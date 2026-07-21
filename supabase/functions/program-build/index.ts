// program-build — turn the user's raw content_sources into structured modules via
// Gemini (Vertex). The expert can pick an exact module count in the UI (1-6); when
// set it becomes a hard rule in the prompt plus a verify/repair pass, otherwise the
// AI picks 1-6. Sets programs.status building → ready / failed so the frontend's
// narrated loader + retry work. Output is validated by the shared schema.
import { z } from 'zod';
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, programBuildRequestSchema, aiProgramSchema } from '../_shared/contract.ts';
import { requireUser, userClient, adminClient } from '../_shared/supabase.ts';
import { callGemini } from '../_shared/gemini.ts';
import { programBuildPrompt } from '../_shared/prompts.ts';

// Overflow recordings are transcribed in their own call; this is that call's shape.
const transcriptSchema = z.object({ transcript: z.string() });

// Map a stored source to a Gemini-supported inline MIME type, or null if it can't
// be analyzed inline (e.g. .docx, or a legacy .webm recording — Gemini has no
// reader for those). Recordings are normalized to WAV client-side. We key strictly
// off the extension so we never MISLABEL bytes (claiming webm is wav → decode error).
function inlineMime(kind: string, ext: string): string | null {
  const byExt: Record<string, string> = {
    pdf: 'application/pdf',
    wav: 'audio/wav', mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac',
    ogg: 'audio/ogg', flac: 'audio/flac',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  };
  if (byExt[ext]) return byExt[ext];
  // A recording with no extension is our normalized WAV; anything else unknown
  // (e.g. legacy webm) is noted by filename instead of attached.
  if (kind === 'voice' && !ext) return 'audio/wav';
  return null;
}

// Base64-encode bytes in chunks (avoids blowing the call stack on large buffers).
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  let programId: string | null = null;
  const admin = adminClient();
  try {
    const user = await requireUser(req);
    const db = userClient(req);
    const { path, module_count: moduleCount } = await parseBody(req, programBuildRequestSchema);

    const { data: sources } = await db
      .from('content_sources')
      .select('id, kind, filename, storage_path, duration_sec')
      .eq('user_id', user.id);

    if (!sources || sources.length === 0) {
      return errorResponse('no_content', 'Add at least one file or recording first.', 400);
    }

    // We retain up to 8 builds. At the cap, no further builds can be created
    // (checked before we deactivate the current build, so a rejected build leaves
    // the active one untouched).
    const { count: buildCount } = await db
      .from('programs').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
    if ((buildCount ?? 0) >= 8) {
      return errorResponse(
        'build_limit',
        "You've reached the limit of 8 builds. Keep refining by editing your saved builds.",
        400,
      );
    }

    // Rebuilds are non-destructive: keep every prior build and add a NEW one.
    // Deactivate the current builds first (the partial unique index allows at most
    // one active build per user), then insert the fresh build as the active one.
    await db.from('programs').update({ is_active: false }).eq('user_id', user.id);

    // Create the program in a 'building' state, active by default.
    const { data: program, error: progErr } = await db
      .from('programs')
      .insert({ user_id: user.id, title: 'Your program', status: 'building', is_active: true })
      .select('*')
      .single();
    if (progErr || !program) {
      return errorResponse('program_create_failed', 'Could not start your program. Please try again.', 502);
    }
    programId = program.id;

    // Assemble the model input: extract text from text files, and attach audio /
    // PDFs / images as inline media so Gemini actually analyzes them (not just the
    // filenames). Non-analyzable or oversized files are noted by name.
    let raw = '';
    const mediaParts: { mimeType: string; dataBase64: string }[] = [];
    // Recordings that don't fit the shared inline budget; transcribed separately.
    const toTranscribe: { mime: string; blob: Blob; label: string }[] = [];
    // Vertex caps the whole generateContent request at ~20 MB, and inlineData is
    // base64 (×4/3 inflation) — so the budget must count ENCODED bytes, with
    // headroom for the prompt text and JSON overhead. 18 MB encoded ≈ 13.5 MB raw.
    let mediaEncodedBytes = 0;
    const MEDIA_CAP_ENCODED = 18 * 1024 * 1024;
    const encodedSize = (rawBytes: number) => Math.ceil(rawBytes / 3) * 4;

    for (const s of sources) {
      const ext = (s.filename.split('.').pop() ?? '').toLowerCase();
      if (/^(txt|md|csv)$/.test(ext)) {
        const { data: blob } = await admin.storage.from('content').download(s.storage_path);
        if (blob) raw += `\n\n=== ${s.filename} ===\n` + (await blob.text()).slice(0, 6000);
        continue;
      }
      const mime = inlineMime(s.kind, ext);
      const label = `${s.kind}: ${s.filename}${s.duration_sec ? ` (${s.duration_sec}s)` : ''}`;
      if (mime) {
        const { data: blob } = await admin.storage.from('content').download(s.storage_path);
        if (blob && mediaEncodedBytes + encodedSize(blob.size) <= MEDIA_CAP_ENCODED) {
          mediaParts.push({ mimeType: mime, dataBase64: toBase64(new Uint8Array(await blob.arrayBuffer())) });
          mediaEncodedBytes += encodedSize(blob.size);
          raw += `\n\n[attached ${label}]`;
          continue;
        }
        // Audio that doesn't fit the shared budget still fits a request of its
        // own (an 8 kHz recording is ≤10 min ≈ 12.8 MB encoded) — transcribe it
        // separately below so up to 60 min of total voice input is fully heard.
        // (Solo-budget check matters for legacy 16 kHz recordings, which can
        // exceed even a dedicated request.)
        if (blob && mime.startsWith('audio/') && encodedSize(blob.size) <= MEDIA_CAP_ENCODED) {
          toTranscribe.push({ mime, blob, label });
          continue;
        }
        console.warn(`program-build: ${s.filename} skipped — over the inline media budget`);
        raw += `\n\n[${label} — too large to analyze directly; not included]`;
        continue;
      }
      raw += `\n\n[${label}]`;
    }

    // Transcribe overflow recordings concurrently and feed the transcripts in as
    // text — text is tiny, so this scales past the inline media ceiling.
    if (toTranscribe.length) {
      const transcripts = await Promise.all(toTranscribe.map(async (t) => {
        const dataBase64 = toBase64(new Uint8Array(await t.blob.arrayBuffer()));
        const { data } = await callGemini({
          admin, userId: user.id, feature: 'program-build',
          systemPrompt:
            'You transcribe voice recordings. Return JSON of the shape {"transcript": string} — the complete, faithful transcript of the recording. No commentary, no summarization.',
          userPrompt: `Transcribe this recording (${t.label}).`,
          schema: transcriptSchema,
          temperature: 0,
          mediaParts: [{ mimeType: t.mime, dataBase64 }],
          mockText: JSON.stringify({ transcript: `(mock transcript of ${t.label})` }),
        });
        return { label: t.label, transcript: data.transcript };
      }));
      for (const t of transcripts) {
        raw += `\n\n=== Transcript of ${t.label} ===\n` + t.transcript.slice(0, 24000);
      }
    }
    if (raw.trim().length < 20 && mediaParts.length === 0) {
      raw = 'The expert provided material about their area of expertise; infer a sensible foundational program.';
    }

    // Build the program. When the expert picked a count it becomes a hard rule in the
    // prompt; the lower temperature keeps the AI on the requested structure. The 3–6
    // schema validates either way (a picked count is always in range).
    const runBuild = async (repairNote = '') => {
      const { system, user: userPrompt, mockText } =
        programBuildPrompt(raw, path, mediaParts.length, moduleCount);
      const { data } = await callGemini({
        admin, userId: user.id, feature: 'program-build',
        systemPrompt: system + repairNote, userPrompt, schema: aiProgramSchema,
        // Rich per-module detail across the modules needs more room than the default
        // 8192 (which also has to cover 2.5 "thinking" tokens).
        temperature: 0.35, maxOutputTokens: 24576, mockText, mediaParts,
      });
      return data;
    };

    let ai = await runBuild();
    // Verify + repair the exact count: one targeted retry that names the miss. Very
    // rarely needed at this temperature, but it makes adherence a guarantee, not a hope.
    if (moduleCount && ai.modules.length !== moduleCount) {
      ai = await runBuild(
        `\n\nCORRECTION: You returned ${ai.modules.length} module(s), but the expert requires EXACTLY ${moduleCount}. Restructure the SAME program into exactly ${moduleCount} module(s) now — merge or split content as needed, but the final count MUST be ${moduleCount}.`,
      );
    }

    // Persist title + modules, flip status to ready.
    await db.from('programs').update({ title: ai.title, status: 'ready' }).eq('id', program.id);
    const moduleRows = ai.modules.map((m, i) => ({
      program_id: program.id, idx: i, title: m.title, outcome: m.outcome,
      detail: m.detail, session_flow: m.session_flow, notes: m.notes,
      participant_notes: m.participant_notes,
    }));
    await db.from('modules').insert(moduleRows);

    const { data: modules } = await db
      .from('modules').select('*').eq('program_id', program.id).order('idx');
    const { data: finalProgram } = await db
      .from('programs').select('*').eq('id', program.id).single();

    return json({ program: finalProgram, modules: modules ?? [] });
  } catch (err) {
    // Mark failed so the UI can offer a clean retry; content is untouched.
    if (programId) {
      await admin.from('programs').update({ status: 'failed' }).eq('id', programId);
    }
    return handleThrown(err);
  }
});

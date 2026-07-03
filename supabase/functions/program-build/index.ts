// program-build — turn the user's raw content_sources into structured modules via
// Gemini (Vertex). The expert can pick an exact module count in the UI (3-6); when
// set it becomes a hard rule in the prompt plus a verify/repair pass, otherwise the
// AI picks 3-6. Sets programs.status building → ready / failed so the frontend's
// narrated loader + retry work. Output is validated by the shared schema.
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, programBuildRequestSchema, aiProgramSchema } from '../_shared/contract.ts';
import { requireUser, userClient, adminClient } from '../_shared/supabase.ts';
import { callGemini } from '../_shared/gemini.ts';
import { programBuildPrompt } from '../_shared/prompts.ts';

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

    // Replace any prior program — rebuilds regenerate from scratch, so we drop the
    // old program (modules cascade) rather than leaving orphans behind the latest.
    await db.from('programs').delete().eq('user_id', user.id);

    // Create the program in a 'building' state.
    const { data: program, error: progErr } = await db
      .from('programs')
      .insert({ user_id: user.id, title: 'Your program', status: 'building' })
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
    let mediaBytes = 0;
    const MEDIA_CAP = 18 * 1024 * 1024; // keep the total inline request under Vertex's limit

    for (const s of sources) {
      const ext = (s.filename.split('.').pop() ?? '').toLowerCase();
      if (/^(txt|md|csv)$/.test(ext)) {
        const { data: blob } = await admin.storage.from('content').download(s.storage_path);
        if (blob) raw += `\n\n=== ${s.filename} ===\n` + (await blob.text()).slice(0, 6000);
        continue;
      }
      const mime = inlineMime(s.kind, ext);
      if (mime && mediaBytes < MEDIA_CAP) {
        const { data: blob } = await admin.storage.from('content').download(s.storage_path);
        if (blob && blob.size + mediaBytes <= MEDIA_CAP) {
          mediaParts.push({ mimeType: mime, dataBase64: toBase64(new Uint8Array(await blob.arrayBuffer())) });
          mediaBytes += blob.size;
          raw += `\n\n[attached ${s.kind}: ${s.filename}${s.duration_sec ? ` (${s.duration_sec}s)` : ''}]`;
          continue;
        }
      }
      raw += `\n\n[${s.kind}: ${s.filename}${s.duration_sec ? ` (${s.duration_sec}s)` : ''}]`;
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

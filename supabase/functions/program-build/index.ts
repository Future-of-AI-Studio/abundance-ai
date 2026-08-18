// program-build — turn the user's raw content_sources into structured modules via
// Gemini (Vertex). The expert can pick an exact module count in the UI (1-6); when
// set it becomes a hard rule in the prompt plus a verify/repair pass, otherwise the
// AI picks 1-6. Sets programs.status building → ready / failed so the frontend's
// narrated loader + retry work. Output is validated by the shared schema.
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, programBuildRequestSchema, aiProgramSchema } from '../_shared/contract.ts';
import { requireUser, userClient, adminClient } from '../_shared/supabase.ts';
import { encodeBase64 } from '@std/encoding/base64';
import { callGemini } from '../_shared/gemini.ts';
import { audioMime, transcribeSource } from '../_shared/transcribe.ts';
import { programBuildPrompt } from '../_shared/prompts.ts';

// PDFs and images are still analyzed inline — they're small and weren't the CPU
// problem that large audio was. Audio is fed in as transcript TEXT instead (see the
// assembly loop). We key strictly off the extension so we never mislabel bytes.
function inlineDocMime(ext: string): string | null {
  const byExt: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  };
  return byExt[ext] ?? null;
}

// Bound the WORK a build does, not just the payload it sends. Every source that
// needs a storage read costs a round trip, and a sequential pass over a large
// library (42 files / 31 MB in the wild) ran the request past the platform limit:
// the isolate was killed *after* the Gemini call had already succeeded, so the
// catch below never ran and the program sat at 'building' forever. Two guards —
// a hard cap on how many documents we fetch, so the worst case is fixed no matter
// what the files look like, and concurrent fetching so wall clock scales with
// batches rather than with file count.
// Mirrored by MAX_BUILD_DOCUMENTS in packages/shared/src/supabase.ts, which the
// upload screen uses to warn before anyone hits it. Keep the two in sync.
const MAX_INLINE_DOCS = 12;
const DOWNLOAD_CONCURRENCY = 5;

/** Run `fn` over `items` in fixed-size concurrent batches, preserving input order. */
async function inBatches<T, R>(
  items: readonly T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
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
      .select('id, kind, filename, storage_path, duration_sec, transcript')
      .eq('user_id', user.id)
      // Upload order, so "the first MAX_INLINE_DOCS documents" means the same set
      // on every build instead of whatever Postgres happened to return.
      .order('created_at', { ascending: true });

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

    // Assemble the model input: extract text from text notes, use stored transcripts
    // for recordings (transcribing on demand any that are missing — a legacy recording
    // or one whose upload-time transcription didn't finish), and attach PDFs / images
    // as inline media. Large audio stays OUT of the build request as text — its base64
    // + inline was what tripped the Edge Runtime CPU limit for heavy users.
    const mediaParts: { mimeType: string; dataBase64: string }[] = [];
    // Vertex caps the whole generateContent request at ~20 MB, and inlineData is
    // base64 (×4/3 inflation) — so the budget must count ENCODED bytes, with
    // headroom for the prompt text and JSON overhead. 18 MB encoded ≈ 13.5 MB raw.
    let mediaEncodedBytes = 0;
    const MEDIA_CAP_ENCODED = 18 * 1024 * 1024;
    const encodedSize = (rawBytes: number) => Math.ceil(rawBytes / 3) * 4;

    // Classify first, fetch in bounded concurrent batches, then reassemble in
    // upload order — so the prompt is identical no matter which download won.
    const plan = sources.map((s) => {
      const ext = (s.filename.split('.').pop() ?? '').toLowerCase();
      return {
        s,
        label: `${s.kind}: ${s.filename}${s.duration_sec ? ` (${s.duration_sec}s)` : ''}`,
        isText: /^(txt|md|csv)$/.test(ext),
        isAudio: audioMime(s) !== null,
        docMime: inlineDocMime(ext),
      };
    });
    type Planned = (typeof plan)[number];

    // Same precedence as before: text, then audio, then inline documents.
    const texts = plan.filter((p) => p.isText);
    const audios = plan.filter((p) => !p.isText && p.isAudio);
    const docs = plan.filter((p) => !p.isText && !p.isAudio && p.docMime);
    const others = plan.filter((p) => !p.isText && !p.isAudio && !p.docMime);

    // Each source's slice of the prompt, keyed by id so assembly can follow upload
    // order rather than completion order.
    const fragment = new Map<string, string>();
    const download = (path: string) => admin.storage.from('content').download(path);

    // Text notes → inline text (tiny, but still a round trip each).
    const textBlobs = await inBatches(texts, DOWNLOAD_CONCURRENCY, async (p: Planned) => {
      const { data: blob } = await download(p.s.storage_path);
      return { p, text: blob ? (await blob.text()).slice(0, 6000) : null };
    });
    for (const { p, text } of textBlobs) {
      if (text !== null) fragment.set(p.s.id, `\n\n=== ${p.s.filename} ===\n` + text);
    }

    // PDFs / images → inline media. Only the first MAX_INLINE_DOCS are fetched AT
    // ALL: the old loop downloaded every document and then discarded the ones past
    // the byte budget, which is what made a large library so expensive. Documents
    // past the cap are still named in the prompt, so the omission is explicit to
    // the model instead of silent.
    const docBlobs = await inBatches(
      docs.slice(0, MAX_INLINE_DOCS),
      DOWNLOAD_CONCURRENCY,
      async (p: Planned) => ({ p, blob: (await download(p.s.storage_path)).data }),
    );
    // Budget applied after the fetch, in upload order, so it stays deterministic.
    for (const { p, blob } of docBlobs) {
      const mime = p.docMime;
      if (blob && mime && mediaEncodedBytes + encodedSize(blob.size) <= MEDIA_CAP_ENCODED) {
        mediaParts.push({ mimeType: mime, dataBase64: encodeBase64(await blob.arrayBuffer()) });
        mediaEncodedBytes += encodedSize(blob.size);
        fragment.set(p.s.id, `\n\n[attached ${p.label}]`);
        continue;
      }
      console.warn(`program-build: ${p.s.filename} skipped — over the inline media budget`);
      fragment.set(p.s.id, `\n\n[${p.label} — too large to analyze directly; not included]`);
    }
    if (docs.length > MAX_INLINE_DOCS) {
      console.warn(`program-build: ${docs.length} documents, reading the first ${MAX_INLINE_DOCS}`);
      for (const p of docs.slice(MAX_INLINE_DOCS)) {
        fragment.set(
          p.s.id,
          `\n\n[${p.label} — not analyzed; a build reads the first ${MAX_INLINE_DOCS} documents]`,
        );
      }
    }

    // Audio → transcript TEXT. Prefer the stored transcript; transcribe on demand
    // (sequentially, to avoid CPU spikes) when it's missing, and persist it.
    for (const p of audios) {
      let transcript = p.s.transcript ?? '';
      if (!transcript.trim()) {
        const res = await transcribeSource(admin, user.id, p.s);
        transcript = res?.transcript ?? '';
      }
      fragment.set(
        p.s.id,
        transcript.trim()
          ? `\n\n=== Transcript of ${p.label} ===\n` + transcript.slice(0, 24000)
          : `\n\n[${p.label} — could not be transcribed]`,
      );
    }

    for (const p of others) fragment.set(p.s.id, `\n\n[${p.label}]`);

    let raw = plan.map((p) => fragment.get(p.s.id) ?? '').join('');

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

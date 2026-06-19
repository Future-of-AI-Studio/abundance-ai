// program-build — turn the user's raw content_sources into 3-6 structured modules
// via Gemini (Vertex). Sets programs.status building → ready / failed so the
// frontend's narrated loader + retry work. Output is validated by the shared schema.
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, programBuildRequestSchema, aiProgramSchema } from '../_shared/contract.ts';
import { requireUser, userClient, adminClient } from '../_shared/supabase.ts';
import { callGemini } from '../_shared/gemini.ts';
import { programBuildPrompt } from '../_shared/prompts.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  let programId: string | null = null;
  const admin = adminClient();
  try {
    const user = await requireUser(req);
    const db = userClient(req);
    const { path } = await parseBody(req, programBuildRequestSchema);

    const { data: sources } = await db
      .from('content_sources')
      .select('id, kind, filename, storage_path, duration_sec')
      .eq('user_id', user.id);

    if (!sources || sources.length === 0) {
      return errorResponse('no_content', 'Add at least one file or recording first.', 400);
    }

    // Create/replace the program in a 'building' state.
    const { data: program, error: progErr } = await db
      .from('programs')
      .insert({ user_id: user.id, title: 'Your program', status: 'building' })
      .select('*')
      .single();
    if (progErr || !program) {
      return errorResponse('program_create_failed', 'Could not start your program. Please try again.', 502);
    }
    programId = program.id;

    // Assemble raw text: pull text-extractable files; note other media by name.
    let raw = '';
    for (const s of sources) {
      if (s.kind === 'file' && /\.(txt|md|csv)$/i.test(s.filename)) {
        const { data: blob } = await admin.storage.from('content').download(s.storage_path);
        if (blob) raw += `\n\n=== ${s.filename} ===\n` + (await blob.text()).slice(0, 6000);
      } else {
        raw += `\n\n[${s.kind}: ${s.filename}${s.duration_sec ? ` (${s.duration_sec}s)` : ''}]`;
      }
    }
    if (raw.trim().length < 20) {
      raw = 'The expert provided recordings and files about their area of expertise; infer a sensible foundational program.';
    }

    const { system, user: userPrompt, mockText } = programBuildPrompt(raw, path);
    const { data: ai } = await callGemini({
      admin, userId: user.id, feature: 'program-build',
      systemPrompt: system, userPrompt, schema: aiProgramSchema,
      temperature: 0.6, mockText,
    });

    // Persist title + modules, flip status to ready.
    await db.from('programs').update({ title: ai.title, status: 'ready' }).eq('id', program.id);
    const moduleRows = ai.modules.map((m, i) => ({
      program_id: program.id, idx: i, title: m.title, outcome: m.outcome, session_flow: m.session_flow,
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

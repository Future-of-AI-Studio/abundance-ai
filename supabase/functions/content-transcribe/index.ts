// content-transcribe — transcribe one uploaded recording and store the text on
// content_sources.transcript. Called by the client right after a voice upload
// finishes, so by the time the expert hits "Build my program" the transcript is
// already there and program-build stays light (text-only, no audio base64/inline).
// Idempotent: a second call for an already-transcribed source is a cheap no-op.
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, contentTranscribeRequestSchema } from '../_shared/contract.ts';
import { requireUser, userClient, adminClient } from '../_shared/supabase.ts';
import { transcribeSource } from '../_shared/transcribe.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const user = await requireUser(req);
    const db = userClient(req);
    const { content_source_id } = await parseBody(req, contentTranscribeRequestSchema);

    // RLS-scoped read confirms the caller owns this source before we touch it.
    const { data: source } = await db
      .from('content_sources')
      .select('id, kind, filename, storage_path, duration_sec, transcript')
      .eq('id', content_source_id)
      .maybeSingle();
    if (!source) return errorResponse('not_found', 'That recording could not be found.', 404);

    const result = await transcribeSource(adminClient(), user.id, source);
    // null = not transcribable audio (e.g. a legacy .webm) — not an error.
    return json({ transcribed: result !== null, cached: result?.cached ?? false });
  } catch (err) {
    return handleThrown(err);
  }
});

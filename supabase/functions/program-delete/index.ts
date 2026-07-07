// program-delete — remove one of the user's retained builds (modules cascade).
// RLS-scoped via the user client, so a user can only delete their own build. The
// active build can't be deleted — the user must switch to another build first, so
// there's always exactly one active build to fall back on.
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, programDeleteRequestSchema } from '../_shared/contract.ts';
import { requireUser, userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    await requireUser(req);
    const db = userClient(req);
    const { program_id } = await parseBody(req, programDeleteRequestSchema);

    // Confirm ownership (a foreign row is invisible under RLS → not found).
    const { data: target } = await db
      .from('programs').select('id, is_active').eq('id', program_id).maybeSingle();
    if (!target) return errorResponse('not_found', "We couldn't find that build.", 404);
    if (target.is_active) {
      return errorResponse(
        'active_build',
        "That build is active. Switch to another build first, then delete this one.",
        400,
      );
    }

    await db.from('programs').delete().eq('id', program_id);
    return json({ ok: true });
  } catch (err) {
    return handleThrown(err);
  }
});

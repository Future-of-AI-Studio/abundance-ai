// program-activate — make one of the user's retained builds the active "your
// program". Rebuilds keep every prior build (see program-build); this is how the
// user picks which one the app reads everywhere (dashboard, pricing, share link,
// students). RLS-scoped via the user client, so a user can only activate their own
// build. The partial unique index (one active per user) is upheld by deactivating
// the others first.
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, programActivateRequestSchema } from '../_shared/contract.ts';
import { requireUser, userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const user = await requireUser(req);
    const db = userClient(req);
    const { program_id } = await parseBody(req, programActivateRequestSchema);

    // Confirm ownership (a foreign row is invisible under RLS → not found).
    const { data: target } = await db
      .from('programs').select('id').eq('id', program_id).maybeSingle();
    if (!target) return errorResponse('not_found', "We couldn't find that build.", 404);

    // Deactivate the others first, then activate the target — keeps the
    // one-active-per-user index satisfied at every step.
    await db.from('programs').update({ is_active: false }).eq('user_id', user.id);
    await db.from('programs').update({ is_active: true }).eq('id', program_id);

    const { data: program } = await db
      .from('programs').select('*').eq('id', program_id).single();
    const { data: modules } = await db
      .from('modules').select('*').eq('program_id', program_id).order('idx');

    return json({ program, modules: modules ?? [] });
  } catch (err) {
    return handleThrown(err);
  }
});

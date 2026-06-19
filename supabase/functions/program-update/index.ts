// program-update — edit title, upsert/reorder modules, remove modules. RLS-scoped
// via the user client, so a user can only touch their own program. Enforces the
// "keep at least one module" rule.
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, programUpdateRequestSchema } from '../_shared/contract.ts';
import { requireUser, userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const user = await requireUser(req);
    const db = userClient(req);
    const body = await parseBody(req, programUpdateRequestSchema);

    // Confirm ownership.
    const { data: program } = await db
      .from('programs').select('id, user_id').eq('id', body.program_id).maybeSingle();
    if (!program) return errorResponse('not_found', "We couldn't find that program.", 404);

    if (body.title !== undefined) {
      await db.from('programs').update({ title: body.title }).eq('id', body.program_id);
    }

    if (body.remove_module_ids?.length) {
      await db.from('modules').delete().in('id', body.remove_module_ids).eq('program_id', body.program_id);
    }

    if (body.modules?.length) {
      for (const m of body.modules) {
        if (m.id) {
          await db.from('modules')
            .update({ idx: m.idx, title: m.title, outcome: m.outcome, session_flow: m.session_flow })
            .eq('id', m.id).eq('program_id', body.program_id);
        } else {
          await db.from('modules')
            .insert({ program_id: body.program_id, idx: m.idx, title: m.title, outcome: m.outcome, session_flow: m.session_flow });
        }
      }
    }

    const { count } = await db
      .from('modules').select('id', { count: 'exact', head: true }).eq('program_id', body.program_id);
    if ((count ?? 0) < 1) {
      return errorResponse('min_modules', 'Keep at least one module.', 400);
    }

    const { data: modules } = await db
      .from('modules').select('*').eq('program_id', body.program_id).order('idx');
    const { data: updated } = await db
      .from('programs').select('*').eq('id', body.program_id).single();

    return json({ program: updated, modules: modules ?? [] });
  } catch (err) {
    return handleThrown(err);
  }
});

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

    if (body.title !== undefined || body.price_cents !== undefined) {
      const patch: Record<string, unknown> = {};
      if (body.title !== undefined) patch.title = body.title;
      if (body.price_cents !== undefined) patch.price_cents = body.price_cents;
      const { error } = await db.from('programs').update(patch).eq('id', body.program_id);
      if (error) return errorResponse('update_failed', "We couldn't save that edit.", 400);
    }

    if (body.remove_module_ids?.length) {
      const { error } = await db.from('modules').delete().in('id', body.remove_module_ids).eq('program_id', body.program_id);
      if (error) return errorResponse('update_failed', "We couldn't remove those modules.", 400);
    }

    if (body.modules?.length) {
      const mods = body.modules;
      const row = (m: (typeof mods)[number]) => ({
        program_id: body.program_id, idx: m.idx, title: m.title, description: m.description, outcome: m.outcome, detail: m.detail, session_flow: m.session_flow, notes: m.notes, participant_notes: m.participant_notes,
      });
      // Upsert (not update): a client-generated id for a brand-new module won't
      // exist yet, so an update would no-op and the module would never persist.
      // All rows go in ONE statement: reordering swaps idx values between rows,
      // and the (program_id, idx) unique check is deferred to commit — row-by-row
      // writes would collide mid-swap.
      const withId = mods.filter((m) => m.id);
      const withoutId = mods.filter((m) => !m.id);
      if (withId.length) {
        const { error } = await db.from('modules').upsert(withId.map((m) => ({ id: m.id, ...row(m) })));
        if (error) return errorResponse('update_failed', "We couldn't save those modules.", 400);
      }
      if (withoutId.length) {
        const { error } = await db.from('modules').insert(withoutId.map(row));
        if (error) return errorResponse('update_failed', "We couldn't save those modules.", 400);
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

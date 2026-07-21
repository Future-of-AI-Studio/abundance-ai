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
      .from('programs').select('id, user_id, title').eq('id', body.program_id).maybeSingle();
    if (!program) return errorResponse('not_found', "We couldn't find that program.", 404);

    if (
      body.title !== undefined || body.price_cents !== undefined ||
      body.free_offer_enabled !== undefined || body.free_offer_until !== undefined
    ) {
      const patch: Record<string, unknown> = {};
      if (body.title !== undefined) patch.title = body.title;
      if (body.price_cents !== undefined) patch.price_cents = body.price_cents;
      if (body.free_offer_enabled !== undefined) patch.free_offer_enabled = body.free_offer_enabled;
      if (body.free_offer_until !== undefined) patch.free_offer_until = body.free_offer_until;
      const { error } = await db.from('programs').update(patch).eq('id', body.program_id);
      if (error) return errorResponse('update_failed', "We couldn't save that edit.", 400);

      // The program title is baked verbatim into generated marketing copy
      // (posts + emails), so a rename must follow it there — otherwise the user
      // has to hunt through every caption by hand. Exact-match replacement keeps
      // their own caption edits intact; posts already marked posted are left
      // alone (they're out in the world as-is). Best-effort: a failure here
      // never fails the title save itself.
      const oldTitle = program.title;
      const newTitle = body.title;
      if (newTitle !== undefined && oldTitle && newTitle !== oldTitle && oldTitle.trim().length >= 3) {
        const { data: posts } = await db
          .from('marketing_posts').select('id, caption')
          .eq('user_id', user.id).eq('posted', false);
        const renamed = (posts ?? [])
          .filter((p) => typeof p.caption === 'string' && p.caption.includes(oldTitle))
          .map((p) => ({ id: p.id, caption: (p.caption as string).split(oldTitle).join(newTitle) }));
        for (const p of renamed) {
          const { error: renameErr } = await db
            .from('marketing_posts').update({ caption: p.caption }).eq('id', p.id);
          if (renameErr) console.error('program-update: caption rename failed', renameErr);
        }
      }
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

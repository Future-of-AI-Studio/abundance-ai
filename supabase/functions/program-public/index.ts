// program-public — the buyer-facing view of a program's landing page (public; no
// JWT). Runs as service role so a shared link works for anonymous visitors
// without opening public RLS on the owner's private rows. Returns only
// learner-safe fields: session_flow + notes (creator delivery guidance) are omitted.
//
// Accepts either the creator's short slug (/laquelle) or a program UUID
// (/p/:id, the legacy form) — see the lookup below for why they differ.
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, programPublicRequestSchema } from '../_shared/contract.ts';
import { adminClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const { program_id, slug } = await parseBody(req, programPublicRequestSchema);
    const admin = adminClient();

    const cols = 'id, user_id, title, price_cents, status, free_offer_enabled, free_offer_until';

    // Two ways in. The slug is the creator's identity, so it resolves to whichever
    // build they currently have ACTIVE — a link shared months ago keeps selling the
    // current program. A UUID is pinned to the one build it names, which is why the
    // legacy /p/:id form goes stale after a rebuild and gets redirected to the slug.
    let program;
    if (slug) {
      const { data: owner } = await admin
        .from('profiles')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!owner) return errorResponse('not_found', "This program isn't available.", 404);

      ({ data: program } = await admin
        .from('programs')
        .select(cols)
        .eq('user_id', owner.id)
        .eq('status', 'ready')
        .eq('is_active', true)
        .maybeSingle());
    } else {
      ({ data: program } = await admin
        .from('programs')
        .select(cols)
        .eq('id', program_id)
        .maybeSingle());
    }

    // Only a finished program is sellable — hide building/failed ones.
    if (!program || program.status !== 'ready') {
      return errorResponse('not_found', "This program isn't available.", 404);
    }

    const { data: modules } = await admin
      .from('modules')
      .select('idx, title, description, outcome, detail')
      .eq('program_id', program.id)
      .order('idx');

    const { data: creator } = await admin
      .from('profiles')
      .select('first_name, slug, category, avatar_url, email, bio, landing_page')
      .eq('id', program.user_id)
      .maybeSingle();

    if (!creator) {
      return errorResponse('not_found', "This program isn't available.", 404);
    }

    return json({
      program: {
        id: program.id,
        title: program.title,
        price_cents: program.price_cents,
        free_offer_enabled: program.free_offer_enabled ?? false,
        free_offer_until: program.free_offer_until ?? null,
      },
      modules: modules ?? [],
      creator,
    });
  } catch (err) {
    return handleThrown(err);
  }
});

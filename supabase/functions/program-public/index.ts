// program-public — the buyer-facing view of a program's landing page (public; no
// JWT). Runs as service role so a shared /p/:id link works for anonymous visitors
// without opening public RLS on the owner's private rows. Returns only
// learner-safe fields: session_flow + notes (creator delivery guidance) are omitted.
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, programPublicRequestSchema } from '../_shared/contract.ts';
import { adminClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const { program_id } = await parseBody(req, programPublicRequestSchema);
    const admin = adminClient();

    const { data: program } = await admin
      .from('programs')
      .select('id, user_id, title, price_cents, status')
      .eq('id', program_id)
      .maybeSingle();

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
      .select('first_name, category, avatar_url, email, bio, landing_page')
      .eq('id', program.user_id)
      .maybeSingle();

    if (!creator) {
      return errorResponse('not_found', "This program isn't available.", 404);
    }

    return json({
      program: { id: program.id, title: program.title, price_cents: program.price_cents },
      modules: modules ?? [],
      creator,
    });
  } catch (err) {
    return handleThrown(err);
  }
});

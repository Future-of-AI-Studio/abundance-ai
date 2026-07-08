// program-view-track — record a view of a program's public landing page (public;
// no JWT). Runs as service role so an anonymous /p/:id visit is counted against
// the program's owner (creator_id) without opening public RLS. Best-effort: a
// failed insert never breaks the buyer's page, so we still return ok.
import { handleOptions } from '../_shared/cors.ts';
import { json, handleThrown } from '../_shared/response.ts';
import { parseBody, programViewTrackRequestSchema } from '../_shared/contract.ts';
import { adminClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const { program_id } = await parseBody(req, programViewTrackRequestSchema);
    const admin = adminClient();

    // Resolve the owner so the view is attributed correctly. Only a sellable
    // program gets counted — bogus/unpublished ids record nothing.
    const { data: program } = await admin
      .from('programs')
      .select('id, user_id, status')
      .eq('id', program_id)
      .maybeSingle();

    if (program && program.status === 'ready') {
      await admin.from('program_views').insert({
        program_id: program.id,
        creator_id: program.user_id,
      });
    }

    // Always ok — view tracking is a side effect, never a blocker for the buyer.
    return json({ ok: true });
  } catch (err) {
    return handleThrown(err);
  }
});

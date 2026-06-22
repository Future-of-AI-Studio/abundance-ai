// sessions-set-link — validate + save a meeting link (Meet/Zoom/Teams/other).
// Surfaces on Home + Circle.
import { handleOptions } from '../_shared/cors.ts';
import { json, handleThrown } from '../_shared/response.ts';
import { parseBody, sessionsSetLinkRequestSchema } from '../_shared/contract.ts';
import { requireUser, userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const user = await requireUser(req);
    const db = userClient(req);
    const { meet_link, platform } = await parseBody(req, sessionsSetLinkRequestSchema);

    const { data: session } = await db
      .from('sessions')
      .upsert({ user_id: user.id, meet_link, platform })
      .select('*')
      .single();

    return json({ session });
  } catch (err) {
    return handleThrown(err);
  }
});

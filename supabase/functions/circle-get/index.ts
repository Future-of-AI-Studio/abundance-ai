// circle-get — return match status, members (peer chips), external WhatsApp/Meet
// links, and the next expert talk. Members are structured (category/level/
// fear_pattern) per A3 — never prose.
import { handleOptions } from '../_shared/cors.ts';
import { json, handleThrown } from '../_shared/response.ts';
import { requireUser, userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const user = await requireUser(req);
    const db = userClient(req);

    // The circle the user belongs to (RLS allows reading their own circle + peers).
    const { data: myMembership } = await db
      .from('circle_members').select('circle_id, whatsapp_url, meet_url').eq('user_id', user.id).maybeSingle();

    let match_status: 'pending' | 'matched' = 'pending';
    let members: unknown[] = [];
    let whatsapp_url: string | null = null;
    let meet_url: string | null = null;

    if (myMembership?.circle_id) {
      const { data: circle } = await db
        .from('circles').select('match_status').eq('id', myMembership.circle_id).maybeSingle();
      match_status = (circle?.match_status as 'pending' | 'matched') ?? 'pending';
      whatsapp_url = myMembership.whatsapp_url ?? null;
      meet_url = myMembership.meet_url ?? null;

      const { data: peers } = await db
        .from('circle_members')
        .select('circle_id, user_id, name, category, level, fear_pattern, whatsapp_url, meet_url')
        .eq('circle_id', myMembership.circle_id);
      members = peers ?? [];
    }

    // Next expert talk: soonest upcoming, else most recent past (for recording).
    const nowIso = new Date().toISOString();
    const { data: upcoming } = await db
      .from('expert_talks').select('*').gte('starts_at', nowIso).order('starts_at', { ascending: true }).limit(1).maybeSingle();
    let next_talk = upcoming ?? null;
    if (!next_talk) {
      const { data: past } = await db
        .from('expert_talks').select('*').lt('starts_at', nowIso).order('starts_at', { ascending: false }).limit(1).maybeSingle();
      next_talk = past ?? null;
    }

    return json({ match_status, members, whatsapp_url, meet_url, next_talk });
  } catch (err) {
    return handleThrown(err);
  }
});

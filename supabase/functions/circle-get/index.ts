// circle-get — return the user's circle (or an automatically recommended one),
// the drop-in meetups, and the next expert talk.
//
// Matching is AUTOMATIC and RULE-BASED (spec A3): if the user isn't already in a
// persisted circle, we run the swappable MatchingService over the pool of
// unmatched creators and return the circle it proposes for them as a *pending*
// recommendation (same category, 3–5 people). The rule engine lives behind an
// interface (see _shared/matching.ts) so a Phase 2/3 ML matcher swaps in without
// touching this handler, the data model, or the UI.
import { handleOptions } from '../_shared/cors.ts';
import { json, handleThrown } from '../_shared/response.ts';
import { requireUser, userClient, adminClient } from '../_shared/supabase.ts';
import { circleFor, type Creator } from '../_shared/matching.ts';

interface RosterMember {
  user_id: string;
  name: string;
  category: string;
  is_you?: boolean;
  program_id?: string | null;
  program_slug?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const user = await requireUser(req);
    const db = userClient(req);

    // The circle the user already belongs to (RLS allows reading own circle + peers).
    const { data: myMembership } = await db
      .from('circle_members')
      .select('circle_id, whatsapp_url, meet_url')
      .eq('user_id', user.id)
      .maybeSingle();

    let match_status: 'pending' | 'matched' = 'pending';
    let members: RosterMember[] = [];
    let whatsapp_url: string | null = null;
    let meet_url: string | null = null;

    if (myMembership?.circle_id) {
      // Persisted circle (operator-confirmed or previously formed) → return it.
      const { data: circle } = await db
        .from('circles').select('match_status').eq('id', myMembership.circle_id).maybeSingle();
      match_status = (circle?.match_status as 'pending' | 'matched') ?? 'pending';
      whatsapp_url = myMembership.whatsapp_url ?? null;
      meet_url = myMembership.meet_url ?? null;

      const { data: peers } = await db
        .from('circle_members')
        .select('user_id, name, category')
        .eq('circle_id', myMembership.circle_id);
      members = (peers ?? []).map((p) => ({
        user_id: p.user_id as string,
        name: p.name as string,
        category: p.category as string,
        is_you: p.user_id === user.id,
      }));
    } else {
      // Not in a circle yet → automatically recommend one via the rule engine.
      // Pool = paid creators not already in a *confirmed* circle. Read with the
      // service role: forming a recommendation needs to see other people's
      // profiles, which RLS (correctly) hides from the user client.
      const admin = adminClient();

      const { data: matchedRows } = await admin
        .from('circle_members')
        .select('user_id, circles!inner(match_status)')
        .eq('circles.match_status', 'matched');
      const alreadyMatched = new Set((matchedRows ?? []).map((r) => r.user_id as string));

      const { data: profiles } = await admin
        .from('profiles')
        .select('id, first_name, category')
        .not('paid_at', 'is', null);

      const pool: Creator[] = (profiles ?? [])
        .filter((p) => !alreadyMatched.has(p.id as string))
        .map((p) => ({
          user_id: p.id as string,
          name: (p.first_name as string) ?? 'Friend',
          category: (p.category as string) ?? 'other',
        }));

      const recommended = circleFor(user.id, pool);
      if (recommended) {
        members = recommended.members.map((m) => ({
          user_id: m.user_id,
          name: m.name,
          category: m.category,
          is_you: m.user_id === user.id,
        }));
      }
      // match_status stays 'pending' — a recommendation, not a confirmed circle.
    }

    // Attach each member's public program landing page so the roster can link
    // through to it. A member's program is hidden from the user client by RLS, so
    // read with the service role; only a published ('ready'), active build is
    // linkable. Members without one are left with program_id: null (not clickable).
    //
    // The slug rides along so the roster links to /laquelle rather than a UUID —
    // a peer's raw program id was the last place a creator saw the old URL shape.
    const peerIds = members.filter((m) => !m.is_you).map((m) => m.user_id);
    if (peerIds.length) {
      const admin = adminClient();
      const [{ data: progs }, { data: slugs }] = await Promise.all([
        admin
          .from('programs')
          .select('id, user_id')
          .in('user_id', peerIds)
          .eq('status', 'ready')
          .eq('is_active', true),
        admin.from('profiles').select('id, slug').in('id', peerIds),
      ]);
      const programByUser = new Map<string, string>();
      for (const p of progs ?? []) {
        if (!programByUser.has(p.user_id as string)) programByUser.set(p.user_id as string, p.id as string);
      }
      const slugByUser = new Map<string, string>();
      for (const s of slugs ?? []) {
        if (s.slug) slugByUser.set(s.id as string, s.slug as string);
      }
      members = members.map((m) => ({
        ...m,
        program_id: m.is_you ? null : programByUser.get(m.user_id) ?? null,
        program_slug: m.is_you ? null : slugByUser.get(m.user_id) ?? null,
      }));
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

    // Upcoming drop-in meetups (open rooms, no commitment). Shown to everyone.
    const { data: meetupRows } = await db
      .from('circle_meetups')
      .select('id, title, starts_at, host_name, join_url')
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true })
      .limit(3);
    const meetups = meetupRows ?? [];

    return json({ match_status, members, whatsapp_url, meet_url, meetups, next_talk });
  } catch (err) {
    return handleThrown(err);
  }
});

// scripts/seed-demo.mjs
// Creates the populated JUDGE DEMO ACCOUNT (and two peer members for the circle)
// so judges see a fully-populated app immediately. Idempotent: re-running resets
// the demo data. Uses the Supabase service role (server-side only).
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-demo.mjs
// Local default values are read from `supabase status` if env vars are unset.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY (from `supabase status`).');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const JUDGE = { email: 'judge@demo.abundance.ai', password: 'AbundanceDemo!2025', first_name: 'Judge', category: 'professional' };
const PEERS = [
  { email: 'maya@demo.abundance.ai', password: 'AbundanceDemo!2025', first_name: 'Maya', category: 'healer', level: 'starting', fear_pattern: 'visibility' },
  { email: 'tom@demo.abundance.ai', password: 'AbundanceDemo!2025', first_name: 'Tom', category: 'professional', level: 'stalled', fear_pattern: 'consistency' },
];

async function findUserByEmail(email) {
  // Paginate through users (demo project is tiny).
  for (let page = 1; page <= 5; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    const u = data?.users?.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u;
    if (!data || data.users.length < 1000) break;
  }
  return null;
}

async function ensurePaidOrder(email, related) {
  const { data: existing } = await admin.from('orders').select('id').eq('email', email).eq('status', 'paid').maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await admin.from('orders').insert({
    email, status: 'paid', amount_cents: 2500, is_related_party: related,
    stripe_payment_intent: `pi_demo_${email.split('@')[0]}`,
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

async function ensureUser(spec, related) {
  // The handle_new_user trigger requires a paid order to exist first (the $25 gate).
  await ensurePaidOrder(spec.email, related);
  let user = await findUserByEmail(spec.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: spec.email,
      password: spec.password,
      email_confirm: true,
      user_metadata: { first_name: spec.first_name, category: spec.category },
    });
    if (error) throw error;
    user = data.user;
    console.log(`  created auth user ${spec.email}`);
  } else {
    console.log(`  reusing auth user ${spec.email}`);
  }
  await admin.from('profiles').update({ category: spec.category, first_name: spec.first_name }).eq('id', user.id);
  return user.id;
}

async function main() {
  console.log('Seeding judge demo account…');
  const judgeId = await ensureUser(JUDGE, true);
  const peerIds = [];
  for (const p of PEERS) peerIds.push(await ensureUser(p, true));

  // Journey: path A, most of the journey complete.
  await admin.from('journey_state').upsert({
    user_id: judgeId, path: 'A', current_step: 'payments',
    completed_steps: ['path', 'content', 'program', 'marketing', 'sessions'],
  });

  // A built, ready program with modules.
  await admin.from('programs').delete().eq('user_id', judgeId);
  const { data: program } = await admin.from('programs').insert({
    user_id: judgeId, title: 'The Confident Consultant: from expert to in-demand', status: 'ready',
  }).select('id').single();
  await admin.from('modules').insert([
    { program_id: program.id, idx: 0, title: 'Own Your Expertise', outcome: 'You can state, in one sentence, the transformation you create.', session_flow: 'Share your origin story. Map the client journey start to finish. Name their first win together.' },
    { program_id: program.id, idx: 1, title: 'Package the Method', outcome: 'You can walk any client through your signature method.', session_flow: 'Teach the framework. Run it live on a real case. Assign a small, doable action.' },
    { program_id: program.id, idx: 2, title: 'Show Up & Be Seen', outcome: 'You can talk about your work without shrinking.', session_flow: 'Practice your message out loud. Handle the awkward questions. Post once, together.' },
    { program_id: program.id, idx: 3, title: 'Keep Them Moving', outcome: 'You can sustain client momentum without burning out.', session_flow: 'Review wins and walls. Coach one sticking point. Set the next commitment.' },
  ]);

  // Marketing posts.
  await admin.from('marketing_posts').delete().eq('user_id', judgeId);
  await admin.from('marketing_posts').insert([
    { user_id: judgeId, channel: 'social', caption: "I built the program I wish I'd had when I started: The Confident Consultant. Doors are open.", hashtags: ['#consulting', '#yourtime', '#startnow'], posted: true },
    { user_id: judgeId, channel: 'social', caption: "You don't need to have it all figured out to begin. I'll walk you through it, step by step.", hashtags: ['#growth', '#mindset'], posted: false },
    { user_id: judgeId, channel: 'social', caption: 'Clarity, a real method, and people in your corner. That is the whole offer. That is the work.', hashtags: ['#community', '#coaching'], posted: false },
  ]);

  // Saved Meet link.
  await admin.from('sessions').upsert({ user_id: judgeId, meet_link: 'https://meet.google.com/abc-defg-hij' });

  // Stripe readiness (partway through).
  await admin.from('stripe_connect').upsert({
    user_id: judgeId, connected: false,
    checklist: { bank: false, id: false, email: true },
  });

  // A matched circle with the judge + two peers.
  await admin.from('circle_members').delete().in('user_id', [judgeId, ...peerIds]);
  await admin.from('circles').delete().eq('id', '33333333-3333-3333-3333-333333333333');
  await admin.from('circles').insert({ id: '33333333-3333-3333-3333-333333333333', match_status: 'matched' });
  const wa = 'https://chat.whatsapp.com/DemoCircleInvite';
  const meet = 'https://meet.google.com/circle-demo-xyz';
  await admin.from('circle_members').insert([
    { circle_id: '33333333-3333-3333-3333-333333333333', user_id: judgeId, name: 'Judge', category: 'professional', level: 'growing', fear_pattern: 'pricing', whatsapp_url: wa, meet_url: meet },
    { circle_id: '33333333-3333-3333-3333-333333333333', user_id: peerIds[0], name: 'Maya', category: 'healer', level: 'starting', fear_pattern: 'visibility', whatsapp_url: wa, meet_url: meet },
    { circle_id: '33333333-3333-3333-3333-333333333333', user_id: peerIds[1], name: 'Tom', category: 'professional', level: 'stalled', fear_pattern: 'consistency', whatsapp_url: wa, meet_url: meet },
  ]);

  // One mindset check-in + this week's quota.
  const week = (() => {
    const now = new Date();
    const day = (now.getUTCDay() + 6) % 7;
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
    return monday.toISOString().slice(0, 10);
  })();
  await admin.from('mindset_checkins').delete().eq('user_id', judgeId);
  await admin.from('mindset_checkins').insert({
    user_id: judgeId, wall_key: 'charging-money',
    prompt: "You're uncomfortable charging money for your help.",
    reflection: 'Charging is not taking — it is making your work sustainable so you can keep showing up. The people who pay you will value the work more, not less. Start with a number that feels almost too easy, and raise it as your confidence grows. You have earned this.',
    user_note: null, cache_hit: true,
  });
  await admin.from('mindset_quota').upsert({ user_id: judgeId, week_start: week, count: 1, cap: 3 });

  console.log('\nDone. Judge demo login:');
  console.log(`  email:    ${JUDGE.email}`);
  console.log(`  password: ${JUDGE.password}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

-- seed.sql — runs on `supabase db reset`. Seeds shared data readable by all
-- authenticated users (the weekly expert talks: one upcoming, one past). The
-- populated JUDGE DEMO ACCOUNT is created separately via scripts/seed-demo.mjs
-- (it needs the Auth admin API to make a real, paid, login-able user).

insert into expert_talks (id, title, starts_at, join_url, recording_url) values
  (
    '11111111-1111-1111-1111-111111111111',
    'Finding Your Voice: teaching when you feel unready',
    now() + interval '4 days',
    'https://meet.google.com/abc-defg-hij',
    null
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Your First Ten Clients: small, honest beginnings',
    now() - interval '5 days',
    null,
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  )
on conflict (id) do nothing;

-- Drop-in meetups — open rooms anyone can join (low-commitment peer support).
insert into circle_meetups (id, title, starts_at, host_name, join_url) values
  (
    '44444444-4444-4444-4444-444444444444',
    'Peer Support Circle — drop in & share where you are',
    now() + interval '2 days',
    'Laquelle',
    'https://meet.google.com/circle-meetup-001'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'Show & Tell — bring one thing you made this week',
    now() + interval '6 days',
    'Laquelle',
    'https://meet.google.com/circle-meetup-002'
  )
on conflict (id) do nothing;

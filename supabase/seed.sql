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

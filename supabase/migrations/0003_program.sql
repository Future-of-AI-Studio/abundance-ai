-- 0003_program.sql
-- Pillar 1: the built program, its modules, raw content, marketing, sessions, payouts.

create table programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Your program',
  status program_status not null default 'building',
  created_at timestamptz not null default now()
);
create index programs_user_id_idx on programs (user_id);

create table modules (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id) on delete cascade,
  idx integer not null,
  title text not null,
  outcome text not null default '',
  session_flow text not null default '',
  unique (program_id, idx)
);
create index modules_program_id_idx on modules (program_id);

create table content_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind content_kind not null,
  storage_path text not null,
  filename text not null,
  duration_sec integer,
  created_at timestamptz not null default now()
);
create index content_sources_user_id_idx on content_sources (user_id);

create table marketing_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  channel channel not null default 'social',
  caption text not null default '',
  hashtags text[] not null default '{}',
  posted boolean not null default false,
  created_at timestamptz not null default now()
);
create index marketing_posts_user_id_idx on marketing_posts (user_id);

create table sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  meet_link text,
  updated_at timestamptz not null default now()
);

-- The user's OWN Stripe Connect account (to receive their client payments).
-- AbundanceAI never holds these funds.
create table stripe_connect (
  user_id uuid primary key references auth.users (id) on delete cascade,
  connected boolean not null default false,
  account_id text,
  checklist jsonb not null default '{"bank": false, "id": false, "email": false}'::jsonb,
  updated_at timestamptz not null default now()
);

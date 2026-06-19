-- 0004_mindset_community.sql
-- Pillar 2 (mindset) and Pillar 3 (community), plus testimonials & refunds.

create table mindset_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  wall_key wall_key not null,
  prompt text not null,
  reflection text not null,
  user_note text,
  cache_hit boolean not null default false,
  created_at timestamptz not null default now()
);
create index mindset_checkins_user_id_idx on mindset_checkins (user_id);

-- 3/week cap (A4). One row per (user, ISO-week-start).
create table mindset_quota (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  count integer not null default 0,
  cap integer not null default 3,
  primary key (user_id, week_start)
);

-- Circles are matched MANUALLY in MVP (A3); the app only displays status + results.
create table circles (
  id uuid primary key default gen_random_uuid(),
  match_status match_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table circle_members (
  circle_id uuid not null references circles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category category not null,
  level member_level not null,
  fear_pattern fear_pattern not null,
  whatsapp_url text,
  meet_url text,
  primary key (circle_id, user_id)
);
create index circle_members_user_id_idx on circle_members (user_id);

-- Weekly expert talk — readable by ALL authenticated users (see RLS migration).
create table expert_talks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  join_url text,
  recording_url text
);
create index expert_talks_starts_at_idx on expert_talks (starts_at);

create table testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null,
  permission_granted boolean not null default false,
  created_at timestamptz not null default now()
);
create index testimonials_user_id_idx on testimonials (user_id);

create table refund_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status refund_status not null default 'requested',
  created_at timestamptz not null default now()
);
create index refund_requests_user_id_idx on refund_requests (user_id);

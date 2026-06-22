-- 0011_circle_meetups.sql
-- Scheduled, drop-in "open rooms" anyone can join — low-commitment peer support
-- (A3): no assigned team, no requirement to attend. Community-wide and readable
-- by ALL authenticated users (like expert_talks). Created by an operator in MVP.

create table circle_meetups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  host_name text not null,
  join_url text,
  created_at timestamptz not null default now()
);
create index circle_meetups_starts_at_idx on circle_meetups (starts_at);

alter table circle_meetups enable row level security;
create policy circle_meetups_select on circle_meetups for select
  using (auth.role() = 'authenticated');

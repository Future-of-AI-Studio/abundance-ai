-- 0025_program_views.sql
-- Page-view tracking for a program's public landing page (/p/:id), so the creator's
-- Home dashboard can show real "page views" and a view → enroll conversion rate.
--
-- Like enrollments, a landing page is public: views are recorded by a service-role
-- Edge Function (program-view-track), so we do NOT open public RLS on this table.
-- The creator reads their own views directly (RLS below). One row per page load —
-- this is a raw page-view count, not unique visitors.

create table program_views (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id) on delete cascade,
  -- Denormalized owner (= programs.user_id) so the creator's stats are a simple,
  -- index-backed RLS read without joining through programs (mirrors enrollments).
  creator_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index program_views_creator_id_idx on program_views (creator_id);
create index program_views_program_id_idx on program_views (program_id);
-- Powers the "this week" delta and total counts without a full scan.
create index program_views_creator_created_idx on program_views (creator_id, created_at desc);

-- The creator reads their own view counts. Inserts come only from the
-- program-view-track Edge Function (service role, bypasses RLS) — anonymous
-- visitors never get a direct insert grant.
alter table program_views enable row level security;
create policy program_views_select on program_views for select using (creator_id = auth.uid());

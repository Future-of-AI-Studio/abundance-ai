-- 0017_selling.sql
-- The sell-side of a program: a price on the program, and the buyers who enroll
-- through its public landing page.
--
-- A program's landing page (/p/:id) is public — anyone with the link can view it
-- and enroll. Views + enrollments are served by service-role Edge Functions
-- (program-public, enroll), so we do NOT open public RLS on programs/profiles.
-- The creator reads their own buyers directly (RLS below).

alter table programs add column price_cents integer not null default 14900;

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id) on delete cascade,
  -- Denormalized owner (= programs.user_id) so the creator's "Students" list is a
  -- simple, index-backed RLS read without joining through programs.
  creator_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  contact text not null default '',
  amount_cents integer not null default 0,
  status text not null default 'enrolled',
  created_at timestamptz not null default now()
);
create index enrollments_creator_id_idx on enrollments (creator_id);
create index enrollments_program_id_idx on enrollments (program_id);

-- The creator reads their own students. Inserts come only from the `enroll` Edge
-- Function (service role, which bypasses RLS) — buyers are anonymous and never
-- get a direct insert grant.
alter table enrollments enable row level security;
create policy enrollments_select on enrollments for select using (creator_id = auth.uid());

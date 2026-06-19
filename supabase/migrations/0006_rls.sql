-- 0006_rls.sql
-- Row Level Security: a user may select/insert/update/delete only their own rows.
-- expert_talks is readable by all authenticated users. ai_usage_logs + response_cache
-- are service-role only. service_role bypasses RLS, so Edge Functions using the
-- service key can still do privileged writes (webhook, AI logging, manual matching).

-- Helper: the circle_ids the current user belongs to. SECURITY DEFINER avoids
-- recursive RLS when circle_members policies reference the same table.
create or replace function public.user_circle_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select circle_id from circle_members where user_id = auth.uid();
$$;

-- ── profiles (keyed by id = auth.uid()) ──────────────────────────────────────
alter table profiles enable row level security;
create policy profiles_select on profiles for select using (id = auth.uid());
create policy profiles_insert on profiles for insert with check (id = auth.uid());
create policy profiles_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- ── orders (read-own; writes are service-role only via webhook) ───────────────
alter table orders enable row level security;
create policy orders_select on orders for select using (user_id = auth.uid());

-- ── journey_state ─────────────────────────────────────────────────────────────
alter table journey_state enable row level security;
create policy journey_all on journey_state for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── programs ──────────────────────────────────────────────────────────────────
alter table programs enable row level security;
create policy programs_all on programs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── modules (owned via parent program) ────────────────────────────────────────
alter table modules enable row level security;
create policy modules_all on modules for all
  using (exists (select 1 from programs p where p.id = modules.program_id and p.user_id = auth.uid()))
  with check (exists (select 1 from programs p where p.id = modules.program_id and p.user_id = auth.uid()));

-- ── content_sources ───────────────────────────────────────────────────────────
alter table content_sources enable row level security;
create policy content_sources_all on content_sources for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── marketing_posts ───────────────────────────────────────────────────────────
alter table marketing_posts enable row level security;
create policy marketing_posts_all on marketing_posts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── sessions ──────────────────────────────────────────────────────────────────
alter table sessions enable row level security;
create policy sessions_all on sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── stripe_connect ────────────────────────────────────────────────────────────
alter table stripe_connect enable row level security;
create policy stripe_connect_all on stripe_connect for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── mindset_checkins ──────────────────────────────────────────────────────────
alter table mindset_checkins enable row level security;
create policy mindset_checkins_all on mindset_checkins for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── mindset_quota ─────────────────────────────────────────────────────────────
alter table mindset_quota enable row level security;
create policy mindset_quota_all on mindset_quota for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── circles (a member can read their circle) ──────────────────────────────────
alter table circles enable row level security;
create policy circles_select on circles for select
  using (id in (select public.user_circle_ids()));

-- ── circle_members (a member can read everyone in their circle) ───────────────
alter table circle_members enable row level security;
create policy circle_members_select on circle_members for select
  using (user_id = auth.uid() or circle_id in (select public.user_circle_ids()));

-- ── expert_talks (readable by ALL authenticated users) ────────────────────────
alter table expert_talks enable row level security;
create policy expert_talks_select on expert_talks for select
  using (auth.role() = 'authenticated');

-- ── testimonials ──────────────────────────────────────────────────────────────
alter table testimonials enable row level security;
create policy testimonials_all on testimonials for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── refund_requests (read-own; create via Edge Function service role) ─────────
alter table refund_requests enable row level security;
create policy refund_requests_select on refund_requests for select using (user_id = auth.uid());

-- ── ai_usage_logs (service-role insert only; no user access) ──────────────────
alter table ai_usage_logs enable row level security;
-- (No policies → normal users cannot read/write; service_role bypasses RLS.)

-- ── response_cache (service-role only) ────────────────────────────────────────
alter table response_cache enable row level security;
-- (No policies → service-role only.)

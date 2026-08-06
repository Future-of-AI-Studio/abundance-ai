-- 0037_profile_slug.sql
-- Short, branded program URLs: abundanceai.net/laquelle instead of
-- abundanceai.net/p/1c0831ad-e00f-4af7-a624-535c724ea61c. The old form was 53
-- characters, unspeakable on a podcast and unprintable on a slide.
--
-- The slug lives on profiles, not programs, on purpose. A user keeps up to 8
-- builds with exactly one is_active (see program-build), and program-public only
-- checks status='ready' — so a /p/:uuid link is pinned to one build and keeps
-- serving the OLD one after a rebuild. Resolving /:slug -> profile -> active
-- build means a link already shared never goes stale.
--
-- Generated once and never regenerated: renaming yourself in Account must not
-- break a link already printed on a flyer.

alter table profiles add column if not exists slug text;

-- Nulls are unique to each other in Postgres, so this tolerates the window
-- between the column being added and the backfill at the bottom of this file.
create unique index if not exists profiles_slug_key on profiles (slug);

-- 2-40 chars, lowercase alphanumeric with internal hyphens. This must agree with
-- SLUG_RE in apps/web/api/_lib/program.ts and the rewrite regex in
-- apps/web/vercel.json — if the three drift, a valid slug becomes unroutable.
alter table profiles drop constraint if exists profiles_slug_format;
alter table profiles add constraint profiles_slug_format
  check (slug is null or slug ~ '^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$');

-- ── slug generation ───────────────────────────────────────────────────────────

-- A slug that would shadow a real route. Must stay in step with the public routes
-- in apps/web/src/App.tsx and the passthrough rules in apps/web/vercel.json.
create or replace function public.reserved_slug(s text)
returns boolean language sql immutable as $$
  select s = any (array[
    'app', 'api', 'p', 'auth', 'checkout', 'welcome', 'gallery', 'faq',
    'privacy', 'terms', 'cookies', 'delivery', 'refunds', 'reset-password',
    'assets', 'admin', 'about', 'contact', 'help', 'login', 'signup',
    'pricing', 'blog', 'support', 'index', 'www'
  ]);
$$;

-- The name reduced to slug characters, before any uniqueness suffix.
--
-- profiles.first_name is a free-text "Name" field, so it usually holds a full
-- name. Slugifying the whole value is the main collision defence — two full
-- names rarely clash, and only single-word names realistically fall through to a
-- numeric suffix. There is no last-name column to disambiguate with.
--
-- A name with no Latin characters reduces to nothing (there is no unaccent
-- extension in this project); those become 'guide', then 'guide-2' via the
-- uniqueness loop, rather than producing an invalid slug.
create or replace function public.slugify_name(p_name text)
returns text language sql immutable as $$
  select case when length(b) < 2 then 'guide' else b end
  from (
    select trim(both '-' from left(
      trim(both '-' from regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g')),
      32
    )) as b
  ) t;
$$;

-- The first free slug for this name: 'james', then 'james-2', 'james-3', ...
--
-- security definer because the uniqueness check has to see EVERY profile, and
-- RLS hides other users' rows from a user-context caller — without it two
-- mentors named James would both be handed 'james' and trip the unique index.
create or replace function public.generate_profile_slug(p_name text)
returns text language plpgsql security definer set search_path = public as $$
declare
  base text := public.slugify_name(p_name);
  candidate text := base;
  n integer := 1;
begin
  while public.reserved_slug(candidate)
     or exists (select 1 from profiles where slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end;
$$;

-- ── sign-up ───────────────────────────────────────────────────────────────────

-- Unchanged from 0008_triggers.sql except for the slug on the profile insert.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  paid_order_id uuid;
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  fname text := coalesce(nullif(meta->>'first_name', ''), 'Friend');
  cat category := coalesce((meta->>'category')::category, 'other');
begin
  select id into paid_order_id
  from orders
  where lower(email) = lower(new.email) and status = 'paid'
  order by created_at desc
  limit 1;

  if paid_order_id is null then
    raise exception 'payment_required: no paid order found for this email'
      using errcode = 'check_violation';
  end if;

  update orders set user_id = new.id
  where id = paid_order_id and user_id is null;

  -- generate_profile_slug checks for a free slug and returns it, so two people
  -- with the same name signing up in the same instant can both be handed 'james'
  -- before either row lands, and the loser hits profiles_slug_key. Their order is
  -- already PAID by this point, so retry with a freshly-picked slug rather than
  -- failing the signup — the second attempt sees the first row and picks 'james-2'.
  for attempt in 1..5 loop
    begin
      insert into profiles (id, first_name, email, category, slug)
      values (new.id, fname, new.email, cat, public.generate_profile_slug(fname))
      on conflict (id) do nothing;
      exit;
    exception when unique_violation then
      if attempt = 5 then raise; end if;
    end;
  end loop;

  insert into journey_state (user_id) values (new.id) on conflict do nothing;
  insert into sessions (user_id) values (new.id) on conflict do nothing;
  insert into stripe_connect (user_id) values (new.id) on conflict do nothing;

  return new;
end;
$$;

-- ── backfill ──────────────────────────────────────────────────────────────────

-- Row by row, not a set-based UPDATE: generate_profile_slug reads profiles, and
-- inside a single UPDATE every row would see the same pre-update snapshot, so
-- two profiles named "James" would both resolve to 'james'.
--
-- Ordered by created_at so the longest-standing mentor keeps the clean slug.
-- Anyone who lands on a suffix is named in a notice — that list is who to offer
-- scripts/migrate/set-profile-slug.mjs to.
do $$
declare
  r record;
  s text;
  suffixed integer := 0;
  total integer := 0;
begin
  for r in select id, first_name, email from profiles where slug is null order by created_at loop
    s := public.generate_profile_slug(r.first_name);
    update profiles set slug = s where id = r.id;
    total := total + 1;
    if s <> public.slugify_name(r.first_name) then
      suffixed := suffixed + 1;
      raise notice 'slug collision: % (%) -> %', r.first_name, r.email, s;
    end if;
  end loop;
  raise notice 'profile slug backfill: % profiles, % suffixed', total, suffixed;
end $$;

-- 0038_fix_signup_payment_gate.sql
-- Repairs a regression in 0037_profile_slug.sql that broke ALL sign-ups with
-- "Database error saving new user".
--
-- 0037 rewrote handle_new_user starting from the 0008 body ("Unchanged from
-- 0008_triggers.sql except for the slug") rather than the current 0022 body.
-- 0008 predates account-first onboarding, so the rewrite silently resurrected
-- three behaviours that 0012 and 0022 had removed or added:
--
--   1. The pay-before-account gate — `raise exception 'payment_required'` when no
--      PAID order exists for the email. Since 0012 nobody has a paid order at
--      sign-up time, so every new account aborted. The exception propagates out
--      of the AFTER INSERT trigger on auth.users, and GoTrue reports any such
--      failure as the generic {"code":"unexpected_failure","message":"Database
--      error saving new user"}. This is the outage.
--   2. `category_other` on the profile insert (added 0022) — dropped, so the
--      free-text label for category='other' was discarded at sign-up.
--   3. The profiles.paid_at stamp for a pre-existing paid order (added 0012) —
--      dropped, so a guest who checked out before creating an account never got
--      /app unlocked.
--
-- The body below is 0022's, with 0037's slug generation threaded into the insert.
-- Do NOT reintroduce the payment gate: paid access is governed by
-- profiles.paid_at, not by whether an account may be created.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  paid_order record;
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  fname text := coalesce(nullif(meta->>'first_name', ''), 'Friend');
  cat category := coalesce((meta->>'category')::category, 'other');
  cat_other text := case when cat = 'other' then nullif(trim(meta->>'category_other'), '') end;
begin
  -- generate_profile_slug picks the first free slug and returns it, so two people
  -- with the same name signing up in the same instant can both be handed 'james'
  -- before either row lands, and the loser hits profiles_slug_key. Retry rather
  -- than fail the sign-up — the second attempt sees the first row and picks
  -- 'james-2'. The slug expression is inside the loop so it is re-evaluated.
  for attempt in 1..5 loop
    begin
      insert into profiles (id, first_name, email, category, category_other, slug)
      values (new.id, fname, new.email, cat, cat_other,
              public.generate_profile_slug(fname))
      on conflict (id) do nothing;
      exit;
    exception when unique_violation then
      if attempt = 5 then raise; end if;
    end;
  end loop;

  insert into journey_state (user_id) values (new.id) on conflict do nothing;
  insert into sessions (user_id) values (new.id) on conflict do nothing;
  insert into stripe_connect (user_id) values (new.id) on conflict do nothing;

  -- Guest checkout before account creation: link the order and unlock /app.
  select id, created_at into paid_order
  from orders
  where lower(email) = lower(new.email) and status = 'paid'
  order by created_at desc
  limit 1;

  if paid_order.id is not null then
    update orders set user_id = new.id where id = paid_order.id and user_id is null;
    update profiles set paid_at = coalesce(paid_at, paid_order.created_at) where id = new.id;
  end if;

  return new;
end;
$$;

-- ── repair accounts created while 0037 was live ───────────────────────────────
--
-- Failed sign-ups need no cleanup: the trigger is AFTER INSERT in the same
-- transaction, so a raised exception rolled the auth.users row back and no
-- partial account exists. The accounts that DID get created are the damaged
-- ones — under 0037's gate a paid order was required to sign up at all, yet
-- 0037's body never stamped paid_at. So every account created in that window
-- belongs to someone who has paid and is currently locked out of /app.

-- 1. Stamp paid_at from any paid order matching the profile's email.
update profiles p
set paid_at = o.created_at
from orders o
where o.status = 'paid'
  and lower(o.email) = lower(p.email)
  and p.paid_at is null;

-- 2. Recover category_other. The value was never written to profiles, but the
--    sign-up metadata it came from still lives on auth.users.
update profiles p
set category_other = nullif(trim(u.raw_user_meta_data->>'category_other'), '')
from auth.users u
where u.id = p.id
  and p.category = 'other'
  and p.category_other is null
  and nullif(trim(u.raw_user_meta_data->>'category_other'), '') is not null;

do $$
declare
  unpaid integer;
begin
  select count(*) into unpaid from profiles where paid_at is null;
  raise notice 'signup trigger repaired; % profiles still have no paid_at', unpaid;
end $$;

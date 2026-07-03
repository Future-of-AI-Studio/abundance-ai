-- 0012_account_first.sql
-- Switch from "pay-before-account" to account-first onboarding. Anyone can create
-- an account; paid access is gated in the app via profiles.paid_at, which is
-- stamped when a Stripe order for that user becomes paid. orders remains the
-- source of truth for payment (Stripe + webhook / verify); paid_at is the
-- denormalized flag the frontend reads to unlock /app.

-- 1. Denormalized paid flag on the profile (null = has not paid yet).
alter table profiles add column if not exists paid_at timestamptz;

-- 2. Backfill any existing profiles that already have a paid order.
update profiles p
set paid_at = o.created_at
from orders o
where o.status = 'paid'
  and lower(o.email) = lower(p.email)
  and p.paid_at is null;

-- 3. Sign-up no longer requires a paid order. handle_new_user now just bootstraps
--    the profile + per-user singleton rows. If a paid order already exists for the
--    email (guest checkout before creating the account) it links it and marks paid.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  paid_order record;
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  fname text := coalesce(nullif(meta->>'first_name', ''), 'Friend');
  cat category := coalesce((meta->>'category')::category, 'other');
begin
  insert into profiles (id, first_name, email, category)
  values (new.id, fname, new.email, cat)
  on conflict (id) do nothing;

  insert into journey_state (user_id) values (new.id) on conflict do nothing;
  insert into sessions (user_id) values (new.id) on conflict do nothing;
  insert into stripe_connect (user_id) values (new.id) on conflict do nothing;

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

-- 4. When an order becomes paid (inserted-as-paid by the seed, or flipped by the
--    webhook / verify), link it to the matching user and stamp profiles.paid_at.
create or replace function public.on_order_paid()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and (old.status is distinct from 'paid') then
    if new.user_id is null then
      select id into new.user_id from auth.users where lower(email) = lower(new.email) limit 1;
    end if;
    update profiles
      set paid_at = coalesce(paid_at, now())
      where id = new.user_id or lower(email) = lower(new.email);
  end if;
  return new;
end;
$$;

drop trigger if exists orders_on_paid on orders;
create trigger orders_on_paid
  before insert or update on orders
  for each row execute function public.on_order_paid();

-- 0008_triggers.sql
-- The $25 gate, profile bootstrap, and updated_at maintenance.

-- ── updated_at maintenance ────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger journey_state_touch before update on journey_state
  for each row execute function public.touch_updated_at();
create trigger sessions_touch before update on sessions
  for each row execute function public.touch_updated_at();
create trigger stripe_connect_touch before update on stripe_connect
  for each row execute function public.touch_updated_at();

-- ── The $25 gate + profile bootstrap ──────────────────────────────────────────
-- Runs when a new auth user is created (sign-up). Blocks account creation unless
-- a PAID order exists for that email (the $25 gate). On success: links the order
-- to the user, creates the profile from sign-up metadata, and seeds the
-- per-user singleton rows (journey_state, sessions, stripe_connect).
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

  insert into profiles (id, first_name, email, category)
  values (new.id, fname, new.email, cat)
  on conflict (id) do nothing;

  insert into journey_state (user_id) values (new.id) on conflict do nothing;
  insert into sessions (user_id) values (new.id) on conflict do nothing;
  insert into stripe_connect (user_id) values (new.id) on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

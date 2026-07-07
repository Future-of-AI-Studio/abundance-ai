-- 0022_category_other.sql
-- Free-text companion to the `category` enum. When a user picks 'other' at
-- signup we keep category='other' (structured, phase-portable per A3) AND stash
-- what they typed here, so the label survives without loosening the enum. Null
-- for every non-'other' category.
alter table profiles add column if not exists category_other text;

-- Re-seed the profile bootstrap so the trigger also carries category_other from
-- sign-up metadata. Only meaningful when category='other'; otherwise it stays null.
-- NB: this is the account-first body from 0012 (no payment gate — paid access is
-- governed by profiles.paid_at) with category_other threaded through; do NOT
-- reintroduce the old pay-before-account exception.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  paid_order record;
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  fname text := coalesce(nullif(meta->>'first_name', ''), 'Friend');
  cat category := coalesce((meta->>'category')::category, 'other');
  cat_other text := case when cat = 'other' then nullif(trim(meta->>'category_other'), '') end;
begin
  insert into profiles (id, first_name, email, category, category_other)
  values (new.id, fname, new.email, cat, cat_other)
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

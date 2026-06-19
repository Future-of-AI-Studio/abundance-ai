-- 0002_core_user.sql
-- Identity, the $25 order, and journey progress.

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  email text not null,
  avatar_url text,
  category category not null default 'other',
  created_at timestamptz not null default now()
);

-- The $25 sign-up. Created at checkout (user_id null until account exists);
-- the webhook flips status to 'paid'. is_related_party flags family/team test
-- buys so arms-length revenue can be reported separately for submission evidence.
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  stripe_payment_intent text unique,
  amount_cents integer not null default 2500,
  status order_status not null default 'created',
  is_related_party boolean not null default false,
  created_at timestamptz not null default now()
);
create index orders_email_idx on orders (email);
create index orders_user_id_idx on orders (user_id);

create table journey_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  path journey_path,
  current_step journey_step,
  completed_steps jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

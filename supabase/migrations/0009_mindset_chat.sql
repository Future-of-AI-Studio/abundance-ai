-- 0009_mindset_chat.sql
-- Conversational mindset: free-form, multi-turn AI chat (persisted threads) that
-- sits alongside the existing one-shot wall check-ins. On wrap-up, a chat is
-- distilled into a regular mindset_checkins reflection (auto-classified wall),
-- so the existing dashboard history keeps reflecting what the user is feeling.

-- Chat AI calls are logged to ai_usage_logs like every other Gemini call.
-- NB: a new enum value cannot be USED in the same transaction it is added in.
-- Nothing below inserts a 'mindset-chat' row (that happens at runtime in the
-- Edge Function, a separate transaction), so adding it here is safe.
alter type ai_feature add value if not exists 'mindset-chat';

-- A persisted chat thread. wall_key is null until a reflection is derived on
-- wrap-up, at which point it records the wall the conversation surfaced.
create table mindset_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  wall_key wall_key,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index mindset_conversations_user_id_idx on mindset_conversations (user_id, last_message_at desc);

-- Individual turns. role is 'user' | 'assistant'. user_id is denormalised so RLS
-- and the daily message cap can scope by user without a join.
create table mindset_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references mindset_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index mindset_messages_conversation_idx on mindset_messages (conversation_id, created_at);
create index mindset_messages_daily_cap_idx on mindset_messages (user_id, created_at);

-- Link a derived reflection back to its source conversation (nullable: wall-picker
-- check-ins have no conversation).
alter table mindset_checkins
  add column conversation_id uuid references mindset_conversations (id) on delete set null;

-- ── RLS (mirror mindset_checkins_all: a user may only touch their own rows) ────
alter table mindset_conversations enable row level security;
create policy mindset_conversations_all on mindset_conversations for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table mindset_messages enable row level security;
create policy mindset_messages_all on mindset_messages for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

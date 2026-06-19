-- 0005_ai_infra.sql
-- AI evidence + cost control. ai_usage_logs is the required submission evidence
-- ("API usage records, agent execution logs"). response_cache backs cached
-- mindset/common AI responses to keep latency + cost low (A4).

create table ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  feature ai_feature not null,
  model text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  latency_ms integer not null default 0,
  cache_hit boolean not null default false,
  created_at timestamptz not null default now()
);
create index ai_usage_logs_created_at_idx on ai_usage_logs (created_at);
create index ai_usage_logs_feature_idx on ai_usage_logs (feature);

-- Keyed by (feature, cache_key). For mindset, cache_key = wall_key (+ category).
create table response_cache (
  feature text not null,
  cache_key text not null,
  value jsonb not null,
  created_at timestamptz not null default now(),
  primary key (feature, cache_key)
);

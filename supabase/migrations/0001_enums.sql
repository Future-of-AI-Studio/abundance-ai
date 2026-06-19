-- 0001_enums.sql
-- Structured vocabulary of the data model. Phase-portability (spec A3):
-- category / member_level / fear_pattern are enums (never free text) so a future
-- automated matching engine ingests them with no rebuild.

-- NB: `path` is a built-in Postgres geometric type, so the enum must be named
-- distinctly or the column silently binds to pg_catalog.path.
create type journey_path as enum ('A', 'B');
create type program_status as enum ('building', 'ready', 'failed');
create type category as enum ('healer', 'hobbyist', 'professional', 'other');
create type member_level as enum ('starting', 'stalled', 'growing', 'scaling');
create type fear_pattern as enum ('impostor', 'visibility', 'pricing', 'tech', 'consistency', 'comparison');
create type channel as enum ('social', 'email');
create type match_status as enum ('pending', 'matched');
create type order_status as enum ('created', 'paid', 'refunded', 'failed');
create type content_kind as enum ('file', 'voice');
create type refund_status as enum ('requested', 'approved', 'denied', 'out_of_window');
create type ai_feature as enum ('program-build', 'marketing-generate', 'mindset-checkin');
create type journey_step as enum ('path', 'content', 'building', 'program', 'marketing', 'sessions', 'payments');
create type wall_key as enum (
  'who-am-i-to-teach',
  'fear-of-being-seen',
  'charging-money',
  'tech-overwhelm',
  'staying-consistent',
  'comparing-myself'
);

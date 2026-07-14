-- 0028_marketing_rounds.sql
-- Marketing generation is append-only: each generate call creates a new numbered
-- round within its phase, and earlier rounds (with the user's edits, favorites
-- and posted flags) are never replaced. A monthly cap of 8 rounds per user is
-- enforced in the marketing-generate function.

alter table marketing_posts add column round integer not null default 1;

-- 0020_program_versions.sql
-- Rebuilds are now non-destructive: each rebuild creates a NEW program (build)
-- instead of deleting the prior one, and the user picks which build is "active".
-- The active build is the one the whole app reads as "your program" (dashboard,
-- pricing, share link, students).
--
-- `is_active` marks that build. A partial unique index guarantees at most one
-- active build per user at the database level, so the invariant can't drift no
-- matter how the app writes. Existing single programs backfill to active via the
-- column default (each user has exactly one row today, so the index is satisfied).
alter table programs add column is_active boolean not null default true;

create unique index programs_one_active_per_user on programs (user_id) where is_active;

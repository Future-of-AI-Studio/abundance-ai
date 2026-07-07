-- 0023_profile_bio.sql
-- Creator bio — the self-written introduction shown in the "Meet your guide"
-- section of the public program landing page. Null until the creator writes one,
-- in which case the landing page falls back to a generated blurb.
alter table profiles add column if not exists bio text;

-- 0010_session_platform.sql
-- Live sessions are no longer Google-Meet-only: the host picks a video tool.
-- `sessions.meet_link` keeps its name (back-compat) but now holds the URL for
-- whichever platform is selected.

create type meeting_platform as enum ('google_meet', 'zoom', 'teams', 'other');

alter table sessions
  add column platform meeting_platform not null default 'google_meet';

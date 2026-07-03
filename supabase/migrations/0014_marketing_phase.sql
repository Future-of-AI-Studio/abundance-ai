-- 0014_marketing_phase.sql
-- Marketing content is now a multi-stage library: each post belongs to a launch
-- phase (just starting → ongoing → after launch), so the user can build up weeks
-- of content and regenerate one stage without losing the others.

create type marketing_phase as enum ('launch', 'ongoing', 'evergreen');

alter table marketing_posts add column phase marketing_phase not null default 'launch';

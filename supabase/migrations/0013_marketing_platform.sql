-- 0013_marketing_platform.sql
-- Per-platform marketing posts. Each social post is tailored for a specific
-- network (Facebook / Instagram / X / LinkedIn); email posts have platform null.

create type social_platform as enum ('facebook', 'instagram', 'x', 'linkedin');

alter table marketing_posts add column platform social_platform;

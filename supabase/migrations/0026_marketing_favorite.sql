-- 0026_marketing_favorite.sql
-- Users can star generated marketing copy they want to keep, so their favorites
-- stand out from the rest of the multi-option library.

alter table marketing_posts add column favorited boolean not null default false;

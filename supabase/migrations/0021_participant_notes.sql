-- 0021_participant_notes.sql
-- Per-module "Notes for Participants": short, bulleted reminders written FOR the
-- learner (one bullet per line), distinct from "notes" which is private delivery
-- guidance for the expert.

alter table modules add column participant_notes text not null default '';

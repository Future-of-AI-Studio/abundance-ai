-- 0015_module_detail.sql
-- Premium program output: each module carries a full detailed explanation
-- ("detail") and optional delivery notes ("notes"), not just a one-line
-- outcome + session flow.

alter table modules add column detail text not null default '';
alter table modules add column notes text not null default '';

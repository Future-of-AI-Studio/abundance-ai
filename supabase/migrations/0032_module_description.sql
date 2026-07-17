-- 0032_module_description.sql
-- Short per-module blurb the expert writes on the Program page, shown under the
-- module title. Length is capped (160 chars) at the API boundary, not here, so
-- the limit can move without a migration.
alter table modules add column description text not null default '';

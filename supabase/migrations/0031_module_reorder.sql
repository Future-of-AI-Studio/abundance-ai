-- 0031_module_reorder.sql
-- Reordering modules swaps idx values between existing rows. The
-- unique (program_id, idx) constraint was checked per row, so any swap
-- (row-by-row upserts, or even one multi-row statement) hit a transient
-- collision and failed. Defer the check to commit so a whole reorder can
-- land atomically. The primary key stays immediate, so ON CONFLICT (id)
-- upserts are unaffected.
alter table modules drop constraint modules_program_id_idx_key;
alter table modules add constraint modules_program_id_idx_key
  unique (program_id, idx) deferrable initially deferred;

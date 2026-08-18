-- content_sources.bytes — the uploaded file's size.
--
-- content-upload-url already receives this as size_bytes (it's what enforces the
-- 50 MB per-file limit) and previously discarded it. Storage still knows the real
-- size, and the server keeps reading it from the object listing when it enforces a
-- build's media budget, so this column is not the authority.
--
-- It exists so the UPLOAD SCREEN can show how much of that budget is used BEFORE a
-- user runs into it: the browser has no other way to learn the size of a file that
-- was uploaded earlier in a previous session.
--
-- Nullable on purpose. Rows created before this migration have no size recorded,
-- and callers must treat null as "unknown" rather than as zero.
alter table content_sources add column if not exists bytes bigint;

-- Backfill from what Storage already knows, so the upload screen reports correctly
-- for libraries that predate the column. Without this, existing files read as 0 MB
-- and the screen OVERSTATES the room left.
--
-- Best-effort: wrapped so a permissions or schema surprise around storage.objects
-- logs a notice instead of failing the migration. The column is display-only, and
-- content-upload-url still enforces the budget from the live object listing, so an
-- incomplete backfill costs accuracy on one caption and nothing else. Re-runnable:
-- `bytes is null` means already-filled rows are left alone.
do $$
begin
  update content_sources cs
  set bytes = (o.metadata->>'size')::bigint
  from storage.objects o
  where o.bucket_id = 'content'
    and o.name = cs.storage_path
    and cs.bytes is null;
exception when others then
  raise notice 'content_sources.bytes backfill skipped: %', sqlerrm;
end $$;

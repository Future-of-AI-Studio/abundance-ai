-- 0007_storage.sql
-- Private `content` bucket for uploads (files + recorded audio). 50 MB limit,
-- type allowlist. Objects are stored under `{user_id}/...` and are readable/
-- writable only by their owner. Signed upload URLs are issued by an Edge Function.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content',
  'content',
  false,
  52428800, -- 50 MB
  array[
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
on conflict (id) do nothing;

-- Owner-only access, scoped by the first path segment = the user's uid.
create policy "content_owner_select" on storage.objects for select
  using (bucket_id = 'content' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "content_owner_insert" on storage.objects for insert
  with check (bucket_id = 'content' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "content_owner_update" on storage.objects for update
  using (bucket_id = 'content' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "content_owner_delete" on storage.objects for delete
  using (bucket_id = 'content' and (storage.foldername(name))[1] = auth.uid()::text);

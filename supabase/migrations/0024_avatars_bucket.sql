-- 0024_avatars_bucket.sql
-- Public `avatars` bucket for profile pictures. Unlike `content` (private,
-- signed URLs), avatars are shown to anonymous visitors on the public program
-- landing page, so the bucket is public-read. Writes stay owner-only, scoped by
-- the first path segment = the user's uid (same pattern as `content`).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Anyone can read an avatar (it's shown on the public landing page).
create policy "avatars_public_read" on storage.objects for select
  using (bucket_id = 'avatars');

-- Only the owner can write/replace/remove their own avatar.
create policy "avatars_owner_insert" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_update" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_delete" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

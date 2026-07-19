-- 0033_guides_bucket.sql
-- Public `guides` bucket for app-owned guidance media (video guides on the
-- Guidance page, and future posters/banners). Unlike `content` (per-user,
-- private) this is our own static content: public-read, and no client write
-- policies at all — uploads happen via the dashboard or service role, which
-- bypass RLS.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'guides',
  'guides',
  true,
  209715200, -- 200 MB
  array['video/mp4', 'video/webm', 'image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;

-- Anyone can read a guide video (the Guidance page is behind auth, but the
-- media itself is not sensitive).
create policy "guides_public_read" on storage.objects for select
  using (bucket_id = 'guides');

-- 0016_content_bucket_types.sql
-- Align the content bucket's allowlist with what the app accepts and Gemini can
-- actually read inline: PDF, plain text (typed/pasted notes), images, and the
-- recorder's audio formats. Word docs and video are out (Gemini can't analyze
-- them via the API); images were missing from the original 0007 list even
-- though the client and content-upload-url accept them.
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'text/plain',
  'image/png', 'image/jpeg', 'image/webp',
  'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm'
]
where id = 'content';

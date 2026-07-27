-- 0036_content_transcript.sql
-- Store a transcript for each audio content_source. Recordings are transcribed
-- once (at upload time via the content-transcribe function; program-build backfills
-- any that are missing), so program-build can feed the model plain TEXT instead of
-- base64-encoding and inlining large audio on every build. That base64 + big-inline
-- work was blowing the Edge Runtime's CPU limit for users with lots of recordings
-- (WORKER_LIMIT) — transcripts keep the build hot path light and let it scale to the
-- full 60 min of voice input the UI allows.
alter table content_sources add column if not exists transcript text;

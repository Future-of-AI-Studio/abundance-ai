// content-upload-url — issue a signed upload URL for the private `content` bucket.
// Validates type + 50 MB limit, records a content_sources row, returns the signed
// URL the client PUTs the bytes to. Objects are stored under {user_id}/... so the
// storage RLS policy keeps them readable only by their owner.
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, contentUploadRequestSchema } from '../_shared/contract.ts';
import { requireUser, adminClient } from '../_shared/supabase.ts';

// Documents the model can analyze inline (PDF + images), plus the audio formats
// the in-app recorder produces (WAV normalized client-side; others as fallback).
// Word docs and video are intentionally excluded — Gemini can't read them.
const ACCEPTED = new Set([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/webp',
  'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const user = await requireUser(req);
    const body = await parseBody(req, contentUploadRequestSchema);

    if (!ACCEPTED.has(body.content_type)) {
      return errorResponse(
        'bad_type',
        "That file type isn't supported. Try a document, audio, or video file — or just record instead.",
        400,
        'file',
      );
    }

    const admin = adminClient();
    const safeName = body.filename.replace(/[^\w.\-]+/g, '_').slice(0, 120);
    const objectPath = `${user.id}/${crypto.randomUUID()}-${safeName}`;

    const { data: signed, error: signErr } = await admin.storage
      .from('content')
      .createSignedUploadUrl(objectPath);
    if (signErr || !signed) {
      return errorResponse('upload_url_failed', 'Could not start the upload. Please try again.', 502);
    }

    const { data: source, error: insErr } = await admin
      .from('content_sources')
      .insert({
        user_id: user.id,
        kind: body.kind,
        storage_path: objectPath,
        filename: body.filename,
        duration_sec: body.duration_sec ?? null,
      })
      .select('id')
      .single();
    if (insErr || !source) {
      return errorResponse('source_insert_failed', 'Could not save that item. Please try again.', 502);
    }

    return json({
      content_source_id: source.id,
      storage_path: objectPath,
      signed_url: signed.signedUrl,
      token: signed.token,
    });
  } catch (err) {
    return handleThrown(err);
  }
});

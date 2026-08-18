// content-upload-url — issue a signed upload URL for the private `content` bucket.
// Validates type + 50 MB limit, records a content_sources row, returns the signed
// URL the client PUTs the bytes to. Objects are stored under {user_id}/... so the
// storage RLS policy keeps them readable only by their owner.
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, contentUploadRequestSchema } from '../_shared/contract.ts';
import { requireUser, adminClient } from '../_shared/supabase.ts';
import {
  MAX_BUILD_DOCS, MEDIA_CAP_ENCODED, encodedSize, isDocument, objectSizes,
} from '../_shared/limits.ts';

// Documents the model can analyze inline (PDF + images + plain text — typed or
// pasted notes are stored as .txt), plus the audio formats the in-app recorder
// produces (WAV normalized client-side; others as fallback).
// Word docs and video are intentionally excluded — Gemini can't read them.
const ACCEPTED = new Set([
  'application/pdf',
  'text/plain',
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
        "That file type isn't supported. Upload a PDF, image, or plain text file — or type or record it instead.",
        400,
        'file',
      );
    }

    const admin = adminClient();

    // Refuse a document once the user already holds everything a build can read,
    // instead of accepting a file program-build would then have to leave out. Only
    // documents are capped: notes are tiny, recordings have their own duration
    // limits, and neither costs a build a storage read. Limits live in
    // _shared/limits.ts so this and program-build can never disagree.
    if (isDocument(body.filename)) {
      const { data: existing } = await admin
        .from('content_sources')
        .select('filename, storage_path')
        .eq('user_id', user.id);
      const documents = (existing ?? []).filter((s) => isDocument(s.filename as string));

      if (documents.length >= MAX_BUILD_DOCS) {
        return errorResponse(
          'document_limit',
          `A build reads up to ${MAX_BUILD_DOCS} documents and you've already added that many. Remove one to make room for this file.`,
          400,
          'file',
        );
      }

      // Byte budget. Sizes come from the object listing, so an object that isn't
      // listed or carries no size simply doesn't count toward the total — an
      // incomplete listing can never reject an upload that should be allowed.
      const sizes = await objectSizes(admin, user.id);
      let usedEncoded = 0;
      for (const s of documents) {
        const bytes = sizes.get(s.storage_path as string);
        if (typeof bytes === 'number') usedEncoded += encodedSize(bytes);
      }
      // size_bytes is already part of the request (and is what enforces the 50 MB
      // per-file limit via the schema), so we can reject a file that WOULD overflow
      // rather than only one arriving at an already-full budget.
      if (usedEncoded + encodedSize(body.size_bytes) > MEDIA_CAP_ENCODED) {
        const freeMb = Math.floor((((MEDIA_CAP_ENCODED - usedEncoded) * 3) / 4) / (1024 * 1024));
        return errorResponse(
          'document_limit',
          freeMb > 0
            ? `That file won't fit in what a build can read - about ${freeMb} MB of room is left. Remove a document, or add a smaller file.`
            : 'Your documents already fill what a build can read. Remove one to make room for this file.',
          400,
          'file',
        );
      }
    }

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

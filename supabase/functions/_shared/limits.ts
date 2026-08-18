// What one build can take in from uploaded documents, in one place.
//
// Two functions need these numbers and they must not drift: content-upload-url
// refuses an upload once a user is already at a limit, and program-build selects
// which documents to read. If they disagreed, a user could upload a file the
// build would then silently ignore — the exact failure this replaces.
//
// Mirrored on the frontend by MAX_BUILD_DOCUMENTS / MAX_BUILD_DOCUMENT_BYTES in
// packages/shared/src/supabase.ts (the Deno side keeps its own copy of shared
// contracts, as _shared/contract.ts already does).
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * How many documents one build reads. This is a ROUND-TRIP ceiling: every file
 * costs a storage read, and a sequential pass over a large library ran the
 * request past the Edge Runtime limit — the isolate was killed after the Gemini
 * call had already succeeded, leaving the program stuck at 'building'.
 */
export const MAX_BUILD_DOCS = 24;

/**
 * Vertex caps the whole generateContent request at ~20 MB, and inlineData is
 * base64 (×4/3 inflation), so the budget counts ENCODED bytes with headroom for
 * the prompt text and JSON overhead. 18 MB encoded ≈ 13.5 MB of raw file.
 */
export const MEDIA_CAP_ENCODED = 18 * 1024 * 1024;

/** Encoded (base64) size of `rawBytes` on the wire. */
export const encodedSize = (rawBytes: number) => Math.ceil(rawBytes / 3) * 4;

/**
 * Documents the model can analyze inline, keyed strictly off the filename
 * extension so we never mislabel bytes.
 */
export function inlineDocMime(ext: string): string | null {
  const byExt: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  };
  return byExt[ext] ?? null;
}

/** True when this filename is one of the inline documents the caps apply to. */
export function isDocument(filename: string): boolean {
  return inlineDocMime((filename.split('.').pop() ?? '').toLowerCase()) !== null;
}

/**
 * storage_path → byte size for everything a user has stored, so callers can weigh
 * files without downloading them. Uploads land at `${user_id}/${uuid}-${name}`
 * (content-upload-url), so one listing per user covers them all.
 *
 * Best-effort by design: a listing failure, or an object whose metadata carries no
 * size, simply leaves that path absent from the map. Callers treat an absent entry
 * as unknown rather than as zero, so a listing outage degrades behavior instead of
 * breaking or wrongly rejecting an upload.
 */
export async function objectSizes(
  admin: SupabaseClient,
  userId: string,
): Promise<Map<string, number>> {
  const sizes = new Map<string, number>();
  const PAGE = 100;
  // list() pages at 100 by default; the walk is bounded so a surprising response
  // can never spin here.
  for (let page = 0; page < 25; page++) {
    const { data, error } = await admin.storage
      .from('content')
      .list(userId, { limit: PAGE, offset: page * PAGE });
    if (error) {
      console.warn(`limits: object listing failed (${error.message}); sizes unknown`);
      break;
    }
    if (!data || data.length === 0) break;
    for (const o of data) {
      const size = (o as { metadata?: { size?: number } | null }).metadata?.size;
      if (typeof size === 'number') sizes.set(`${userId}/${o.name}`, size);
    }
    if (data.length < PAGE) break;
  }
  return sizes;
}

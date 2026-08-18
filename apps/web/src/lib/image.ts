// Downscale oversized images in the browser, before they're uploaded.
//
// Gemini bills a flat ~258 tokens for an image regardless of its resolution, so a
// print-resolution original tells the model nothing a 1600px version doesn't —
// while costing upload time, storage, and, most expensively, a share of
// program-build's inline-media budget that starves every later document.
//
// This has to happen here: the browser PUTs bytes straight to Storage via the
// signed URL from content-upload-url, so no server of ours ever sees the file.
// (Node image libraries like sharp are not an option for the same reason, and
// wouldn't load in Deno or Edge runtime anyway.)
//
// The encoded type is preserved — JPEG stays JPEG, PNG stays PNG — because
// program-build keys its MIME strictly off the filename extension, so a PNG
// re-encoded as JPEG would arrive at Vertex mislabeled.

/** Longest edge we keep, in px. Well above what the model needs to read a page. */
const MAX_EDGE = 1600;
/** Below this, re-encoding rarely saves enough to be worth the decode. */
const MIN_BYTES_TO_COMPRESS = 600 * 1024;
const JPEG_QUALITY = 0.82;

const RE_ENCODABLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Return a smaller version of `file` when it's a large image, else `file` itself.
 * Never throws: an image we can't decode is passed through untouched so it fails
 * (or succeeds) downstream on its own merits rather than disappearing here.
 */
export async function compressImage(file: File): Promise<File> {
  if (!RE_ENCODABLE.has(file.type) || file.size < MIN_BYTES_TO_COMPRESS) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    // Quality is ignored for PNG, which is lossless — the win there is the resize.
    canvas.toBlob(resolve, file.type, file.type === 'image/png' ? undefined : JPEG_QUALITY),
  );

  // An already-optimized image can come back BIGGER after a round trip through
  // canvas; keep whichever is actually smaller.
  if (!blob || blob.size >= file.size) return file;

  return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
}

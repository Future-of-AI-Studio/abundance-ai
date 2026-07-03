// Social sharing — intent-link tier (no OAuth, no account linking yet).
// On mobile we hand the post to the OS share sheet (navigator.share), which
// surfaces Instagram/Facebook/X if installed. On desktop those apps aren't in a
// share sheet, so we fall back to per-platform composer links. Facebook's sharer
// and Instagram can't be prefilled with text, so callers copy the caption first.

export type SharePlatform = 'x' | 'facebook' | 'instagram' | 'linkedin';

/** Caption + hashtags joined the same way the Copy button builds clipboard text. */
export function buildShareText(caption: string, hashtags: string[]): string {
  return `${caption}${hashtags.length ? '\n\n' + hashtags.join(' ') : ''}`;
}

/** True when the OS-level share sheet is usable for this text (mobile, mostly). */
export function canNativeShare(text: string): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  return typeof navigator.canShare !== 'function' || navigator.canShare({ text });
}

/**
 * Open the OS share sheet. Resolves true if the sheet completed, false if the
 * user dismissed it (AbortError) — callers use that to decide whether to mark
 * the post as shared.
 */
export async function nativeShare(text: string): Promise<boolean> {
  try {
    await navigator.share({ text });
    return true;
  } catch {
    return false; // AbortError (cancelled) or unsupported — fall back to the menu
  }
}

/**
 * Desktop composer URL for a platform. X prefills text; Facebook only accepts a
 * link (the `quote` param was deprecated), so the caller copies the caption.
 * Instagram has no web composer at all, hence null.
 */
export function intentUrl(platform: SharePlatform, text: string, url: string): string | null {
  switch (platform) {
    case 'x':
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    case 'linkedin':
      // LinkedIn's share dialog only accepts a URL (no prefilled text), so the
      // caller copies the caption for pasting — same pattern as Facebook.
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    case 'instagram':
      return null;
  }
}

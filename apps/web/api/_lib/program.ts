// Shared helpers for the link-preview functions (api/p.ts, api/og.tsx).
//
// Why these exist: apps/web is a static Vite SPA, so every URL used to serve the
// same index.html. Link crawlers (WhatsApp, iMessage, Facebook, LinkedIn, Slack)
// don't run JavaScript, so a shared /p/:id link unfurled as the generic
// "AbundanceAI" blurb with no image. These functions fetch the program server-side
// so the preview describes the mentor's program instead.
//
// Kept dependency-free on purpose: these run in the Vercel Edge runtime, where a
// module-scope throw is an uncatchable 500 that would take down every sales link.
// Nothing here throws at import time and no env var is read with `!`.

/** Only a well-formed UUID is ever echoed into markup or forwarded upstream. */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// VITE_-prefixed vars are readable in the function runtime — the prefix only
// governs what Vite inlines into the client bundle — so the existing project env
// works with no dashboard change. Unprefixed names win when they're set.
export const env = (name: string): string =>
  (typeof process !== 'undefined' ? (process.env?.[name] ?? '') : '').trim();

export const SUPABASE_URL = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
export const SUPABASE_ANON_KEY = env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY');

/** The shape of program-public's response that the previews actually read. */
export interface PublicProgram {
  program: { id: string; title: string };
  modules: Array<{ outcome?: string | null }>;
  creator: {
    first_name?: string | null;
    landing_page?: { theme?: string | null; tagline?: string | null; eyebrow?: string | null } | null;
  };
}

/** A string field from an untrusted JSON blob, or '' when it isn't one. */
export const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/**
 * Collapse whitespace, drop control characters, and cut to `max` with an ellipsis.
 * programs.title and modules.outcome have no upstream max length, so both the meta
 * tags and the image canvas have to defend themselves.
 */
export function clamp(value: unknown, max: number): string {
  const text = String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Fetch the buyer-facing program payload. program-public is verify_jwt=false and
 * already returns 404 for anything that isn't status='ready', so an unpublished
 * program simply gets no preview.
 *
 * Returns null on every failure — callers must degrade, never throw.
 */
export async function fetchProgram(id: string, timeoutMs = 1500): Promise<PublicProgram | null> {
  if (!UUID_RE.test(id) || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/program-public`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ program_id: id }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PublicProgram;
    return str(data?.program?.title) ? data : null;
  } catch {
    return null;
  }
}

/**
 * The preview subtitle. Mirrors the page's own hero subtitle
 * (ProgramLandingPage.tsx `subtitle`) so the unfurl matches what the visitor
 * lands on. Reads landing_page defensively: the page runs the blob through zod
 * and falls back to defaults, so a malformed value must read as absent here too.
 */
export function previewDescription(data: PublicProgram): string {
  const tagline = str(data.creator?.landing_page?.tagline);
  const outcome = str(data.modules?.[0]?.outcome);
  const name = str(data.creator?.first_name) || 'your guide';
  return tagline || outcome || `A step-by-step program from ${name}, built to move you forward.`;
}

/** The hero eyebrow, matching ProgramLandingPage's `eyebrow` fallback. */
export function previewEyebrow(data: PublicProgram): string {
  return str(data.creator?.landing_page?.eyebrow) || 'Live group program';
}

/**
 * A short content hash used to version the og:image URL. WhatsApp and iMessage
 * cache preview images per-URL with no purge tool, so renaming a program has to
 * change the image URL or the old thumbnail sticks forever.
 */
export function contentHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

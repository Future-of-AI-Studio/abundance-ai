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

/**
 * A creator's short URL segment (abundanceai.net/laquelle). Same rule as the
 * profiles_slug_format check in supabase/migrations/0037_profile_slug.sql and the
 * rewrite regex in vercel.json — if the three drift, a valid slug stops routing.
 * Also the reason a slug is safe to interpolate into markup: no dots, no slashes.
 */
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$/;

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
    // The canonical short URL segment. Drives both the /p/:uuid → /:slug redirect
    // and og:url/canonical, so a UUID share never advertises itself as canonical.
    slug?: string | null;
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

/** How a page was addressed: by the creator's slug, or by a legacy program UUID. */
export type ProgramRef = { slug: string; id?: undefined } | { id: string; slug?: undefined };

/**
 * Fetch the buyer-facing program payload, by slug or by program UUID.
 * program-public is verify_jwt=false and already returns 404 for anything that
 * isn't status='ready', so an unpublished program simply gets no preview.
 *
 * Returns null on every failure — callers must degrade, never throw.
 */
export async function fetchProgram(ref: ProgramRef, timeoutMs = 1500): Promise<PublicProgram | null> {
  const body = ref.slug
    ? SLUG_RE.test(ref.slug) && { slug: ref.slug }
    : UUID_RE.test(ref.id ?? '') && { program_id: ref.id };
  if (!body || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/program-public`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
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
 * The creator's slug, or '' when they don't have a usable one. Re-validated here
 * rather than trusted: it comes back over the network and ends up in a Location
 * header and in markup.
 */
export function creatorSlug(data: PublicProgram): string {
  const slug = str(data.creator?.slug).toLowerCase();
  return SLUG_RE.test(slug) ? slug : '';
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

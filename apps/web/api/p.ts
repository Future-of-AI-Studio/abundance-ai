// /:slug and /p/:programId — serves the SPA shell with the mentor's program in
// the meta tags, so a link texted or WhatsApp'd unfurls as *their* program
// instead of the generic "AbundanceAI" blurb. vercel.json rewrites both forms
// here; for /:slug the browser URL never changes, so react-router still matches
// and ProgramLandingPage mounts exactly as before.
//
// /p/:programId is the legacy share link. It stays alive forever — those URLs are
// in Instagram bios, WhatsApp threads and printed material we can't edit — but
// when its owner has a slug it redirects, so the ugly form decays out of
// circulation on its own and the mentor only ever sees one URL.
//
// EVERY sales link in the product now passes through this function, so every
// branch must end in working HTML. On any failure we redirect to ?raw=1, which
// vercel.json sends straight to the untouched index.html.

import {
  SLUG_RE,
  UUID_RE,
  clamp,
  contentHash,
  creatorSlug,
  env,
  fetchProgram,
  previewDescription,
  str,
  type ProgramRef,
  type PublicProgram,
} from './_lib/program';

export const config = { runtime: 'edge' };

const BYPASS_SECRET = env('VERCEL_AUTOMATION_BYPASS_SECRET');
const PUBLIC_SITE_URL = env('PUBLIC_SITE_URL').replace(/\/+$/, '');

const CACHE_OK = 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400';
const CACHE_NONE = 'no-store';

// Deliberately 302, not 301/308. A permanent redirect is cached by browsers and
// crawlers effectively forever with no purge tool, so a mistake here would be
// unfixable for anyone who hit it. Flip to 301 once this is proven in production
// — 301 is understood by every link-unfurl crawler, where 308 support is spotty.
const LEGACY_REDIRECT_STATUS = 302;

// index.html for the *current* deployment. Function instances never outlive a
// deployment, so this can't serve stale content-hashed asset names.
let shellCache: string | null = null;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** The origin the visitor actually used — creators share window.location.origin. */
function originOf(req: Request): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (host) return `${req.headers.get('x-forwarded-proto') || 'https'}://${host}`;
  return PUBLIC_SITE_URL || (env('VERCEL_URL') ? `https://${env('VERCEL_URL')}` : '');
}

/**
 * Is this our built SPA shell, or something standing in front of it?
 *
 * Vercel's Deployment Protection login page is served with HTTP 200 and valid
 * HTML, so status and `</head>` prove nothing. Only the shell has both the mount
 * point and a hashed asset reference, and serving anything else in its place turns
 * every program link into someone else's page — so this is checked, not assumed.
 */
function looksLikeShell(html: string): boolean {
  return html.includes('</head>') && html.includes('id="root"') && html.includes('/assets/');
}

/**
 * The built shell. It can't be bundled with the function: dist/ is produced by the
 * static build, isn't in the function's traced files, and asset filenames are
 * content-hashed so nothing can be hardcoded.
 *
 * Fetched from the origin the visitor used, NOT from VERCEL_URL. The deployment
 * URL is covered by Deployment Protection even when the custom domain isn't, so
 * pinning to it made the self-fetch return Vercel's login page. The request origin
 * is reachable by definition — the visitor just came through it.
 */
async function fetchShell(req: Request): Promise<string | null> {
  // VERCEL_URL is unset outside Vercel (scripts/dev-preview.mjs), where there's no
  // deployment boundary to bound the cache — always re-read so a rebuild shows up.
  const onVercel = Boolean(env('VERCEL_URL'));
  if (onVercel && shellCache) return shellCache;

  const base = originOf(req);
  if (!base) return null;
  try {
    const res = await fetch(`${base}/index.html`, {
      signal: AbortSignal.timeout(1500),
      // Lets the self-fetch through on a protected preview. Requires "Protection
      // Bypass for Automation" in project settings; without it a protected preview
      // simply falls back to the plain SPA.
      headers: BYPASS_SECRET ? { 'x-vercel-protection-bypass': BYPASS_SECRET } : {},
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (!looksLikeShell(html)) return null;
    if (onVercel) shellCache = html;
    return html;
  } catch {
    return null;
  }
}

function metaTags(data: PublicProgram, path: string, origin: string): string {
  const title = clamp(data.program.title, 90);
  const description = clamp(previewDescription(data), 200);
  const theme = str(data.creator?.landing_page?.theme) || 'warm';
  // &v is a hash of what the image actually shows. WhatsApp and iMessage cache
  // preview images per-URL with no purge tool, so renaming a program has to change
  // the URL or the old thumbnail sticks forever.
  const version = contentHash(`${title}|${theme}`);
  const slug = creatorSlug(data);
  const imageRef = slug ? `slug=${slug}` : `id=${data.program.id}`;
  const image = `${origin}/api/og?${imageRef}&v=${version}`;
  // Always the short URL when one exists, even on a legacy request — a UUID must
  // never advertise itself as canonical or crawlers will keep indexing it.
  const pageUrl = `${origin}${slug ? `/${slug}` : path}`;

  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const img = escapeHtml(image);
  const url = escapeHtml(pageUrl);

  return [
    `<meta name="description" content="${d}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="AbundanceAI" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:image:secure_url" content="${img}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${t}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${img}" />`,
    `<link rel="canonical" href="${url}" />`,
  ].join('\n    ');
}

/**
 * Replace the shell's title and description rather than appending: index.html
 * already ships both, and crawlers read whichever comes first.
 */
function injectMeta(shell: string, data: PublicProgram, path: string, origin: string): string {
  const title = escapeHtml(clamp(data.program.title, 90));
  return shell
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
    .replace(/[ \t]*<meta\s+name=["']description["'][^>]*>\s*\n?/i, '')
    .replace('</head>', `  ${metaTags(data, path, origin)}\n  </head>`);
}

const html = (body: string, cacheControl: string, status = 200): Response =>
  new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cacheControl },
  });

/**
 * Hand the request back to the plain SPA. ?raw=1 is matched by the ?raw rewrite
 * rules in vercel.json, which serve index.html directly. `isRetry` means those
 * rules didn't fire (misordered config) — degrade to an error page rather than loop.
 */
function bail(path: string, isRetry: boolean): Response {
  if (isRetry) {
    return html(
      '<!doctype html><meta charset="utf-8"><title>AbundanceAI</title>' +
        '<p style="font:16px system-ui;padding:2rem">This page is temporarily unavailable. Please refresh.</p>',
      CACHE_NONE,
      503,
    );
  }
  return new Response(null, {
    status: 307,
    headers: { location: `${path}?raw=1`, 'cache-control': CACHE_NONE },
  });
}

/** The public path a request came in on, used for ?raw=1 fallbacks and canonical. */
const pathOf = (ref: ProgramRef): string =>
  ref.slug ? `/${ref.slug}` : `/p/${encodeURIComponent(ref.id ?? '')}`;

export default async function handler(req: Request): Promise<Response> {
  let path = '/';
  let isRetry = false;
  try {
    const url = new URL(req.url);
    const slug = (url.searchParams.get('slug') ?? '').toLowerCase();
    const id = url.searchParams.get('id') ?? '';
    isRetry = url.searchParams.has('raw');

    const ref: ProgramRef | null = slug
      ? SLUG_RE.test(slug) ? { slug } : null
      : UUID_RE.test(id) ? { id } : null;
    // Nothing routable — hand back the SPA on the path the visitor actually used.
    if (!ref) return bail(slug ? `/${encodeURIComponent(slug)}` : `/p/${encodeURIComponent(id)}`, isRetry);
    path = pathOf(ref);

    // Fetched together even on the branch that ends in a redirect: the shell is
    // memoized per deployment (shellCache), so the second request onward pays
    // nothing for it, and keeping one code path avoids a serial hop on the
    // common case.
    const [shell, data] = await Promise.all([fetchShell(req), fetchProgram(ref)]);
    if (!shell) return bail(path, isRetry);
    // No program (unpublished, deleted, upstream down) — the SPA still renders its
    // own "not available" state, so serve it unmodified rather than guessing.
    if (!data) return html(shell, CACHE_NONE);

    // A legacy /p/:uuid link whose owner has a slug: send the visitor to the short
    // URL so their address bar shows the branded form. Never redirects a slug
    // request, so this cannot loop.
    const short = creatorSlug(data);
    if (ref.id && short) {
      return new Response(null, {
        status: LEGACY_REDIRECT_STATUS,
        headers: { location: `/${short}`, 'cache-control': CACHE_NONE },
      });
    }

    return html(injectMeta(shell, data, path, originOf(req)), CACHE_OK);
  } catch {
    return bail(path, isRetry);
  }
}

// /p/:programId — serves the SPA shell with the mentor's program in the meta
// tags, so a link texted or WhatsApp'd unfurls as *their* program instead of the
// generic "AbundanceAI" blurb. vercel.json rewrites /p/:programId here; the
// browser URL never changes, so react-router still matches /p/:programId and
// ProgramLandingPage mounts exactly as before.
//
// EVERY sales link in the product now passes through this function, so every
// branch must end in working HTML. On any failure we redirect to ?raw=1, which
// vercel.json sends straight to the untouched index.html.

import {
  UUID_RE,
  clamp,
  contentHash,
  env,
  fetchProgram,
  previewDescription,
  str,
  type PublicProgram,
} from './_lib/program';

export const config = { runtime: 'edge' };

const BYPASS_SECRET = env('VERCEL_AUTOMATION_BYPASS_SECRET');
const PUBLIC_SITE_URL = env('PUBLIC_SITE_URL').replace(/\/+$/, '');

const CACHE_OK = 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400';
const CACHE_NONE = 'no-store';

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
 * The built shell, fetched from this deployment's own origin. It can't be bundled
 * with the function: dist/ is produced by the static build, isn't in the function's
 * traced files, and asset filenames are content-hashed so nothing can be hardcoded.
 */
async function fetchShell(req: Request): Promise<string | null> {
  // VERCEL_URL is unset outside Vercel (scripts/dev-preview.mjs), where there's no
  // deployment boundary to bound the cache — always re-read so a rebuild shows up.
  const onVercel = Boolean(env('VERCEL_URL'));
  if (onVercel && shellCache) return shellCache;

  // VERCEL_URL pins the fetch to *this* deployment: using the request host on a
  // preview could pull production's shell and its mismatched asset hashes.
  const base = onVercel ? `https://${env('VERCEL_URL')}` : originOf(req);
  if (!base) return null;
  try {
    const res = await fetch(`${base}/index.html`, {
      signal: AbortSignal.timeout(1500),
      // Preview deployments sit behind Deployment Protection, which would 401 this
      // self-fetch. Requires "Protection Bypass for Automation" in project settings.
      headers: BYPASS_SECRET ? { 'x-vercel-protection-bypass': BYPASS_SECRET } : {},
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (!html.includes('</head>')) return null; // an error page, not the shell
    if (onVercel) shellCache = html;
    return html;
  } catch {
    return null;
  }
}

function metaTags(data: PublicProgram, id: string, origin: string): string {
  const title = clamp(data.program.title, 90);
  const description = clamp(previewDescription(data), 200);
  const theme = str(data.creator?.landing_page?.theme) || 'warm';
  // &v is a hash of what the image actually shows. WhatsApp and iMessage cache
  // preview images per-URL with no purge tool, so renaming a program has to change
  // the URL or the old thumbnail sticks forever.
  const version = contentHash(`${title}|${theme}`);
  const image = `${origin}/api/og?id=${id}&v=${version}`;
  const pageUrl = `${origin}/p/${id}`;

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
function injectMeta(shell: string, data: PublicProgram, id: string, origin: string): string {
  const title = escapeHtml(clamp(data.program.title, 90));
  return shell
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
    .replace(/[ \t]*<meta\s+name=["']description["'][^>]*>\s*\n?/i, '')
    .replace('</head>', `  ${metaTags(data, id, origin)}\n  </head>`);
}

const html = (body: string, cacheControl: string, status = 200): Response =>
  new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cacheControl },
  });

/**
 * Hand the request back to the plain SPA. ?raw=1 is matched by the first rewrite
 * rule in vercel.json, which serves index.html directly. `isRetry` means that rule
 * didn't fire (misordered config) — degrade to an error page rather than loop.
 */
function bail(id: string, isRetry: boolean): Response {
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
    headers: {
      location: `/p/${encodeURIComponent(id)}?raw=1`,
      'cache-control': CACHE_NONE,
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  let id = '';
  let isRetry = false;
  try {
    const url = new URL(req.url);
    id = url.searchParams.get('id') ?? '';
    isRetry = url.searchParams.has('raw');

    if (!UUID_RE.test(id)) return bail(id, isRetry);

    const [shell, data] = await Promise.all([fetchShell(req), fetchProgram(id)]);
    if (!shell) return bail(id, isRetry);
    // No program (unpublished, deleted, upstream down) — the SPA still renders its
    // own "not available" state, so serve it unmodified rather than guessing.
    if (!data) return html(shell, CACHE_NONE);

    return html(injectMeta(shell, data, id, originOf(req)), CACHE_OK);
  } catch {
    return bail(id, isRetry);
  }
}

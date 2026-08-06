// /api/og?id=<programId> — the 1200×630 link-preview thumbnail referenced by the
// og:image tag that api/p.ts injects. Purely typographic: the program's own title
// set on the mentor's chosen landing-page palette. No avatars, no uploads, no new
// columns — every program that exists today gets a thumbnail with no mentor action.
//
// Never returns an error status. Some crawlers drop the whole preview when
// og:image fails, so the fallback is a wordmark-only card, not a 500.

import { ImageResponse } from '@vercel/og';
import { LANDING_THEMES, type LandingPalette } from '../src/lib/landingPalettes';
import { UUID_RE, clamp, fetchProgram, previewEyebrow, str } from './_lib/program';

export const config = { runtime: 'edge' };

const WIDTH = 1200;
const HEIGHT = 630;
// The og:image URL carries a &v=<hash of title+theme>, so the URL itself changes
// whenever the artwork would — safe to cache forever, and it beats WhatsApp's
// per-URL image cache, which has no purge mechanism.
const CACHE = 'public, max-age=0, s-maxage=31536000, immutable';

const FALLBACK: LandingPalette = LANDING_THEMES.warm;

/** Titles have no upstream max length, so the type scales down to fit the canvas. */
function titleSize(length: number): number {
  if (length <= 34) return 84;
  if (length <= 60) return 68;
  if (length <= 90) return 54;
  return 44;
}

function card(opts: {
  palette: LandingPalette;
  eyebrow: string;
  title: string;
  byline: string;
}) {
  const { palette: t, eyebrow, title, byline } = opts;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 76,
        background: `linear-gradient(135deg, ${t.bg} 0%, ${t.bgSoft} 100%)`,
        borderTop: `12px solid ${t.primary}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 26,
          letterSpacing: 3,
          fontWeight: 600,
          color: t.accent,
        }}
      >
        {eyebrow.toUpperCase()}
      </div>

      <div
        style={{
          display: 'flex',
          fontSize: titleSize(title.length),
          lineHeight: 1.12,
          fontWeight: 700,
          color: t.inkDeep,
          letterSpacing: -1,
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          fontSize: 28,
        }}
      >
        <div style={{ display: 'flex', color: t.inkSoft }}>{byline}</div>
        <div style={{ display: 'flex', color: t.primary, fontWeight: 700, letterSpacing: -0.5 }}>
          AbundanceAI
        </div>
      </div>
    </div>
  );
}

export default async function handler(req: Request): Promise<Response> {
  // Fallback card: a program page whose data we couldn't load. Deliberately not the
  // mentor-facing "turn your expertise into a program" pitch — the audience here is
  // the buyer who was sent the link.
  let eyebrow = 'Live group program';
  let title = 'A program built to move you forward.';
  let byline = '';
  let palette = FALLBACK;

  try {
    const id = new URL(req.url).searchParams.get('id') ?? '';
    const data = UUID_RE.test(id) ? await fetchProgram(id) : null;
    if (data) {
      const themeId = str(data.creator?.landing_page?.theme);
      palette = LANDING_THEMES[themeId as keyof typeof LANDING_THEMES] ?? FALLBACK;
      title = clamp(data.program.title, 110);
      eyebrow = clamp(previewEyebrow(data), 48);
      const name = str(data.creator?.first_name);
      byline = name ? `with ${name}` : '';
    }
  } catch {
    // fall through to the wordmark card
  }

  return new ImageResponse(card({ palette, eyebrow, title, byline }), {
    width: WIDTH,
    height: HEIGHT,
    headers: { 'cache-control': CACHE },
  });
}

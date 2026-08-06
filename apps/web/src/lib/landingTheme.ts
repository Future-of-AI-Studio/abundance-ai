import {
  landingPageSettingsSchema,
  type LandingPageSettings,
  type LandingThemeId,
} from '@abundance/shared';
import { LANDING_THEMES, type LandingPalette } from './landingPalettes';

// The palette table itself lives in ./landingPalettes so the link-preview image
// renderer (apps/web/api/og.tsx) can import it without pulling in zod. Re-exported
// here because everything under src/ imports colors from this module.
export { LANDING_THEMES } from './landingPalettes';
export type { LandingPalette } from './landingPalettes';

/** Display order for the theme picker. */
export const LANDING_THEME_IDS = Object.keys(LANDING_THEMES) as LandingThemeId[];

/**
 * Normalize a stored (possibly null/partial/legacy) blob into full settings +
 * its palette. Bad data falls back to defaults rather than breaking the page.
 */
export function resolveLanding(raw: LandingPageSettings | null | undefined): {
  settings: LandingPageSettings;
  palette: LandingPalette;
} {
  const parsed = landingPageSettingsSchema.safeParse(raw ?? {});
  const settings = parsed.success ? parsed.data : landingPageSettingsSchema.parse({});
  return { settings, palette: LANDING_THEMES[settings.theme] };
}

/** The "Meet your guide" card background (3-stop wash or 2-stop gradient). */
export function heroGradient(palette: LandingPalette): string {
  return palette.heroVia
    ? `linear-gradient(135deg, ${palette.heroFrom}, ${palette.heroVia}, ${palette.heroTo})`
    : `linear-gradient(135deg, ${palette.heroFrom}, ${palette.heroTo})`;
}

/**
 * Corner radii for cards/buttons. `undefined` keeps the Tailwind class default
 * (the soft look); 'sharp' overrides via inline style.
 */
export function landingRadii(corners: LandingPageSettings['corners']): { card?: string; button?: string } {
  return corners === 'sharp' ? { card: '2px', button: '3px' } : {};
}

/** A safe external href from a stored handle-or-URL ("instagram.com/maya" → https). */
export function externalHref(value: string): string {
  const v = value.trim();
  return /^https?:\/\//i.test(v) ? v : `https://${v.replace(/^\/+/, '')}`;
}

/** The page background for a palette + background style. */
export function landingBackground(palette: LandingPalette, background: LandingPageSettings['background']): string {
  return background === 'gradient'
    ? `linear-gradient(180deg, ${palette.bg} 0%, ${palette.bgSoft} 100%)`
    : palette.bg;
}

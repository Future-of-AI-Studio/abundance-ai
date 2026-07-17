import {
  landingPageSettingsSchema,
  type LandingBrandColor,
  type LandingPageSettings,
  type LandingThemeId,
} from '@abundance/shared';

/**
 * Landing page theme palettes — the color presets a creator can pick for their
 * public /p/:id page. Colors are applied as inline styles (not Tailwind classes)
 * because the values are chosen at runtime; 'warm' mirrors the app's default
 * brand tokens exactly, so an untouched page looks identical to before.
 */
export interface LandingPalette {
  label: string;
  note: string;
  bg: string;
  bgSoft: string; // gradient end / tinted sections
  surface: string; // cards
  line: string; // borders
  ink: string;
  inkSoft: string; // secondary text
  inkDeep: string; // display headings
  accent: string; // eyebrows, module numbers
  primary: string; // price, links, buttons
  primaryHover: string;
  onPrimary: string; // button text
  heroFrom: string; // "Meet your guide" card gradient
  heroVia: string;
  heroTo: string;
}

export const LANDING_THEMES: Record<LandingThemeId, LandingPalette> = {
  warm: {
    label: 'Warm Clay',
    note: 'Earthy terracotta & teal - the classic look',
    bg: '#FBF6EF',
    bgSoft: '#F3E9DC',
    surface: '#FFFFFF',
    line: '#EDE3D6',
    ink: '#3A2E26',
    inkSoft: '#8A7B6D',
    inkDeep: '#2A211B',
    accent: '#3F8E6E',
    primary: '#B5532A',
    primaryHover: '#E08A3C',
    onPrimary: '#FFFFFF',
    heroFrom: 'rgba(63, 142, 110, 0.15)',
    heroVia: 'rgba(181, 83, 42, 0.10)',
    heroTo: '#F3E9DC',
  },
  sage: {
    label: 'Fresh Sage',
    note: 'Calm greens - natural and grounded',
    bg: '#F4F7F1',
    bgSoft: '#E7EFE1',
    surface: '#FFFFFF',
    line: '#DDE8D4',
    ink: '#2C3A2E',
    inkSoft: '#6E8070',
    inkDeep: '#1E2B20',
    accent: '#8A6D3B',
    primary: '#2F7D4F',
    primaryHover: '#3E9A64',
    onPrimary: '#FFFFFF',
    heroFrom: 'rgba(47, 125, 79, 0.14)',
    heroVia: 'rgba(138, 109, 59, 0.08)',
    heroTo: '#E7EFE1',
  },
  sky: {
    label: 'Coastal Sky',
    note: 'Airy blues with a warm coral accent',
    bg: '#F2F7FA',
    bgSoft: '#E3EEF5',
    surface: '#FFFFFF',
    line: '#D9E6EF',
    ink: '#26333D',
    inkSoft: '#64798A',
    inkDeep: '#18242F',
    accent: '#C96F4A',
    primary: '#2E6E8E',
    primaryHover: '#3D85A8',
    onPrimary: '#FFFFFF',
    heroFrom: 'rgba(46, 110, 142, 0.14)',
    heroVia: 'rgba(201, 111, 74, 0.09)',
    heroTo: '#E3EEF5',
  },
  dusk: {
    label: 'Quiet Dusk',
    note: 'Deep plum night mode with amber glow',
    bg: '#221D29',
    bgSoft: '#2B2437',
    surface: '#2E2839',
    line: '#3D3550',
    ink: '#EDE6F2',
    inkSoft: '#A99FB8',
    inkDeep: '#F7F2FA',
    accent: '#B49CE8',
    primary: '#E08A3C',
    primaryHover: '#EDA55F',
    onPrimary: '#241C12',
    heroFrom: 'rgba(180, 156, 232, 0.16)',
    heroVia: 'rgba(224, 138, 60, 0.10)',
    heroTo: '#2B2437',
  },
  mono: {
    label: 'Paper & Ink',
    note: 'Minimal monochrome - let the words lead',
    bg: '#FAFAF7',
    bgSoft: '#F1F1EC',
    surface: '#FFFFFF',
    line: '#E4E4DC',
    ink: '#26261F',
    inkSoft: '#75756C',
    inkDeep: '#161612',
    accent: '#75756C',
    primary: '#22221E',
    primaryHover: '#3A3A34',
    onPrimary: '#FFFFFF',
    heroFrom: 'rgba(34, 34, 30, 0.06)',
    heroVia: 'rgba(34, 34, 30, 0.03)',
    heroTo: '#F1F1EC',
  },
};

/** Display order for the theme picker. */
export const LANDING_THEME_IDS = Object.keys(LANDING_THEMES) as LandingThemeId[];

/**
 * Button/accent color swatches — every value is dark enough for white (or the
 * given) text, so any pick stays legible on any theme. Overrides only the
 * palette's `primary` trio; the rest of the theme is untouched.
 */
export const BRAND_COLORS: Record<LandingBrandColor, { label: string; primary: string; primaryHover: string; onPrimary: string }> = {
  clay: { label: 'Clay', primary: '#B5532A', primaryHover: '#E08A3C', onPrimary: '#FFFFFF' },
  amber: { label: 'Amber', primary: '#B45309', primaryHover: '#D97706', onPrimary: '#FFFFFF' },
  forest: { label: 'Forest', primary: '#15803D', primaryHover: '#16A34A', onPrimary: '#FFFFFF' },
  pine: { label: 'Pine', primary: '#047857', primaryHover: '#059669', onPrimary: '#FFFFFF' },
  teal: { label: 'Teal', primary: '#0F766E', primaryHover: '#0D9488', onPrimary: '#FFFFFF' },
  ocean: { label: 'Ocean', primary: '#0369A1', primaryHover: '#0284C7', onPrimary: '#FFFFFF' },
  blue: { label: 'Blue', primary: '#1D4ED8', primaryHover: '#2563EB', onPrimary: '#FFFFFF' },
  indigo: { label: 'Indigo', primary: '#4338CA', primaryHover: '#4F46E5', onPrimary: '#FFFFFF' },
  violet: { label: 'Violet', primary: '#6D28D9', primaryHover: '#7C3AED', onPrimary: '#FFFFFF' },
  plum: { label: 'Plum', primary: '#A21CAF', primaryHover: '#C026D3', onPrimary: '#FFFFFF' },
  rose: { label: 'Rose', primary: '#BE185D', primaryHover: '#DB2777', onPrimary: '#FFFFFF' },
  slate: { label: 'Slate', primary: '#334155', primaryHover: '#475569', onPrimary: '#FFFFFF' },
};

/** Display order for the swatch picker. */
export const BRAND_COLOR_IDS = Object.keys(BRAND_COLORS) as LandingBrandColor[];

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
  let palette = LANDING_THEMES[settings.theme];
  if (settings.brand_color) {
    const b = BRAND_COLORS[settings.brand_color];
    palette = { ...palette, primary: b.primary, primaryHover: b.primaryHover, onPrimary: b.onPrimary };
  }
  return { settings, palette };
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

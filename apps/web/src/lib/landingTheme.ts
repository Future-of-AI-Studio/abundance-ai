import {
  landingPageSettingsSchema,
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
  bg: string;
  bgSoft: string; // gradient end / tinted sections
  surface: string; // module cards & confirmation card
  line: string; // borders
  ink: string;
  inkSoft: string; // secondary text
  inkDeep: string; // display headings
  accent: string; // eyebrows on the page background
  primary: string; // price, links, buttons
  primaryHover: string;
  onPrimary: string; // button text
  // "Meet your guide" card gradient. The original five schemes use a
  // translucent 3-stop wash (heroVia set); the newer schemes use an opaque
  // 2-stop gradient (heroVia omitted).
  heroFrom: string;
  heroVia?: string;
  heroTo: string;
  // Text on cards (bio card, module cards, confirmation card). The original
  // schemes reuse the page inks; schemes that put a light card on a dark page
  // (royal-blue) need their own.
  cardInk: string;
  cardInkSoft: string;
  cardAccent: string; // links, eyebrows & module numbers on cards
}

export const LANDING_THEMES: Record<LandingThemeId, LandingPalette> = {
  // ── The original five schemes ───────────────────────────────────────────────
  warm: {
    label: 'Warm Clay',
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
    cardInk: '#3A2E26',
    cardInkSoft: '#8A7B6D',
    cardAccent: '#B5532A',
  },
  sage: {
    label: 'Fresh Sage',
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
    cardInk: '#2C3A2E',
    cardInkSoft: '#6E8070',
    cardAccent: '#2F7D4F',
  },
  sky: {
    label: 'Coastal Sky',
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
    cardInk: '#26333D',
    cardInkSoft: '#64798A',
    cardAccent: '#2E6E8E',
  },
  dusk: {
    label: 'Quiet Dusk',
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
    cardInk: '#EDE6F2',
    cardInkSoft: '#A99FB8',
    cardAccent: '#E08A3C',
  },
  mono: {
    label: 'Paper & Ink',
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
    cardInk: '#26261F',
    cardInkSoft: '#75756C',
    cardAccent: '#22221E',
  },

  // ── The expanded set ────────────────────────────────────────────────────────
  'sunlit-peach': {
    label: 'Sunlit Peach',
    bg: '#FFE0C2',
    bgSoft: '#F9D2AC',
    surface: '#FFFFFF',
    line: '#F0CBA6',
    ink: '#1A1A1A',
    inkSoft: '#6B6B6B',
    inkDeep: '#1A1A1A',
    accent: '#FF7F50',
    primary: '#FF7F50',
    primaryHover: '#F2693A',
    onPrimary: '#FFFFFF',
    heroFrom: '#FFFFFF',
    heroTo: '#FCE0C7',
    cardInk: '#1A1A1A',
    cardInkSoft: '#6B6B6B',
    cardAccent: '#C2552B',
  },
  'petal-blush': {
    label: 'Petal Blush',
    bg: '#FDECEF',
    bgSoft: '#F8DCE2',
    surface: '#FFFFFF',
    line: '#F1CFD7',
    ink: '#1A1A1A',
    inkSoft: '#6B6B6B',
    inkDeep: '#1A1A1A',
    accent: '#C94C72',
    primary: '#C94C72',
    primaryHover: '#D96486',
    onPrimary: '#FFFFFF',
    heroFrom: '#FFFFFF',
    heroTo: '#F7D9E0',
    cardInk: '#1A1A1A',
    cardInkSoft: '#6B6B6B',
    cardAccent: '#C94C72',
  },
  'soft-lilac': {
    label: 'Soft Lilac',
    bg: '#E6E6FA',
    bgSoft: '#D9D9F2',
    surface: '#FFFFFF',
    line: '#D0D0EA',
    ink: '#1A1A1A',
    inkSoft: '#6B6B6B',
    inkDeep: '#1A1A1A',
    accent: '#4B0082',
    primary: '#4B0082',
    primaryHover: '#6B1FA8',
    onPrimary: '#FFFFFF',
    heroFrom: '#FFFFFF',
    heroTo: '#DCD3F0',
    cardInk: '#1A1A1A',
    cardInkSoft: '#6B6B6B',
    cardAccent: '#4B0082',
  },
  'ocean-blue': {
    label: 'Ocean Blue',
    bg: '#D8F3DC',
    bgSoft: '#C6EACD',
    surface: '#FFFFFF',
    line: '#BFE4C7',
    ink: '#1A1A1A',
    inkSoft: '#555555',
    inkDeep: '#1A1A1A',
    accent: '#2A7F9E',
    primary: '#2A7F9E',
    primaryHover: '#3B97B8',
    onPrimary: '#FFFFFF',
    heroFrom: '#FFFFFF',
    heroTo: '#CFE9E5',
    cardInk: '#1A1A1A',
    cardInkSoft: '#555555',
    cardAccent: '#2A7F9E',
  },
  turquoise: {
    label: 'Turquoise',
    bg: '#C8F1EE',
    bgSoft: '#B2E8E3',
    surface: '#FFFFFF',
    line: '#A9E3DE',
    ink: '#1A1A1A',
    inkSoft: '#4F6B66',
    inkDeep: '#26433F',
    accent: '#2A9D8F',
    primary: '#2A9D8F',
    primaryHover: '#35B5A4',
    onPrimary: '#FFFFFF',
    heroFrom: '#C7EEE9',
    heroTo: '#C7EEE9',
    cardInk: '#1A1A1A',
    cardInkSoft: '#4F6B66',
    cardAccent: '#1F7468',
  },
  'royal-blue': {
    label: 'Royal Blue',
    bg: '#2B4C7E',
    bgSoft: '#24406B',
    surface: '#FFFFFF',
    line: '#3E619B',
    ink: '#FFFFFF',
    inkSoft: '#E0E0E0',
    inkDeep: '#FFFFFF',
    accent: '#FFD54F',
    primary: '#FFD54F',
    primaryHover: '#FFE082',
    onPrimary: '#1A1A1A',
    heroFrom: '#FFFFFF',
    heroTo: '#C7D4EC',
    cardInk: '#1A1A1A',
    cardInkSoft: '#555555',
    cardAccent: '#2B4C7E',
  },
  'soothing-gray': {
    label: 'Soothing Gray',
    bg: '#F2F2F2',
    bgSoft: '#E7E7E7',
    surface: '#FFFFFF',
    line: '#E0E0E0',
    ink: '#1A1A1A',
    inkSoft: '#555555',
    inkDeep: '#1A1A1A',
    accent: '#1F3A93',
    primary: '#1F3A93',
    primaryHover: '#2E4DB3',
    onPrimary: '#FFFFFF',
    heroFrom: '#E3E9FA',
    heroTo: '#F7F9FE',
    cardInk: '#1A1A1A',
    cardInkSoft: '#555555',
    cardAccent: '#1F3A93',
  },
  'powerful-black': {
    label: 'Powerful Black',
    bg: '#000000',
    bgSoft: '#121212',
    surface: '#1A1A1A',
    line: '#2E2E2E',
    ink: '#FFFFFF',
    inkSoft: '#CFCFCF',
    inkDeep: '#FFFFFF',
    accent: '#FFD54F',
    primary: '#FFD54F',
    primaryHover: '#FFE082',
    onPrimary: '#1A1A1A',
    heroFrom: '#6E6E6E',
    heroTo: '#1A1A1A',
    cardInk: '#FFFFFF',
    cardInkSoft: '#CFCFCF',
    cardAccent: '#FFD54F',
  },
  'warm-cream': {
    label: 'Warm Cream',
    bg: '#FFF8E7',
    bgSoft: '#F8EDD2',
    surface: '#FFFFFF',
    line: '#EFE3C6',
    ink: '#1A1A1A',
    inkSoft: '#666666',
    inkDeep: '#1A1A1A',
    accent: '#2A7F9E',
    primary: '#2A7F9E',
    primaryHover: '#3B97B8',
    onPrimary: '#FFFFFF',
    heroFrom: '#FFFFFF',
    heroTo: '#E4F3F1',
    cardInk: '#1A1A1A',
    cardInkSoft: '#666666',
    cardAccent: '#2A7F9E',
  },
  'elegant-white': {
    label: 'Elegant White',
    bg: '#FFFFFF',
    bgSoft: '#F4F4F4',
    surface: '#F8F8F8',
    line: '#E8E8E8',
    ink: '#1A1A1A',
    inkSoft: '#555555',
    inkDeep: '#1A1A1A',
    accent: '#FF7F50',
    primary: '#FF7F50',
    primaryHover: '#F2693A',
    onPrimary: '#FFFFFF',
    heroFrom: '#FDF7F5',
    heroTo: '#FBEEE8',
    cardInk: '#1A1A1A',
    cardInkSoft: '#555555',
    cardAccent: '#C2552B',
  },
};

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

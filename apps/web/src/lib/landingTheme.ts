import {
  landingPageSettingsSchema,
  type LandingPageSettings,
  type LandingThemeId,
} from '@abundance/shared';

/**
 * Landing page background presets — the creator picks one background color for
 * their public /p/:id page and every other color (bio box, buttons, text) is
 * fixed by the preset. Colors are applied as inline styles (not Tailwind
 * classes) because the values are chosen at runtime.
 *
 * Card tokens exist because several presets put a light bio box / module card
 * on a dark page background — text inside those cards can't reuse the page's
 * ink colors.
 */
export interface LandingPalette {
  label: string;
  note: string;
  bg: string;
  bgSoft: string; // gradient end / tinted sections
  surface: string; // bio box + module cards
  line: string; // borders
  ink: string; // primary text on the page background
  inkSoft: string; // secondary text on the page background
  inkDeep: string; // display headings
  accent: string; // eyebrows, check icons (on the page background)
  primary: string; // price, links, buttons
  primaryHover: string;
  onPrimary: string; // button text
  cardInk: string; // primary text on surface (bio box / module cards)
  cardInkSoft: string; // secondary text on surface
  cardAccent: string; // links, eyebrows & module numbers on surface
}

export const LANDING_THEMES: Record<LandingThemeId, LandingPalette> = {
  'elegant-white': {
    label: 'Elegant White',
    note: 'Crisp white · deep blue buttons',
    bg: '#FFFFFF',
    bgSoft: '#F4F4F4',
    surface: '#F8F8F8',
    line: '#E8E8E8',
    ink: '#1A1A1A',
    inkSoft: '#555555',
    inkDeep: '#0F0F0F',
    accent: '#003366',
    primary: '#003366',
    primaryHover: '#14508C',
    onPrimary: '#FFFFFF',
    cardInk: '#1A1A1A',
    cardInkSoft: '#555555',
    cardAccent: '#003366',
  },
  'warm-cream': {
    label: 'Warm Cream',
    note: 'Soft cream · muted teal buttons',
    bg: '#FFF8E7',
    bgSoft: '#F8EDD2',
    surface: '#FFFFFF',
    line: '#EFE3C6',
    ink: '#1A1A1A',
    inkSoft: '#666666',
    inkDeep: '#0F0F0F',
    accent: '#2A7F9E',
    primary: '#2A7F9E',
    primaryHover: '#3B97B8',
    onPrimary: '#FFFFFF',
    cardInk: '#1A1A1A',
    cardInkSoft: '#666666',
    cardAccent: '#2A7F9E',
  },
  'powerful-black': {
    label: 'Powerful Black',
    note: 'Bold black · gold buttons',
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
    cardInk: '#FFFFFF',
    cardInkSoft: '#CFCFCF',
    cardAccent: '#FFD54F',
  },
  'soothing-gray': {
    label: 'Soothing Gray',
    note: 'Light gray · navy buttons',
    bg: '#F2F2F2',
    bgSoft: '#E7E7E7',
    surface: '#FFFFFF',
    line: '#E0E0E0',
    ink: '#1A1A1A',
    inkSoft: '#555555',
    inkDeep: '#0F0F0F',
    accent: '#1F3A93',
    primary: '#1F3A93',
    primaryHover: '#2E4DB3',
    onPrimary: '#FFFFFF',
    cardInk: '#1A1A1A',
    cardInkSoft: '#555555',
    cardAccent: '#1F3A93',
  },
  'royal-blue': {
    label: 'Royal Blue',
    note: 'Deep blue · gold buttons',
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
    cardInk: '#1A1A1A',
    cardInkSoft: '#555555',
    cardAccent: '#2B4C7E',
  },
  'wedgwood-blue': {
    label: 'Classic Wedgwood Blue',
    note: 'Classic blue · coral buttons',
    bg: '#4A6FA5',
    bgSoft: '#3E6094',
    surface: '#FFFFFF',
    line: '#5F82B4',
    ink: '#FFFFFF',
    inkSoft: '#E8E8E8',
    inkDeep: '#FFFFFF',
    accent: '#FFE3D6',
    primary: '#FF7F50',
    primaryHover: '#FF9569',
    onPrimary: '#1A1A1A',
    cardInk: '#1A1A1A',
    cardInkSoft: '#555555',
    cardAccent: '#C2552B',
  },
  'vibrant-turquoise': {
    label: 'Vibrant Turquoise',
    note: 'Turquoise · deep green buttons',
    bg: '#2A9D8F',
    bgSoft: '#23887C',
    surface: '#FFFFFF',
    line: '#45AFA2',
    ink: '#FFFFFF',
    inkSoft: '#E0E0E0',
    inkDeep: '#FFFFFF',
    accent: '#D9F3EE',
    primary: '#1A3A2F',
    primaryHover: '#275445',
    onPrimary: '#FFFFFF',
    cardInk: '#1A1A1A',
    cardInkSoft: '#555555',
    cardAccent: '#1A3A2F',
  },
  'golden-yellow': {
    label: 'Golden Yellow',
    note: 'Sunny gold · slate buttons',
    bg: '#FFD54F',
    bgSoft: '#F7C838',
    surface: '#FFFFFF',
    line: '#E9BC2E',
    ink: '#1A1A1A',
    inkSoft: '#555555',
    inkDeep: '#0F0F0F',
    accent: '#2E2E2E',
    primary: '#2E2E2E',
    primaryHover: '#474747',
    onPrimary: '#FFFFFF',
    cardInk: '#1A1A1A',
    cardInkSoft: '#555555',
    cardAccent: '#2E2E2E',
  },
  'dusty-rose': {
    label: 'Radiant Dusty Rose',
    note: 'Dusty rose · deep plum buttons',
    bg: '#E28DA6',
    bgSoft: '#D97D99',
    surface: '#FFFFFF',
    line: '#EBA6BA',
    ink: '#1A1A1A',
    inkSoft: '#6B6B6B',
    inkDeep: '#0F0F0F',
    accent: '#4A2E35',
    primary: '#4A2E35',
    primaryHover: '#654049',
    onPrimary: '#FFFFFF',
    cardInk: '#1A1A1A',
    cardInkSoft: '#6B6B6B',
    cardAccent: '#4A2E35',
  },
  'ocean-blue': {
    label: 'Ocean Blue',
    note: 'Pale aqua · deep teal buttons',
    bg: '#D8F3DC',
    bgSoft: '#C6EACD',
    surface: '#FFFFFF',
    line: '#BFE4C7',
    ink: '#1A1A1A',
    inkSoft: '#555555',
    inkDeep: '#0F0F0F',
    accent: '#2A7F9E',
    primary: '#2A7F9E',
    primaryHover: '#3B97B8',
    onPrimary: '#FFFFFF',
    cardInk: '#1A1A1A',
    cardInkSoft: '#555555',
    cardAccent: '#2A7F9E',
  },
  'soft-lilac': {
    label: 'Soft Lilac',
    note: 'Gentle lilac · deep indigo buttons',
    bg: '#E6E6FA',
    bgSoft: '#D9D9F2',
    surface: '#FFFFFF',
    line: '#D0D0EA',
    ink: '#1A1A1A',
    inkSoft: '#6B6B6B',
    inkDeep: '#0F0F0F',
    accent: '#4B0082',
    primary: '#4B0082',
    primaryHover: '#6B1FA8',
    onPrimary: '#FFFFFF',
    cardInk: '#1A1A1A',
    cardInkSoft: '#6B6B6B',
    cardAccent: '#4B0082',
  },
  'sunlit-peach': {
    label: 'Sunlit Peach',
    note: 'Warm peach · coral buttons',
    bg: '#FFE0C2',
    bgSoft: '#F9D2AC',
    surface: '#FFFFFF',
    line: '#F0CBA6',
    ink: '#1A1A1A',
    inkSoft: '#6B6B6B',
    inkDeep: '#0F0F0F',
    accent: '#C2552B',
    primary: '#FF7F50',
    primaryHover: '#F2693A',
    onPrimary: '#1A1A1A',
    cardInk: '#1A1A1A',
    cardInkSoft: '#6B6B6B',
    cardAccent: '#C2552B',
  },
  'petal-blush': {
    label: 'Petal Blush',
    note: 'Blush pink · deep rose buttons',
    bg: '#FDECEF',
    bgSoft: '#F8DCE2',
    surface: '#FFFFFF',
    line: '#F1CFD7',
    ink: '#1A1A1A',
    inkSoft: '#6B6B6B',
    inkDeep: '#0F0F0F',
    accent: '#C94C72',
    primary: '#C94C72',
    primaryHover: '#D96486',
    onPrimary: '#FFFFFF',
    cardInk: '#1A1A1A',
    cardInkSoft: '#6B6B6B',
    cardAccent: '#C94C72',
  },
  'fresh-mint': {
    label: 'Fresh Mint',
    note: 'Cool mint · forest green buttons',
    bg: '#DFF5E3',
    bgSoft: '#CDEBD4',
    surface: '#FFFFFF',
    line: '#C4E5CC',
    ink: '#1A1A1A',
    inkSoft: '#555555',
    inkDeep: '#0F0F0F',
    accent: '#2F6F4E',
    primary: '#2F6F4E',
    primaryHover: '#3E8A63',
    onPrimary: '#FFFFFF',
    cardInk: '#1A1A1A',
    cardInkSoft: '#555555',
    cardAccent: '#2F6F4E',
  },
};

/** Display order for the background-color picker. */
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

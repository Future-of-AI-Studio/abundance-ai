import type { Config } from 'tailwindcss';

/**
 * Design tokens from spec §2, mapped into the Tailwind theme. Components use
 * these semantic classes only — NO hard-coded hex anywhere in components.
 * Tailwind's default 4px spacing scale already matches §2.3 exactly (1=4px…16=64px),
 * so we extend only radius/shadow/type/color.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#B5532A', hover: '#E08A3C', deep: '#9A4422' },
        accent: { DEFAULT: '#3F8E6E', light: '#7FC4A6' },
        bg: '#FBF6EF',
        surface: { DEFAULT: '#F3E9DC', plain: '#FFFFFF' },
        ink: { DEFAULT: '#3A2E26', secondary: '#8A7B6D', muted: '#6F6258', deep: '#2A211B', cream: '#FFF6EE' },
        error: { DEFAULT: '#C0392B', bg: '#FBE9E7', border: '#F3C9C4' },
        success: { DEFAULT: '#086A55', bg: '#E6F6F1', border: '#C0E9DC' },
        line: { DEFAULT: '#EDE3D6', strong: '#D8C9B8' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        serif: ['Newsreader', 'Georgia', 'serif'],
      },
      fontSize: {
        display: ['40px', { lineHeight: '1.0', letterSpacing: '-0.02em', fontWeight: '700' }],
        h1: ['28px', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '700' }],
        h2: ['20px', { lineHeight: '1.25', fontWeight: '600' }],
        h3: ['17px', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['16px', { lineHeight: '1.6' }],
        'body-sm': ['14px', { lineHeight: '1.55' }],
        caption: ['13px', { lineHeight: '1.5' }],
        eyebrow: ['12px', { lineHeight: '1.0', letterSpacing: '0.12em', fontWeight: '600' }],
        data: ['12px', { lineHeight: '1.2', letterSpacing: '0.06em', fontWeight: '500' }],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '20px',
        pill: '999px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(58,46,38,0.06)',
        md: '0 4px 12px rgba(58,46,38,0.08)',
        lg: '0 12px 28px rgba(58,46,38,0.12)',
        focus: '0 0 0 3px rgba(181,83,42,0.25)',
      },
      maxWidth: {
        frame: '720px', // app content column
        narrow: '480px', // checkout / forms
        calm: '640px', // mindset / account
        landing: '840px',
      },
      keyframes: {
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'dot-pulse': { '0%,100%': { opacity: '0.35', transform: 'scale(0.85)' }, '50%': { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'sheet-up': 'sheet-up 0.28s cubic-bezier(0.32,0.72,0,1)',
        'fade-in': 'fade-in 0.2s ease-out',
        'dot-pulse': 'dot-pulse 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;

// Routes for the legal policy pages (see src/pages/legal/). LegalLink opens
// these in a new tab so in-progress signup/checkout forms aren't lost.
export const LEGAL_LINKS = {
  terms: '/terms',       // Terms of Service
  privacy: '/privacy',   // Privacy Policy
  cookies: '/cookies',   // Cookie Policy
  delivery: '/delivery', // Delivery Policy
  refunds: '/refunds',   // Refund & Cancellation Policy
} as const;

export type LegalDocKey = keyof typeof LEGAL_LINKS;

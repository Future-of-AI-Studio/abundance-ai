export const LEGAL_LINKS = {
  terms: '#',     // Terms of Service
  privacy: '#',   // Privacy Policy
  cookies: '#',   // Cookie Policy
  delivery: '#',  // Delivery Policy
  refunds: '#',   // Refund & Cancellation Policy
} as const;

export type LegalDocKey = keyof typeof LEGAL_LINKS;

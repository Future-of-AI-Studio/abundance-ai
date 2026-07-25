import Stripe from 'stripe';

// Stripe configured for Deno's fetch HTTP client. Keys live in Supabase secrets;
// they never reach the client (only the publishable key is returned to the UI).
const SECRET = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

// Sign-up fee in cents — the account-first "$25 gate". Overridable via the
// SIGNUP_AMOUNT_CENTS secret so the LIVE gateway can be smoke-tested for a tiny
// amount: `supabase secrets set SIGNUP_AMOUNT_CENTS=50` on the target project,
// then `supabase secrets unset SIGNUP_AMOUNT_CENTS` to restore the $25 default.
// Floored at 50 because Stripe rejects USD charges under $0.50 (amount_too_small).
export const SIGNUP_AMOUNT_CENTS = Math.max(
  50,
  Math.trunc(Number(Deno.env.get('SIGNUP_AMOUNT_CENTS') ?? '')) || 2500,
);

// Optional platform fee taken from each creator enrollment, in basis points
// (100 = 1%). Default 0 → the creator keeps the full amount; the charge is a
// direct charge on their connected account and AbundanceAI never holds the funds.
// Set PLATFORM_FEE_BPS in Supabase secrets to start collecting an application fee.
const PLATFORM_FEE_BPS = Math.max(0, Math.trunc(Number(Deno.env.get('PLATFORM_FEE_BPS') ?? '0')) || 0);

export function platformFeeCents(amountCents: number): number {
  if (PLATFORM_FEE_BPS <= 0) return 0;
  return Math.round((amountCents * PLATFORM_FEE_BPS) / 10000);
}

export function stripeClient(): Stripe {
  return new Stripe(SECRET, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function stripeConfigured(): boolean {
  return SECRET.trim().length > 0;
}

export function publishableKey(): string {
  return Deno.env.get('STRIPE_PUBLISHABLE_KEY') ?? '';
}

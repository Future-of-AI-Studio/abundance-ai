import Stripe from 'stripe';

// Stripe configured for Deno's fetch HTTP client. Keys live in Supabase secrets;
// they never reach the client (only the publishable key is returned to the UI).
const SECRET = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

export const SIGNUP_AMOUNT_CENTS = 2500;

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

// Frontend env. Only publishable values are ever exposed to the client.
// VITE_USE_MOCKS=true runs the whole app against an in-memory mock adapter so
// the UI is buildable/testable before the backend is wired (spec: swap with one flag).

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '',
  // Public storage bucket for guide videos (Guidance page). Empty → the video
  // cards fall back to their "Coming soon" placeholder.
  guidesBucketUrl: import.meta.env.VITE_GUIDES_BUCKET_URL ?? '',
  useMocks:
    String(import.meta.env.VITE_USE_MOCKS ?? '').toLowerCase() === 'true' ||
    !import.meta.env.VITE_SUPABASE_URL, // default to mocks when not configured
  // Deployment environment. Only 'test' opts out of production-only guards (e.g.
  // locking the program-page share link until Stripe is connected). Anything else
  // — including unset — resolves to 'production', so a missing value never silently
  // disables a guard in prod.
  environment: (String(import.meta.env.VITE_ENVIRONMENT ?? 'production').toLowerCase() === 'test'
    ? 'test'
    : 'production') as 'test' | 'production',
};

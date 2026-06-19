// Frontend env. Only publishable values are ever exposed to the client.
// VITE_USE_MOCKS=true runs the whole app against an in-memory mock adapter so
// the UI is buildable/testable before the backend is wired (spec: swap with one flag).

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '',
  useMocks:
    String(import.meta.env.VITE_USE_MOCKS ?? '').toLowerCase() === 'true' ||
    !import.meta.env.VITE_SUPABASE_URL, // default to mocks when not configured
};

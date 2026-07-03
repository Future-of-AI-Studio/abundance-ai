import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client factory. Uses only the ANON key + URL (both safe to
 * ship to the client). Auth/session + direct table reads go through this;
 * anything needing server logic or AI goes through Edge Functions.
 */
export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

let cached: SupabaseClient | null = null;

export function createBrowserSupabase(env: SupabaseEnv): SupabaseClient {
  if (cached) return cached;
  cached = createClient(env.url, env.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // magic-link support
    },
  });
  return cached;
}

/** Table name constants — avoids stringly-typed `.from('...')` drift. */
export const TABLES = {
  profiles: 'profiles',
  orders: 'orders',
  journey_state: 'journey_state',
  programs: 'programs',
  modules: 'modules',
  content_sources: 'content_sources',
  marketing_posts: 'marketing_posts',
  sessions: 'sessions',
  stripe_connect: 'stripe_connect',
  mindset_checkins: 'mindset_checkins',
  mindset_quota: 'mindset_quota',
  mindset_conversations: 'mindset_conversations',
  mindset_messages: 'mindset_messages',
  circles: 'circles',
  circle_members: 'circle_members',
  expert_talks: 'expert_talks',
  testimonials: 'testimonials',
  refund_requests: 'refund_requests',
  ai_usage_logs: 'ai_usage_logs',
  response_cache: 'response_cache',
} as const;

export const CONTENT_BUCKET = 'content';
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
// Document uploads are restricted to what Gemini can actually read inline: PDFs
// and images. (Word docs aren't analyzable; speech goes through the recorder,
// which stores WAV.) Keep this in sync with the server allowlist in
// content-upload-url and the storage bucket's allowed_mime_types.
export const ACCEPTED_UPLOAD_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
];
/** `accept` attribute for the file picker — mirrors ACCEPTED_UPLOAD_TYPES. */
export const ACCEPTED_UPLOAD_ACCEPT = '.pdf,image/png,image/jpeg,image/webp';

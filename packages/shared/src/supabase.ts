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
  enrollments: 'enrollments',
  program_views: 'program_views',
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
/**
 * What a single build can take in from uploaded documents (PDF / image): how many
 * files it will read, and roughly how many bytes of them it can carry. The build
 * picks documents by size until whichever limit runs out first.
 *
 * Mirrors MAX_INLINE_DOCS and MEDIA_CAP_ENCODED in
 * supabase/functions/program-build/index.ts — together they bound the work one
 * build does, so a large library can't run the request past the Edge Runtime
 * limit. Keep them in sync; these copies exist so the upload screen can say the
 * numbers out loud before anyone hits them.
 *
 * The byte figure is the raw-file equivalent of the build's 18 MB *encoded* cap
 * (inline media is base64, which inflates by 4/3).
 */
export const MAX_BUILD_DOCUMENTS = 24;
export const MAX_BUILD_DOCUMENT_BYTES = (18 * 1024 * 1024 * 3) / 4;
// Document uploads are restricted to what Gemini can actually read inline: PDFs,
// images, and plain text (typed/pasted notes are stored as .txt). Word docs
// aren't analyzable; speech goes through the recorder, which stores WAV. Keep
// this in sync with the server allowlist in content-upload-url and the storage
// bucket's allowed_mime_types.
export const ACCEPTED_UPLOAD_TYPES = [
  'application/pdf',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp',
];
/** `accept` attribute for the file picker — mirrors ACCEPTED_UPLOAD_TYPES. */
export const ACCEPTED_UPLOAD_ACCEPT = '.pdf,.txt,text/plain,image/png,image/jpeg,image/webp';

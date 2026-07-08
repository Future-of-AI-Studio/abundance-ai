// The single backend seam. Pages/store talk to `backend` only — never to Supabase
// or fetch directly — so one flag (env.useMocks) swaps the live implementation
// for the in-memory mock with zero page changes.
import type {
  AbundanceClient,
  Category,
  Profile,
  JourneyState,
  Program,
  Module,
  MarketingPost,
  Session,
  StripeConnect,
  MindsetCheckin,
  MindsetConversation,
  MindsetMessage,
  ContentSource,
  Enrollment,
  ProgramStats,
} from '@abundance/shared';

export interface AuthUser {
  id: string;
  email: string;
}

export interface ProgramWithModules {
  program: Program | null;
  modules: Module[];
}

/** Auth surface (mirrors the subset of supabase.auth the app needs). */
export interface BackendAuth {
  getUser(): Promise<AuthUser | null>;
  onChange(cb: (user: AuthUser | null) => void): () => void;
  signUpWithPassword(args: {
    email: string;
    password: string;
    firstName: string;
    category: Category;
    // The user's own words when category === 'other'; ignored otherwise.
    categoryOther?: string | null;
  }): Promise<{ user: AuthUser | null; needsConfirmation: boolean }>;
  signInWithPassword(args: { email: string; password: string }): Promise<AuthUser>;
  signInWithMagicLink(email: string): Promise<void>;
  signOut(): Promise<void>;
}

/** Direct table reads (RLS-scoped in live mode). */
export interface BackendReads {
  getProfile(): Promise<Profile | null>;
  getJourney(): Promise<JourneyState | null>;
  /** The active build — the one the app reads everywhere as "your program". */
  getProgram(): Promise<ProgramWithModules>;
  /** All of the user's retained builds (metadata only), newest first — powers the build switcher. */
  getPrograms(): Promise<Program[]>;
  /** Modules for a specific build — used to preview a non-active build before activating it. */
  getProgramModules(programId: string): Promise<Module[]>;
  getMarketingPosts(): Promise<MarketingPost[]>;
  getSession(): Promise<Session | null>;
  getStripeConnect(): Promise<StripeConnect | null>;
  getLatestCheckin(): Promise<MindsetCheckin | null>;
  /** Recent mindset reflections, newest first — powers the Mindset dashboard. */
  getCheckins(): Promise<MindsetCheckin[]>;
  /** Recent mindset chat threads, newest activity first — powers "resume a chat". */
  getConversations(): Promise<MindsetConversation[]>;
  /** All messages in a conversation, oldest first. */
  getMessages(conversationId: string): Promise<MindsetMessage[]>;
  /** The user's saved content sources (uploads + recordings), newest first — Step 2's draft. */
  getContentSources(): Promise<ContentSource[]>;
  /** Buyers who enrolled through the creator's program landing page, newest first. */
  getEnrollments(): Promise<Enrollment[]>;
  /** Aggregated landing-page view counts (total + this week) — powers Home metrics. */
  getProgramStats(): Promise<ProgramStats>;
  updateProfile(patch: Partial<Pick<Profile, 'first_name' | 'category' | 'category_other' | 'bio' | 'avatar_url'>>): Promise<Profile>;
}

/** Content upload (signed URL issued by the Edge Function, bytes PUT by the client). */
export interface BackendStorage {
  upload(file: File, kind: 'file' | 'voice', durationSec?: number): Promise<{ id: string; filename: string }>;
  /** Upload a profile picture to the public avatars bucket; returns its public URL. */
  uploadAvatar(file: File): Promise<string>;
  /** Remove a saved source — deletes the stored object and its content_sources row. */
  remove(id: string): Promise<void>;
  /** A short-lived, playable URL for a stored object (the bucket is private → signed). */
  signedUrl(storagePath: string): Promise<string>;
}

export interface Backend {
  auth: BackendAuth;
  reads: BackendReads;
  storage: BackendStorage;
  api: AbundanceClient;
}

// Lazily resolve so the heavy supabase client isn't created in mock mode.
import { env } from './env';

let _backend: Backend | null = null;
export async function getBackend(): Promise<Backend> {
  if (_backend) return _backend;
  if (env.useMocks) {
    const { createMockBackend } = await import('@/mocks/mockBackend');
    _backend = createMockBackend();
  } else {
    const { createLiveBackend } = await import('./liveBackend');
    _backend = createLiveBackend();
  }
  return _backend;
}

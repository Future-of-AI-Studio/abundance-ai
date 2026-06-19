// The single backend seam. Pages/store talk to `backend` only — never to Supabase
// or fetch directly — so one flag (env.useMocks) swaps the live implementation
// for the in-memory mock with zero page changes.
import type {
  AbundanceClient,
  Profile,
  JourneyState,
  Program,
  Module,
  MarketingPost,
  Session,
  StripeConnect,
  MindsetCheckin,
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
  }): Promise<{ user: AuthUser | null; needsConfirmation: boolean }>;
  signInWithPassword(args: { email: string; password: string }): Promise<AuthUser>;
  signInWithMagicLink(email: string): Promise<void>;
  signOut(): Promise<void>;
}

/** Direct table reads (RLS-scoped in live mode). */
export interface BackendReads {
  getProfile(): Promise<Profile | null>;
  getJourney(): Promise<JourneyState | null>;
  getProgram(): Promise<ProgramWithModules>;
  getMarketingPosts(): Promise<MarketingPost[]>;
  getSession(): Promise<Session | null>;
  getStripeConnect(): Promise<StripeConnect | null>;
  getLatestCheckin(): Promise<MindsetCheckin | null>;
  /** Recent mindset reflections, newest first — powers the Mindset dashboard. */
  getCheckins(): Promise<MindsetCheckin[]>;
  updateProfile(patch: Partial<Pick<Profile, 'first_name' | 'category'>>): Promise<Profile>;
}

/** Content upload (signed URL issued by the Edge Function, bytes PUT by the client). */
export interface BackendStorage {
  upload(file: File, kind: 'file' | 'voice', durationSec?: number): Promise<{ id: string; filename: string }>;
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

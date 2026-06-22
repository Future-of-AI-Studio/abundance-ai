// Global app store (Zustand) — the slices from spec §7.5, hydrated from the
// backend (mock or live). Pages read from here and call the refreshers after
// actions; the backend remains the source of truth.
import { create } from 'zustand';
import { getBackend } from '@/lib/backend';
import type { AuthUser, Backend, ProgramWithModules } from '@/lib/backend';
import type {
  Profile,
  JourneyState,
  MarketingPost,
  Session,
  StripeConnect,
  MindsetCheckin,
  ContentSource,
} from '@abundance/shared';

interface AppState {
  // lifecycle
  backend: Backend | null;
  ready: boolean; // initial auth/session resolved
  // §7.5 slices
  user: AuthUser | null;
  profile: Profile | null;
  journey: JourneyState | null;
  program: ProgramWithModules;
  posts: MarketingPost[];
  session: Session | null;
  payments: StripeConnect | null;
  latestCheckin: MindsetCheckin | null;
  contentSources: ContentSource[]; // Step 2 draft — auto-saved uploads/recordings

  init: () => Promise<void>;
  hydrate: () => Promise<void>;
  refreshJourney: () => Promise<void>;
  refreshProgram: () => Promise<void>;
  refreshMarketing: () => Promise<void>;
  refreshSession: () => Promise<void>;
  refreshPayments: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshContent: () => Promise<void>;
  setUser: (u: AuthUser | null) => void;
}

export const useApp = create<AppState>((set, get) => ({
  backend: null,
  ready: false,
  user: null,
  profile: null,
  journey: null,
  program: { program: null, modules: [] },
  posts: [],
  session: null,
  payments: null,
  latestCheckin: null,
  contentSources: [],

  async init() {
    const backend = await getBackend();
    set({ backend });
    const user = await backend.auth.getUser();
    set({ user });
    backend.auth.onChange((u) => {
      set({ user: u });
      if (u) void get().hydrate();
      else set({ profile: null, journey: null, program: { program: null, modules: [] }, posts: [], session: null, payments: null, latestCheckin: null, contentSources: [] });
    });
    if (user) await get().hydrate();
    set({ ready: true });
  },

  async hydrate() {
    const b = get().backend;
    if (!b) return;
    const [profile, journey, program, posts, session, payments, latestCheckin, contentSources] = await Promise.all([
      b.reads.getProfile(),
      b.reads.getJourney(),
      b.reads.getProgram(),
      b.reads.getMarketingPosts(),
      b.reads.getSession(),
      b.reads.getStripeConnect(),
      b.reads.getLatestCheckin(),
      b.reads.getContentSources(),
    ]);
    set({ profile, journey, program, posts, session, payments, latestCheckin, contentSources });
  },

  async refreshJourney() { const b = get().backend; if (b) set({ journey: await b.reads.getJourney() }); },
  async refreshProgram() { const b = get().backend; if (b) set({ program: await b.reads.getProgram() }); },
  async refreshMarketing() { const b = get().backend; if (b) set({ posts: await b.reads.getMarketingPosts() }); },
  async refreshSession() { const b = get().backend; if (b) set({ session: await b.reads.getSession() }); },
  async refreshPayments() { const b = get().backend; if (b) set({ payments: await b.reads.getStripeConnect() }); },
  async refreshProfile() { const b = get().backend; if (b) set({ profile: await b.reads.getProfile() }); },
  async refreshContent() { const b = get().backend; if (b) set({ contentSources: await b.reads.getContentSources() }); },
  setUser(user) { set({ user }); },
}));

/** Convenience hook to grab the resolved backend (after init). */
export function useBackend(): Backend {
  const b = useApp((s) => s.backend);
  if (!b) throw new Error('Backend not initialized — call useApp.init() in App.');
  return b;
}

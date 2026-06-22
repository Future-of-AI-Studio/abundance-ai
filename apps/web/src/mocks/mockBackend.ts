// In-memory mock backend — a full, demoable AbundanceAI with no server. Persists
// to localStorage so reloads keep state. Mirrors the live backend's behavior:
// journey, AI program build, marketing, the 3/week mindset cap, circle, refunds.
import type {
  Backend,
  AuthUser,
  ProgramWithModules,
} from '@/lib/backend';
import type {
  Profile,
  JourneyState,
  MarketingPost,
  Session,
  StripeConnect,
  MindsetCheckin,
  MindsetConversation,
  MindsetMessage,
  ContentSource,
  AbundanceClient,
  Category,
} from '@abundance/shared';
import { AbundanceApiError } from '@abundance/shared';
import { MOCK } from './mockData';

const KEY = 'abundance_mock_state_v1';
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const uid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

interface MockState {
  user: AuthUser | null;
  profile: Profile | null;
  journey: JourneyState | null;
  program: ProgramWithModules;
  posts: MarketingPost[];
  session: Session | null;
  stripe: StripeConnect | null;
  checkins: MindsetCheckin[];
  quota: { week_start: string; count: number; cap: number };
  conversations: MindsetConversation[];
  messages: MindsetMessage[];
  contentSources: ContentSource[];
}

const CHAT_DAILY_CAP = 20;
function startOfTodayMs(): number {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
}

function weekStart(): string {
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

function fresh(): MockState {
  return {
    user: null,
    profile: null,
    journey: null,
    program: { program: null, modules: [] },
    posts: [],
    session: null,
    stripe: null,
    checkins: [],
    quota: { week_start: weekStart(), count: 0, cap: 3 },
    conversations: [],
    messages: [],
    contentSources: [],
  };
}

function load(): MockState {
  try {
    const raw = localStorage.getItem(KEY);
    // Merge over defaults so state saved before new fields existed stays valid.
    if (raw) return { ...fresh(), ...(JSON.parse(raw) as Partial<MockState>) };
  } catch {
    /* ignore */
  }
  return fresh();
}

export function createMockBackend(): Backend {
  let state = load();
  const listeners = new Set<(u: AuthUser | null) => void>();
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  const emit = () => listeners.forEach((cb) => cb(state.user));

  function bootstrapUser(email: string, firstName: string, category: Category = 'other') {
    const id = uid();
    state.user = { id, email };
    state.profile = { id, first_name: firstName, email, avatar_url: null, category, created_at: nowIso() };
    state.journey = { user_id: id, path: null, current_step: null, completed_steps: [], updated_at: nowIso() };
    state.session = { user_id: id, platform: 'google_meet', meet_link: null, updated_at: nowIso() };
    state.stripe = { user_id: id, connected: false, account_id: null, checklist: { bank: false, id: false, email: true }, updated_at: nowIso() };
    save();
    emit();
  }

  const api: AbundanceClient = {
    async checkoutSession() {
      await delay(400);
      return {
        client_secret: 'pi_mock_secret',
        order_id: uid(),
        payment_intent_id: `pi_mock_${Date.now()}`,
        amount_cents: 2500,
        publishable_key: 'pk_test_mock',
      };
    },
    async verifyPayment() {
      await delay(200);
      return { paid: true, email: 'demo@abundance.ai', order_id: uid() };
    },
    async contentUploadUrl(req) {
      await delay(150);
      return { content_source_id: uid(), storage_path: `mock/${req.filename}`, signed_url: 'mock://upload', token: 'mock' };
    },
    async programBuild(req) {
      await delay(2600); // narrated loader has time to breathe
      const programId = uid();
      const built = MOCK.buildProgram(req.path);
      state.program = {
        program: { id: programId, user_id: state.user!.id, title: built.title, status: 'ready', created_at: nowIso() },
        modules: built.modules.map((m, i) => ({ id: uid(), program_id: programId, idx: i, ...m })),
      };
      save();
      return { program: state.program.program!, modules: state.program.modules };
    },
    async programUpdate(req) {
      await delay(250);
      const p = state.program;
      if (p.program && req.title !== undefined) p.program.title = req.title;
      if (req.remove_module_ids?.length) {
        p.modules = p.modules.filter((m) => !req.remove_module_ids!.includes(m.id));
      }
      if (req.modules) {
        p.modules = req.modules.map((m, i) => ({
          id: m.id ?? uid(),
          program_id: p.program!.id,
          idx: m.idx ?? i,
          title: m.title,
          outcome: m.outcome,
          session_flow: m.session_flow,
        }));
      }
      p.modules.sort((a, b) => a.idx - b.idx);
      save();
      return { program: p.program!, modules: p.modules };
    },
    async marketingGenerate(req) {
      await delay(1800);
      state.posts = MOCK.posts(state.program.program?.title ?? 'Your program', req.include_email).map((p) => ({
        id: uid(), user_id: state.user!.id, created_at: nowIso(), posted: false, ...p,
      }));
      save();
      return { posts: state.posts };
    },
    async marketingUpdate(req) {
      await delay(150);
      const post = state.posts.find((p) => p.id === req.id);
      if (!post) throw new AbundanceApiError('not_found', "We couldn't find that post.");
      if (req.caption !== undefined) post.caption = req.caption;
      if (req.hashtags !== undefined) post.hashtags = req.hashtags;
      if (req.posted !== undefined) post.posted = req.posted;
      save();
      return { post };
    },
    async sessionsSetLink(req) {
      await delay(250);
      state.session = { user_id: state.user!.id, platform: req.platform ?? 'google_meet', meet_link: req.meet_link, updated_at: nowIso() };
      save();
      return { session: state.session };
    },
    async stripeConnect(req) {
      await delay(300);
      if (req.reconcile) {
        state.stripe = { ...state.stripe!, connected: true, checklist: { bank: true, id: true, email: true } };
        save();
        return { onboarding_url: null, connected: true, checklist: state.stripe.checklist };
      }
      return { onboarding_url: 'https://connect.stripe.com/mock-onboarding', connected: false, checklist: state.stripe!.checklist };
    },
    async mindsetCheckin(req) {
      await delay(req.user_note ? 1400 : 500);
      if (state.quota.week_start !== weekStart()) state.quota = { week_start: weekStart(), count: 0, cap: 3 };
      if (state.quota.count >= state.quota.cap) {
        return { status: 'limit', message: "You've used your 3 check-ins this week. Your circle is here in the meantime →", remaining: 0 };
      }
      const r = MOCK.reflection(req.wall_key, state.profile?.category ?? 'other');
      const cacheHit = !req.user_note && state.checkins.some((c) => c.wall_key === req.wall_key);
      const checkin: MindsetCheckin = {
        id: uid(), user_id: state.user!.id, wall_key: req.wall_key, prompt: r.prompt, reflection: r.reflection,
        user_note: req.user_note ?? null, cache_hit: cacheHit, created_at: nowIso(),
      };
      state.checkins.unshift(checkin);
      state.quota.count += 1;
      save();
      return { status: 'ok', checkin, cache_hit: cacheHit, remaining: Math.max(0, state.quota.cap - state.quota.count) };
    },
    async mindsetChat(req) {
      await delay(700);
      const usedToday = state.messages.filter(
        (m) => m.role === 'user' && new Date(m.created_at).getTime() >= startOfTodayMs(),
      ).length;
      if (usedToday >= CHAT_DAILY_CAP) {
        return { status: 'limit', message: "Let's pick this up tomorrow — you've done a lot of reflecting today. Your circle is here in the meantime →" };
      }

      let convId = req.conversation_id;
      if (!convId) {
        convId = uid();
        state.conversations.unshift({
          id: convId, title: req.message.slice(0, 80), wall_key: null,
          last_message_at: nowIso(), created_at: nowIso(),
        });
      }
      const turnIndex = state.messages.filter((m) => m.conversation_id === convId && m.role === 'user').length;
      state.messages.push({ id: uid(), conversation_id: convId, role: 'user', content: req.message, created_at: nowIso() });

      const reply = MOCK.chatReply(req.message, turnIndex);
      const assistantMsg: MindsetMessage = { id: uid(), conversation_id: convId, role: 'assistant', content: reply, created_at: nowIso() };
      state.messages.push(assistantMsg);

      const conv = state.conversations.find((c) => c.id === convId);
      if (conv) conv.last_message_at = nowIso();
      save();
      return { status: 'ok', conversation_id: convId, message: assistantMsg, daily_remaining: Math.max(0, CHAT_DAILY_CAP - (usedToday + 1)) };
    },
    async mindsetReflect(req) {
      await delay(1200);
      const conv = state.conversations.find((c) => c.id === req.conversation_id);
      if (!conv) throw new AbundanceApiError('not_found', "We couldn't find that conversation.");
      if (state.quota.week_start !== weekStart()) state.quota = { week_start: weekStart(), count: 0, cap: 3 };
      if (state.quota.count >= state.quota.cap) {
        return { status: 'limit', message: "You've used your 3 check-ins this week. Your circle is here in the meantime →", remaining: 0 };
      }
      const msgs = state.messages.filter((m) => m.conversation_id === req.conversation_id);
      const transcript = msgs.map((m) => m.content).join('\n');
      const wallKey = MOCK.classifyWall(transcript) as MindsetCheckin['wall_key'];
      const r = MOCK.reflection(wallKey, state.profile?.category ?? 'other');
      const checkin: MindsetCheckin = {
        id: uid(), user_id: state.user!.id, wall_key: wallKey, prompt: r.prompt, reflection: r.reflection,
        user_note: null, cache_hit: false, created_at: nowIso(),
      };
      state.checkins.unshift(checkin);
      conv.wall_key = wallKey;
      state.quota.count += 1;
      save();
      return { status: 'ok', checkin, cache_hit: false, remaining: Math.max(0, state.quota.cap - state.quota.count) };
    },
    async circleGet() {
      await delay(400);
      return MOCK.circle();
    },
    async testimonialCreate(req) {
      await delay(250);
      return { testimonial: { id: uid(), user_id: state.user!.id, text: req.text, permission_granted: req.permission_granted, created_at: nowIso() } };
    },
    async refundRequest() {
      await delay(300);
      return { within_window: true, status: 'requested', days_remaining: 76, message: "Done — your refund is on its way. No hard feelings, and you're always welcome back." };
    },
    async journeyUpdate(req) {
      await delay(120);
      const j = state.journey ?? { user_id: state.user!.id, path: null, current_step: null, completed_steps: [], updated_at: nowIso() };
      if (req.path !== undefined) j.path = req.path;
      if (req.current_step !== undefined) j.current_step = req.current_step;
      if (req.complete_step && !j.completed_steps.includes(req.complete_step)) j.completed_steps.push(req.complete_step);
      j.updated_at = nowIso();
      state.journey = j;
      save();
      return j;
    },
  };

  return {
    api,
    auth: {
      async getUser() {
        await delay(80);
        return state.user;
      },
      onChange(cb) {
        listeners.add(cb);
        return () => listeners.delete(cb);
      },
      async signUpWithPassword({ email, firstName }) {
        await delay(400);
        bootstrapUser(email, firstName || 'Friend');
        return { user: state.user, needsConfirmation: false };
      },
      async signInWithPassword({ email }) {
        await delay(400);
        if (!state.user) bootstrapUser(email, 'Friend');
        return state.user!;
      },
      async signInWithMagicLink() {
        await delay(300);
      },
      async signOut() {
        await delay(150);
        state = fresh();
        localStorage.removeItem(KEY);
        emit();
      },
    },
    reads: {
      async getProfile() { return state.profile; },
      async getJourney() { return state.journey; },
      async getProgram() { return state.program; },
      async getMarketingPosts() { return state.posts; },
      async getSession() { return state.session; },
      async getStripeConnect() { return state.stripe; },
      async getLatestCheckin() { return state.checkins[0] ?? null; },
      async getCheckins() { return state.checkins; },
      async getConversations() { return state.conversations; },
      async getMessages(conversationId) {
        return state.messages.filter((m) => m.conversation_id === conversationId);
      },
      async getContentSources() {
        // Newest first, mirroring the live query.
        return [...state.contentSources].sort((a, b) => b.created_at.localeCompare(a.created_at));
      },
      async updateProfile(patch) {
        if (state.profile) state.profile = { ...state.profile, ...patch };
        save();
        return state.profile!;
      },
    },
    storage: {
      async upload(file, kind, durationSec) {
        await delay(500);
        const id = uid();
        state.contentSources.unshift({
          id,
          user_id: state.user?.id ?? 'mock-user',
          kind,
          storage_path: `mock/${id}-${file.name}`,
          filename: file.name,
          duration_sec: durationSec ?? null,
          created_at: nowIso(),
        });
        save();
        return { id, filename: file.name };
      },
      async remove(id) {
        await delay(150);
        state.contentSources = state.contentSources.filter((s) => s.id !== id);
        save();
      },
    },
  };
}

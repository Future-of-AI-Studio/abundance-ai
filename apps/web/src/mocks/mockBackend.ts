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
  Program,
  MarketingPost,
  Session,
  StripeConnect,
  MindsetCheckin,
  MindsetConversation,
  MindsetMessage,
  ContentSource,
  Enrollment,
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
  // Every rebuild adds a build (newest first); at most one is_active. Mirrors the
  // live model where programs are retained and the user picks the active one.
  programs: ProgramWithModules[];
  posts: MarketingPost[];
  session: Session | null;
  stripe: StripeConnect | null;
  checkins: MindsetCheckin[];
  quota: { week_start: string; count: number; cap: number };
  conversations: MindsetConversation[];
  messages: MindsetMessage[];
  contentSources: ContentSource[];
  enrollments: Enrollment[];
  // Raw landing-page views (one row per /p/:id load) — powers Home's view + conversion stats.
  programViews: Array<{ id: string; program_id: string; creator_id: string; created_at: string }>;
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
    programs: [],
    posts: [],
    session: null,
    stripe: null,
    checkins: [],
    quota: { week_start: weekStart(), count: 0, cap: 3 },
    conversations: [],
    messages: [],
    contentSources: [],
    enrollments: [],
    programViews: [],
  };
}

function load(): MockState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MockState> & { program?: ProgramWithModules };
      // Merge over defaults so state saved before new fields existed stays valid.
      const merged = { ...fresh(), ...parsed };
      // Migrate legacy single-program state into the builds list (one active build).
      if (!parsed.programs && parsed.program?.program) {
        merged.programs = [
          { program: { ...parsed.program.program, is_active: true }, modules: parsed.program.modules ?? [] },
        ];
      }
      delete (merged as { program?: unknown }).program;
      return merged;
    }
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
  // In-memory storage_path → object URL, for playing back uploads/recordings this session.
  const blobUrls = new Map<string, string>();

  // The active build — what the app reads as "your program".
  const activeBuild = (): ProgramWithModules =>
    state.programs.find((b) => b.program?.is_active) ?? { program: null, modules: [] };
  const findBuild = (id: string): ProgramWithModules | undefined =>
    state.programs.find((b) => b.program?.id === id);

  function bootstrapUser(email: string, firstName: string, category: Category = 'other', categoryOther: string | null = null) {
    const id = uid();
    state.user = { id, email };
    state.profile = { id, first_name: firstName, email, avatar_url: null, category, category_other: category === 'other' ? categoryOther : null, bio: null, paid_at: nowIso(), created_at: nowIso() };
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
      // We retain up to 6 builds — at the cap the user must delete one first.
      if (state.programs.length >= 6) {
        throw new AbundanceApiError('build_limit', "You've reached the limit of 6 builds. Delete one to make room for a new one.");
      }
      const programId = uid();
      const built = MOCK.buildProgram(req.path);
      // Non-destructive: deactivate current builds, prepend the new active one.
      state.programs.forEach((b) => { if (b.program) b.program.is_active = false; });
      const build: ProgramWithModules = {
        program: { id: programId, user_id: state.user!.id, title: built.title, status: 'ready', price_cents: 2000, is_active: true, created_at: nowIso() },
        modules: built.modules.map((m, i) => ({ id: uid(), program_id: programId, idx: i, ...m })),
      };
      state.programs = [build, ...state.programs];
      save();
      return { program: build.program!, modules: build.modules };
    },
    async programActivate(req) {
      await delay(200);
      const target = findBuild(req.program_id);
      if (!target?.program) throw new AbundanceApiError('not_found', "We couldn't find that build.");
      state.programs.forEach((b) => { if (b.program) b.program.is_active = false; });
      target.program.is_active = true;
      save();
      return { program: target.program, modules: target.modules };
    },
    async programDelete(req) {
      await delay(200);
      const target = findBuild(req.program_id);
      if (!target?.program) throw new AbundanceApiError('not_found', "We couldn't find that build.");
      if (target.program.is_active) {
        throw new AbundanceApiError('active_build', 'That build is active. Switch to another build first, then delete this one.');
      }
      state.programs = state.programs.filter((b) => b.program?.id !== req.program_id);
      save();
      return { ok: true as const };
    },
    async programUpdate(req) {
      await delay(250);
      const p = findBuild(req.program_id);
      if (!p?.program) throw new AbundanceApiError('not_found', "We couldn't find that program.");
      if (req.title !== undefined) p.program.title = req.title;
      if (req.price_cents !== undefined) p.program.price_cents = req.price_cents;
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
          detail: m.detail ?? '',
          session_flow: m.session_flow,
          notes: m.notes ?? '',
          participant_notes: m.participant_notes ?? '',
        }));
      }
      p.modules.sort((a, b) => a.idx - b.idx);
      save();
      return { program: p.program, modules: p.modules };
    },
    async programPublic(req) {
      await delay(300);
      // Demo runs in one browser, so the "buyer" reads the creator's local build.
      // Each build has its own public URL, so look it up by id (not just the active one).
      const build = findBuild(req.program_id);
      const p = build?.program;
      if (!p || p.status !== 'ready') {
        throw new AbundanceApiError('not_found', "This program isn't available.");
      }
      return {
        program: { id: p.id, title: p.title, price_cents: p.price_cents },
        modules: build!.modules
          .slice()
          .sort((a, b) => a.idx - b.idx)
          .map((m) => ({ idx: m.idx, title: m.title, outcome: m.outcome, detail: m.detail })),
        creator: {
          first_name: state.profile?.first_name ?? 'Your host',
          category: state.profile?.category ?? 'other',
          avatar_url: state.profile?.avatar_url ?? null,
          email: state.profile?.email ?? 'hello@abundance.ai',
          bio: state.profile?.bio ?? null,
        },
      };
    },
    async programViewTrack(req) {
      await delay(120);
      const p = findBuild(req.program_id)?.program;
      // Only a sellable build gets counted — mirrors the live function.
      if (p && p.status === 'ready') {
        state.programViews.unshift({ id: uid(), program_id: p.id, creator_id: p.user_id, created_at: nowIso() });
        save();
      }
      return { ok: true as const };
    },
    async enrollSession(req) {
      await delay(300);
      const p = findBuild(req.program_id)?.program;
      if (!p) {
        throw new AbundanceApiError('not_found', "This program isn't available.");
      }
      // No real Stripe in the mock — the landing page shows the demo pay form.
      return { client_secret: null, payment_intent_id: `pi_mock_${Date.now()}`, amount_cents: p.price_cents, publishable_key: '', stripe: false };
    },
    async enroll(req) {
      await delay(600);
      const p = findBuild(req.program_id)?.program;
      if (!p) {
        throw new AbundanceApiError('not_found', "This program isn't available.");
      }
      state.enrollments.unshift({
        id: uid(), program_id: p.id, creator_id: p.user_id,
        name: req.name, email: req.email, contact: req.contact,
        amount_cents: p.price_cents, status: 'enrolled',
        stripe_payment_intent: req.payment_intent_id ?? null, created_at: nowIso(),
      });
      save();
      return {
        ok: true,
        program_title: p.title,
        creator_first_name: state.profile?.first_name ?? 'your host',
        amount_cents: p.price_cents,
      };
    },
    async marketingGenerate(req) {
      await delay(1800);
      const platforms = req.platforms ?? ['facebook', 'instagram', 'x', 'linkedin'];
      const phase = req.phase ?? 'launch';
      const targetCount = platforms.length + (req.include_email ? 1 : 0);
      const count = ({ 1: 5, 2: 3, 3: 3, 4: 2, 5: 2 } as Record<number, number>)[targetCount] ?? 2;
      const fresh = MOCK.posts(activeBuild().program?.title ?? 'Your program', platforms, req.include_email, count).map((p) => ({
        id: uid(), user_id: state.user!.id, created_at: nowIso(), posted: false, phase, ...p,
      }));
      // Replace only this phase's posts (mirrors the live backend).
      state.posts = [...state.posts.filter((p) => p.phase !== phase), ...fresh];
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
      async signUpWithPassword({ email, firstName, category, categoryOther }) {
        await delay(400);
        bootstrapUser(email, firstName || 'Friend', category, categoryOther ?? null);
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
      async getProgram() { return activeBuild(); },
      async getPrograms() {
        return state.programs.map((b) => b.program).filter((p): p is Program => p !== null);
      },
      async getProgramModules(programId) { return findBuild(programId)?.modules ?? []; },
      async getMarketingPosts() { return state.posts; },
      async getSession() { return state.session; },
      async getStripeConnect() { return state.stripe; },
      async getLatestCheckin() { return state.checkins[0] ?? null; },
      async getCheckins() { return state.checkins; },
      async getConversations() {
        // Newest first, mirroring the live query.
        return [...state.conversations].sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
      },
      async getMessages(conversationId) {
        return state.messages.filter((m) => m.conversation_id === conversationId);
      },
      async getContentSources() {
        // Newest first, mirroring the live query.
        return [...state.contentSources].sort((a, b) => b.created_at.localeCompare(a.created_at));
      },
      async getEnrollments() {
        return [...state.enrollments].sort((a, b) => b.created_at.localeCompare(a.created_at));
      },
      async getProgramStats() {
        const weekAgo = Date.now() - 7 * 86_400_000;
        const views_this_week = state.programViews.filter(
          (v) => new Date(v.created_at).getTime() >= weekAgo,
        ).length;
        return { views: state.programViews.length, views_this_week };
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
        const storagePath = `mock/${id}-${file.name}`;
        // Keep a playable object URL in memory so the recording can be played back
        // this session (blob URLs don't survive a reload — fine for the mock).
        blobUrls.set(storagePath, URL.createObjectURL(file));
        state.contentSources.unshift({
          id,
          user_id: state.user?.id ?? 'mock-user',
          kind,
          storage_path: storagePath,
          filename: file.name,
          duration_sec: durationSec ?? null,
          created_at: nowIso(),
        });
        save();
        return { id, filename: file.name };
      },
      async uploadAvatar(file) {
        await delay(400);
        // Encode as a data URL so it renders with no backend and survives a reload
        // via the persisted store (blob URLs don't).
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Upload failed.'));
          reader.readAsDataURL(file);
        });
      },
      async remove(id) {
        await delay(150);
        const gone = state.contentSources.find((s) => s.id === id);
        if (gone) { const u = blobUrls.get(gone.storage_path); if (u) URL.revokeObjectURL(u); blobUrls.delete(gone.storage_path); }
        state.contentSources = state.contentSources.filter((s) => s.id !== id);
        save();
      },
      async signedUrl(storagePath) {
        const u = blobUrls.get(storagePath);
        if (!u) throw new Error('That recording isn\'t available anymore (demo resets on reload).');
        return u;
      },
    },
  };
}

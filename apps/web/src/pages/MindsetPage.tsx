import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  WALL_KEYS,
  type WallKey,
  type MindsetCheckin,
  type MindsetConversation,
  type MindsetMessage,
} from '@abundance/shared';
import { Button, Card, Textarea, TextInput, Eyebrow } from '@/components/ui';
import { HeartIcon, ArrowRight, ArrowLeft } from '@/components/ui/icons';
import { VideoPlayer } from '@/components/media/VideoPlayer';
import { cn } from '@/lib/cn';
import { useApp } from '@/store';
import { toast } from '@/store/toast';

// [12] Mindset Check-In — a calm dashboard (weekly progress + a recommended
// "right now" reflection + recent reflections) that opens into a category-aware
// courage prompt. Typing indicator while generating; cached responses appear
// instantly. Counts toward the 3/week cap; at the cap it warmly redirects to
// Circle (never a wall).
const WALL_LABELS: Record<WallKey, string> = {
  'who-am-i-to-teach': 'Who am I to teach this?',
  'fear-of-being-seen': 'I\'m scared of being seen',
  'charging-money': 'It feels wrong to charge',
  'tech-overwhelm': 'The tech overwhelms me',
  'staying-consistent': 'I won\'t keep it up',
  'comparing-myself': 'Everyone\'s ahead of me',
};

// Warm invitation copy for the dashboard's "right now" card — the teaser shown
// before a reflection begins (the reflection itself is generated on start).
const FEATURED: Record<WallKey, { quote: string; teaser: string }> = {
  'who-am-i-to-teach': { quote: 'Who am I to teach this?', teaser: "Your students aren't looking for the world's expert — just someone a step ahead. That's you." },
  'fear-of-being-seen': { quote: 'What if nobody shows up?', teaser: "You don't need a crowd. You need the right few. Let's look at who your first students really are." },
  'charging-money': { quote: 'It feels wrong to charge.', teaser: "Charging isn't taking — it's what lets you keep showing up for the people you help." },
  'tech-overwhelm': { quote: 'The tech overwhelms me.', teaser: "You don't have to learn all of it. Just the next small step — and we'll take it together." },
  'staying-consistent': { quote: "What if I can't keep it up?", teaser: "Consistency isn't intensity. Let's find a rhythm that fits the life you already have." },
  'comparing-myself': { quote: "Everyone's ahead of me.", teaser: "Their chapter 20 isn't your chapter 2. Let's come back to your own pace." },
};

// Mirrors the backend's 3/week mindset cap.
const WEEKLY_CAP = 3;

// Tappable conversation openers — common things people arrive with. Seeded from
// the FEATURED walls so the chat starts somewhere true.
const SUGGESTED_QUESTIONS = [
  'Who am I to teach this?',
  'It feels wrong to charge — is that normal?',
  "I'm scared no one will show up.",
  'The tech is overwhelming me.',
];

// In-chat follow-up prompts — gentle reframing nudges offered above the composer.
const CHAT_FOLLOWUPS = [
  "I don't feel expert enough.",
  'What if they know more than me?',
  'Help me reframe this.',
];

// "today" / "yesterday" / weekday / "Jun 3" — relative label for reflections.
function relativeDay(iso: string): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return new Date(iso).toLocaleDateString(undefined, { weekday: 'short' });
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Is the reflection from the current (Monday-start) week? Drives weekly progress.
function isThisWeek(iso: string): boolean {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((now.getDay() + 6) % 7));
  return new Date(iso).getTime() >= monday.getTime();
}

type Mode = 'dashboard' | 'chat';

export function MindsetPage() {
  const navigate = useNavigate();
  const { backend } = useApp();
  const [loading, setLoading] = useState(false);
  const [checkin, setCheckin] = useState<MindsetCheckin | null>(null);
  const [limit, setLimit] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [showTestimonial, setShowTestimonial] = useState(false);
  const [picking, setPicking] = useState(false);
  const [history, setHistory] = useState<MindsetCheckin[]>([]);

  // Chat: a free-form, multi-turn conversation that can be saved as a reflection.
  const [mode, setMode] = useState<Mode>('dashboard');
  const [conversations, setConversations] = useState<MindsetConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MindsetMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dailyLimit, setDailyLimit] = useState<string | null>(null); // chat capped for today
  const [saveNotice, setSaveNotice] = useState<string | null>(null); // weekly cap on saving
  const threadEndRef = useRef<HTMLDivElement>(null);

  const loadHistory = () => {
    backend?.reads.getCheckins().then(setHistory).catch(() => {});
  };
  const loadConversations = () => {
    backend?.reads.getConversations().then(setConversations).catch(() => {});
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadHistory(); loadConversations(); }, [backend]);

  // Keep the latest message in view as the thread grows.
  useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);

  const weekCount = history.filter((c) => isThisWeek(c.created_at)).length;
  const doneWalls = new Set(history.map((c) => c.wall_key));
  // Recommend the first wall the user hasn't reflected on yet; fall back to the first.
  const recommended = WALL_KEYS.find((w) => !doneWalls.has(w)) ?? WALL_KEYS[0];

  const start = async (wall: WallKey) => {
    if (!backend) return;
    setLoading(true);
    setCheckin(null);
    setLimit(null);
    setPicking(false);
    try {
      const res = await backend.api.mindsetCheckin({ wall_key: wall });
      if (res.status === 'limit') setLimit(res.message);
      else { setCheckin(res.checkin); setShowTestimonial(true); }
      loadHistory();
    } catch {
      toast.error("Let's try that again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setCheckin(null); setLimit(null); setNote(''); setShowTestimonial(false); setPicking(false); loadHistory(); };

  // ── Chat handlers ───────────────────────────────────────────────────────────
  const sendChat = async (text: string) => {
    const content = text.trim();
    if (!backend || !content || sending) return;
    setChatInput('');
    // Optimistically show the user's message while the reply lands.
    const optimistic: MindsetMessage = {
      id: `tmp-${Date.now()}`, conversation_id: conversationId ?? 'pending',
      role: 'user', content, created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setSending(true);
    try {
      const res = await backend.api.mindsetChat({ conversation_id: conversationId ?? undefined, message: content });
      if (res.status === 'limit') setDailyLimit(res.message);
      else {
        setConversationId(res.conversation_id);
        setMessages((m) => [...m, res.message]);
        loadConversations();
      }
    } catch {
      toast.error("Let's try that again in a moment.");
    } finally {
      setSending(false);
    }
  };

  const openNewChat = (seed?: string) => {
    setMode('chat');
    setConversationId(null);
    setMessages([]);
    setDailyLimit(null);
    setSaveNotice(null);
    setChatInput('');
    if (seed) void sendChat(seed);
  };

  const resumeChat = async (conv: MindsetConversation) => {
    if (!backend) return;
    setMode('chat');
    setConversationId(conv.id);
    setDailyLimit(null);
    setSaveNotice(null);
    setChatInput('');
    try {
      setMessages(await backend.reads.getMessages(conv.id));
    } catch {
      setMessages([]);
    }
  };

  const closeChat = () => { setMode('dashboard'); loadHistory(); loadConversations(); };

  const saveReflection = async () => {
    if (!backend || !conversationId || saving) return;
    setSaving(true);
    setSaveNotice(null);
    try {
      const res = await backend.api.mindsetReflect({ conversation_id: conversationId });
      if (res.status === 'limit') setSaveNotice(res.message);
      else {
        toast.success('Saved to your reflections. 🌱');
        loadHistory();
        loadConversations();
        setMode('dashboard');
      }
    } catch {
      toast.error("Let's try that again in a moment.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = !!conversationId && messages.some((m) => m.role === 'user');

  // ── Chat view ─────────────────────────────────────────────────────────────
  if (mode === 'chat') {
    // Title the conversation by its opening question, falling back to the saved
    // conversation title once the thread is persisted.
    const chatTitle =
      messages.find((m) => m.role === 'user')?.content
      ?? conversations.find((c) => c.id === conversationId)?.title
      ?? 'New conversation';

    return (
      <div className="flex flex-col bg-bg lg:min-h-0 lg:flex-1">
        {/* Header — back · title · save */}
        <header className="flex items-center gap-3 border-b border-line bg-surface-plain px-5 py-3.5 lg:px-8">
          <div className="flex flex-1 justify-start">
            <button onClick={closeChat} className="inline-flex items-center gap-1.5 text-body-sm text-ink-secondary hover:text-ink">
              <ArrowLeft width={18} height={18} /> Back
            </button>
          </div>
          <div className="min-w-0 max-w-[55%] text-center">
            <p className="font-mono text-eyebrow uppercase tracking-[0.12em] text-ink-secondary">Mindset conversation</p>
            <p className="truncate text-body font-semibold text-ink">&ldquo;{chatTitle}&rdquo;</p>
          </div>
          <div className="flex flex-1 justify-end">
            {canSave && (
              <Button size="sm" variant="secondary" fullWidth={false} loading={saving} onClick={saveReflection}>
                Save as reflection
              </Button>
            )}
          </div>
        </header>

        {/* Thread */}
        <div className="overflow-y-auto px-5 py-6 lg:min-h-0 lg:flex-1 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            <div className="flex justify-center">
              <span className="rounded-pill bg-surface px-3 py-1 text-caption text-ink-secondary">
                A private space · just between you and Mindset
              </span>
            </div>

            {messages.length === 0 && !sending && (
              <p className="py-8 text-center text-body-sm text-ink-secondary">Say what&apos;s on your mind. I&apos;m here.</p>
            )}

            {messages.map((m) => (
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-lg bg-primary px-4 py-2.5 text-body text-white">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-accent text-white">
                    <HeartIcon width={15} height={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 font-mono text-eyebrow uppercase tracking-[0.12em] text-accent">Mindset</p>
                    <div className="whitespace-pre-wrap rounded-lg border border-line bg-surface-plain px-4 py-3 text-body text-ink shadow-sm">
                      {m.content}
                    </div>
                  </div>
                </div>
              )
            ))}

            {sending && (
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-accent text-white">
                  <HeartIcon width={15} height={15} />
                </span>
                <div className="rounded-lg border border-line bg-surface-plain px-4 py-1 shadow-sm">
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={threadEndRef} />
          </div>
        </div>

        {/* Composer — pinned to the bottom on desktop; on mobile it flows with
            room to clear the fixed tab bar. */}
        <div className="border-t border-line bg-surface-plain px-5 pb-28 pt-4 lg:px-8 lg:pb-4">
          <div className="mx-auto max-w-3xl">
            {saveNotice && (
              <Card variant="plain" className="mb-3 border-accent/20 bg-success-bg/40 text-center">
                <p className="text-body-sm text-ink">{saveNotice}</p>
                <button onClick={() => navigate('/app/circle')} className="mt-2 text-body-sm font-medium text-accent hover:underline">Go to my circle →</button>
              </Card>
            )}

            {dailyLimit ? (
              <Card variant="plain" className="text-center">
                <p className="text-body-sm text-ink">{dailyLimit}</p>
                <button onClick={() => navigate('/app/circle')} className="mt-2 text-body-sm font-medium text-accent hover:underline">Go to my circle →</button>
              </Card>
            ) : (
              <>
                {messages.length > 0 && !sending && (
                  <div className="mb-3 flex flex-wrap justify-center gap-2">
                    {CHAT_FOLLOWUPS.map((q) => (
                      <button
                        key={q}
                        onClick={() => void sendChat(q)}
                        className="rounded-pill border border-line bg-surface-plain px-3 py-1.5 text-body-sm text-ink-secondary transition-colors hover:border-accent/40 hover:text-ink"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                <form
                  className="flex items-end gap-2"
                  onSubmit={(e) => { e.preventDefault(); void sendChat(chatInput); }}
                >
                  <TextInput
                    className="flex-1"
                    placeholder="Type a message…"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={sending}
                  />
                  <Button type="submit" size="md" fullWidth={false} disabled={!chatInput.trim() || sending} iconRight={<ArrowRight width={18} height={18} />}>
                    Send
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // The dashboard spreads into a two-column workspace; the focused states (a live
  // reflection, the wall picker, a cap notice) stay in a calm reading column.
  const isDashboard = !limit && !loading && !checkin && !picking;

  return (
    // Non-chat surface scrolls inside the shell's full-height main. The dashboard
    // spreads wide; the focused states stay in a calm reading column.
    <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
      <div className={cn('mx-auto w-full px-5 pb-28 pt-4 lg:px-8 lg:pb-16 lg:pt-12', isDashboard ? 'max-w-[1720px]' : 'max-w-calm')}>
        <Eyebrow className="mb-2 text-accent">Mindset</Eyebrow>

        {/* Limit state */}
        {limit ? (
          <Card variant="plain" className="text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-pill bg-primary/10 text-primary"><HeartIcon width={24} height={24} /></span>
            <p className="text-body text-ink">{limit}</p>
            <div className="mx-auto mt-5 max-w-xs">
              <Button iconRight={<ArrowRight width={18} height={18} />} onClick={() => navigate('/app/circle')}>Go to my circle</Button>
            </div>
          </Card>
        ) : loading ? (
          <Card variant="plain">
            <TypingIndicator />
          </Card>
        ) : checkin ? (
          <div className="space-y-4">
            <Card variant="plain">
              <h1 className="text-h2 font-semibold text-ink">{checkin.prompt}</h1>
              <p className="mt-3 whitespace-pre-wrap text-body text-ink">{checkin.reflection}</p>
              {checkin.cache_hit && <p className="mt-2 font-mono text-data text-ink-secondary">SERVED INSTANTLY</p>}
            </Card>

            <Card><VideoPlayer poster="" label="A word from Ruby" /></Card>

            <Card variant="plain">
              <Textarea label="How does that land?" placeholder="Optional — a line for yourself." value={note} onChange={(e) => setNote(e.target.value)} />
            </Card>

            {showTestimonial && <TestimonialCapture onDone={() => setShowTestimonial(false)} />}

            <div className="flex items-center gap-3">
              <Button onClick={() => { toast.success('Saved for you.'); navigate('/app'); }}>Done</Button>
              <Button variant="ghost" fullWidth={false} onClick={() => navigate('/app/circle')}>Talk to my circle →</Button>
            </div>
            <button onClick={reset} className="text-body-sm text-ink-secondary">Start another check-in</button>
          </div>
        ) : picking ? (
          /* Wall picker — reached from "Choose a different focus" */
          <div>
            <button onClick={() => setPicking(false)} className="mb-3 text-body-sm text-ink-secondary hover:text-ink">← Back</button>
            <h1 className="text-h1 font-bold text-ink">What's on your heart today?</h1>
            <p className="mt-2 text-body text-ink-secondary">Pick what's true right now. We'll meet you there.</p>
            <div className="mt-5 grid gap-3">
              {WALL_KEYS.map((w) => (
                <button key={w} onClick={() => start(w)} className="rounded-lg border border-line bg-surface-plain px-5 py-4 text-left text-body text-ink transition-colors hover:border-accent/40">
                  {WALL_LABELS[w]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Dashboard — weekly progress, a recommended reflection, recent history */
          <div>
            <h1 className="font-serif text-h1 font-medium text-ink">A little courage, right when you need it.</h1>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
              {/* Main — talk it through + the recommended reflection */}
              <div className="space-y-4">
                {/* Talk it through — open a free-form conversation with the coach */}
                <Card className="bg-surface-plain">
                  <Eyebrow className="text-accent">Talk it through</Eyebrow>
                  <h2 className="mt-2 font-serif text-h2 text-ink">What&apos;s on your mind?</h2>
                  <p className="mt-1 text-body-sm text-ink-secondary">Tell me what&apos;s going on — or start with one of these.</p>
                  <form
                    className="mt-3 flex items-end gap-2"
                    onSubmit={(e) => { e.preventDefault(); if (chatInput.trim()) openNewChat(chatInput.trim()); }}
                  >
                    <TextInput
                      className="flex-1"
                      placeholder="Type a message…"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                    />
                    <Button type="submit" size="md" fullWidth={false} disabled={!chatInput.trim()} iconRight={<ArrowRight width={18} height={18} />}>
                      Send
                    </Button>
                  </form>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => openNewChat(q)}
                        className="rounded-pill border border-line bg-surface-plain px-3 py-1.5 text-body-sm text-ink-secondary transition-colors hover:border-accent/40 hover:text-ink"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Recommended "right now" reflection */}
                <Card className="border-accent/20 bg-success-bg/50">
                  <Eyebrow className="text-accent">Right now</Eyebrow>
                  <h2 className="mt-2 font-serif text-h2 text-ink">&ldquo;{FEATURED[recommended].quote}&rdquo;</h2>
                  <p className="mt-2 text-body text-ink-secondary">{FEATURED[recommended].teaser}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <Button variant="accent" fullWidth={false} onClick={() => start(recommended)}>Start reflection</Button>
                    <button onClick={() => setPicking(true)} className="text-body-sm font-medium text-accent hover:underline">
                      Choose a different focus →
                    </button>
                  </div>
                </Card>
              </div>

              {/* Rail — weekly progress, recent reflections, past conversations */}
              <div className="space-y-4">
                <Card variant="plain" className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-body-sm font-semibold text-ink">Check-ins this week</p>
                    <span className="font-mono text-data text-ink-secondary">{weekCount} / {WEEKLY_CAP}</span>
                  </div>
                  <div className="mt-3 flex gap-1.5">
                    {Array.from({ length: WEEKLY_CAP }).map((_, i) => (
                      <span key={i} className={cn('h-1.5 flex-1 rounded-pill', i < weekCount ? 'bg-accent' : 'bg-accent/20')} />
                    ))}
                  </div>
                </Card>

                {history.length > 0 && (
                  <Card variant="plain" className="p-4">
                    <Eyebrow className="mb-3">Recent reflections</Eyebrow>
                    <div className="space-y-2">
                      {history.slice(0, 4).map((c) => (
                        <div key={c.id} className="rounded-md border border-line bg-surface/50 px-3 py-2">
                          <p className="truncate text-body-sm font-semibold text-ink">&ldquo;{WALL_LABELS[c.wall_key]}&rdquo;</p>
                          <p className="mt-0.5 truncate text-caption text-ink-secondary">
                            Reflected {relativeDay(c.created_at)}{c.user_note ? ` · ${c.user_note}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {conversations.length > 0 && (
                  <Card variant="plain" className="p-4">
                    <Eyebrow className="mb-2">Your conversations</Eyebrow>
                    <div className="divide-y divide-line">
                      {conversations.slice(0, 4).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => void resumeChat(c)}
                          className="flex w-full items-center justify-between gap-2 py-2.5 text-left hover:opacity-70"
                        >
                          <span className="min-w-0 truncate text-body-sm font-medium text-ink">{c.title ?? 'A conversation'}</span>
                          <ArrowRight width={16} height={16} className="shrink-0 text-ink-secondary" />
                        </button>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-4" aria-label="Thinking">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-2.5 w-2.5 animate-dot-pulse rounded-pill bg-primary" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  );
}

function TestimonialCapture({ onDone }: { onDone: () => void }) {
  const { backend } = useApp();
  const [text, setText] = useState('');
  const [permission, setPermission] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return <Card className="text-center text-body-sm text-success">Thank you — that means a lot. 🌱</Card>;

  return (
    <Card className="border-accent/30 bg-success-bg/40">
      <p className="text-body font-medium text-ink">Feeling it? Share a few words.</p>
      <Textarea className="mt-2" placeholder="What's shifting for you?" value={text} onChange={(e) => setText(e.target.value)} />
      <label className="mt-2 flex items-center gap-2 text-caption text-ink-secondary">
        <input type="checkbox" checked={permission} onChange={(e) => setPermission(e.target.checked)} className="h-4 w-4 accent-[#3F8E6E]" />
        You can share this to help others.
      </label>
      <div className="mt-3 flex gap-2">
        <Button size="sm" fullWidth={false} disabled={!text.trim()} onClick={async () => { if (backend && text.trim()) { await backend.api.testimonialCreate({ text, permission_granted: permission }); setDone(true); } }}>Share</Button>
        <Button size="sm" variant="ghost" fullWidth={false} onClick={onDone}>Not now</Button>
      </div>
    </Card>
  );
}

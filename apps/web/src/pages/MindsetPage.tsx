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
import { HeartIcon, ArrowRight } from '@/components/ui/icons';
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
    return (
      <div className="-mx-5 -mt-4 flex min-h-[calc(100dvh-7rem)] flex-col bg-gradient-to-b from-surface to-bg px-5 pt-6">
        <div className="mx-auto flex w-full max-w-calm flex-1 flex-col">
          <div className="mb-3 flex items-center justify-between">
            <button onClick={closeChat} className="text-body-sm text-ink-secondary hover:text-ink">← Back</button>
            {canSave && (
              <Button size="sm" variant="accent-secondary" fullWidth={false} loading={saving} onClick={saveReflection}>
                Save as reflection
              </Button>
            )}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pb-4">
            {messages.length === 0 && !sending && (
              <Card variant="plain" className="text-center text-body-sm text-ink-secondary">
                Say what&apos;s on your mind. I&apos;m here.
              </Card>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[82%] whitespace-pre-wrap rounded-lg px-4 py-2.5 text-body',
                  m.role === 'user' ? 'bg-primary text-white' : 'border border-line bg-surface-plain text-ink',
                )}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-lg border border-line bg-surface-plain px-4 py-1">
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={threadEndRef} />
          </div>

          {saveNotice && (
            <Card variant="plain" className="mb-3 border-accent/20 bg-success-bg/40 text-center">
              <p className="text-body-sm text-ink">{saveNotice}</p>
              <button onClick={() => navigate('/app/circle')} className="mt-2 text-body-sm font-medium text-accent hover:underline">Go to my circle →</button>
            </Card>
          )}

          {dailyLimit ? (
            <Card variant="plain" className="mb-3 text-center">
              <p className="text-body-sm text-ink">{dailyLimit}</p>
              <button onClick={() => navigate('/app/circle')} className="mt-2 text-body-sm font-medium text-accent hover:underline">Go to my circle →</button>
            </Card>
          ) : (
            <form
              className="mt-auto flex items-end gap-2 pb-2"
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
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-5 -mt-4 min-h-[calc(100dvh-7rem)] bg-gradient-to-b from-surface to-bg px-5 pt-6">
      <div className="mx-auto max-w-calm">
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

            {/* Weekly progress */}
            <Card variant="plain" className="mt-5 flex items-center justify-between">
              <span className="text-body text-ink">Check-ins this week</span>
              <span className="flex items-center gap-2.5">
                <span className="flex gap-1.5">
                  {Array.from({ length: WEEKLY_CAP }).map((_, i) => (
                    <span key={i} className={cn('h-2.5 w-2.5 rounded-pill', i < weekCount ? 'bg-accent' : 'bg-accent/20')} />
                  ))}
                </span>
                <span className="font-mono text-data text-ink-secondary">{weekCount} / {WEEKLY_CAP}</span>
              </span>
            </Card>

            {/* Talk it through — open a free-form conversation with the coach */}
            <Card className="mt-4">
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
            <Card className="mt-4 border-accent/20 bg-success-bg/50">
              <Eyebrow className="text-accent">Right now</Eyebrow>
              <h2 className="mt-2 font-serif text-h2 text-ink">&ldquo;{FEATURED[recommended].quote}&rdquo;</h2>
              <p className="mt-2 text-body text-ink-secondary">{FEATURED[recommended].teaser}</p>
              <div className="mt-4">
                <Button variant="accent" fullWidth={false} onClick={() => start(recommended)}>Start reflection</Button>
              </div>
              <button onClick={() => setPicking(true)} className="mt-3 text-body-sm font-medium text-accent hover:underline">
                Choose a different focus →
              </button>
            </Card>

            {/* Recent reflections */}
            {history.length > 0 && (
              <section className="mt-7">
                <Eyebrow className="mb-3">Recent reflections</Eyebrow>
                <div className="space-y-3">
                  {history.slice(0, 4).map((c) => (
                    <Card key={c.id} variant="plain">
                      <p className="truncate text-body font-semibold text-ink">&ldquo;{WALL_LABELS[c.wall_key]}&rdquo;</p>
                      <p className="mt-0.5 truncate text-caption text-ink-secondary">
                        Reflected {relativeDay(c.created_at)}{c.user_note ? ` · ${c.user_note}` : ''}
                      </p>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Resume a past conversation */}
            {conversations.length > 0 && (
              <section className="mt-7">
                <Eyebrow className="mb-3">Your conversations</Eyebrow>
                <div className="space-y-3">
                  {conversations.slice(0, 4).map((c) => (
                    <button key={c.id} onClick={() => void resumeChat(c)} className="block w-full text-left">
                      <Card variant="plain" className="transition-colors hover:border-accent/40">
                        <p className="truncate text-body font-semibold text-ink">{c.title ?? 'A conversation'}</p>
                        <p className="mt-0.5 truncate text-caption text-ink-secondary">
                          {c.wall_key ? 'Reflection saved · ' : ''}Last message {relativeDay(c.last_message_at)}
                        </p>
                      </Card>
                    </button>
                  ))}
                </div>
              </section>
            )}
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

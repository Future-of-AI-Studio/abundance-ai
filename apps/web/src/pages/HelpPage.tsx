import { useMemo, useState } from 'react';
import { Button, Card, Eyebrow } from '@/components/ui';
import {
  SearchIcon,
  PlusIcon,
  MinusIcon,
  ChatIcon,
  StarIcon,
  ProgramIcon,
  MegaphoneIcon,
  CardIcon,
  UsersIcon,
  UserIcon,
} from '@/components/ui/icons';

// [Help] A help-center landing page: search, browse-by-topic tiles, and the
// questions creators ask most, with the recommended session format alongside.
// Static guidance, no backend calls.

type Topic = {
  Icon: (p: { width?: number; height?: number }) => JSX.Element;
  title: string;
  blurb: string;
  count: number;
};

const TOPICS: Topic[] = [
  { Icon: StarIcon, title: 'Getting started', blurb: 'Your first steps, sharing ideas, and building a program.', count: 6 },
  { Icon: ProgramIcon, title: 'Building your program', blurb: 'Modules, builds, editing, and comparing versions.', count: 8 },
  { Icon: MegaphoneIcon, title: 'Marketing & social', blurb: 'Titles, descriptions, outreach, and post copy.', count: 5 },
  { Icon: CardIcon, title: 'Payments & payouts', blurb: 'Connecting payouts, pricing, and getting paid.', count: 4 },
  { Icon: UsersIcon, title: 'Sessions & students', blurb: 'Running sessions, formats, and enrollment.', count: 7 },
  { Icon: UserIcon, title: 'Account & billing', blurb: 'Profile, plan, and workspace settings.', count: 3 },
];

type Faq = { q: string; a: string };

const FAQS: Faq[] = [
  {
    q: 'How many mentoring sessions should I create?',
    a: "You can create anywhere from one to six sessions. If you're not sure, let AbundanceAI recommend the right number based on the ideas and materials you share — you can always adjust afterward.",
  },
  {
    q: 'How long should each session be?',
    a: 'Most online group mentoring sessions work well at 75–90 minutes: spend 20–40 minutes sharing your knowledge or framework, and use the rest for discussion, exercises, guidance, and Q&A.',
  },
  {
    q: 'Can I edit what AbundanceAI builds?',
    a: 'Yes. You can review the full program, edit any part, or create another version. Previous builds stay available so you can compare them and pick the sections you like best.',
  },
  {
    q: 'What can I upload as source material?',
    a: "Speak your ideas aloud, type directly into the platform, or upload notes, documents, presentations, and other materials — including useful content you've created with another AI. You don't need to organize it first; AbundanceAI will structure it for you.",
  },
  {
    q: 'How do I get paid by participants?',
    a: 'Connect Stripe once (about 5 minutes) and payouts go straight to your own account. Participants pay, and Stripe sends the funds directly to your connected bank account or debit card. AbundanceAI never holds your money.',
  },
];

// The recommended split of a session's time, rendered as two labelled bars.
const SESSION_SPLIT = [
  { label: 'Share your knowledge or framework', range: '20–40 min', pct: 40 },
  { label: 'Discussion, exercises & Q&A', range: 'The rest', pct: 60 },
];

export function HelpPage() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(0);

  const q = query.trim().toLowerCase();
  const faqs = useMemo(
    () => (q ? FAQS.filter((f) => (f.q + ' ' + f.a).toLowerCase().includes(q)) : FAQS),
    [q],
  );
  const topics = useMemo(
    () => (q ? TOPICS.filter((t) => (t.title + ' ' + t.blurb).toLowerCase().includes(q)) : TOPICS),
    [q],
  );

  return (
    <div>
      {/* Hero — centred search over the whole help center */}
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow className="text-accent">Help center</Eyebrow>
        <h1 className="mt-2 font-serif text-h1 font-medium text-ink">How can we help?</h1>
        <p className="mx-auto mt-2 max-w-md text-body text-ink-secondary">
          Search our guides, or browse a topic below to get the most out of AbundanceAI.
        </p>

        <div className="relative mt-6">
          <SearchIcon
            width={20}
            height={20}
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-secondary"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a topic, e.g. “session length”"
            className="h-12 w-full rounded-pill border border-line bg-surface-plain pl-11 pr-14 text-body text-ink shadow-sm outline-none placeholder:text-ink-secondary/60 focus:border-primary"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-surface px-2 py-1 font-mono text-eyebrow uppercase tracking-wide text-ink-secondary sm:block">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Browse by topic — tiles */}
      <section className="mt-10">
        <Eyebrow className="mb-3 text-accent">Browse by topic</Eyebrow>
        {topics.length === 0 ? (
          <p className="text-body-sm text-ink-secondary">No topics match “{query}”.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map(({ Icon, title, blurb, count }) => (
              <button
                key={title}
                type="button"
                onClick={() => setQuery(title)}
                className="group flex h-full flex-col rounded-lg border border-line bg-surface p-5 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon width={20} height={20} />
                </span>
                <h3 className="mt-3 text-h3 font-semibold text-ink">{title}</h3>
                <p className="mt-1 flex-1 text-body-sm text-ink-secondary">{blurb}</p>
                <p className="mt-4 font-mono text-data text-ink-secondary">
                  {/* {count} article{count === 1 ? '' : 's'} */}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Popular questions + session-format rail */}
      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <section>
          <Eyebrow className="mb-1 text-accent">Popular questions</Eyebrow>
          <h2 className="font-serif text-h2 text-ink">Answers to the things creators ask most</h2>

          {faqs.length === 0 ? (
            <p className="mt-4 text-body-sm text-ink-secondary">No questions match “{query}”.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {faqs.map((f) => {
                const idx = FAQS.indexOf(f);
                const isOpen = open === idx;
                return (
                  <Card key={f.q} variant="plain" className="p-0">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? -1 : idx)}
                      className="flex w-full items-center justify-between gap-4 p-5 text-left"
                    >
                      <span className="text-h3 font-semibold text-primary">{f.q}</span>
                      <span className="shrink-0 text-accent">
                        {isOpen ? <MinusIcon width={18} height={18} /> : <PlusIcon width={18} height={18} />}
                      </span>
                    </button>
                    {isOpen && <p className="px-5 pb-5 text-body-sm text-ink-secondary">{f.a}</p>}
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <Card>
            <Eyebrow className="text-accent">Recommended session format</Eyebrow>
            <h2 className="mt-2 font-serif text-h2 text-ink">Aim for 75–90 minutes</h2>
            <div className="mt-4 space-y-3">
              {SESSION_SPLIT.map((s) => (
                <div key={s.label}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-body-sm text-ink">{s.label}</span>
                    <span className="shrink-0 font-mono text-data text-ink-secondary">{s.range}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-pill bg-accent/15">
                    <div className="h-full rounded-pill bg-accent" style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-body-sm text-ink-secondary">
              A balance between sharing your expertise and giving participants room to engage and
              apply it.
            </p>
          </Card>

          <Card variant="plain" className="border border-accent/25 bg-accent/5">
            <Eyebrow className="text-accent">Still stuck?</Eyebrow>
            <p className="mt-2 text-body-sm text-ink-secondary">
              Reach out any time — we usually reply within a day.
            </p>
            <Button className="mt-4" iconLeft={<ChatIcon width={18} height={18} />}>
              Contact support
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}

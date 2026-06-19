import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui';
import {
  SparkleIcon,
  HeartIcon,
  CircleTabIcon,
  ShieldIcon,
  ArrowRight,
  CheckIcon,
} from '@/components/ui/icons';
import { VideoPlayer } from '@/components/media/VideoPlayer';

// [01] Landing — warm, video-first front door in the GrowLinkAI house style.
// Converts email-blast visitors into $25 sign-ups. Serif display + dotted warm
// backdrop, persona grid, a dark three-pillar band, steps, testimonials, price.

const PERSONAS = [
  { tag: 'The master hobbyist', Icon: CircleTabIcon, name: 'Fly fisherman, 30 years', line: 'Three decades of expertise — and never made a dollar from it. Until now.' },
  { tag: 'The expert healer', Icon: HeartIcon, name: 'Breathwork practitioner', line: 'Fabulously gifted, surviving on 1-on-1s. Ready to scale — just didn’t know how.' },
  { tag: 'The professional', Icon: ShieldIcon, name: 'Divorce attorney', line: 'Knows her stuff cold — but has never packaged her expertise into a program.' },
  { tag: 'The upgrader', Icon: SparkleIcon, name: 'Stalled online presence', line: 'Outdated and underperforming — ready to use AI to refresh and relaunch.' },
];

const PILLARS = [
  { no: '01', kind: 'Toolkit', Icon: SparkleIcon, title: 'AI done-for-you', line: 'Paint-by-numbers guidance through structuring your program, writing your marketing, and launching. The AI does the heavy lifting.' },
  { no: '02', kind: 'Mindset', Icon: HeartIcon, title: 'Courage, on tap', line: 'Proactive coaching that gets ahead of your fears — before you hit the wall. Always available, always patient, never judging.' },
  { no: '03', kind: 'Community', Icon: CircleTabIcon, title: 'A circle beside you', line: 'A matched peer group of 3–5 people on the same path, plus weekly expert talks. You are never doing this alone.' },
];

const STEPS = [
  { no: '01', title: 'Tell us what you know', line: 'Upload your notes — or just talk. Messy is fine. The AI listens.' },
  { no: '02', title: 'Watch it become real', line: 'In minutes, a structured 3–6 module program — titles, outcomes, flow. Yours to tweak.' },
  { no: '03', title: 'Marketing, written for you', line: 'Social posts and captions, ready to publish. You don’t write a word — just edit to taste.' },
  { no: '04', title: 'Get set up to get paid', line: 'A guided walkthrough gets payments flowing and your group meeting — simple as that.' },
];

const TESTIMONIALS = [
  { quote: 'I’d been “going to” do this for five years. I had a program by Sunday night.', name: 'Maya R.', role: 'Breathwork coach' },
  { quote: 'The check-ins knew exactly what I was afraid of. It felt like someone had my back.', name: 'Daniel K.', role: 'Fly-fishing guide' },
  { quote: 'My circle of four kept me going. We’re still meeting every week.', name: 'Priya S.', role: 'Family attorney' },
];

const FEATURES = [
  'AI builds your structured 3–6 module program',
  'Social posts written for you, ready to publish',
  'Proactive mindset coaching at every step',
  'A matched peer circle & weekly expert talks',
  'Guided setup to receive payment — we never touch your money',
];

function Eyebrow({ children, tone = 'green' }: { children: string; tone?: 'green' | 'amber' }) {
  return (
    <p className={cn('font-mono text-eyebrow uppercase tracking-[0.12em]', tone === 'amber' ? 'text-primary' : 'text-accent')}>
      {children}
    </p>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const start = () => navigate('/auth');
  const signIn = () => navigate('/auth?mode=signin');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="overflow-x-hidden bg-bg text-ink">
      {/* ============ NAV ============ */}
      <nav
        className={cn(
          'sticky top-0 z-50 border-b px-6 py-4 transition-colors duration-200',
          scrolled ? 'border-line bg-bg/85 shadow-sm backdrop-blur-md backdrop-saturate-150' : 'border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex max-w-[1140px] items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex gap-1">
              <span className="h-2.5 w-2.5 rounded-pill bg-primary" />
              <span className="h-2.5 w-2.5 rounded-pill bg-accent" />
            </span>
            <span className="text-h3 font-bold tracking-[-0.01em]">
              Abundance<span className="text-accent">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={signIn}
              className="rounded-md px-3 py-2.5 text-body-sm font-semibold text-ink-secondary transition-colors hover:text-ink"
            >
              Sign in
            </button>
            <button
              onClick={start}
              className="rounded-md bg-primary px-5 py-2.5 text-body-sm font-semibold text-white transition-colors hover:bg-primary-deep"
            >
              Start for $25
            </button>
          </div>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <header className="dots-warm px-6 pb-[clamp(56px,9vw,96px)] pt-[clamp(48px,8vw,88px)]">
        <div className="mx-auto flex max-w-[1140px] flex-wrap items-center gap-[clamp(32px,5vw,64px)]">
          <div className="min-w-[300px] flex-1 basis-[420px] rise-in">
            <Eyebrow>Share your gifts · make a living</Eyebrow>
            <h1 className="mt-5 text-balance font-serif text-[clamp(40px,6vw,62px)] font-medium leading-[1.04] tracking-[-0.015em] text-ink">
              It’s your time to share your gifts with the world.
            </h1>
            <p className="mt-5 max-w-[50ch] text-[clamp(17px,2vw,19px)] leading-relaxed text-ink-muted">
              You have the knowledge. AbundanceAI turns it into a real online program, gives you the
              courage to show up, and puts a circle of people beside you. No tech skills. No business
              background. <strong className="font-semibold text-ink">You just show up.</strong>
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={start}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-[30px] py-4 text-body font-semibold text-white transition-all hover:-translate-y-px hover:bg-primary-deep"
              >
                Start for $25
                <ArrowRight width={20} height={20} />
              </button>
              <span className="font-mono text-data text-ink-secondary">90-day money-back guarantee</span>
            </div>
          </div>

          {/* video */}
          <div className="min-w-[300px] flex-1 basis-[380px] rise-in">
            <div className="relative">
              <VideoPlayer poster="" label="Watch Ruby’s story" className="aspect-[4/3] rounded-xl border border-line" />
              <div className="pointer-events-none absolute bottom-4 left-4 rounded-pill bg-ink/80 px-3 py-1.5 text-caption font-medium text-ink-cream">
                Watch Ruby’s story · 2 min
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============ "EVEN IF" ============ */}
      <section className="bg-surface px-6 py-[clamp(56px,9vw,104px)]">
        <div className="mx-auto max-w-[900px]">
          <Eyebrow>For people who’ve been waiting</Eyebrow>
          <div className="mb-11 mt-9 flex flex-col gap-[22px]">
            {[
              'Even if you don’t know how to market yourself…',
              'Even if you don’t have a website, or yours is years out of date…',
              'Even if you’ve never turned your expertise into a program…',
            ].map((line, i) => (
              <div key={i} className="flex items-baseline gap-[18px]">
                <span className="shrink-0 font-mono text-body-sm text-primary">{`0${i + 1}`}</span>
                <p className="font-serif text-[clamp(22px,3.2vw,30px)] font-normal leading-[1.25] text-ink">{line}</p>
              </div>
            ))}
          </div>
          <p className="max-w-[34ch] text-[clamp(20px,2.6vw,26px)] font-semibold leading-snug text-ink">
            We walk you through all of it. You just show up.
          </p>
        </div>
      </section>

      {/* ============ PERSONAS ============ */}
      <section className="px-6 py-[clamp(56px,9vw,104px)]">
        <div className="mx-auto max-w-[1140px]">
          <div className="mb-12 max-w-[640px]">
            <Eyebrow>You’ll see yourself here</Eyebrow>
            <h2 className="mt-4 font-serif text-[clamp(30px,4.4vw,44px)] font-medium leading-[1.08] tracking-[-0.01em] text-ink">
              Real people, real gifts — finally getting out into the world.
            </h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5">
            {PERSONAS.map(({ tag, Icon, name, line }) => (
              <article
                key={tag}
                className="overflow-hidden rounded-xl border border-line bg-surface-plain transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex aspect-[5/4] items-center justify-center bg-gradient-to-br from-surface to-primary/10">
                  <span className="flex h-16 w-16 items-center justify-center rounded-pill bg-surface-plain text-primary shadow-sm">
                    <Icon width={28} height={28} />
                  </span>
                </div>
                <div className="p-5">
                  <p className="mb-2 font-mono text-data uppercase tracking-[0.06em] text-primary">{tag}</p>
                  <p className="mb-1.5 text-h3 font-semibold text-ink">{name}</p>
                  <p className="text-body-sm leading-relaxed text-ink-secondary">{line}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ THREE PILLARS (dark) ============ */}
      <section className="dots-cream bg-ink-deep px-6 py-[clamp(56px,9vw,108px)] text-ink-cream">
        <div className="mx-auto max-w-[1140px]">
          <div className="mb-14 max-w-[660px]">
            <p className="font-mono text-eyebrow uppercase tracking-[0.12em] text-accent-light">Three things, working together</p>
            <h2 className="mt-4 font-serif text-[clamp(30px,4.4vw,44px)] font-medium leading-[1.08] tracking-[-0.01em] text-ink-cream">
              The first product that treats you as a whole human being.
            </h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(270px,1fr))] gap-[22px]">
            {PILLARS.map(({ no, kind, Icon, title, line }) => (
              <div key={no} className="rounded-xl border border-white/10 bg-white/[0.04] p-7">
                <div className="mb-[18px] flex items-center justify-between">
                  <p className="font-mono text-data text-primary-hover">{`${no} · ${kind.toUpperCase()}`}</p>
                  <span className="flex h-9 w-9 items-center justify-center rounded-pill bg-white/[0.06] text-accent-light">
                    <Icon width={18} height={18} />
                  </span>
                </div>
                <h3 className="mb-3 font-serif text-h2 font-medium leading-tight text-ink-cream">{title}</h3>
                <p className="text-body-sm leading-relaxed text-ink-cream/70">{line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="px-6 py-[clamp(56px,9vw,104px)]">
        <div className="mx-auto max-w-[1140px]">
          <div className="mb-[52px] max-w-[640px]">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-4 font-serif text-[clamp(30px,4.4vw,44px)] font-medium leading-[1.08] tracking-[-0.01em] text-ink">
              From “I have a gift” to a real program — in an afternoon.
            </h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
            {STEPS.map(({ no, title, line }) => (
              <div key={no} className="border-t-2 border-primary pt-5">
                <p className="mb-3.5 font-mono text-data text-primary">{`STEP ${no}`}</p>
                <h3 className="mb-2 text-h3 font-semibold text-ink">{title}</h3>
                <p className="text-body-sm leading-relaxed text-ink-secondary">{line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="bg-surface px-6 py-[clamp(56px,9vw,104px)]">
        <div className="mx-auto max-w-[1140px]">
          <div className="mb-12 max-w-[600px]">
            <Eyebrow>Early voices</Eyebrow>
            <h2 className="mt-4 font-serif text-[clamp(30px,4.4vw,42px)] font-medium leading-[1.08] tracking-[-0.01em] text-ink">
              It’s amazing to see all that was in my head become a real program.
            </h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
            {TESTIMONIALS.map(({ quote, name, role }) => (
              <figure key={name} className="rounded-xl border border-line border-l-[3px] border-l-accent bg-surface-plain p-[26px]">
                <blockquote className="mb-[22px] font-serif text-[18px] italic leading-normal text-ink">“{quote}”</blockquote>
                <figcaption className="flex items-center gap-3">
                  <Avatar name={name} size={46} />
                  <div>
                    <p className="text-body-sm font-semibold text-ink">{name}</p>
                    <p className="text-caption text-ink-secondary">{role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="scroll-mt-[72px] px-6 py-[clamp(56px,9vw,104px)]">
        <div className="mx-auto max-w-[720px]">
          <div className="overflow-hidden rounded-[24px] border-2 border-primary bg-surface-plain">
            <div className="bg-primary px-8 py-7 text-center text-ink-cream">
              <p className="mb-2 font-mono text-eyebrow uppercase tracking-[0.12em] text-white/80">Start today</p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="font-mono text-[clamp(44px,8vw,60px)] font-medium leading-none text-white">$25</span>
                <span className="text-body text-white/80">to begin</span>
              </div>
            </div>
            <div className="p-8">
              <p className="mb-6 text-center text-body leading-snug text-ink">
                So cheap it removes all hesitation — backed by a{' '}
                <strong className="text-primary">90-day money-back guarantee.</strong> Zero risk. You either
                build something you’re proud of, or you don’t pay.
              </p>
              <ul className="mb-7 flex flex-col gap-3.5">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-success-bg text-success">
                      <CheckIcon width={13} height={13} />
                    </span>
                    <span className="text-body-sm leading-snug text-ink">{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={start}
                className="block w-full rounded-lg bg-primary py-4 text-center text-body font-semibold text-white transition-colors hover:bg-primary-deep"
              >
                Start for $25
              </button>
              <p className="mt-4 text-center font-mono text-caption text-ink-secondary">
                Secure checkout by Stripe · Cancel anytime within 90 days
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA + FOOTER ============ */}
      <footer className="bg-ink-deep px-6 pb-10 pt-[clamp(56px,9vw,96px)] text-ink-cream">
        <div className="mx-auto max-w-[760px] text-center">
          <h2 className="mb-6 font-serif text-[clamp(30px,5vw,48px)] font-medium leading-[1.08] tracking-[-0.01em] text-ink-cream">
            The world is waiting for what only you can give.
          </h2>
          <button
            onClick={start}
            className="inline-flex items-center gap-2 rounded-md bg-primary-hover px-[34px] py-4 text-body font-bold text-ink-deep transition-colors hover:bg-[#F0A157]"
          >
            Start for $25
            <ArrowRight width={20} height={20} />
          </button>
        </div>
        <div className="mx-auto mt-16 flex max-w-[1140px] flex-wrap items-center justify-between gap-3.5 border-t border-white/10 pt-7">
          <div className="flex items-center gap-2.5">
            <span className="flex gap-1">
              <span className="h-2.5 w-2.5 rounded-pill bg-primary-hover" />
              <span className="h-2.5 w-2.5 rounded-pill bg-accent-light" />
            </span>
            <span className="text-body-sm font-bold text-ink-cream">
              Abundance<span className="text-accent-light">AI</span>
            </span>
          </div>
          <span className="font-mono text-caption text-ink-cream/60">
            A humanity-first platform · Gemini XPRIZE · 2026
          </span>
        </div>
      </footer>
    </div>
  );
}

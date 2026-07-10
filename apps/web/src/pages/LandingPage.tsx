import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui';
import {
  SparkleIcon,
  HeartIcon,
  ShieldIcon,
  TargetIcon,
  MicIcon,
  UsersIcon,
  WandSparklesIcon,
  HeartHandshakeIcon,
  PlayIcon,
  ArrowRight,
  CheckIcon,
} from '@/components/ui/icons';
import { useApp } from '@/store';

// [01] Landing — bright, airy, video-first front door (AbundanceAI Landing design).
// White canvas, Playfair display + Inter body, gradient text/buttons, organic
// floating blobs & brushstroke washes. Converts email visitors into $25 sign-ups.
// Palette is the namespaced lp-* token set — does not touch the app design system.

const STEPS = [
  { no: '01', tone: 'warm', Icon: MicIcon, title: 'Share your knowledge', line: 'Upload your notes or just talk. Messy is fine — the AI listens.' },
  { no: '02', tone: 'warm', Icon: SparkleIcon, title: 'Build it with AI', line: 'A structured 3–6 module program appears in minutes. Yours to shape.' },
  { no: '03', tone: 'cool', Icon: HeartHandshakeIcon, title: 'Launch with courage', line: 'Marketing written for you, plus coaching at every wall.' },
  { no: '04', tone: 'cool', Icon: UsersIcon, title: 'Grow together', line: 'A matched circle and weekly expert talks keep you going.' },
] as const;

const EVEN_IF = [
  'Even if you don’t know how to market yourself.',
  'Even if you have no website at all.',
  'Even if you’ve never built a program before.',
];

const PERSONAS = [
  { tag: 'The master hobbyist', Icon: TargetIcon, grad: 'from-[#FCE0B8] to-lp-orange', name: 'Fly fisherman, 30 years', tagColor: 'text-lp-orange', line: 'Three decades of expertise — and never made a dollar from it. Until now.' },
  { tag: 'The expert healer', Icon: HeartIcon, grad: 'from-[#BFE9D7] to-lp-teal', name: 'Breathwork practitioner', tagColor: 'text-lp-teal', line: 'Fabulously gifted, surviving on 1-on-1s. Ready to scale — just didn’t know how.' },
  { tag: 'The professional', Icon: ShieldIcon, grad: 'from-[#CFE4F8] to-lp-blue', name: 'Divorce attorney', tagColor: 'text-lp-blue', line: 'Knows her stuff cold — but has never packaged her expertise into a program.' },
  { tag: 'The upgrader', Icon: SparkleIcon, grad: 'from-[#FBE0A8] to-lp-gold', name: 'Stalled online presence', tagColor: 'text-lp-orange', line: 'Outdated and underperforming — ready to use AI to refresh and relaunch.' },
] as const;

const PILLARS = [
  { Icon: WandSparklesIcon, iconColor: 'text-lp-orange', bar: 'from-lp-orange to-lp-gold', title: 'AI Builder', line: 'Paint-by-numbers guidance through building, marketing, and launching. The AI does the heavy lifting.' },
  { Icon: HeartIcon, iconColor: 'text-lp-teal', bar: 'from-lp-teal to-lp-green', title: 'Mindset Support', line: 'Proactive coaching that gets ahead of your fears — patient, always there, never judging.' },
  { Icon: UsersIcon, iconColor: 'text-lp-blue', bar: 'from-lp-blue to-[#69A0E8]', title: 'Peer Circles', line: 'A matched group of 3–5 people on the same path, plus weekly expert talks. Never alone.' },
] as const;

const VOICES = [
  { quote: 'I’d been “going to” do this for five years. I had a program by Sunday night.', name: 'Maya R.', role: 'Breathwork coach' },
  { quote: 'The check-ins knew exactly what I was afraid of. It felt like someone had my back.', name: 'Daniel K.', role: 'Fly-fishing guide' },
  { quote: 'My circle of four kept me going. We’re still meeting every week.', name: 'Priya S.', role: 'Family attorney' },
];

const INCLUDES = [
  'Your 3–6 module program, built by AI',
  'Social posts written and ready',
  'Mindset coaching at every step',
  'A peer circle & weekly expert talks',
];

function Eyebrow({ children, tone, className }: { children: string; tone: 'orange' | 'teal'; className?: string }) {
  return (
    <p className={cn('font-mono text-eyebrow uppercase tracking-[0.14em]', tone === 'orange' ? 'text-lp-orange' : 'text-lp-teal', className)}>
      {children}
    </p>
  );
}

// Presentational video panel — gradient placeholder, play affordance, caption.
function VideoPanel({ className, captionTone = 'dark' }: { className?: string; captionTone?: 'dark' }) {
  return (
    <div className={cn('relative overflow-hidden rounded-[22px] bg-gradient-to-br from-lp-warm-soft via-[#FBF7EF] to-lp-cool-soft shadow-[0_30px_70px_rgba(27,35,51,0.16)]', className)}>
      <div className="flex items-center justify-center" style={{ aspectRatio: '16 / 9' }}>
        <span className="lp-btn-grad flex h-[72px] w-[72px] items-center justify-center rounded-pill">
          <PlayIcon width={26} height={26} className="ml-1 fill-white text-white" />
        </span>
      </div>
      {captionTone === 'dark' && (
        <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-pill bg-lp-ink/70 px-3.5 py-2 text-caption font-medium text-white backdrop-blur-sm">
          <PlayIcon width={14} height={14} className="fill-white text-white" />
          Watch Ruby’s story · 2 min
        </div>
      )}
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const ready = useApp((s) => s.ready);
  const user = useApp((s) => s.user);
  const [scrolled, setScrolled] = useState(false);
  const start = () => navigate('/auth');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Returning signed-in user hitting the marketing page (e.g. a fresh tab) →
  // drop straight into the app. AppShell forwards unpaid accounts to /checkout.
  if (ready && user) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-screen overflow-x-hidden bg-lp-canvas font-sans text-lp-ink antialiased [scroll-behavior:smooth]">
      {/* ===================== NAV ===================== */}
      <nav className={cn('sticky top-0 z-[60] px-[30px] py-[18px] transition-[background,box-shadow] duration-200', scrolled && 'bg-white/85 shadow-[0_1px_0_rgba(27,35,51,0.06)] backdrop-blur-md backdrop-saturate-150')}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-between">
          <button onClick={() => navigate('/')} className="font-display text-[24px] font-semibold tracking-[-0.01em]">
            Abundance<span className="lp-grad-text">AI</span>
          </button>
          <div className="hidden items-center gap-[34px] md:flex">
            <a href="#how" className="text-body-sm font-medium text-lp-ink-2 transition-colors hover:text-lp-ink">How it works</a>
            <a href="#pillars" className="text-body-sm font-medium text-lp-ink-2 transition-colors hover:text-lp-ink">What you get</a>
            <a href="#pricing" className="text-body-sm font-medium text-lp-ink-2 transition-colors hover:text-lp-ink">Pricing</a>
          </div>
          <button onClick={start} className="lp-btn-grad rounded-pill px-[22px] py-[11px] text-body-sm font-semibold text-white">
            Start for $25
          </button>
        </div>
      </nav>

      {/* ===================== HERO ===================== */}
      <header className="relative px-[30px] pb-[clamp(40px,6vw,72px)] pt-[clamp(28px,4vw,56px)]">
        <div className="lp-blob lp-blob-warm lp-float bottom-[-80px] left-[2%] h-[400px] w-[480px]" />
        <div className="relative z-[2] mx-auto grid max-w-[1200px] items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]" style={{ minHeight: 'clamp(420px,52vh,560px)' }}>
          <div className="rise-in">
            <p className="mb-[26px] inline-flex items-center gap-2 font-mono text-eyebrow uppercase tracking-[0.12em] text-lp-teal">
              <span className="h-0.5 w-6 rounded-pill bg-gradient-to-r from-lp-teal to-lp-green" />
              Impact over income
            </p>
            <h1 className="mb-[26px] text-balance font-display text-[clamp(42px,6vw,76px)] font-semibold leading-[1.02] tracking-[-0.015em]">
              Turn what you know into <span className="lp-grad-text italic">something</span> the world can use.
            </h1>
            <p className="mb-[34px] max-w-[46ch] text-[clamp(16px,1.8vw,19px)] leading-relaxed text-lp-ink-2">
              You already have the expertise. AbundanceAI gives you the courage to show up, the tools to build a real program, and a circle of people beside you. No tech skills. No business background. You just show up.
            </p>
            <div className="mb-[30px] flex flex-wrap items-center gap-4">
              <button onClick={start} className="lp-btn-grad inline-flex items-center gap-2 rounded-pill px-8 py-4 text-[17px] font-semibold text-white">
                Try it for $25 <ArrowRight width={18} height={18} />
              </button>
              <a href="#how" className="inline-flex items-center gap-[9px] text-body-sm font-semibold text-lp-ink transition-colors hover:text-lp-orange">
                <span className="flex h-[42px] w-[42px] items-center justify-center rounded-pill border border-lp-hair">
                  <PlayIcon width={15} height={15} className="ml-0.5 fill-lp-ink text-lp-ink" />
                </span>
                See how it works
              </a>
            </div>
            <p className="text-caption text-lp-ink-3">Nothing to lose — 90-day money-back guarantee.</p>
          </div>

          {/* video panel */}
          <div className="relative flex items-center justify-center">
            <div className="lp-deco lp-float top-[-34px] right-[-28px] h-[200px] w-[200px] rounded-pill bg-[radial-gradient(circle_at_35%_35%,rgba(248,197,58,0.34),rgba(244,137,44,0))] blur-[4px]" />
            <div className="lp-deco lp-float bottom-[-40px] left-[-34px] h-[230px] w-[230px] rounded-pill bg-[radial-gradient(circle_at_40%_40%,rgba(95,197,106,0.26),rgba(22,167,156,0))] blur-[4px] [animation-delay:1.2s]" />
            <VideoPanel className="relative z-[1] w-full max-w-[540px]" />
          </div>
        </div>
      </header>

      {/* ===================== HOW IT WORKS ===================== */}
      <section id="how" className="relative scroll-mt-20 px-[30px] py-[clamp(56px,8vw,104px)]">
        <div className="lp-brush lp-brush-warm lp-float top-[30px] right-[2%] h-[280px] w-[420px] -rotate-[24deg]" />
        <div className="relative z-[1] mx-auto max-w-[1200px]">
          <div className="mx-auto mb-[18px] text-center">
            <Eyebrow tone="orange" className="mb-4">How it works</Eyebrow>
            <h2 className="font-display text-[clamp(30px,4.6vw,50px)] font-semibold leading-[1.08]">
              Simple steps. <span className="lp-grad-text-cool">Powerful results.</span>
            </h2>
          </div>

          {/* curving dotted connector */}
          <svg className="lp-deco relative my-[18px] block h-[60px] w-full" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true">
            <path d="M60,46 C300,2 460,2 600,30 C740,58 900,58 1140,14" stroke="#EEF1F6" strokeWidth="2.5" strokeDasharray="2 9" strokeLinecap="round" fill="none" />
          </svg>

          <div className="relative z-[1] grid gap-[26px] sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ no, tone, Icon, title, line }) => (
              <div key={no} className="text-center">
                <p className={cn('mb-3.5 font-display text-[clamp(40px,5vw,58px)] font-semibold leading-none', tone === 'warm' ? 'lp-grad-text' : 'lp-grad-text-cool')}>{no}</p>
                <Icon width={24} height={24} className="mx-auto text-lp-ink-2" />
                <h3 className="mb-2 mt-3 text-h3 font-semibold">{title}</h3>
                <p className="mx-auto max-w-[24ch] text-body-sm leading-relaxed text-lp-ink-2">{line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== EVEN IF ===================== */}
      <section className="relative px-[30px] py-[clamp(56px,8vw,100px)]">
        <div className="lp-brush lp-brush-cool lp-float bottom-[6%] left-[3%] h-[300px] w-[440px] rotate-[18deg] [animation-delay:1.4s]" />
        <div className="relative z-[1] mx-auto max-w-[760px]">
          <Eyebrow tone="orange" className="mb-10 text-center">For people who’ve been waiting</Eyebrow>
          <div className="mb-11 flex flex-col gap-[22px]">
            {EVEN_IF.map((line) => (
              <div key={line} className="flex items-baseline gap-[18px]">
                <span className="shrink-0 font-display text-[22px] font-semibold leading-[1.2] text-lp-orange">→</span>
                <p className="font-display text-[clamp(22px,3vw,30px)] font-medium leading-[1.25]">{line}</p>
              </div>
            ))}
          </div>
          <p className="pl-10 text-[clamp(18px,2.1vw,22px)] leading-snug text-lp-ink-2">
            We walk you through all of it. <strong className="font-semibold text-lp-ink">You just show up.</strong>
          </p>
        </div>
      </section>

      {/* ===================== PERSONAS ===================== */}
      <section id="personas" className="relative px-[30px] py-[clamp(56px,8vw,100px)]">
        <div className="lp-brush lp-brush-warm lp-float top-[8%] right-[2%] h-[280px] w-[420px] -rotate-[20deg]" />
        <div className="relative z-[1] mx-auto max-w-[1200px]">
          <div className="mb-[52px] max-w-[760px]">
            <Eyebrow tone="teal" className="mb-4">You’ll see yourself here</Eyebrow>
            <h2 className="font-display text-[clamp(30px,4.6vw,50px)] font-semibold leading-[1.06]">
              Real people, real gifts — <span className="lp-grad-text italic">finally</span> getting out into the world.
            </h2>
          </div>

          <div className="grid items-stretch gap-[clamp(28px,4vw,52px)] lg:grid-cols-[1.18fr_1fr]">
            <div className="grid gap-[18px] sm:grid-cols-2">
              {PERSONAS.map(({ tag, Icon, grad, name, tagColor, line }) => (
                <div key={tag} className="flex flex-col gap-3.5">
                  <span className={cn('lp-float flex h-14 w-14 items-center justify-center rounded-pill bg-gradient-to-br shadow-md', grad)}>
                    <Icon width={24} height={24} className="text-white" />
                  </span>
                  <div>
                    <p className={cn('mb-1.5 font-mono text-[11px] uppercase tracking-[0.1em]', tagColor)}>{tag}</p>
                    <p className="mb-1.5 text-h3 font-semibold">{name}</p>
                    <p className="text-body-sm leading-relaxed text-lp-ink-2">{line}</p>
                  </div>
                </div>
              ))}
            </div>

            <VideoPanel className="min-h-[300px] self-stretch shadow-[0_24px_60px_rgba(27,35,51,0.10)]" />
          </div>
        </div>
      </section>

      {/* ===================== THREE PILLARS ===================== */}
      <section id="pillars" className="relative scroll-mt-20 px-[30px] py-[clamp(56px,8vw,104px)]">
        <div className="lp-brush lp-brush-warm lp-float top-[6%] left-[3%] h-[280px] w-[420px] rotate-[20deg]" />
        <div className="lp-brush lp-brush-blue lp-float bottom-[6%] right-[3%] h-[300px] w-[440px] -rotate-[18deg] [animation-delay:1.5s]" />
        <div className="relative z-[1] mx-auto max-w-[1140px]">
          <div className="mx-auto mb-[60px] max-w-[580px] text-center">
            <Eyebrow tone="teal" className="mb-4">The three pillars</Eyebrow>
            <h2 className="font-display text-[clamp(30px,4.6vw,50px)] font-semibold leading-[1.08]">Everything you need to thrive.</h2>
          </div>
          <div className="grid gap-[clamp(28px,4vw,56px)] md:grid-cols-3">
            {PILLARS.map(({ Icon, iconColor, bar, title, line }) => (
              <div key={title} className="text-center">
                <div className="mb-4 inline-flex items-center justify-center">
                  <Icon width={24} height={24} className={iconColor} />
                </div>
                <div className={cn('mx-auto mb-[18px] h-[3px] w-[38px] rounded-pill bg-gradient-to-r', bar)} />
                <h3 className="mb-2.5 font-display text-[24px] font-semibold">{title}</h3>
                <p className="mx-auto max-w-[30ch] text-body leading-relaxed text-lp-ink-2">{line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== TESTIMONIALS ===================== */}
      <section id="voices" className="relative px-[30px] py-[clamp(56px,8vw,100px)]">
        <div className="lp-brush lp-brush-cool lp-float top-[6%] left-[3%] h-[280px] w-[420px] rotate-[16deg]" />
        <div className="relative z-[1] mx-auto max-w-[1140px]">
          <div className="mb-[52px] max-w-[640px]">
            <Eyebrow tone="teal" className="mb-4">Early voices</Eyebrow>
            <h2 className="font-display text-[clamp(28px,4.4vw,46px)] font-semibold leading-[1.08]">
              It’s amazing to see all that was in my head become <span className="lp-grad-text-cool italic">a real program.</span>
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {VOICES.map(({ quote, name, role }) => (
              <figure key={name} className="flex flex-col border-l-[3px] pl-5 [border-image:linear-gradient(180deg,#16A79C,#5FC56A)_1]">
                <blockquote className="mb-6 flex-1 font-display text-[19px] font-medium italic leading-[1.4]">“{quote}”</blockquote>
                <figcaption className="flex items-center gap-3">
                  <Avatar name={name} size={44} />
                  <div>
                    <p className="text-body-sm font-semibold">{name}</p>
                    <p className="text-caption text-lp-ink-2">{role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== PRICING ===================== */}
      <section id="pricing" className="relative scroll-mt-[74px] px-[30px] py-[clamp(56px,8vw,104px)]">
        <div className="lp-blob lp-blob-warm lp-float top-[2%] right-[3%] h-[360px] w-[440px]" />
        <div className="lp-blob lp-blob-cool lp-float bottom-[4%] left-[3%] h-[340px] w-[400px] [animation-delay:1.4s]" />
        <div className="relative z-[1] mx-auto max-w-[720px] text-center">
          <Eyebrow tone="orange" className="mb-[18px]">Start today</Eyebrow>
          <h2 className="mb-2 font-display text-[clamp(34px,6vw,64px)] font-semibold leading-[1.04]">
            All of it for <span className="lp-grad-text">$25.</span>
          </h2>
          <p className="mx-auto mb-[34px] max-w-[42ch] text-[clamp(16px,2vw,19px)] leading-snug text-lp-ink-2">
            So small it removes all hesitation — and backed by a 90-day money-back guarantee. Build something you’re proud of, or you don’t pay.
          </p>

          <div className="mx-auto mb-[38px] grid max-w-[560px] gap-x-9 gap-y-3.5 text-left sm:grid-cols-2">
            {INCLUDES.map((item) => (
              <div key={item} className="flex items-start gap-[11px]">
                <CheckIcon width={19} height={19} className="mt-px shrink-0 text-lp-teal" />
                <span className="text-body-sm leading-snug text-lp-ink">{item}</span>
              </div>
            ))}
          </div>

          <button onClick={start} className="lp-btn-grad inline-block rounded-pill px-10 py-[17px] text-[18px] font-semibold text-white">
            Start your program →
          </button>
          <p className="mt-[18px] font-mono text-[11px] text-lp-ink-3">Secure checkout by Stripe · cancel anytime within 90 days</p>
        </div>
      </section>

      {/* ===================== FINAL CTA + FOOTER ===================== */}
      <footer className="relative mt-[clamp(20px,4vw,40px)] overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(90%_70%_at_10%_135%,rgba(248,197,58,0.22)_0%,rgba(244,137,44,0.07)_30%,rgba(255,255,255,0)_62%),radial-gradient(90%_70%_at_92%_130%,rgba(95,197,106,0.18)_0%,rgba(22,167,156,0.06)_32%,rgba(255,255,255,0)_64%),linear-gradient(180deg,#FFFFFF_0%,rgba(255,255,255,0)_34%)]" />
        <div className="lp-deco lp-float bottom-[-200px] right-[-160px] h-[560px] w-[560px] rounded-pill bg-[radial-gradient(circle_at_50%_50%,rgba(248,197,58,0.20),rgba(244,137,44,0))] blur-[16px]" />
        <div className="lp-deco lp-float bottom-[-200px] left-[-160px] h-[560px] w-[560px] rounded-pill bg-[radial-gradient(circle_at_50%_50%,rgba(95,197,106,0.16),rgba(22,167,156,0))] blur-[16px] [animation-delay:1.6s]" />
        <div className="relative z-[1] mx-auto max-w-[760px] px-[30px] pb-[clamp(36px,5vw,52px)] pt-[clamp(64px,9vw,120px)] text-center">
          <h2 className="mb-6 font-display text-[clamp(32px,5.4vw,56px)] font-semibold leading-[1.06]">
            The world is waiting for what only <span className="lp-grad-text italic">you</span> can give.
          </h2>
          <button onClick={start} className="lp-btn-grad inline-block rounded-pill px-9 py-4 text-[17px] font-semibold text-white">
            Try it for $25
          </button>
        </div>
        <div className="relative z-[1] mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3.5 px-[30px] pb-10">
          <span className="font-display text-[18px] font-semibold">
            Abundance<span className="lp-grad-text">AI</span>
          </span>
          <span className="font-mono text-caption text-lp-ink-3">A humanity-first platform · Gemini XPRIZE · 2026</span>
        </div>
      </footer>
    </div>
  );
}

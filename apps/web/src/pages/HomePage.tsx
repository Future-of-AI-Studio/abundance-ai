import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNextStep, trail as journeyTrail, type CircleGetResponse } from '@abundance/shared';
import { useApp } from '@/store';
import { Eyebrow, Skeleton, Avatar } from '@/components/ui';
import { ArrowRight, CheckIcon, LockIcon, CloseIcon, SparkleIcon, CalendarIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

// [04] Journey Home — the post-login dashboard. A warm greeting + day counter, a
// single next-best-step hero, a vertical progress trail with live descriptions, a
// dismissable mindset check-in, a "what you have so far" stat grid, and this
// week's expert talk. Empty program → one warm CTA, never a blank dashboard.
export function HomePage() {
  const navigate = useNavigate();
  const { ready, backend, journey, program, posts, session, profile, enrollments, refreshEnrollments } = useApp();

  // Expert talk + live circle status come from the circle endpoint (same source
  // as the Circle tab); they enrich Home but never block its first paint.
  const [circle, setCircle] = useState<CircleGetResponse | null>(null);
  useEffect(() => {
    if (!backend) return;
    void backend.api.circleGet().then(setCircle).catch(() => { /* non-blocking */ });
    // Enrollment count powers the "what you have so far" rail; non-blocking.
    void refreshEnrollments().catch(() => { /* non-blocking */ });
  }, [backend, refreshEnrollments]);

  const [checkinDismissed, setCheckinDismissed] = useState(false);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }, []);

  const dayCount = useMemo(() => {
    if (!profile?.created_at) return 1;
    const ms = Date.now() - new Date(profile.created_at).getTime();
    return Math.max(1, Math.floor(ms / 86_400_000) + 1);
  }, [profile?.created_at]);

  if (!ready || !journey) {
    return (
      <div className="space-y-6">
        <Skeleton variant="line" className="w-2/3" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="chip" />)}
        </div>
      </div>
    );
  }

  const firstName = profile?.first_name ?? 'there';
  const next = getNextStep(journey);
  const moduleCount = program.modules.length;
  const postCount = posts.length;
  const completed = new Set(journey.completed_steps);

  // Live, human descriptions for each trail node — pulled from real counts/state.
  const describe = (step: string): string => {
    switch (step) {
      case 'path': return journey.path ? (journey.path === 'A' ? 'Live group coaching' : 'Recorded program') : 'Choose your direction';
      case 'content': return 'Your material';
      case 'program': return moduleCount > 0 ? `${moduleCount} modules ready` : 'Your curriculum';
      case 'marketing': return postCount > 0 ? `${postCount} posts drafted` : 'Your launch posts';
      case 'sessions': return session?.meet_link ? 'Session link ready' : 'Your live room';
      case 'payments': return 'Get set up to get paid';
      default: return '';
    }
  };

  const steps = journeyTrail(journey.path).map((s) => ({
    label: s.trailLabel,
    sub: describe(s.step),
    state: completed.has(s.step) ? 'complete' : s.step === next.step ? 'current' : 'upcoming',
  }));

  const showCheckin = !!program.program && !checkinDismissed;
  const enrollCount = enrollments.length;

  // Real counts of what the user has built so far — each row links to its tab.
  const stats: Array<{ value: string; label: string; to: string }> = [
    { value: String(moduleCount), label: moduleCount === 1 ? 'module ready' : 'modules ready', to: '/app/program' },
    { value: String(postCount), label: postCount === 1 ? 'post drafted' : 'posts drafted', to: '/app/onboarding/marketing' },
    { value: String(enrollCount), label: enrollCount === 1 ? 'participant enrolled' : 'participants enrolled', to: '/app/students' },
  ];

  return (
    <div className="space-y-7">
      {/* Greeting + identity */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-h1 font-medium text-ink">{greeting}, {firstName}</h1>
          <p className="mt-0.5 font-mono text-caption text-ink-secondary">Day {dayCount} of your journey</p>
        </div>
        <button onClick={() => navigate('/app/account')} aria-label="Account" className="shrink-0">
          <Avatar name={firstName} src={profile?.avatar_url} size={44} />
        </button>
      </header>

      {/* Hero — the single next best step */}
      <button onClick={() => navigate(next.route)} className="block w-full text-left">
        <div className="dots-cream rounded-xl bg-primary p-6 shadow-md transition-shadow hover:shadow-lg">
          <p className="mb-3 font-mono text-eyebrow uppercase tracking-[0.12em] text-white/80">Your next step</p>
          <h2 className="font-serif text-h2 leading-snug text-white">
            {next.done ? "You're all set — revisit anything anytime." : next.label}
          </h2>
          <span className="mt-5 inline-flex items-center gap-2 rounded-md bg-white px-4 py-3 text-body-sm font-semibold text-primary">
            {next.done ? 'Review your journey' : 'Continue'}
            <ArrowRight width={16} height={16} />
          </span>
        </div>
      </button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* Progress trail (vertical, live) */}
        <section className="rounded-lg border border-line bg-surface-plain p-5 shadow-sm">
          <p className="mb-4 font-mono text-eyebrow uppercase tracking-[0.12em] text-accent">Your journey</p>
          <ol className="space-y-0">
            {steps.map((s, i) => {
              const last = i === steps.length - 1;
              return (
                <li key={s.label} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        'flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-pill',
                        s.state === 'complete' && 'bg-accent text-white',
                        s.state === 'current' && 'border-2 border-primary bg-bg',
                        s.state === 'upcoming' && 'bg-surface text-ink-secondary',
                      )}
                    >
                      {s.state === 'complete' && <CheckIcon width={15} height={15} />}
                      {s.state === 'current' && <span className="h-2 w-2 rounded-pill bg-primary" />}
                      {s.state === 'upcoming' && <LockIcon width={13} height={13} />}
                    </span>
                    {!last && (
                      <span className={cn('min-h-[18px] w-0.5 flex-1', s.state === 'complete' ? 'bg-accent' : 'bg-line')} />
                    )}
                  </div>
                  <div className={last ? '' : 'pb-3.5'}>
                    <p className={cn(
                      'text-body-sm font-semibold',
                      s.state === 'current' ? 'text-primary' : s.state === 'upcoming' ? 'text-ink-secondary' : 'text-ink',
                    )}>
                      {s.label}
                    </p>
                    <p className="text-caption text-ink-secondary">{s.sub}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Right rail */}
        <div className="space-y-4">
          {/* Proactive mindset check-in (conditional, dismissable) */}
          {showCheckin && (
            <div className="relative rounded-lg border border-accent/30 bg-accent/10 p-5">
              <button
                onClick={() => setCheckinDismissed(true)}
                aria-label="Dismiss"
                className="absolute right-3.5 top-3.5 text-accent/80 hover:text-accent"
              >
                <CloseIcon width={18} height={18} />
              </button>
              <div className="mb-2.5 flex items-center gap-2">
                <SparkleIcon width={16} height={16} className="text-accent" />
                <p className="font-mono text-eyebrow uppercase tracking-[0.1em] text-accent">A quiet check-in</p>
              </div>
              <p className="text-body-sm text-ink">
                Putting your work out there brings up a lot — and that's normal. Got two minutes to take a breath with us?
              </p>
              <button
                onClick={() => navigate('/app/mindset')}
                className="mt-4 rounded-md bg-accent px-4 py-2.5 text-body-sm font-semibold text-white transition-colors hover:bg-accent-light"
              >
                Reflect with me
              </button>
            </div>
          )}

          {/* What you have so far */}
          <section className="rounded-lg border border-line bg-surface-plain p-5 shadow-sm">
            <Eyebrow className="mb-2">What you have so far</Eyebrow>
            <div>
              {stats.map(({ value, label, to }) => (
                <button
                  key={label}
                  onClick={() => navigate(to)}
                  className="flex w-full items-center gap-3 border-b border-line py-3 text-left last:border-0 hover:opacity-70"
                >
                  <span className="w-9 shrink-0 font-serif text-h1 font-medium text-primary">{value}</span>
                  <span className="text-body-sm text-ink-secondary">{label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* This week's expert talk */}
          {/* {circle?.next_talk && (
            <button onClick={() => navigate('/app/circle')} className="block w-full text-left">
              <div className="flex items-center gap-4 rounded-xl bg-[#2A211B] p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary-hover/20 text-primary-hover">
                  <CalendarIcon width={22} height={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-eyebrow uppercase tracking-[0.08em] text-primary-hover">This week's talk</p>
                  <p className="mt-0.5 truncate text-body-sm font-semibold text-white">{circle.next_talk.title}</p>
                  <p className="text-caption text-white/60">
                    {new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(circle.next_talk.starts_at))}
                  </p>
                </div>
                <ArrowRight width={18} height={18} className="shrink-0 text-white/70" />
              </div>
            </button>
          )} */}
        </div>
      </div>
    </div>
  );
}

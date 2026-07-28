import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNextStep, trail as journeyTrail } from '@abundance/shared';
import { useApp } from '@/store';
import { Skeleton, Avatar } from '@/components/ui';
import { ArrowRight, CheckIcon, LockIcon, CloseIcon, SparkleIcon, HeartIcon, MegaphoneIcon, ProgramIcon, UsersIcon, HelpIcon } from '@/components/ui/icons';
import { ShareProgramLink } from '@/components/ShareProgramLink';
import { formatPrice } from '@/lib/money';
import { env } from '@/lib/env';
import { cn } from '@/lib/cn';

// [04] Journey Home — the post-login dashboard. A warm greeting + day counter, a
// single next-best-step hero, a live performance snapshot (students, revenue,
// page views, conversion), a "grow your program" share card, a recent-activity
// feed, a journey progress grid, and a dismissable mindset check-in. Empty program
// → the hero still points at one warm next step, never a blank dashboard.
const WEEK_MS = 7 * 86_400_000;

function firstNameOf(full: string): string {
  return full.trim().split(/\s+/)[0] || full.trim();
}

// Compact, human relative time for the activity feed.
function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

export function HomePage() {
  const navigate = useNavigate();
  const { ready, journey, program, posts, session, profile, enrollments, stats, latestCheckin, payments, refreshEnrollments, refreshStats } = useApp();

  useEffect(() => {
    // Live counts power the snapshot + activity feed; both are non-blocking.
    void refreshEnrollments().catch(() => { /* non-blocking */ });
    void refreshStats().catch(() => { /* non-blocking */ });
  }, [refreshEnrollments, refreshStats]);

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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="chip" />)}
        </div>
        <Skeleton variant="card" />
      </div>
    );
  }

  const firstName = profile?.first_name ?? 'there';
  const next = getNextStep(journey);
  const moduleCount = program.modules.length;
  const postCount = posts.length;
  const completed = new Set(journey.completed_steps);

  // ── Performance snapshot ────────────────────────────────────────────────────
  const now = Date.now();
  const enrollCount = enrollments.length;
  const enrollThisWeek = enrollments.filter((e) => now - new Date(e.created_at).getTime() < WEEK_MS).length;
  const revenueCents = enrollments.reduce((sum, e) => sum + (e.amount_cents ?? 0), 0);
  const conversion = stats.views > 0 ? (enrollCount / stats.views) * 100 : null;
  // The shareable /p/:id link is hidden until Stripe is connected — enforced in
  // PRODUCTION only, so the test/beta site keeps links open. Same guard as StudentsPage.
  const canShare = (payments?.connected ?? false) || env.environment !== 'production';

  const metrics: Array<{ label: string; value: string; hint: string; to?: string }> = [
    {
      label: 'Participants',
      value: String(enrollCount),
      hint: enrollThisWeek > 0 ? `+${enrollThisWeek} this week` : enrollCount > 0 ? 'total' : 'none yet',
      to: '/app/students',
    },
    {
      label: 'Revenue',
      value: formatPrice(revenueCents),
      hint: revenueCents > 0 ? 'one-time' : 'no sales yet',
      to: '/app/students',
    },
    {
      label: 'Page views',
      value: String(stats.views),
      hint: stats.views_this_week > 0 ? `+${stats.views_this_week} this week` : stats.views > 0 ? 'all time' : 'none yet',
    },
    {
      label: 'Conversion',
      value: conversion === null ? '-' : `${conversion.toFixed(1)}%`,
      hint: 'view → enroll',
    },
  ];

  // ── Journey progress grid ───────────────────────────────────────────────────
  const describe = (step: string): string => {
    switch (step) {
      case 'path': return journey.path ? (journey.path === 'A' ? 'Live group coaching' : 'Recorded program') : 'Choose your direction';
      case 'content': return 'Your material';
      case 'program': return moduleCount > 0 ? `${moduleCount} modules ready` : 'Your curriculum';
      case 'marketing': return postCount > 0 ? `${postCount} posts drafted` : 'Your launch posts';
      case 'sessions': return session?.meet_link ? 'Session link ready' : 'Your live room';
      case 'payments': return 'Set up to get paid';
      default: return '';
    }
  };

  const steps = journeyTrail(journey.path).map((s) => ({
    label: s.trailLabel,
    sub: describe(s.step),
    state: completed.has(s.step) ? 'complete' : s.step === next.step ? 'current' : 'upcoming',
  }));
  const doneCount = steps.filter((s) => s.state === 'complete').length;
  const journeyComplete = doneCount === steps.length;

  // ── Recent activity (derived from real state, newest first) ──────────────────
  type Activity = { key: string; icon: ReactNode; tone: string; title: ReactNode; meta?: string; ts: string };
  const activity: Activity[] = [];

  enrollments.slice(0, 4).forEach((e) => {
    activity.push({
      key: `enroll-${e.id}`,
      icon: <span className="font-mono text-body-sm font-semibold">$</span>,
      tone: 'bg-primary/10 text-primary',
      title: <><span className="font-semibold text-ink">{firstNameOf(e.name)}</span> enrolled</>,
      meta: `+${formatPrice(e.amount_cents ?? 0)}`,
      ts: e.created_at,
    });
  });
  if (latestCheckin) {
    activity.push({
      key: `checkin-${latestCheckin.id}`,
      icon: <HeartIcon width={16} height={16} />,
      tone: 'bg-accent/12 text-accent',
      title: 'You saved a reflection',
      meta: `“${latestCheckin.prompt}”`,
      ts: latestCheckin.created_at,
    });
  }
  const unposted = posts.filter((p) => !p.posted).length;
  if (unposted > 0) {
    const newest = posts.reduce((a, b) => (a.created_at > b.created_at ? a : b));
    activity.push({
      key: 'posts-ready',
      icon: <MegaphoneIcon width={16} height={16} />,
      tone: 'bg-primary/10 text-primary',
      title: <><span className="font-semibold text-ink">{unposted} marketing {unposted === 1 ? 'post' : 'posts'}</span> ready to publish</>,
      ts: newest.created_at,
    });
  }
  if (program.program) {
    activity.push({
      key: `program-${program.program.id}`,
      icon: <ProgramIcon width={16} height={16} />,
      tone: 'bg-accent/12 text-accent',
      title: <><span className="font-semibold text-ink">{program.program.title}</span> is live</>,
      ts: program.program.created_at,
    });
  }
  activity.sort((a, b) => b.ts.localeCompare(a.ts));
  const recent = activity.slice(0, 5);

  const showCheckin = !!program.program && !checkinDismissed;

  return (
    <div className="space-y-6">
      {/* Greeting + identity */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-h1 font-medium text-ink">{greeting}, {firstName}</h1>
          <p className="mt-0.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-ink-secondary">Day {dayCount} of your journey</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {/* Guidance — mobile only (the desktop side rail carries it). */}
          <button
            onClick={() => navigate('/app/help')}
            aria-label="Guidance"
            className="flex h-10 w-10 items-center justify-center rounded-pill text-ink-secondary transition-colors hover:bg-surface hover:text-ink lg:hidden"
          >
            <HelpIcon width={22} height={22} />
          </button>
          <button onClick={() => navigate('/app/account')} aria-label="Account">
            <Avatar name={firstName} src={profile?.avatar_url} size={44} />
          </button>
        </div>
      </header>

      {/* Hero — the single next best step */}
      <button onClick={() => navigate(next.route)} className="block w-full text-left">
        <div className="dots-cream rounded-xl bg-primary p-6 shadow-md transition-shadow hover:shadow-lg">
          <p className="mb-3 font-mono text-eyebrow uppercase tracking-[0.12em] text-white/80">Your next step</p>
          <h2 className="font-serif text-h2 leading-snug text-white">
            {next.done ? "You're all set - revisit anything, anytime." : next.label}
          </h2>
          <span className="mt-5 inline-flex items-center gap-2 rounded-md bg-white px-4 py-3 text-body-sm font-semibold text-primary">
            {next.done ? 'Review your journey' : 'Continue'}
            <ArrowRight width={16} height={16} />
          </span>
        </div>
      </button>

      {/* Performance snapshot */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => {
          const inner = (
            <>
              <p className="font-mono text-eyebrow uppercase tracking-[0.12em] text-ink-secondary">{m.label}</p>
              <p className="mt-2 font-serif text-h1 font-medium leading-none text-ink">{m.value}</p>
              <p className="mt-1.5 text-caption text-ink-secondary">{m.hint}</p>
            </>
          );
          return m.to ? (
            <button
              key={m.label}
              onClick={() => navigate(m.to!)}
              className="rounded-lg border border-line bg-surface-plain p-4 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              {inner}
            </button>
          ) : (
            <div key={m.label} className="rounded-lg border border-line bg-surface-plain p-4 shadow-sm">
              {inner}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* Left column */}
        <div className="min-w-0 space-y-6">
          {/* Grow your program — share the link. Hidden until Stripe is connected
              (production only): sharing before payouts work would let a participant
              enroll on a program whose payment can't go through. Matches StudentsPage. */}
          {program.program && (
            <section className="rounded-lg border border-line bg-surface-plain p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono text-eyebrow uppercase tracking-[0.12em] text-primary">Grow your program</p>
                <span className="shrink-0 rounded-pill bg-accent/12 px-2.5 py-1 text-caption font-medium text-accent">
                  {enrollCount} enrolled
                </span>
              </div>
              {canShare ? (
                <>
                  <h3 className="mt-2 font-serif text-h3 font-medium text-ink">
                    {enrollCount > 0 ? 'Keep sharing to grow your program.' : 'Share your link to get your first students.'}
                  </h3>
                  <p className="mt-1.5 text-body-sm text-ink-secondary">
                    Post it anywhere - social, your bio, a DM. Anyone who opens it can preview your program and enroll.
                  </p>
                  <ShareProgramLink programId={program.program.id} className="mt-4" />
                </>
              ) : (
                <>
                  <h3 className="mt-2 font-serif text-h3 font-medium text-ink">Connect Stripe to share your program.</h3>
                  <p className="mt-1.5 text-body-sm text-ink-secondary">
                    Connect your Stripe account first so enrollments can pay you. Your link stays hidden until then — sharing it before you can accept payment would leave participants unable to enroll.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/app/onboarding/payments')}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-caption font-semibold text-white hover:bg-primary/90"
                  >
                    Connect Stripe to get your link <ArrowRight width={16} height={16} />
                  </button>
                </>
              )}
            </section>
          )}

          {/* Your journey — progress grid */}
          <section className="rounded-lg border border-line bg-surface-plain p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="font-mono text-eyebrow uppercase tracking-[0.12em] text-accent">Your journey</p>
              <span className={cn(
                'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-caption font-medium',
                journeyComplete ? 'bg-accent/12 text-accent' : 'bg-surface text-ink-secondary',
              )}>
                {journeyComplete && <CheckIcon width={13} height={13} />}
                {journeyComplete ? 'Complete' : 'In progress'} · {doneCount} of {steps.length}
              </span>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {steps.map((s) => (
                <div
                  key={s.label}
                  className={cn(
                    'flex items-center gap-3 rounded-md border p-3',
                    s.state === 'current' ? 'border-primary/40 bg-primary/5' : 'border-line bg-bg',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-pill',
                      s.state === 'complete' && 'bg-accent text-white',
                      s.state === 'current' && 'border-2 border-primary bg-surface-plain',
                      s.state === 'upcoming' && 'bg-surface text-ink-secondary',
                    )}
                  >
                    {s.state === 'complete' && <CheckIcon width={15} height={15} />}
                    {s.state === 'current' && <span className="h-2 w-2 rounded-pill bg-primary" />}
                    {s.state === 'upcoming' && <LockIcon width={13} height={13} />}
                  </span>
                  <div className="min-w-0">
                    <p className={cn(
                      'truncate text-body-sm font-semibold',
                      s.state === 'current' ? 'text-primary' : s.state === 'upcoming' ? 'text-ink-secondary' : 'text-ink',
                    )}>
                      {s.label}
                    </p>
                    <p className="truncate text-caption text-ink-secondary">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right rail */}
        <div className="min-w-0 space-y-6">
          {/* Recent activity */}
          <section className="rounded-lg border border-line bg-surface-plain p-5 shadow-sm">
            <p className="mb-3 font-mono text-eyebrow uppercase tracking-[0.12em] text-ink-secondary">Recent activity</p>
            {recent.length > 0 ? (
              <ul className="space-y-0.5">
                {recent.map((a) => (
                  <li key={a.key} className="flex items-start gap-3 border-b border-line py-3 last:border-0">
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-pill', a.tone)}>
                      {a.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-body-sm text-ink-secondary">{a.title}</p>
                      <p className="truncate text-caption text-ink-secondary">
                        {timeAgo(a.ts)}{a.meta ? ` · ${a.meta}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-3 py-3 text-body-sm text-ink-secondary">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-surface text-ink-secondary">
                  <UsersIcon width={16} height={16} />
                </span>
                Your activity will show up here as students find your program.
              </div>
            )}
          </section>

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
                Putting your work out there brings up a lot - and that's normal. Got two minutes to take a breath with us?
              </p>
              <button
                onClick={() => navigate('/app/mindset')}
                className="mt-4 rounded-md bg-accent px-4 py-2.5 text-body-sm font-semibold text-white transition-colors hover:bg-accent-light"
              >
                Reflect with me
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

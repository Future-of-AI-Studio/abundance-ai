import { useEffect, useState } from 'react';
import type { CircleGetResponse } from '@abundance/shared';
import { Button, Skeleton, Eyebrow, EmptyState } from '@/components/ui';
import { CircleTabIcon, CalendarIcon, VideoIcon, ChatIcon, UsersIcon } from '@/components/ui/icons';
import { programShareUrl } from '@/components/ShareProgramLink';
import { cn } from '@/lib/cn';
import { useApp } from '@/store';
import { toast } from '@/store/toast';

// [13] Your Circle — peer support, low-commitment (A3). People are shown as a
// warm roster (name + avatar only — no labels/categories that someone didn't
// choose to wear). Before a circle is confirmed we still show *recommended*
// people so the page is never empty. Scheduled drop-in meetups give the "what /
// when / who hosts" a bare Meet link can't. Matching is manual in MVP.

// Solid avatar tints cycled by position, so the roster reads as distinct people.
const AVATAR_TONES = ['bg-primary', 'bg-accent', 'bg-primary-hover', 'bg-ink-muted'];

const meetupTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function CirclePage() {
  const { backend } = useApp();
  const [data, setData] = useState<CircleGetResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!backend) return;
    void (async () => {
      try {
        setData(await backend.api.circleGet());
      } catch (e) {
        // Don't fail silently into the empty state — surface it so a broken
        // request is visible instead of looking like "no circle yet".
        console.error('[CirclePage] circleGet failed', e);
        toast.error("We couldn't load your circle just now - try again in a moment.");
      } finally {
        setLoading(false);
      }
    })();
  }, [backend]);

  const openExternal = (url: string | null, name: string) => {
    if (!url) { toast.error(`We couldn't open ${name} - make sure it's installed, or copy the link.`); return; }
    window.open(url, '_blank', 'noopener');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="line" className="w-1/2" />
        {[0, 1, 2].map((i) => <Skeleton key={i} variant="chip" />)}
        <Skeleton variant="card" />
      </div>
    );
  }

  const matched = data?.match_status === 'matched';
  const members = data?.members ?? [];
  const meetups = data?.meetups ?? [];
  const nextMeetup = meetups[0];
  const talk = data?.next_talk;
  // Pending with people to show → treat them as recommendations, not a roster.
  const recommending = !matched && members.length > 0;

  return (
    <div>
      <img
        src="/community-banner-2.webp"
        alt="AbundanceAI Community &amp; Peer Support Circles"
        className="mb-6 w-full rounded-xl border border-line shadow-sm"
      />

      {/* AbundanceAI Telegram community — open to everyone from day one, no
          matching required. The human counterweight to an AI-built program. */}
      <section className="mb-7 rounded-xl border border-accent/25 bg-accent/5 p-6">
        <div className="flex items-center gap-2 text-accent">
          <ChatIcon width={18} height={18} />
          <Eyebrow className="text-accent">Community</Eyebrow>
        </div>
        <h2 className="mt-2 font-serif text-h2 font-medium text-ink">Join the AbundanceAI Telegram Community</h2>
        <p className="mt-1 text-body font-semibold text-ink">You do not have to build your program alone.</p>
        <div className="mt-3 space-y-3 text-body-sm text-ink-secondary">
          <p>
            The AbundanceAI Telegram Community is a warm, welcoming place to meet other mentors, share ideas, ask
            questions, celebrate wins, build friendships, and cheer one another on as you create and launch your program.
          </p>
          <p>
            At a time when more of life is happening through AI, AbundanceAI brings you the human touch: real
            conversation, genuine encouragement, practical support, laughter, care, and connection.
          </p>
          <p>
            You can also meet people working in similar areas or launching around the same time and form a small Peer
            Support Circle. Meet regularly, exchange feedback, work through challenges, stay inspired, and help one
            another keep moving forward.
          </p>
        </div>
        <div className="mt-5">
          <Button
            variant="accent"
            fullWidth={false}
            iconLeft={<ChatIcon width={18} height={18} />}
            onClick={() => openExternal('https://t.me/+IuW34ORWMtU4Njhh', 'Telegram')}
          >
            Join the AbundanceAI Telegram Community
          </Button>
        </div>
        <p className="mt-3 text-body-sm text-ink-secondary">
          Come connect, create, grow, and make new friends along the way.
        </p>
      </section>

      <Eyebrow className="text-accent">Your circle</Eyebrow>

      {matched ? (
        <h1 className="mt-1 font-serif text-h1 font-medium text-ink">You&rsquo;re not doing this alone.</h1>
      ) : recommending ? (
        <h1 className="mt-1 font-serif text-h1 font-medium text-ink">People you might connect with.</h1>
      ) : (
        <h1 className="mt-1 font-serif text-h1 font-medium text-ink">Your circle is on the way.</h1>
      )}

      {matched && (
        <p className="mt-1.5 text-body text-ink-secondary">
          {members.length} people, here to cheer you on. Meet as often or as little as you like.
        </p>
      )}
      {recommending && (
        <p className="mt-1.5 text-body text-ink-secondary">
          A few people at a similar stage. No pressure to commit - say hi, or meet them at the next circle meetup.
        </p>
      )}

      {/* Featured next meetup — a relaxed, drop-in room. */}
      {nextMeetup && (
        <div className="mt-5 flex flex-col gap-3 rounded-lg border border-accent/25 bg-accent/5 p-5 sm:flex-row sm:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
            <CalendarIcon width={22} height={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body-sm font-semibold text-ink">Next circle meetup · {meetupTime(nextMeetup.starts_at)}</p>
            <p className="text-caption text-ink-secondary">A relaxed 45 minutes with your group. Cameras optional.</p>
          </div>
          <Button variant="accent" fullWidth={false} className="shrink-0" onClick={() => openExternal(nextMeetup.join_url, 'the meetup')}>Drop in</Button>
        </div>
      )}

      {/* Roster (matched circle or recommendations) — name + avatar only. */}
      {members.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-lg border border-line bg-surface-plain shadow-sm">
          {members.map((m, i) => {
            // A member with a published program links through to their landing page.
            const linkable = !m.is_you && !!m.program_id;
            const rowClass = cn('flex w-full items-center gap-3.5 px-5 py-4 text-left', i > 0 && 'border-t border-line');
            const inner = (
              <>
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-pill font-mono text-data text-white', AVATAR_TONES[i % AVATAR_TONES.length])}>
                  {m.name.trim().charAt(0).toUpperCase() || '·'}
                </span>
                <p className="min-w-0 truncate text-body font-semibold text-ink">{m.name}</p>
                {m.is_you ? (
                  <span className="ml-auto shrink-0 rounded-pill bg-surface px-2 py-0.5 text-caption font-medium text-ink-secondary">You</span>
                ) : linkable ? (
                  <span className="ml-auto shrink-0 text-caption font-medium text-accent">View program page →</span>
                ) : null}
              </>
            );
            return linkable ? (
              <a
                key={m.user_id}
                href={programShareUrl(m.program_slug, m.program_id!)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(rowClass, 'transition-colors hover:bg-surface')}
              >
                {inner}
              </a>
            ) : (
              <div key={m.user_id} className={rowClass}>{inner}</div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<CircleTabIcon width={30} height={30} />}
          headline="We're hand-matching your circle"
          subline="We pair you with mentors in the same field and at a similar stage, so your circle speaks your language from day one. You'll hear from us within 48 hours - good circles are worth the wait."
        />
      )}

      {/* Group channels — only once a circle is confirmed and has its own room. */}
      {matched && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="accent" iconLeft={<ChatIcon width={18} height={18} />} onClick={() => openExternal(data!.whatsapp_url, 'WhatsApp')}>WhatsApp</Button>
          <Button variant="secondary" iconLeft={<VideoIcon width={18} height={18} />} onClick={() => openExternal(data!.meet_url, 'your circle room')}>Circle room</Button>
        </div>
      )}

      {/* More drop-in meetups — open rooms, scheduled, no commitment. The next
          one is featured above, so list the rest here. */}
      {meetups.length > 1 && (
        <section className="mt-7">
          <div className="flex items-center gap-2">
            <UsersIcon width={18} height={18} className="text-ink-secondary" />
            <h2 className="text-body font-semibold text-ink">More drop-in meetups</h2>
          </div>
          <p className="mt-1 text-caption text-ink-secondary">Open rooms you can join anytime - no commitment.</p>
          <div className="mt-3 space-y-3">
            {meetups.slice(1).map((mu) => (
              <div key={mu.id} className="flex items-center gap-4 rounded-lg border border-line bg-surface-plain p-4 shadow-sm">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                  <CalendarIcon width={22} height={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold text-ink">{mu.title}</p>
                  <p className="text-caption text-ink-secondary">{meetupTime(mu.starts_at)} · with {mu.host_name}</p>
                </div>
                <Button variant="secondary" size="sm" fullWidth={false} className="shrink-0" onClick={() => openExternal(mu.join_url, 'the meetup')}>Drop in</Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Weekly expert talk — dark feature card */}
      {talk && (
        <button
          onClick={() => openExternal(talk.join_url ?? talk.recording_url, 'the talk')}
          className="mt-7 flex w-full items-center gap-4 rounded-xl bg-ink-deep p-5 text-left"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary-hover/20 text-primary-hover">
            <CalendarIcon width={22} height={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-eyebrow uppercase tracking-[0.08em] text-primary-hover">Weekly expert talk</p>
            <p className="mt-0.5 truncate text-body-sm font-semibold text-white">{talk.title}</p>
            <p className="text-caption text-white/60">
              {new Date(talk.starts_at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
          <span className="shrink-0 text-body-sm font-semibold text-white/80">
            {talk.join_url ? 'Join live' : 'Watch'} &rarr;
          </span>
        </button>
      )}
    </div>
  );
}

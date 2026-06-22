import { useEffect, useState } from 'react';
import type { CircleGetResponse } from '@abundance/shared';
import { Button, Skeleton, Eyebrow, EmptyState } from '@/components/ui';
import { CircleTabIcon, CalendarIcon, VideoIcon, ChatIcon, UsersIcon } from '@/components/ui/icons';
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
      try { setData(await backend.api.circleGet()); } catch { /* noop */ } finally { setLoading(false); }
    })();
  }, [backend]);

  const openExternal = (url: string | null, name: string) => {
    if (!url) { toast.error(`We couldn't open ${name} — make sure it's installed, or copy the link.`); return; }
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
  const talk = data?.next_talk;
  // Pending with people to show → treat them as recommendations, not a roster.
  const recommending = !matched && members.length > 0;

  return (
    <div>
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
          A few people at a similar stage. No pressure to commit — say hi at a meetup below whenever you&rsquo;re ready.
        </p>
      )}

      {/* Roster (matched circle or recommendations) — name + avatar only. */}
      {members.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-lg border border-line bg-surface-plain shadow-sm">
          {members.map((m, i) => (
            <div key={m.user_id} className={cn('flex items-center gap-3.5 px-5 py-4', i > 0 && 'border-t border-line')}>
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-pill font-mono text-data text-white', AVATAR_TONES[i % AVATAR_TONES.length])}>
                {m.name.trim().charAt(0).toUpperCase() || '·'}
              </span>
              <p className="min-w-0 truncate text-body font-semibold text-ink">{m.name}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CircleTabIcon width={30} height={30} />}
          headline="We're hand-matching your circle"
          subline="You'll hear from us within 48 hours. Good circles are worth the wait."
        />
      )}

      {/* Group channels — only once a circle is confirmed and has its own room. */}
      {matched && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="accent" iconLeft={<ChatIcon width={18} height={18} />} onClick={() => openExternal(data!.whatsapp_url, 'WhatsApp')}>WhatsApp</Button>
          <Button variant="secondary" iconLeft={<VideoIcon width={18} height={18} />} onClick={() => openExternal(data!.meet_url, 'your circle room')}>Circle room</Button>
        </div>
      )}

      {/* Drop-in meetups — open rooms, scheduled, no commitment. */}
      {meetups.length > 0 && (
        <section className="mt-7">
          <div className="flex items-center gap-2">
            <UsersIcon width={18} height={18} className="text-ink-secondary" />
            <h2 className="text-body font-semibold text-ink">Drop-in meetups</h2>
          </div>
          <p className="mt-1 text-caption text-ink-secondary">Open rooms you can join anytime — no commitment.</p>
          <div className="mt-3 space-y-3">
            {meetups.map((mu) => (
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
          className="mt-7 flex w-full items-center gap-4 rounded-xl bg-[#2A211B] p-5 text-left"
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

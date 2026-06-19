import { useEffect, useState } from 'react';
import type { CircleGetResponse } from '@abundance/shared';
import { Button, Skeleton, Eyebrow, EmptyState } from '@/components/ui';
import { CircleTabIcon, CalendarIcon, VideoIcon, ChatIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { useApp } from '@/store';
import { toast } from '@/store/toast';

// [13] Your Circle — a warm roster (peers matched by craft + stage),
// WhatsApp/Meet deep links, and the weekly expert talk. Pending match → warm
// "hand-matching" message (manual matching, A3).

// Solid avatar tints cycled by position, so the roster reads as distinct people.
const AVATAR_TONES = ['bg-primary', 'bg-accent', 'bg-primary-hover', 'bg-ink-muted'];

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
  const talk = data?.next_talk;

  return (
    <div>
      <Eyebrow className="text-accent">Your circle</Eyebrow>

      {!matched ? (
        <>
          <h1 className="mt-1 font-serif text-h1 font-medium text-ink">Your circle is on the way.</h1>
          <EmptyState
            icon={<CircleTabIcon width={30} height={30} />}
            headline="We're hand-matching your circle"
            subline="You'll hear from us within 48 hours. Good circles are worth the wait."
          />
        </>
      ) : (
        <>
          <h1 className="mt-1 font-serif text-h1 font-medium text-ink">You&rsquo;re not doing this alone.</h1>
          <p className="mt-1.5 text-body text-ink-secondary">
            {members.length} people, matched by craft and stage. Meeting weekly.
          </p>

          {/* Roster */}
          <div className="mt-5 overflow-hidden rounded-lg border border-line bg-surface-plain shadow-sm">
            {members.map((m, i) => (
              <div key={m.user_id} className={cn('flex items-center gap-3.5 px-5 py-4', i > 0 && 'border-t border-line')}>
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-pill font-mono text-data text-white', AVATAR_TONES[i % AVATAR_TONES.length])}>
                  {m.name.trim().charAt(0).toUpperCase() || '·'}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-body font-semibold text-ink">{m.name}</p>
                  <p className="text-caption text-ink-secondary">{m.category} · {m.level}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Group channels */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button variant="accent" iconLeft={<ChatIcon width={18} height={18} />} onClick={() => openExternal(data!.whatsapp_url, 'WhatsApp')}>WhatsApp</Button>
            <Button variant="secondary" iconLeft={<VideoIcon width={18} height={18} />} onClick={() => openExternal(data!.meet_url, 'Google Meet')}>Join Meet</Button>
          </div>
        </>
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

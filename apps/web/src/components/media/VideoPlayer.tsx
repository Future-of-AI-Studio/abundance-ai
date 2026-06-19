import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { PlayIcon } from '@/components/ui/icons';

// Video player — landing (autoplay muted inline), talk, leadership clip. Falls
// back to a warm poster + play affordance if the source can't load; never blocks
// the CTA (§3 [01]).
export function VideoPlayer({
  src,
  poster,
  autoplay = false,
  muted = false,
  label = 'Watch',
  className,
}: {
  src?: string;
  poster?: string;
  autoplay?: boolean;
  muted?: boolean;
  label?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(!src);
  const [playing, setPlaying] = useState(false);

  if (failed) {
    return (
      <div className={cn('relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-surface', className)}>
        {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />}
        <span className="relative flex h-14 w-14 items-center justify-center rounded-pill bg-primary text-white shadow-md">
          <PlayIcon width={26} height={26} />
        </span>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div className={cn('relative aspect-video w-full overflow-hidden rounded-xl bg-ink/5', className)}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        autoPlay={autoplay}
        muted={muted || autoplay}
        loop={autoplay}
        playsInline
        controls={playing}
        onError={() => setFailed(true)}
        onPlay={() => setPlaying(true)}
        className="h-full w-full object-cover"
      />
      {!playing && !autoplay && (
        <button
          onClick={() => { ref.current?.play(); setPlaying(true); }}
          className="absolute inset-0 flex items-center justify-center bg-ink/10"
          aria-label={label}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-pill bg-primary text-white shadow-md">
            <PlayIcon width={26} height={26} />
          </span>
        </button>
      )}
    </div>
  );
}

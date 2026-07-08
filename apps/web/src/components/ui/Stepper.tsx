import { cn } from '@/lib/cn';
import { CheckIcon } from './icons';

export interface StepNode {
  label: string;
  state: 'complete' | 'current' | 'upcoming';
}

// Horizontal progress trail (compact on mobile). Complete = green check,
// current = terracotta, upcoming = muted (§6 Stepper / Progress Trail).
// When `onSelect` is provided, complete/current steps become clickable so the
// user can jump back to any step they've reached; upcoming steps stay locked.
// `activeIndex` marks the step matching the page you're viewing with a "you are
// here" highlight — distinct from journey state (which may be all-complete).
export function Stepper({ steps, onSelect, activeIndex }: { steps: StepNode[]; onSelect?: (index: number) => void; activeIndex?: number }) {
  return (
    <div className="flex items-center">
      {steps.map((s, i) => {
        const clickable = !!onSelect && s.state !== 'upcoming';
        const active = i === activeIndex;
        const inner = (
          <>
            <span
              className={cn(
                'flex items-center justify-center rounded-pill border font-mono transition-all',
                active ? 'h-9 w-9 text-body-sm shadow-sm' : 'h-7 w-7 text-data',
                s.state === 'complete' && 'bg-accent border-accent text-white',
                s.state === 'current' && 'bg-primary border-primary text-white',
                s.state === 'upcoming' && 'bg-surface border-line-strong text-ink-secondary',
                clickable && 'group-hover:scale-105',
              )}
            >
              {s.state === 'complete' ? <CheckIcon width={active ? 18 : 15} height={active ? 18 : 15} /> : i + 1}
            </span>
            <span className={cn('mt-1 hidden text-caption sm:block', active ? 'font-bold text-primary' : s.state === 'upcoming' ? 'text-ink-secondary' : 'text-ink')}>
              {s.label}
            </span>
          </>
        );
        return (
          <div key={s.label} className="flex flex-1 items-center last:flex-none">
            {clickable ? (
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`Go to ${s.label}`}
                aria-current={active ? 'step' : undefined}
                className="group flex flex-col items-center focus:outline-none"
              >
                {inner}
              </button>
            ) : (
              <div aria-current={active ? 'step' : undefined} className="flex flex-col items-center">{inner}</div>
            )}
            {i < steps.length - 1 && (
              <span className={cn('mx-1 h-0.5 flex-1 rounded-pill', s.state === 'complete' ? 'bg-accent' : 'bg-line-strong')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

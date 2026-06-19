import { cn } from '@/lib/cn';
import { CheckIcon } from './icons';

export interface StepNode {
  label: string;
  state: 'complete' | 'current' | 'upcoming';
}

// Horizontal progress trail (compact on mobile). Complete = green check,
// current = terracotta, upcoming = muted (§6 Stepper / Progress Trail).
export function Stepper({ steps }: { steps: StepNode[] }) {
  return (
    <div className="flex items-center">
      {steps.map((s, i) => (
        <div key={s.label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-pill border text-data font-mono',
                s.state === 'complete' && 'bg-accent border-accent text-white',
                s.state === 'current' && 'bg-primary border-primary text-white',
                s.state === 'upcoming' && 'bg-surface border-line-strong text-ink-secondary',
              )}
            >
              {s.state === 'complete' ? <CheckIcon width={15} height={15} /> : i + 1}
            </span>
            <span className={cn('mt-1 hidden text-caption sm:block', s.state === 'upcoming' ? 'text-ink-secondary' : 'text-ink')}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <span className={cn('mx-1 h-0.5 flex-1 rounded-pill', s.state === 'complete' ? 'bg-accent' : 'bg-line-strong')} />
          )}
        </div>
      ))}
    </div>
  );
}

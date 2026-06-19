import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type BadgeVariant = 'recommended' | 'done' | 'pending' | 'new' | 'matched';

const VARIANT: Record<BadgeVariant, string> = {
  recommended: 'bg-success-bg text-success border-success-border',
  done: 'bg-success-bg text-success border-success-border',
  matched: 'bg-success-bg text-success border-success-border',
  pending: 'bg-surface text-ink-secondary border-line-strong',
  new: 'bg-primary/10 text-primary border-primary/30',
};

export function Badge({ variant = 'pending', children }: { variant?: BadgeVariant; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 font-mono text-data uppercase tracking-[0.06em]',
        VARIANT[variant],
      )}
    >
      {variant === 'matched' && <span className="h-1.5 w-1.5 rounded-pill bg-success" />}
      {children}
    </span>
  );
}

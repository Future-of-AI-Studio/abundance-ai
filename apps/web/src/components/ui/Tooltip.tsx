import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

// Lightweight CSS tooltip: a small bubble that appears on hover or keyboard focus
// of whatever it wraps. Because it triggers off the wrapper (not the child), it
// still works around a *disabled* control — a disabled <button> fires no events,
// but the wrapper does. The label is also mirrored to `title`/`aria-label` so it
// stays discoverable for screen readers and native hover.
export function Tooltip({
  label,
  children,
  className,
  side = 'top',
}: {
  label: string;
  children: ReactNode;
  className?: string;
  side?: 'top' | 'bottom';
}) {
  return (
    <span className={cn('group relative inline-flex', className)} tabIndex={0} title={label} aria-label={label}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 w-max max-w-[240px] -translate-x-1/2 rounded-md bg-ink-deep px-2.5 py-1.5 text-caption leading-snug text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        {label}
      </span>
    </span>
  );
}

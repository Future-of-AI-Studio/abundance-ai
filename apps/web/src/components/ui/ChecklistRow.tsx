import { cn } from '@/lib/cn';
import { CheckIcon } from './icons';

// Checklist row (Get Paid) — label + status (done = green check / todo = empty circle).
export function ChecklistRow({ label, status }: { label: string; status: 'todo' | 'in-progress' | 'done' }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-pill border',
          status === 'done' ? 'border-accent bg-accent text-white' : 'border-line-strong bg-surface-plain',
        )}
      >
        {status === 'done' && <CheckIcon width={14} height={14} />}
        {status === 'in-progress' && <span className="h-2 w-2 rounded-pill bg-primary" />}
      </span>
      <span className={cn('text-body', status === 'done' ? 'text-ink' : 'text-ink-secondary')}>{label}</span>
    </div>
  );
}

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { CheckIcon } from './icons';
import { Sheet } from './Sheet';

export interface Option<T extends string> {
  value: T;
  label: string;
}

// Mobile-friendly select: tapping opens a bottom-sheet picker (§6). Selected
// item gets a terracotta check.
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
}: {
  label?: string;
  value: T | null;
  options: Option<T>[];
  onChange: (v: T) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <div>
      {label && <span className="mb-1.5 block text-body-sm font-medium text-ink">{label}</span>}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center justify-between rounded-md border border-line bg-surface-plain px-4 text-body text-ink"
      >
        <span className={cn(!current && 'text-ink-secondary/60')}>{current?.label ?? placeholder}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-secondary">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={label ?? 'Select'}>
        <ul className="divide-y divide-line">
          {options.map((o) => {
            const active = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className="flex w-full items-center justify-between py-3 text-body text-ink hover:text-primary"
                >
                  {o.label}
                  {active && <CheckIcon width={20} height={20} className="text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </div>
  );
}

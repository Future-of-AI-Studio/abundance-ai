import { cn } from '@/lib/cn';

export interface Segment<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex w-full gap-1 rounded-pill bg-surface p-1" role="tablist">
      {segments.map((seg) => {
        const active = seg.value === value;
        return (
          <button
            key={seg.value}
            role="tab"
            aria-selected={active}
            disabled={seg.disabled}
            onClick={() => !seg.disabled && onChange(seg.value)}
            className={cn(
              'flex-1 rounded-pill px-4 py-2 text-body-sm font-medium transition-colors',
              active ? 'bg-surface-plain text-primary shadow-sm' : 'text-ink-secondary hover:text-ink',
              seg.disabled && 'cursor-not-allowed opacity-40',
            )}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}

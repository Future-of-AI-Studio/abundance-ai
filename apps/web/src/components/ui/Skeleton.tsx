import { cn } from '@/lib/cn';

type Variant = 'line' | 'card' | 'chip' | 'module-card' | 'post-card';

export function Skeleton({ variant = 'line', className }: { variant?: Variant; className?: string }) {
  const shapes: Record<Variant, string> = {
    line: 'h-4 w-full rounded-sm',
    chip: 'h-16 w-full rounded-md',
    card: 'h-28 w-full rounded-lg',
    'module-card': 'h-24 w-full rounded-lg',
    'post-card': 'h-32 w-full rounded-lg',
  };
  return <div className={cn('shimmer bg-surface', shapes[variant], className)} aria-hidden />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="line" className={i === lines - 1 ? 'w-2/3' : 'w-full'} />
      ))}
    </div>
  );
}

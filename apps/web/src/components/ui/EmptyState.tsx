import type { ReactNode } from 'react';

// Never a blank screen — a soft illustration block + warm headline + reassurance
// + optional action (§6).
export function EmptyState({
  icon,
  headline,
  subline,
  action,
}: {
  icon?: ReactNode;
  headline: string;
  subline?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-pill bg-surface text-primary">
        {icon}
      </div>
      <h2 className="text-h2 font-semibold text-ink">{headline}</h2>
      {subline && <p className="mt-2 max-w-xs text-body text-ink-secondary">{subline}</p>}
      {action && <div className="mt-6 w-full max-w-xs">{action}</div>}
    </div>
  );
}

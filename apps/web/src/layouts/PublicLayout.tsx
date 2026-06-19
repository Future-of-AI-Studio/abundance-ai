import { Outlet, Link } from 'react-router-dom';

// Acquisition shell — no tab bar, no app chrome. Logo-only header, conversion-focused.
export function PublicLayout() {
  return (
    <div className="min-h-[100dvh] bg-bg">
      <Outlet />
    </div>
  );
}

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 font-semibold text-ink">
      <span className="flex h-7 w-7 items-center justify-center rounded-pill bg-primary text-white">
        <span className="font-mono text-data">A</span>
      </span>
      <span className="text-h3">AbundanceAI</span>
    </Link>
  );
}

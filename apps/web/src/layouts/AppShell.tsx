import { Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useApp } from '@/store';
import { Avatar, Spinner, BottomTabBar, SideNav } from '@/components/ui';

// Authenticated shell. Mobile: top greeting bar (avatar→Account) + persistent
// bottom tab bar. Desktop (lg+): a left side rail carries nav + account, the
// greeting bar and bottom tab bar fold away, and the content column centers in
// the space beside the rail. Wraps RequireAuth.
export function AppShell() {
  const navigate = useNavigate();
  const { ready, user, profile } = useApp();

  const loading = (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg text-primary">
      <Spinner size={28} />
    </div>
  );

  if (!ready) return loading;
  if (!user) return <Navigate to="/auth" replace />;
  // Signed in but the profile is still hydrating — wait before deciding the gate.
  if (!profile) return loading;
  // Account-first: signed in but unpaid → send to checkout to unlock the app.
  if (!profile.paid_at) return <Navigate to="/checkout" replace />;

  const firstName = profile?.first_name ?? 'there';

  return (
    <div className="min-h-[100dvh] bg-bg">
      <SideNav firstName={firstName} avatarUrl={profile?.avatar_url} />

      {/* Mobile-only greeting bar — the side rail carries identity on desktop. */}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-frame items-center justify-between px-5 py-3">
          <p className="text-body-sm text-ink-secondary">
            Good to see you, <span className="font-medium text-ink">{firstName}</span>
          </p>
          <button onClick={() => navigate('/app/account')} aria-label="Account">
            <Avatar name={firstName} src={profile?.avatar_url} size={36} />
          </button>
        </div>
      </header>

      {/* Reserve the rail width on desktop, then center the content column in what's left. */}
      <div className="lg:pl-64">
        <main className="mx-auto max-w-frame px-5 pb-28 pt-4 lg:pb-16 lg:pt-12">
          <Outlet />
        </main>
      </div>

      <BottomTabBar />
    </div>
  );
}

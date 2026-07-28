import { Outlet, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useApp } from '@/store';
import { useUnsaved } from '@/store/unsaved';
import { Avatar, Button, Sheet, Spinner, BottomTabBar, SideNav } from '@/components/ui';
import { cn } from '@/lib/cn';

// Authenticated shell. Mobile: top greeting bar (avatar→Account) + persistent
// bottom tab bar. Desktop (lg+): a left side rail carries nav + account, the
// greeting bar and bottom tab bar fold away, and the content spans the full
// width beside the rail — a dashboard feel rather than a centered document.
// Individual pages that read best narrow (Mindset, Help) self-constrain with
// their own max-width. Wraps RequireAuth.
export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ready, user, profile } = useApp();
  const { pending, guard, confirmPending, cancelPending } = useUnsaved();
  // Full-height routes (the Mindset conversation) manage their own scrolling: the
  // shell becomes a fixed-viewport flex column with a padding-less main — on every
  // breakpoint — so the page's header/thread/composer flex-fill the screen with no
  // leftover bands and the composer stays pinned above the mobile tab bar. The page
  // supplies its own padding.
  const fullHeight = location.pathname === '/app/mindset';
  // Home has its own greeting header (name + day counter + account avatar), so the
  // generic mobile greeting bar would duplicate it — suppress it on that route.
  const isHome = location.pathname === '/app';

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
    <div className={cn('min-h-[100dvh] bg-bg', fullHeight && 'flex h-[100dvh] flex-col overflow-hidden')}>
      <SideNav firstName={firstName} avatarUrl={profile?.avatar_url} />

      {/* Mobile-only greeting bar — the side rail carries identity on desktop, and
          Home carries its own greeting header, so it's hidden there. */}
      <header className={cn('sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur lg:hidden', isHome && 'hidden')}>
        <div className="mx-auto flex max-w-frame items-center justify-between px-5 py-3">
          <p className="text-body-sm text-ink-secondary">
            Good to see you, <span className="font-medium text-ink">{firstName}</span>
          </p>
          <button
            onClick={() => { if (!guard(() => navigate('/app/account'))) navigate('/app/account'); }}
            aria-label="Account"
          >
            <Avatar name={firstName} src={profile?.avatar_url} size={36} />
          </button>
        </div>
      </header>

      {/* Reserve the rail width on desktop, then let content fill the space beside
          it (capped so line lengths stay sane on ultra-wide monitors). */}
      <div className={cn('lg:pl-64', fullHeight && 'flex min-h-0 flex-1 flex-col')}>
        <main
          className={cn(
            fullHeight
              ? 'flex w-full min-h-0 flex-1 flex-col'
              : 'mx-auto w-full max-w-[1720px] px-5 pb-28 pt-4 lg:px-8 lg:pb-16 lg:pt-12',
          )}
        >
          <Outlet />
        </main>
      </div>

      <BottomTabBar />

      {/* Unsaved-edits confirm — rendered last so it paints above any page-level
          sheet (Sheet has no portal; DOM order breaks the z-50 tie). */}
      <Sheet
        open={pending !== null}
        onClose={cancelPending}
        title="Leave without saving?"
        footer={
          <>
            <Button variant="destructive" onClick={confirmPending}>Leave without saving</Button>
            <Button variant="ghost" onClick={cancelPending}>Keep editing</Button>
          </>
        }
      >
        <p className="text-body text-ink-secondary">
          You have edits that haven&rsquo;t been saved yet. If you leave now, those changes will be lost.
        </p>
      </Sheet>
    </div>
  );
}

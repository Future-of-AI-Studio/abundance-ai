import { NavLink, Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Avatar } from './Avatar';
import { HomeIcon, ProgramIcon, UsersIcon, HeartIcon, CircleTabIcon } from './icons';

// Desktop-only left rail (lg+). Mirrors the BottomTabBar destinations and pins
// Account at the foot. Hidden on mobile, where BottomTabBar takes over.
const TABS = [
  { to: '/app', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/app/program', label: 'Program', Icon: ProgramIcon, end: false },
  { to: '/app/students', label: 'Students', Icon: UsersIcon, end: false },
  { to: '/app/mindset', label: 'Mindset', Icon: HeartIcon, end: false },
  { to: '/app/circle', label: 'Circle', Icon: CircleTabIcon, end: false },
];

export function SideNav({ firstName, avatarUrl }: { firstName: string; avatarUrl?: string | null }) {
  const navigate = useNavigate();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface-plain/70 px-4 py-6 backdrop-blur lg:flex">
      {/* Brand */}
      <Link to="/app" className="inline-flex items-center gap-2 px-2 font-semibold text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-pill bg-primary text-white">
          <span className="font-mono text-data">A</span>
        </span>
        <span className="text-h3">AbundanceAI</span>
      </Link>

      {/* Primary nav */}
      <nav className="mt-10 flex flex-1 flex-col gap-1">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-body-sm transition-colors',
                isActive
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-ink-secondary hover:bg-surface hover:text-ink active:bg-surface/80',
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Accent bar: solid for the selected tab, a faint hint on hover. */}
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
                  )}
                />
                <Icon
                  width={22}
                  height={22}
                  className={cn('transition-colors', isActive ? 'text-primary' : 'text-ink-secondary group-hover:text-ink')}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Account — pinned to the foot */}
      <button
        onClick={() => navigate('/app/account')}
        aria-label="Account"
        className="mt-4 flex items-center gap-3 rounded-md border border-line bg-surface-plain px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
      >
        <Avatar name={firstName} src={avatarUrl} size={36} />
        <div className="min-w-0">
          <p className="truncate text-body-sm font-medium text-ink">{firstName}</p>
          <p className="text-caption text-ink-secondary">View account</p>
        </div>
      </button>
    </aside>
  );
}

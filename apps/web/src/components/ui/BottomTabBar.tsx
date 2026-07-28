import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useUnsaved } from '@/store/unsaved';
import { cn } from '@/lib/cn';
import { HomeIcon, ProgramIcon, UsersIcon, HeartIcon, CircleTabIcon } from './icons';

// Persistent bottom tab bar on app screens. Active = growth green, inactive =
// warm slate (§1.2 / §6). Account is NOT here — it lives behind the avatar.
const TABS = [
  { to: '/app', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/app/program', label: 'Program', Icon: ProgramIcon, end: false },
  { to: '/app/students', label: 'Participants', Icon: UsersIcon, end: false },
  { to: '/app/mindset', label: 'Mindset', Icon: HeartIcon, end: false },
  { to: '/app/circle', label: 'Circle', Icon: CircleTabIcon, end: false },
];

export function BottomTabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const guard = useUnsaved((s) => s.guard);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-safe backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-frame">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={(e) => { if (pathname !== to && guard(() => navigate(to))) e.preventDefault(); }}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-caption transition-colors',
                isActive ? 'text-accent' : 'text-ink-secondary hover:text-ink',
              )
            }
          >
            <Icon width={24} height={24} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

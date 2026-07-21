import { useNavigate, useLocation } from 'react-router-dom';
import { trail as journeyTrail, getNextStep } from '@abundance/shared';
import { Stepper } from '@/components/ui';
import { useApp } from '@/store';
import { useUnsaved } from '@/store/unsaved';
import { cn } from '@/lib/cn';

// The shared, clickable journey trail shown across every onboarding step. Reads
// the journey from the store, marks each step complete/current/upcoming, and lets
// the user jump to any step they've already reached (upcoming steps stay locked).
export function JourneyStepper({ className }: { className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const journey = useApp((s) => s.journey);
  const guard = useUnsaved((s) => s.guard);
  if (!journey) return null;

  const trailSteps = journeyTrail(journey.path);
  if (!trailSteps.length) return null;

  // Which node maps to the page we're on — the "you are here" highlight. -1 (no
  // highlight) if the current route isn't one of the trail steps.
  const activeIndex = trailSteps.findIndex((s) => s.route === location.pathname);

  const completed = new Set(journey.completed_steps ?? []);
  const next = getNextStep(journey);
  const nodes = trailSteps.map((s) => ({
    label: s.trailLabel,
    state: (completed.has(s.step) ? 'complete' : s.step === next.step ? 'current' : 'upcoming') as
      'complete' | 'current' | 'upcoming',
  }));

  return (
    <div className={cn('overflow-x-auto pb-1', className)}>
      <Stepper
        steps={nodes}
        activeIndex={activeIndex}
        onSelect={(i) => {
          const s = trailSteps[i];
          if (!s || s.route === location.pathname) return;
          // Unsaved edits on the current step? Block and let the confirm sheet decide.
          if (!guard(() => navigate(s.route))) navigate(s.route);
        }}
      />
    </div>
  );
}

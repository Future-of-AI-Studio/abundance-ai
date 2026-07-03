import { useNavigate } from 'react-router-dom';
import { trail as journeyTrail, getNextStep } from '@abundance/shared';
import { Stepper } from '@/components/ui';
import { useApp } from '@/store';
import { cn } from '@/lib/cn';

// The shared, clickable journey trail shown across every onboarding step. Reads
// the journey from the store, marks each step complete/current/upcoming, and lets
// the user jump to any step they've already reached (upcoming steps stay locked).
export function JourneyStepper({ className }: { className?: string }) {
  const navigate = useNavigate();
  const journey = useApp((s) => s.journey);
  if (!journey) return null;

  const trailSteps = journeyTrail(journey.path);
  if (!trailSteps.length) return null;

  const completed = new Set(journey.completed_steps ?? []);
  const next = getNextStep(journey);
  const nodes = trailSteps.map((s) => ({
    label: s.trailLabel,
    state: (completed.has(s.step) ? 'complete' : s.step === next.step ? 'current' : 'upcoming') as
      'complete' | 'current' | 'upcoming',
  }));

  return (
    <div className={cn('overflow-x-auto pb-1', className)}>
      <Stepper steps={nodes} onSelect={(i) => { const s = trailSteps[i]; if (s) navigate(s.route); }} />
    </div>
  );
}

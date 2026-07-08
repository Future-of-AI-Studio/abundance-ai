import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Path } from '@abundance/shared';
import { trail as journeyTrail, getNextStep } from '@abundance/shared';
import { Button, Card } from '@/components/ui';
import { StepLayout, RailLabel } from '@/components/StepLayout';
import { useApp } from '@/store';
import { cn } from '@/lib/cn';
import { CheckIcon, TargetIcon } from '@/components/ui/icons';

// [05] Choose Your Path — Live Group Coaching (Type A) only for now.
// Self-Paced (Type B) is deferred; path is fixed to A and branches the rest of onboarding.
const OPTIONS: Array<{
  value: Path; title: string; promise: string; bullets: string[]; bestFor: string;
}> = [
  {
    value: 'A',
    title: 'Live Group Coaching',
    promise: 'Show up live and coach a small group in real time.',
    bullets: ['3–6 live sessions', 'Real-time feedback', 'Highest income potential'],
    bestFor: 'Best for people who light up in conversation.',
  },
];

export function ChoosePathPage() {
  const navigate = useNavigate();
  const { backend, refreshJourney } = useApp();
  const [selected, setSelected] = useState<Path | null>('A');
  const [saving, setSaving] = useState(false);

  const onContinue = async () => {
    if (!selected || !backend) return;
    setSaving(true);
    await backend.api.journeyUpdate({ path: selected, current_step: 'content', complete_step: 'path' });
    await refreshJourney();
    navigate('/app/onboarding/content');
  };

  return (
    <StepLayout
      back
      backTo="/app"
      eyebrow="Step 1 of your journey"
      title="Ready to show up live and coach?"
      main={
        <>
          <p className="text-body-sm text-ink-secondary">Choose how you want to teach. You can change this anytime.</p>

          <div className="grid gap-4">
            {OPTIONS.map((o) => {
              const active = selected === o.value;
              return (
                <button
                  key={o.value}
                  onClick={() => setSelected(o.value)}
                  className={cn(
                    'rounded-lg border p-5 text-left transition-all',
                    active ? 'border-primary bg-primary/5 shadow-md' : 'border-line bg-surface-plain hover:border-primary/40',
                  )}
                >
                  <div className="flex items-start gap-4">
                    <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', active ? 'bg-primary/15 text-primary' : 'bg-surface text-ink-secondary')}>
                      <TargetIcon width={22} height={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-h3 font-semibold text-ink">{o.title}</h3>
                        {active && <span className="rounded-pill bg-primary/10 px-2 py-0.5 font-mono text-data uppercase tracking-[0.06em] text-primary">Selected</span>}
                      </div>
                      <p className="mt-1 text-body-sm text-ink-secondary">{o.promise}</p>
                      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                        {o.bullets.map((b) => (
                          <li key={b} className="flex items-center gap-2 text-body-sm text-ink">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" />{b}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-caption italic text-ink-secondary">{o.bestFor}</p>
                    </div>
                    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border', active ? 'border-primary bg-primary text-white' : 'border-line-strong')}>
                      {active && <CheckIcon width={14} height={14} />}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <Button size="lg" disabled={!selected} loading={saving} onClick={onContinue}>Continue</Button>
        </>
      }
      aside={
        <>
          <Card variant="plain" className="p-4">
            <RailLabel>Setup progress</RailLabel>
            <SetupProgress />
          </Card>
        </>
      }
    />
  );
}

// Vertical journey list for the rail. Reads the same trail as the top stepper but
// renders it as a compact checklist with the current step called out.
function SetupProgress() {
  const journey = useApp((s) => s.journey);
  if (!journey) return null;
  const steps = journeyTrail(journey.path);
  if (!steps.length) return null;
  const completed = new Set(journey.completed_steps ?? []);
  const next = getNextStep(journey);

  return (
    <ol className="space-y-2.5">
      {steps.map((s) => {
        const state = completed.has(s.step) ? 'complete' : s.step === next.step ? 'current' : 'upcoming';
        return (
          <li key={s.step} className="flex items-center gap-2.5">
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-pill',
                state === 'complete' && 'bg-accent text-white',
                state === 'current' && 'border-2 border-primary',
                state === 'upcoming' && 'border border-line-strong',
              )}
            >
              {state === 'complete' && <CheckIcon width={10} height={10} />}
              {state === 'current' && <span className="h-1.5 w-1.5 rounded-pill bg-primary" />}
            </span>
            <span className={cn('text-body-sm', state === 'current' ? 'font-semibold text-primary' : state === 'upcoming' ? 'text-ink-secondary' : 'text-ink')}>
              {s.trailLabel}{state === 'current' && ' — choosing now'}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

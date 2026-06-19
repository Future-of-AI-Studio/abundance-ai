import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Path } from '@abundance/shared';
import { Button, Badge } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { useApp } from '@/store';
import { cn } from '@/lib/cn';
import { CheckIcon } from '@/components/ui/icons';

// [05] Choose Your Path — Live Group Coaching (A, recommended) vs Self-Paced (B).
// Branches the rest of onboarding. Continue enabled on select.
const OPTIONS: Array<{
  value: Path; title: string; promise: string; bullets: string[]; bestFor: string; recommended?: boolean;
}> = [
  {
    value: 'A',
    title: 'Live Group Coaching',
    promise: 'Show up live and coach a small group in real time.',
    bullets: ['3–6 live sessions', 'Real-time feedback', 'Highest income potential'],
    bestFor: 'Best for people who light up in conversation.',
    recommended: true,
  },
  {
    value: 'B',
    title: 'Self-Paced Course',
    promise: 'Record once, sell on repeat — Udemy-style.',
    bullets: ['Pre-recorded modules', 'Great if you\'re camera-shy', 'Learners go at their own pace'],
    bestFor: 'Best for people who prefer to record on their own time.',
  },
];

export function ChoosePathPage() {
  const navigate = useNavigate();
  const { backend, refreshJourney } = useApp();
  const [selected, setSelected] = useState<Path | null>(null);
  const [saving, setSaving] = useState(false);

  const onContinue = async () => {
    if (!selected || !backend) return;
    setSaving(true);
    await backend.api.journeyUpdate({ path: selected, current_step: 'content', complete_step: 'path' });
    await refreshJourney();
    navigate('/app/onboarding/content');
  };

  return (
    <div>
      <PageHeader back backTo="/app" eyebrow="Step 1 of your journey" title="Ready to show up live, or start with recorded?" />

      <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="flex items-start justify-between">
                <span className={cn('flex h-6 w-6 items-center justify-center rounded-pill border', active ? 'border-primary bg-primary text-white' : 'border-line-strong')}>
                  {active && <CheckIcon width={14} height={14} />}
                </span>
                {o.recommended && <Badge variant="recommended">Recommended</Badge>}
              </div>
              <h3 className="mt-3 text-h3 font-semibold text-ink">{o.value === 'A' ? 'Type A — ' : 'Type B — '}{o.title}</h3>
              <p className="mt-1 text-body-sm text-ink-secondary">{o.promise}</p>
              <ul className="mt-3 space-y-1.5">
                {o.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-body-sm text-ink">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" />{b}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-caption text-ink-secondary">{o.bestFor}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <Button size="lg" disabled={!selected} loading={saving} onClick={onContinue}>Continue</Button>
      </div>
    </div>
  );
}

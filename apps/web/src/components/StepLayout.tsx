import type { ReactNode } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { JourneyStepper } from '@/components/JourneyStepper';
import { Card } from '@/components/ui';

// Shared chrome for every onboarding step: Back → eyebrow → title → full-width
// stepper card → a two-column workspace (main content + a contextual right rail).
// Pass `main`/`aside` for the standard 1fr + 340px split, or `children` to supply
// a custom grid (e.g. the Marketing picker/preview columns).
export function StepLayout({
  eyebrow, title, subtitle, back, backTo, main, aside, children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  back?: boolean;
  backTo?: string;
  main?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div>
      <PageHeader back={back} backTo={backTo} eyebrow={eyebrow} title={title}>
        {subtitle}
      </PageHeader>

      <Card variant="plain" className="mb-6 px-4 py-3">
        <JourneyStepper />
      </Card>

      {children ?? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start xl:gap-8">
          <div className="min-w-0 space-y-5">{main}</div>
          {aside && <aside className="space-y-4 lg:sticky lg:top-6">{aside}</aside>}
        </div>
      )}
    </div>
  );
}

// A right-rail section label, matching the eyebrow rhythm used across the app.
export function RailLabel({ children }: { children: ReactNode }) {
  return <p className="mb-3 font-mono text-eyebrow uppercase tracking-[0.12em] text-ink-secondary">{children}</p>;
}

import { useState } from 'react';
import {
  Button, Card, CardTitle, Eyebrow, TextInput, Textarea, Select, Badge,
  Skeleton, EmptyState, Avatar, SegmentedControl, Sheet, Stepper, ChecklistRow, type StepNode,
} from '@/components/ui';
import { SparkleIcon, HeartIcon } from '@/components/ui/icons';
import { toast } from '@/store/toast';

// /gallery — a dev-only review surface for the §6 primitives. Not part of the
// app flow; reachable directly for visual QA.
const steps: StepNode[] = [
  { label: 'Path', state: 'complete' },
  { label: 'Content', state: 'complete' },
  { label: 'Program', state: 'current' },
  { label: 'Marketing', state: 'upcoming' },
  { label: 'Get paid', state: 'upcoming' },
];

export function GalleryPage() {
  const [sheet, setSheet] = useState(false);
  const [seg, setSeg] = useState<'a' | 'b'>('a');
  const [sel, setSel] = useState<'healer' | 'other' | null>(null);

  return (
    <div className="mx-auto max-w-frame space-y-8 px-5 py-8">
      <h1 className="text-h1 font-bold text-ink">Component gallery</h1>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button fullWidth={false}>Primary</Button>
          <Button fullWidth={false} variant="secondary">Secondary</Button>
          <Button fullWidth={false} variant="ghost">Ghost</Button>
          <Button fullWidth={false} variant="destructive">Destructive</Button>
          <Button fullWidth={false} loading>Loading</Button>
          <Button fullWidth={false} disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Text" placeholder="Type here" />
          <TextInput label="Password" type="password" placeholder="Secret" />
          <TextInput label="With error" error="Something's off" defaultValue="oops" />
          <Select label="Category" value={sel} options={[{ value: 'healer', label: 'Healer' }, { value: 'other', label: 'Other' }]} onChange={setSel} />
        </div>
        <Textarea label="Textarea" placeholder="A few words…" className="mt-3" />
      </Section>

      <Section title="Badges & Pills">
        <div className="flex flex-wrap gap-2">
          <Badge variant="recommended">Recommended</Badge>
          <Badge variant="done">Done</Badge>
          <Badge variant="pending">Pending</Badge>
          <Badge variant="new">New</Badge>
          <Badge variant="matched">Matched</Badge>
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card><CardTitle>Surface</CardTitle></Card>
          <Card variant="plain"><CardTitle>Plain</CardTitle></Card>
          <Card variant="hero"><CardTitle>Hero</CardTitle></Card>
        </div>
      </Section>

      <Section title="Segmented control">
        <SegmentedControl segments={[{ value: 'a', label: 'Social' }, { value: 'b', label: 'Email', disabled: true }]} value={seg} onChange={setSeg} />
      </Section>

      <Section title="Stepper">
        <Card><Stepper steps={steps} /></Card>
      </Section>

      <Section title="Checklist">
        <Card variant="plain">
          <ChecklistRow label="Email" status="done" />
          <ChecklistRow label="Bank account" status="in-progress" />
          <ChecklistRow label="Photo ID" status="todo" />
        </Card>
      </Section>

      <Section title="Avatar & Toast">
        <div className="flex items-center gap-3">
          <Avatar name="Ruby Moore" />
          <Button fullWidth={false} variant="secondary" onClick={() => toast.success('Copied to clipboard')}>Success toast</Button>
          <Button fullWidth={false} variant="secondary" onClick={() => toast.error('Something went wrong')}>Error toast</Button>
        </div>
      </Section>

      <Section title="Skeletons">
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton variant="card" /><Skeleton variant="post-card" /><Skeleton variant="module-card" />
        </div>
      </Section>

      <Section title="Sheet & Empty">
        <Button fullWidth={false} onClick={() => setSheet(true)}>Open sheet</Button>
        <Card className="mt-3">
          <EmptyState icon={<SparkleIcon width={28} height={28} />} headline="Nothing here yet" subline="A warm, reassuring empty state." action={<Button>Do the thing</Button>} />
        </Card>
        <Sheet open={sheet} onClose={() => setSheet(false)} title="Example sheet" footer={<Button onClick={() => setSheet(false)}>Got it</Button>}>
          <p className="text-body text-ink-secondary">Bottom sheet on mobile, centered modal on desktop.</p>
        </Sheet>
      </Section>

      <Section title="Icons">
        <div className="flex gap-3 text-primary"><SparkleIcon /><HeartIcon /></div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <Eyebrow className="mb-3">{title}</Eyebrow>
      {children}
    </section>
  );
}

import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Category } from '@abundance/shared';
import { Button, Card, TextInput, Select, Sheet, Eyebrow } from '@/components/ui';
import {
  PencilIcon, CardIcon, LockIcon, HelpIcon, BookIcon, CircleTabIcon, ShieldIcon, ArrowRight,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { useApp } from '@/store';
import { toast } from '@/store/toast';

const CATEGORIES: Array<{ value: Category; label: string }> = [
  { value: 'healer', label: 'Healer' },
  { value: 'hobbyist', label: 'Hobbyist' },
  { value: 'professional', label: 'Professional' },
  { value: 'other', label: 'Other' },
];
const CATEGORY_LABEL: Record<Category, string> = {
  healer: 'Healer', hobbyist: 'Hobbyist', professional: 'Professional', other: 'Other',
};

type Cadence = 'gentle' | 'balanced' | 'active';
const CADENCE: Array<{ value: Cadence; label: string; note: string }> = [
  { value: 'gentle', label: 'Gentle', note: 'up to 1 check-in a week' },
  { value: 'balanced', label: 'Balanced', note: 'up to 3 check-ins a week' },
  { value: 'active', label: 'Active', note: 'up to 5 check-ins a week' },
];

// [14] Account & settings — profile, path/program, account & security, the
// notification + cadence preferences, and the one-tap 90-day refund (confirm
// sheet). Two-column dashboard on desktop, stacked on mobile.
export function AccountPage() {
  const navigate = useNavigate();
  const { backend, profile, journey, program, refreshProfile } = useApp();

  // Edit-profile sheet
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(profile?.first_name ?? '');
  const [category, setCategory] = useState<Category>(profile?.category ?? 'other');
  const [savingName, setSavingName] = useState(false);

  // Local notification preferences (UI-only for now).
  const [mindsetNudges, setMindsetNudges] = useState(true);
  const [circleTalks, setCircleTalks] = useState(true);
  const [productEmails, setProductEmails] = useState(false);
  const [cadence, setCadence] = useState<Cadence>('balanced');

  // Refund flow
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundResult, setRefundResult] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);

  const saveProfile = async () => {
    if (!backend) return;
    if (!name.trim()) { toast.error("Your name can't be empty."); return; }
    setSavingName(true);
    try { await backend.reads.updateProfile({ first_name: name, category }); await refreshProfile(); toast.success('Saved'); setEditOpen(false); }
    catch { toast.error("Couldn't save — try again."); }
    finally { setSavingName(false); }
  };

  const requestRefund = async () => {
    if (!backend) return;
    setRefunding(true);
    try { const res = await backend.api.refundRequest(); setRefundResult(res.message); }
    catch { setRefundResult('Something went wrong — please reach out to us directly.'); }
    finally { setRefunding(false); }
  };

  const signOut = async () => { await backend?.auth.signOut(); navigate('/'); };

  const displayName = profile?.first_name?.trim() || 'Friend';
  const pathLabel = journey?.path === 'A' ? 'Live group coaching' : journey?.path === 'B' ? 'Self-paced program' : 'Path not chosen yet';
  const pathSub = journey?.path ? `Type ${journey.path} · your chosen path` : 'Pick a path to begin';
  const moduleCount = program.modules.length;
  const cadenceNote = CADENCE.find((c) => c.value === cadence)!;

  // Day X of 90 within the guarantee window.
  const dayOfGuarantee = (() => {
    if (!profile?.created_at) return 1;
    const days = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86_400_000) + 1;
    return Math.min(90, Math.max(1, days));
  })();

  return (
    <div>
      {/* Header */}
      <h1 className="font-serif text-h1 font-medium text-ink">Account &amp; settings</h1>
      <p className="mt-1.5 text-body text-ink-secondary">Manage your profile, how we reach you, and your guarantee.</p>

      {/* Profile */}
      <Card variant="plain" className="mt-6 flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill bg-accent font-mono text-h3 text-white">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-h3 font-semibold text-ink">{displayName}</p>
          {profile?.email && <p className="truncate text-body-sm text-ink-secondary">{profile.email}</p>}
          {profile?.category && (
            <span className="mt-1.5 inline-flex rounded-pill border border-success-border bg-success-bg px-2.5 py-0.5 font-mono text-data text-success">
              {CATEGORY_LABEL[profile.category]}
            </span>
          )}
        </div>
        <Button variant="secondary" size="md" fullWidth={false} iconLeft={<PencilIcon width={16} height={16} />} onClick={() => { setName(profile?.first_name ?? ''); setCategory(profile?.category ?? 'other'); setEditOpen(true); }}>
          Edit profile
        </Button>
      </Card>

      {/* Two-column dashboard */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* ---- Left column ---- */}
        <div className="space-y-6">
          {/* Your path */}
          <section>
            <Eyebrow className="mb-3">Your path</Eyebrow>
            <div className="overflow-hidden rounded-lg border border-line bg-surface-plain shadow-sm">
              <Row icon={<CircleTabIcon width={20} height={20} />} title={pathLabel} sub={pathSub} />
              <div className="border-t border-line" />
              <Row
                icon={<BookIcon width={20} height={20} />}
                title={program.program?.title ?? 'No program yet'}
                sub={program.program ? `${moduleCount} module${moduleCount === 1 ? '' : 's'} · ${program.program.status === 'ready' ? 'ready' : 'in progress'}` : 'Build yours in a few minutes'}
                onClick={() => navigate('/app/program')}
              />
            </div>
          </section>

          {/* Notifications */}
          <section>
            <Eyebrow className="mb-3">Notifications</Eyebrow>
            <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface-plain shadow-sm">
              <Toggle title="Mindset check-ins" sub="Gentle nudges at the hard moments" on={mindsetNudges} onChange={setMindsetNudges} />
              <Toggle title="Circle & expert talks" sub="When your circle meets or a talk is live" on={circleTalks} onChange={setCircleTalks} />
              <Toggle title="Product emails" sub="Tips and occasional updates" on={productEmails} onChange={setProductEmails} />
            </div>
          </section>

          {/* Check-in rhythm */}
          <section>
            <Eyebrow className="mb-3">Check-in rhythm</Eyebrow>
            <Card variant="plain">
              <p className="text-body text-ink">How often should we reach out to keep your courage up?</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {CADENCE.map((c) => {
                  const active = c.value === cadence;
                  return (
                    <button
                      key={c.value}
                      onClick={() => setCadence(c.value)}
                      className={cn(
                        'rounded-lg border px-3 py-2.5 text-body-sm font-medium transition-colors',
                        active ? 'border-transparent bg-primary text-white' : 'border-line bg-surface-plain text-ink hover:border-primary/40',
                      )}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 font-mono text-data text-ink-secondary">{cadenceNote.label} · {cadenceNote.note}</p>
            </Card>
          </section>
        </div>

        {/* ---- Right column ---- */}
        <div className="space-y-6">
          {/* Account & security */}
          <section>
            <Eyebrow className="mb-3">Account &amp; security</Eyebrow>
            <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface-plain shadow-sm">
              <NavRow icon={<CardIcon width={20} height={20} />} label="Payment & billing" onClick={() => toast.info('Billing portal is coming soon.')} />
              <NavRow icon={<LockIcon width={20} height={20} />} label="Password & security" onClick={() => toast.info('Password & security settings are coming soon.')} />
              <NavRow icon={<HelpIcon width={20} height={20} />} label="Help & contact us" onClick={() => toast.info('Reach us anytime at hello@abundance.ai')} />
            </div>
          </section>

          {/* Your guarantee */}
          <section>
            <Eyebrow className="mb-3">Your guarantee</Eyebrow>
            <Card className="border-accent/20 bg-success-bg/50">
              <div className="flex items-center gap-2.5">
                <ShieldIcon width={22} height={22} className="shrink-0 text-success" />
                <p className="text-body font-semibold text-ink">90-day money-back guarantee</p>
              </div>
              <p className="mt-2.5 text-body-sm text-ink-secondary">
                You&rsquo;re on day {dayOfGuarantee} of 90. If this isn&rsquo;t right for you, you can request a full refund — no questions, no friction.
              </p>
              <div className="mt-4">
                <Button variant="accent-secondary" fullWidth={false} onClick={() => { setRefundResult(null); setRefundOpen(true); }}>
                  Request a refund
                </Button>
              </div>
            </Card>
          </section>
        </div>
      </div>

      {/* Sign out */}
      <div className="mt-8">
        <Button variant="ghost" fullWidth={false} onClick={signOut}>Sign out</Button>
      </div>

      {/* Edit profile sheet */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit profile" footer={
        <>
          <Button loading={savingName} onClick={saveProfile}>Save changes</Button>
          <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
        </>
      }>
        <div className="space-y-3">
          <TextInput label="First name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select<Category> label="Category" value={category} options={CATEGORIES} onChange={setCategory} />
        </div>
      </Sheet>

      {/* Refund confirm sheet */}
      <Sheet
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title={refundResult ? 'Done' : 'Request your refund?'}
        footer={
          refundResult ? (
            <Button onClick={() => setRefundOpen(false)}>Close</Button>
          ) : (
            <>
              <Button variant="destructive" loading={refunding} onClick={requestRefund}>Yes, request refund</Button>
              <Button variant="ghost" onClick={() => setRefundOpen(false)}>Never mind</Button>
            </>
          )
        }
      >
        {refundResult ? (
          <p className="text-body text-ink">{refundResult}</p>
        ) : (
          <p className="text-body text-ink-secondary">You&rsquo;re within your 90-day window. We&rsquo;ll process it right away — no questions asked.</p>
        )}
      </Sheet>
    </div>
  );
}

// A path/program row — static, or a tappable nav row when onClick is given.
function Row({ icon, title, sub, onClick }: { icon: ReactNode; title: string; sub: string; onClick?: () => void }) {
  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface text-primary">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold text-ink">{title}</p>
        <p className="truncate text-caption text-ink-secondary">{sub}</p>
      </div>
      {onClick && <ArrowRight width={18} height={18} className="shrink-0 text-ink-secondary" />}
    </>
  );
  return onClick ? (
    <button onClick={onClick} className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition-colors hover:bg-surface/50">{inner}</button>
  ) : (
    <div className="flex items-center gap-3.5 px-5 py-4">{inner}</div>
  );
}

// A labelled nav row with a chevron (Account & security).
function NavRow({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition-colors hover:bg-surface/50">
      <span className="shrink-0 text-ink-secondary">{icon}</span>
      <span className="flex-1 text-body text-ink">{label}</span>
      <ArrowRight width={18} height={18} className="shrink-0 text-ink-secondary" />
    </button>
  );
}

function Toggle({ title, sub, on, onChange }: { title: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-body font-semibold text-ink">{title}</p>
        <p className="text-caption text-ink-secondary">{sub}</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={title}
        onClick={() => onChange(!on)}
        className={cn('relative h-6 w-11 shrink-0 rounded-pill transition-colors', on ? 'bg-accent' : 'bg-line-strong')}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-pill bg-white transition-transform', on ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}

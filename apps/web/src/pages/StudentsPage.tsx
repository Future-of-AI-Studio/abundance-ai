import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Card, EmptyState, Select, Skeleton, TextInput } from '@/components/ui';
import { UsersIcon } from '@/components/ui/icons';
import { PageHeader } from '@/components/PageHeader';
import { ShareProgramLink } from '@/components/ShareProgramLink';
import { PriceEditor } from '@/components/PriceEditor';
import { useApp } from '@/store';
import { toast } from '@/store/toast';
import { formatPrice } from '@/lib/money';

type SortKey = 'latest' | 'oldest' | 'az' | 'za';
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'latest', label: 'Latest added' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'az', label: 'Name A–Z' },
  { value: 'za', label: 'Name Z–A' },
];
const PAGE_SIZE = 8;

// [Students] The creator's list of buyers who enrolled through their program's
// public landing page — plus the shareable link and the program's price.
export function StudentsPage() {
  const navigate = useNavigate();
  const { ready, backend, program, enrollments, refreshEnrollments, refreshProgram } = useApp();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('latest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    (async () => {
      await refreshEnrollments();
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [refreshEnrollments]);

  // Reset to the first page whenever the query or sort changes.
  useEffect(() => { setPage(1); }, [search, sort]);

  // Search + sort happen client-side over the creator's own list. Default order
  // is latest-added first.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = enrollments.filter((e) =>
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      (e.contact ?? '').toLowerCase().includes(q));
    return [...matched].sort((a, b) => {
      switch (sort) {
        case 'oldest': return a.created_at.localeCompare(b.created_at);
        case 'az': return a.name.localeCompare(b.name);
        case 'za': return b.name.localeCompare(a.name);
        default: return b.created_at.localeCompare(a.created_at); // latest
      }
    });
  }, [enrollments, search, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const pageItems = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  if (!ready) return <div className="space-y-4"><Skeleton variant="line" className="w-1/2" /><Skeleton variant="module-card" /></div>;

  if (!program.program) {
    return (
      <EmptyState
        icon={<UsersIcon width={30} height={30} />}
        headline="Your students will show up here"
        subline="Build your program first - then share its link and watch enrollments roll in."
        action={<Button size="lg" onClick={() => navigate('/app/program')}>Go to my program</Button>}
      />
    );
  }

  const programId = program.program.id;
  const priceCents = program.program.price_cents;
  const total = enrollments.reduce((sum, e) => sum + e.amount_cents, 0);

  const savePrice = async (cents: number) => {
    if (!backend) return;
    try {
      await backend.api.programUpdate({ program_id: programId, price_cents: cents });
      await refreshProgram();
      toast.success('Price updated.');
    } catch {
      toast.error("Couldn't save that price - try again.");
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Participants" title="Your participants." />

      {/* Share + summary — two columns on desktop */}
      <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Card variant="plain">
          <h2 className="text-h3 font-semibold text-ink">Share your program</h2>
          <p className="mt-1 text-body-sm text-ink-secondary">
            Post this link anywhere. Anyone who opens it can preview your program and enroll.
          </p>
          <ShareProgramLink programId={programId} className="mt-3" />
          <div className="mt-4 border-t border-line pt-4">
            <PriceEditor priceCents={priceCents} onSave={savePrice} />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
          <Card variant="plain">
            <p className="font-serif text-display text-ink-deep">{enrollments.length}</p>
            <p className="mt-1 font-mono text-eyebrow uppercase tracking-[0.12em] text-ink-secondary">{enrollments.length === 1 ? 'Student' : 'Students'}</p>
          </Card>
          <Card variant="surface">
            <p className="font-serif text-display text-primary">{formatPrice(total)}</p>
            <p className="mt-1 font-mono text-eyebrow uppercase tracking-[0.12em] text-ink-secondary">Enrolled value</p>
          </Card>
        </div>
      </div>

      {/* Search + sort */}
      {enrollments.length > 0 && (
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <TextInput
              label="Search students"
              placeholder="Name, email, or number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="sm:w-52">
            <Select<SortKey> label="Sort by" value={sort} options={SORT_OPTIONS} onChange={setSort} />
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <Card className="divide-y divide-line p-0">
          {[0, 1].map((i) => <div key={i} className="px-5 py-4"><Skeleton variant="line" className="w-2/3" /></div>)}
        </Card>
      ) : enrollments.length === 0 ? (
        <Card variant="plain" className="text-center">
          <p className="text-body text-ink">No participants yet - but the door's open.</p>
          <p className="mt-1 text-body-sm text-ink-secondary">Share your link above. The moment someone enrolls, they'll appear here with their contact details.</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card variant="plain" className="text-center">
          <p className="text-body-sm text-ink-secondary">No participants match “{search.trim()}”.</p>
        </Card>
      ) : (
        <>
          <div className="mb-1.5 flex items-center gap-4 px-5 font-mono text-eyebrow uppercase tracking-[0.12em] text-ink-secondary">
            <span className="flex-1">Student</span>
            <span className="w-24 text-right">Paid</span>
            <span className="hidden w-28 text-right sm:block">Joined</span>
          </div>
          <Card className="divide-y divide-line p-0">
            {pageItems.map((e) => (
              <div key={e.id} className="flex items-center gap-4 px-5 py-4">
                <Avatar name={e.name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-semibold text-ink">{e.name}</p>
                  <p className="truncate text-caption text-ink-secondary">
                    <a href={`mailto:${e.email}`} className="hover:text-primary">{e.email}</a>{e.contact ? ` · ${e.contact}` : ''}
                  </p>
                </div>
                <span className="w-24 shrink-0 text-right text-body-sm font-semibold text-ink">{formatPrice(e.amount_cents)}</span>
                <span className="hidden w-28 shrink-0 text-right text-caption text-ink-secondary sm:block">{new Date(e.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </Card>

          {pageCount > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <Button size="sm" variant="secondary" fullWidth={false} disabled={current <= 1} onClick={() => setPage(current - 1)}>
                Previous
              </Button>
              <span className="text-caption text-ink-secondary">Page {current} of {pageCount}</span>
              <Button size="sm" variant="secondary" fullWidth={false} disabled={current >= pageCount} onClick={() => setPage(current + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

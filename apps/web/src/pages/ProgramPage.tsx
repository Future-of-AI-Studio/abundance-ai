import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Module, Program } from '@abundance/shared';
import { Button, Badge, Card, Eyebrow, EmptyState, Sheet, Skeleton } from '@/components/ui';
import { ProgramIcon, DragIcon, TrashIcon, PlusIcon, PencilIcon, CheckIcon, ArrowRight, ArrowLeft, SparkleIcon, ChevronDown, EyeIcon, CloseIcon } from '@/components/ui/icons';
import { JourneyStepper } from '@/components/JourneyStepper';
import { useApp } from '@/store';
import type { Backend } from '@/lib/backend';
import { toast } from '@/store/toast';
import { cn } from '@/lib/cn';

type LocalModule = Pick<Module, 'id' | 'idx' | 'title' | 'description' | 'outcome' | 'detail' | 'session_flow' | 'notes' | 'participant_notes'>;

// Program size cap — mirrors the shared programUpdate schema and the AI build
// rule (builds produce 3-6 modules).
const MAX_MODULES = 6;

// "Notes for Participants" is stored as one string, one bullet per line.
const toBullets = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);

// Rough word count for a chunk of prose (empty string → 0).
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

// Reading-time estimate (minutes) for a module's written material, ~200 wpm.
const readMinutes = (m: { detail: string; session_flow: string; outcome: string }) =>
  Math.max(1, Math.round((words(m.detail) + words(m.session_flow) + words(m.outcome)) / 200));

// Short, human timestamp for labelling a build in the switcher.
const buildWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// [08] Your Program ✦ — the first WOW and the permanent Program tab. A focused
// workspace: modules read/edit inline in the main column while builds and stats
// stay in reach in a right rail. Empty (no program) → warm CTA → Path.
export function ProgramPage() {
  const navigate = useNavigate();
  const { ready, backend, program, builds, refreshProgram, refreshBuilds, refreshJourney } = useApp();
  const [title, setTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [modules, setModules] = useState<LocalModule[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  useEffect(() => {
    setTitle(program.program?.title ?? '');
    setModules(program.modules.map((m) => ({ id: m.id, idx: m.idx, title: m.title, description: m.description ?? '', outcome: m.outcome, detail: m.detail ?? '', session_flow: m.session_flow, notes: m.notes ?? '', participant_notes: m.participant_notes ?? '' })));
  }, [program]);

  if (!ready) return <div className="space-y-4"><Skeleton variant="line" className="w-1/2" />{[0, 1, 2].map((i) => <Skeleton key={i} variant="module-card" />)}</div>;

  if (!program.program) {
    return (
      <EmptyState
        icon={<ProgramIcon width={30} height={30} />}
        headline="Let's turn your expertise into a program"
        subline="It only takes a few minutes, and we walk you through every step."
        action={<Button size="lg" onClick={() => navigate('/app/onboarding/path')}>Start now</Button>}
      />
    );
  }
  const programId = program.program.id;

  const saveTitle = async () => {
    setEditingTitle(false);
    if (!backend || !title.trim()) { setTitle(program.program!.title); return; }
    try {
      await backend.api.programUpdate({ program_id: programId, title });
      await refreshProgram();
    } catch { toast.error("Couldn't save that edit - tap to retry"); }
  };

  const persist = async (next: LocalModule[], removeIds?: string[]) => {
    if (!backend) return;
    const reindexed = next.map((m, i) => ({ ...m, idx: i }));
    setModules(reindexed);
    try {
      await backend.api.programUpdate({
        program_id: programId,
        modules: reindexed.map((m) => ({ id: m.id, idx: m.idx, title: m.title, description: m.description, outcome: m.outcome, detail: m.detail, session_flow: m.session_flow, notes: m.notes, participant_notes: m.participant_notes })),
        ...(removeIds?.length ? { remove_module_ids: removeIds } : {}),
      });
      await refreshProgram();
    } catch {
      toast.error("Couldn't save that edit - tap to retry");
      await refreshProgram();
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= modules.length) return;
    const next = [...modules];
    [next[i], next[j]] = [next[j]!, next[i]!];
    void persist(next);
  };

  // Native drag-to-reorder. Reorder live as the user drags over a new slot,
  // then persist once on drop. Arrows remain as the keyboard-accessible path.
  const onDragStart = (i: number) => setDragIndex(i);

  const onDragOverItem = (i: number) => {
    if (dragIndex === null || dragIndex === i) return;
    const next = [...modules];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved!);
    setModules(next.map((m, idx) => ({ ...m, idx })));
    setDragIndex(i);
  };

  const onDragEnd = () => {
    if (dragIndex === null) return;
    setDragIndex(null);
    void persist(modules);
  };

  const askRemove = (id: string) => {
    if (modules.length <= 1) { toast.info('Keep at least one module.'); return; }
    setConfirmRemoveId(id);
  };

  const confirmRemove = () => {
    if (!confirmRemoveId) return;
    void persist(modules.filter((m) => m.id !== confirmRemoveId), [confirmRemoveId]);
    setConfirmRemoveId(null);
  };

  const atMax = modules.length >= MAX_MODULES;

  const add = () => {
    if (atMax) { toast.info(`Programs max out at ${MAX_MODULES} modules.`); return; }
    const newModule: LocalModule = { id: crypto.randomUUID(), idx: modules.length, title: 'New module', description: '', outcome: '', detail: '', session_flow: '', notes: '', participant_notes: '' };
    void persist([...modules, newModule]);
  };

  const editModule = (id: string, patch: Partial<LocalModule>) => {
    const next = modules.map((m) => (m.id === id ? { ...m, ...patch } : m));
    setModules(next);
  };

  const goMarketing = async () => {
    setContinuing(true);
    try {
      if (backend) { await backend.api.journeyUpdate({ current_step: 'marketing' }); await refreshJourney(); }
      navigate('/app/onboarding/marketing');
    } finally { setContinuing(false); }
  };

  // Honest, derived at-a-glance figures — the data model has no lesson/level/
  // duration fields, so we surface what the program actually contains.
  const totalRead = modules.reduce((n, m) => n + readMinutes(m), 0);
  const noteCount = modules.reduce((n, m) => n + toBullets(m.participant_notes).length, 0);

  return (
    // The Program route runs full-width in the shell (see AppShell `wide`), so the
    // workspace fills the viewport rather than a centered reading column.
    <div>
      {/* Header — Back + eyebrow + title, consistent with the other steps. The
          forward CTA lives at the bottom of the content, like every step. */}
      <button onClick={() => navigate('/app/onboarding/content')} className="mb-3 inline-flex items-center gap-1 text-body-sm text-ink-secondary hover:text-ink">
        <ArrowLeft width={18} height={18} /> Back
      </button>
      <div className="mb-5">
        <Eyebrow className="mb-2">Your program</Eyebrow>
        <h1 className="text-h1 font-bold text-ink">Here's your program.</h1>
      </div>

      <Card variant="plain" className="mb-6 px-4 py-3">
        <JourneyStepper />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start xl:gap-8">
        {/* Main column — program title, meta, modules */}
        <div className="min-w-0">
          <div className="mb-4">
            <Eyebrow className="mb-2">Program</Eyebrow>
            {editingTitle ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                className="w-full rounded-md border border-primary bg-surface-plain px-3 py-2 text-h1 font-bold text-ink"
              />
            ) : (
              <button onClick={() => setEditingTitle(true)} className="block text-left text-h1 font-bold leading-tight text-ink hover:text-primary">
                {title || 'Untitled program'}
              </button>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <MetaPill>{modules.length} module{modules.length === 1 ? '' : 's'}</MetaPill>
              {noteCount > 0 && <MetaPill>{noteCount} participant note{noteCount === 1 ? '' : 's'}</MetaPill>}
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <p className="text-eyebrow font-mono uppercase tracking-[0.12em] text-ink-secondary">Modules</p>
            <button
              onClick={add}
              disabled={atMax}
              title={atMax ? `Programs max out at ${MAX_MODULES} modules.` : undefined}
              className="inline-flex items-center gap-1.5 rounded-pill border border-dashed border-line-strong px-3 py-1.5 text-body-sm font-medium text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <PlusIcon width={16} height={16} /> Add module
            </button>
          </div>

          <div className="space-y-3">
            {modules.map((m, i) => (
              <ModuleCard
                key={m.id}
                index={i}
                module={m}
                isFirst={i === 0}
                isLast={i === modules.length - 1}
                isDragging={dragIndex === i}
                onMove={(dir) => move(i, dir)}
                onRemove={() => askRemove(m.id)}
                onChange={(patch) => editModule(m.id, patch)}
                onCommit={() => persist(modules)}
                onDragStart={() => onDragStart(i)}
                onDragOverItem={() => onDragOverItem(i)}
                onDragEnd={onDragEnd}
              />
            ))}
          </div>

          {/* Forward CTA at the bottom of the content, consistent with every step.
              Editing modules above is inline; to change the underlying content and
              regenerate, head back to the content step (it rebuilds from sources). */}
          <div className="mt-6 space-y-2">
            <Button
              size="lg"
              loading={continuing}
              iconRight={<ArrowRight width={20} height={20} />}
              onClick={goMarketing}
            >
              Continue
            </Button>
            <Button
              size="lg"
              variant="ghost"
              iconLeft={<SparkleIcon width={18} height={18} />}
              onClick={() => navigate('/app/onboarding/content')}
            >
              Edit my content & rebuild
            </Button>
          </div>
        </div>

        {/* Right rail — builds + at-a-glance, sticky on wide screens */}
        <aside className="space-y-4 lg:sticky lg:top-6">
          <BuildsRail
            builds={builds}
            activeId={programId}
            backend={backend}
            onOpen={(id) => setPreviewId(id)}
            onNewBuild={() => navigate('/app/onboarding/content')}
          />
          <AtAGlance
            moduleCount={modules.length}
            readMinutes={totalRead}
            noteCount={noteCount}
            onViewLive={() => window.open(`/p/${programId}`, '_blank', 'noopener,noreferrer')}
          />
        </aside>
      </div>

      <BuildReader
        build={builds.find((b) => b.id === previewId && b.id !== programId) ?? null}
        buildNumber={previewId ? builds.length - builds.findIndex((b) => b.id === previewId) : 0}
        backend={backend}
        onClose={() => setPreviewId(null)}
        onChanged={async () => { await refreshProgram(); await refreshBuilds(); }}
      />

      {/* Delete-module confirm sheet */}
      <Sheet
        open={confirmRemoveId !== null}
        onClose={() => setConfirmRemoveId(null)}
        title="Delete this module?"
        footer={
          <>
            <Button variant="destructive" onClick={confirmRemove}>Yes, delete it</Button>
            <Button variant="ghost" onClick={() => setConfirmRemoveId(null)}>Keep it</Button>
          </>
        }
      >
        <p className="text-body text-ink-secondary">
          &ldquo;{modules.find((m) => m.id === confirmRemoveId)?.title}&rdquo; and everything in it
          will be removed from this build. This can&rsquo;t be undone.
        </p>
      </Sheet>
    </div>
  );
}

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-pill border border-line bg-surface-plain px-3 py-1 text-caption font-medium text-ink-secondary">
      {children}
    </span>
  );
}

function ModuleCard({
  index, module: m, isFirst, isLast, isDragging, onMove, onRemove, onChange, onCommit,
  onDragStart, onDragOverItem, onDragEnd,
}: {
  index: number;
  module: LocalModule;
  isFirst: boolean;
  isLast: boolean;
  isDragging: boolean;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onChange: (patch: Partial<LocalModule>) => void;
  onCommit: () => void;
  onDragStart: () => void;
  onDragOverItem: () => void;
  onDragEnd: () => void;
}) {
  const [editing, setEditing] = useState(false);
  // Detail is long-form; keep cards scannable by collapsing it behind a toggle.
  const [expanded, setExpanded] = useState(false);
  // Only drag from the handle, and never while editing (so inputs stay usable).
  const [dragEnabled, setDragEnabled] = useState(false);

  const notes = toBullets(m.participant_notes);
  const hasDetail = !!(m.detail || m.session_flow || m.notes || m.participant_notes);

  return (
    <Card
      variant="plain"
      draggable={dragEnabled && !editing}
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragOverItem(); }}
      onDragEnd={() => { setDragEnabled(false); onDragEnd(); }}
      className={cn('p-4 transition-opacity', isDragging && 'opacity-50')}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1.5 pt-0.5 text-ink-secondary">
          <span className="flex h-7 w-7 items-center justify-center rounded-pill bg-primary/10 font-mono text-data text-primary">{index + 1}</span>
          <button
            type="button"
            aria-label="Drag to reorder"
            className="cursor-grab touch-none text-ink-secondary hover:text-primary active:cursor-grabbing"
            onMouseDown={() => setDragEnabled(true)}
            onMouseUp={() => setDragEnabled(false)}
            onTouchStart={() => setDragEnabled(true)}
          >
            <DragIcon width={18} height={18} aria-hidden />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <input
                value={m.title}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="Module title"
                className="w-full rounded-md border border-line px-3 py-2 text-h3 font-semibold text-ink focus:border-primary"
              />
              <textarea
                value={m.outcome}
                onChange={(e) => onChange({ outcome: e.target.value })}
                placeholder="What can they do after this module?"
                rows={2}
                className="w-full resize-none rounded-md border border-line px-3 py-2 text-body-sm text-ink focus:border-primary"
              />
              <textarea
                value={m.detail}
                onChange={(e) => onChange({ detail: e.target.value })}
                placeholder="The full module - what it covers, what's taught, and the exercise they complete"
                rows={6}
                className="w-full resize-none rounded-md border border-line px-3 py-2 text-body-sm text-ink focus:border-primary"
              />
              <textarea
                value={m.session_flow}
                onChange={(e) => onChange({ session_flow: e.target.value })}
                placeholder="How the session runs"
                rows={2}
                className="w-full resize-none rounded-md border border-line px-3 py-2 text-body-sm text-ink focus:border-primary"
              />
              <textarea
                value={m.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
                placeholder="Notes for you - prep, sticking points, delivery tips (optional)"
                rows={2}
                className="w-full resize-none rounded-md border border-line px-3 py-2 text-body-sm text-ink focus:border-primary"
              />
              <div>
                <textarea
                  value={m.participant_notes}
                  onChange={(e) => onChange({ participant_notes: e.target.value })}
                  placeholder={'Notes for participants - one bullet per line\ne.g. Bring a recent client story\nPractice your message out loud'}
                  rows={4}
                  className="w-full resize-none rounded-md border border-line px-3 py-2 text-body-sm text-ink focus:border-primary"
                />
                <p className="mt-1 text-caption text-ink-secondary">One note per line - each becomes a bullet your participants see.</p>
              </div>
              <Button size="sm" fullWidth={false} iconLeft={<CheckIcon width={15} height={15} />} onClick={() => { setEditing(false); onCommit(); }}>
                Save
              </Button>
            </div>
          ) : (
            <div>
              <button
                onClick={() => hasDetail && setExpanded((v) => !v)}
                aria-expanded={expanded}
                className={cn('w-full text-left', !hasDetail && 'cursor-default')}
              >
                <h3 className="text-h3 font-semibold text-ink">{m.title}</h3>
                {m.outcome && (
                  <div className="mt-2 flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 rounded-pill bg-accent/10 px-2 py-0.5 font-mono text-data uppercase tracking-[0.06em] text-accent">Outcome</span>
                    <p className="text-body-sm text-ink-secondary">{m.outcome}</p>
                  </div>
                )}
              </button>

              {expanded && (
                <div className="mt-3 space-y-3 border-t border-line pt-3">
                  {m.detail && (
                    <div>
                      <p className="text-caption font-semibold uppercase tracking-wide text-ink-secondary">What this module covers</p>
                      <p className="mt-1 whitespace-pre-line text-body-sm text-ink">{m.detail}</p>
                    </div>
                  )}
                  {m.session_flow && (
                    <div>
                      <p className="text-caption font-semibold uppercase tracking-wide text-ink-secondary">How it runs</p>
                      <p className="mt-1 whitespace-pre-line text-body-sm text-ink">{m.session_flow}</p>
                    </div>
                  )}
                  {notes.length > 0 && (
                    <div className="rounded-md bg-primary/5 px-3 py-2">
                      <p className="text-caption font-semibold uppercase tracking-wide text-primary">Notes for participants</p>
                      <ul className="mt-1 space-y-1">
                        {notes.map((note, i) => (
                          <li key={i} className="flex gap-2 text-caption text-ink-secondary">
                            <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {m.notes && (
                    <div className="rounded-md bg-primary/5 px-3 py-2">
                      <p className="text-caption font-semibold uppercase tracking-wide text-primary">Notes for you</p>
                      <p className="mt-1 whitespace-pre-line text-caption text-ink-secondary">{m.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Footer — honest per-module read estimate + expand toggle. */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-caption text-ink-secondary">
                  {readMinutes(m)} min read{notes.length > 0 ? ` · ${notes.length} note${notes.length === 1 ? '' : 's'}` : ''}
                </span>
                {hasDetail && (
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    className="inline-flex items-center gap-1 text-caption font-medium text-primary hover:underline"
                  >
                    {expanded ? 'Hide details' : 'Show full module'}
                    <ChevronDown width={14} height={14} className={cn('transition-transform', expanded && 'rotate-180')} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {!editing && (
          <div className="flex flex-col items-center gap-1 text-ink-secondary">
            <button onClick={() => setEditing(true)} aria-label="Edit module" className="hover:text-primary"><PencilIcon width={16} height={16} /></button>
            <button disabled={isFirst} onClick={() => onMove(-1)} aria-label="Move up" className="disabled:opacity-30 hover:text-primary">▲</button>
            <button disabled={isLast} onClick={() => onMove(1)} aria-label="Move down" className="disabled:opacity-30 hover:text-primary">▼</button>
            <button onClick={onRemove} aria-label="Remove module" className="mt-0.5 hover:text-error"><TrashIcon width={16} height={16} /></button>
          </div>
        )}
      </div>
    </Card>
  );
}

// Right-rail builds card. Every rebuild is kept (max 6); the active one is
// highlighted, and any other build opens the two-pane reader for comparison.
// Builds arrive newest-first; they're numbered by age (oldest = Build 1) so
// "Build N" stays stable as new ones are added.
function BuildsRail({
  builds, activeId, backend, onOpen, onNewBuild,
}: {
  builds: Program[];
  activeId: string;
  backend: Backend | null;
  onOpen: (id: string) => void;
  onNewBuild: () => void;
}) {
  if (!backend || builds.length === 0) return null;
  const numberOf = (id: string) => builds.length - builds.findIndex((b) => b.id === id);

  return (
    <Card variant="plain" className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-eyebrow font-mono uppercase tracking-[0.12em] text-ink-secondary">Your builds</p>
        <p className="text-caption text-ink-secondary">{builds.length} of 6 kept</p>
      </div>
      <div className="space-y-2">
        {builds.map((b) => {
          const isActive = b.id === activeId;
          return (
            <button
              key={b.id}
              onClick={() => { if (!isActive) onOpen(b.id); }}
              aria-current={isActive}
              disabled={isActive}
              className={cn(
                'flex w-full flex-col items-start gap-1.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
                isActive ? 'border-primary bg-primary/5' : 'border-line hover:border-primary/40 hover:bg-surface/50',
              )}
            >
              <span className="flex w-full items-center justify-between gap-2 text-body-sm font-semibold text-ink">
                Build {numberOf(b.id)}
                {isActive && <Badge variant="matched">Active</Badge>}
                {b.status === 'failed' && <Badge variant="pending">Failed</Badge>}
                {b.status === 'building' && <Badge variant="new">Building</Badge>}
              </span>
              <span className="text-caption text-ink-secondary">{buildWhen(b.created_at)}</span>
            </button>
          );
        })}
      </div>
      <button
        onClick={onNewBuild}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong py-2.5 text-body-sm font-medium text-primary hover:bg-primary/5"
      >
        <PlusIcon width={16} height={16} /> New build
      </button>
    </Card>
  );
}

function AtAGlance({
  moduleCount, noteCount, onViewLive,
}: {
  moduleCount: number;
  readMinutes: number;
  noteCount: number;
  onViewLive: () => void;
}) {
  const rows: Array<[string, string]> = [
    ['Modules', String(moduleCount)],
    ['Participant notes', String(noteCount)],
  ];
  return (
    <Card variant="plain" className="p-4">
      <p className="mb-3 text-eyebrow font-mono uppercase tracking-[0.12em] text-ink-secondary">At a glance</p>
      <dl className="space-y-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between border-b border-line pb-2.5 last:border-0 last:pb-0">
            <dt className="text-body-sm text-ink-secondary">{label}</dt>
            <dd className="font-mono text-body-sm font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <button
        onClick={onViewLive}
        className="mt-4 inline-flex items-center gap-1.5 text-caption font-medium text-primary hover:underline"
      >
        <EyeIcon width={15} height={15} /> View program page
      </button>
    </Card>
  );
}

// Read-only two-pane reader for a non-active build: module list on the left, one
// clean reading column on the right, with prev/next paging. "Make active" lives
// in the header. Builds can't be deleted — every build is kept so earlier
// versions always remain available for comparison.
function BuildReader({
  build, buildNumber, backend, onClose, onChanged,
}: {
  build: Program | null;
  buildNumber: number;
  backend: Backend | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!build || !backend) { setModules([]); return; }
    // Reset paging whenever a different build is opened.
    setSel(0);
    let alive = true;
    setLoading(true);
    void backend.reads.getProgramModules(build.id).then((m) => {
      if (alive) { setModules(m); setLoading(false); }
    });
    return () => { alive = false; };
  }, [build, backend]);

  const activate = async () => {
    if (!build || !backend) return;
    setBusy(true);
    try {
      await backend.api.programActivate({ program_id: build.id });
      await onChanged();
      toast.success('Switched to this build.');
      onClose();
    } catch {
      toast.error("Couldn't switch to that build - try again");
    } finally {
      setBusy(false);
    }
  };

  const current = modules[sel];
  const next = modules[sel + 1];
  const prev = modules[sel - 1];

  return (
    <Sheet
      open={!!build}
      onClose={onClose}
      bare
      size="reader"
      title={build ? `Build ${buildNumber}` : ''}
      panelClassName="flex h-[92vh] flex-col sm:h-[85vh]"
    >
      {build && (
        <>
          {/* Header */}
          <div className="shrink-0 border-b border-line px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-caption text-ink-secondary">
                  <span className="rounded-pill bg-primary/10 px-2 py-0.5 font-mono text-data uppercase tracking-[0.06em] text-primary">Build {buildNumber}</span>
                  <span>
                    Created {buildWhen(build.created_at)}
                    {!loading && modules.length > 0 && ` · ${modules.length} module${modules.length === 1 ? '' : 's'}`}
                  </span>
                </div>
                <h2 className="mt-1.5 truncate text-h2 font-semibold text-ink">{build.title}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button size="sm" fullWidth={false} loading={busy} disabled={build.status !== 'ready' || busy} onClick={activate}>
                  Make active
                </Button>
                <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary hover:bg-surface hover:text-ink">
                  <CloseIcon width={22} height={22} />
                </button>
              </div>
            </div>
          </div>

          {/* Two panes */}
          <div className="flex min-h-0 flex-1">
            {/* Module list (desktop) */}
            <nav className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface/40 py-3 sm:flex">
              <p className="px-4 pb-2 text-eyebrow font-mono uppercase tracking-[0.12em] text-ink-secondary">
                Modules · {modules.length ? sel + 1 : 0} of {modules.length}
              </p>
              {modules.map((m, i) => {
                const active = i === sel;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSel(i)}
                    aria-current={active}
                    className={cn('flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors', active ? 'bg-primary/5' : 'hover:bg-surface/70')}
                  >
                    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-pill font-mono text-data', active ? 'bg-primary text-white' : 'bg-primary/10 text-primary')}>{i + 1}</span>
                    <span className={cn('text-body-sm leading-snug', active ? 'font-semibold text-ink' : 'text-ink-secondary')}>{m.title}</span>
                  </button>
                );
              })}
            </nav>

            {/* Reading column */}
            <div className="min-w-0 flex-1 overflow-y-auto px-5 py-6 sm:px-10 sm:py-8">
              {loading ? (
                <div className="space-y-4"><Skeleton variant="line" className="w-1/3" /><Skeleton variant="line" className="w-2/3" /><Skeleton variant="module-card" /></div>
              ) : current ? (
                <article className="mx-auto max-w-2xl">
                  <Eyebrow className="mb-2">Module {sel + 1}</Eyebrow>
                  <h3 className="text-h1 font-bold leading-tight text-ink">{current.title}</h3>

                  {current.outcome && (
                    <div className="mt-4 flex items-start gap-3 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-white">
                        <CheckIcon width={15} height={15} />
                      </span>
                      <div>
                        <p className="text-eyebrow font-mono uppercase tracking-[0.12em] text-accent">What you'll be able to do</p>
                        <p className="mt-1 text-body-sm font-medium text-ink">{current.outcome}</p>
                      </div>
                    </div>
                  )}

                  {current.detail && <p className="mt-5 whitespace-pre-line text-body leading-relaxed text-ink">{current.detail}</p>}

                  {current.session_flow && (
                    <div className="mt-6">
                      <p className="text-caption font-semibold uppercase tracking-wide text-ink-secondary">How it runs</p>
                      <p className="mt-1 whitespace-pre-line text-body-sm leading-relaxed text-ink">{current.session_flow}</p>
                    </div>
                  )}

                  {toBullets(current.participant_notes).length > 0 && (
                    <div className="mt-6 rounded-md bg-primary/5 px-3 py-2">
                      <p className="text-caption font-semibold uppercase tracking-wide text-primary">Notes for participants</p>
                      <ul className="mt-1 space-y-1">
                        {toBullets(current.participant_notes).map((note, i) => (
                          <li key={i} className="flex gap-2 text-caption text-ink-secondary">
                            <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              ) : (
                <p className="text-body-sm text-ink-secondary">This build has no modules.</p>
              )}
            </div>
          </div>

          {/* Footer paging */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-5 py-3 sm:px-6">
            <button
              onClick={() => setSel((s) => Math.max(0, s - 1))}
              disabled={!prev}
              className="inline-flex items-center gap-1.5 text-body-sm text-ink-secondary hover:text-ink disabled:opacity-30"
            >
              <ArrowLeft width={18} height={18} /> Previous
            </button>
            <Button
              size="md"
              fullWidth={false}
              disabled={!next}
              iconRight={<ArrowRight width={18} height={18} />}
              onClick={() => setSel((s) => Math.min(modules.length - 1, s + 1))}
            >
              {next ? `Next: ${next.title}` : 'Last module'}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}

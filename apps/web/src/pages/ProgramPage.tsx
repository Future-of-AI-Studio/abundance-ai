import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Module, Program } from '@abundance/shared';
import { Button, Badge, Card, EmptyState, Sheet, Skeleton } from '@/components/ui';
import { ProgramIcon, DragIcon, TrashIcon, PlusIcon, CheckIcon, ArrowRight, SparkleIcon } from '@/components/ui/icons';
import { PageHeader } from '@/components/PageHeader';
import { JourneyStepper } from '@/components/JourneyStepper';
import { useApp } from '@/store';
import type { Backend } from '@/lib/backend';
import { toast } from '@/store/toast';
import { cn } from '@/lib/cn';

type LocalModule = Pick<Module, 'id' | 'idx' | 'title' | 'outcome' | 'detail' | 'session_flow' | 'notes'>;

// Short, human timestamp for labelling a build in the switcher.
const buildWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// [08] Your Program ✦ — the first WOW and the permanent Program tab. Inline-edit
// title + modules, reorder, add/remove. Empty (no program) → warm CTA → Path.
export function ProgramPage() {
  const navigate = useNavigate();
  const { ready, backend, program, builds, refreshProgram, refreshBuilds, refreshJourney } = useApp();
  const [title, setTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [modules, setModules] = useState<LocalModule[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    setTitle(program.program?.title ?? '');
    setModules(program.modules.map((m) => ({ id: m.id, idx: m.idx, title: m.title, outcome: m.outcome, detail: m.detail ?? '', session_flow: m.session_flow, notes: m.notes ?? '' })));
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
    } catch { toast.error("Couldn't save that edit — tap to retry"); }
  };

  const persist = async (next: LocalModule[]) => {
    if (!backend) return;
    const reindexed = next.map((m, i) => ({ ...m, idx: i }));
    setModules(reindexed);
    try {
      await backend.api.programUpdate({
        program_id: programId,
        modules: reindexed.map((m) => ({ id: m.id, idx: m.idx, title: m.title, outcome: m.outcome, detail: m.detail, session_flow: m.session_flow, notes: m.notes })),
      });
      await refreshProgram();
    } catch { toast.error("Couldn't save that edit — tap to retry"); }
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

  const remove = (id: string) => {
    if (modules.length <= 1) { toast.info('Keep at least one module.'); return; }
    void persist(modules.filter((m) => m.id !== id));
  };

  const add = () => {
    const newModule: LocalModule = { id: crypto.randomUUID(), idx: modules.length, title: 'New module', outcome: '', detail: '', session_flow: '', notes: '' };
    void persist([...modules, newModule]);
  };

  const editModule = (id: string, patch: Partial<LocalModule>) => {
    const next = modules.map((m) => (m.id === id ? { ...m, ...patch } : m));
    setModules(next);
  };

  return (
    <div>
      <PageHeader eyebrow="Your program" title="Here's your program." />

      <JourneyStepper className="mb-5" />

      {/* Build switcher — every rebuild is kept; pick which one is active. */}
      <BuildSwitcher
        builds={builds}
        activeId={programId}
        backend={backend}
        onActivated={async () => { await refreshProgram(); await refreshBuilds(); }}
      />

      {/* Title (inline editable) */}
      <Card variant="plain" className="mb-4">
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
            className="w-full rounded-md border border-primary bg-surface-plain px-3 py-2 text-h2 font-semibold text-ink"
          />
        ) : (
          <button onClick={() => setEditingTitle(true)} className="w-full text-left text-h2 font-semibold text-ink hover:text-primary">
            {title || 'Untitled program'}
          </button>
        )}
      </Card>

      {/* Modules */}
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
            onRemove={() => remove(m.id)}
            onChange={(patch) => editModule(m.id, patch)}
            onCommit={() => persist(modules)}
            onDragStart={() => onDragStart(i)}
            onDragOverItem={() => onDragOverItem(i)}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>

      <button onClick={add} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-line-strong py-3 text-body-sm font-medium text-primary hover:bg-primary/5">
        <PlusIcon width={18} height={18} /> Add module
      </button>

      <div className="mt-6 space-y-2">
        <Button
          size="lg"
          iconRight={<ArrowRight width={20} height={20} />}
          onClick={async () => {
            if (backend) { await backend.api.journeyUpdate({ current_step: 'marketing' }); await refreshJourney(); }
            navigate('/app/onboarding/marketing');
          }}
        >
          Looks great — continue
        </Button>
        {/* Editing modules above is inline; to change the underlying content and
            regenerate, head back to the content step (it rebuilds from sources). */}
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

  return (
    <Card
      variant="plain"
      draggable={dragEnabled && !editing}
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragOverItem(); }}
      onDragEnd={() => { setDragEnabled(false); onDragEnd(); }}
      className={cn('transition-opacity', isDragging && 'opacity-50')}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 pt-0.5 text-ink-secondary">
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
                placeholder="The full module — what it covers, what's taught, and the exercise they complete"
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
                placeholder="Notes for you — prep, sticking points, delivery tips (optional)"
                rows={2}
                className="w-full resize-none rounded-md border border-line px-3 py-2 text-body-sm text-ink focus:border-primary"
              />
              <Button size="sm" fullWidth={false} iconLeft={<CheckIcon width={15} height={15} />} onClick={() => { setEditing(false); onCommit(); }}>
                Save
              </Button>
            </div>
          ) : (
            <div>
              <button onClick={() => setEditing(true)} className="w-full text-left">
                <h3 className="text-h3 font-semibold text-ink">{m.title}</h3>
                {m.outcome && <p className="mt-1 text-body-sm text-ink-secondary">{m.outcome}</p>}
              </button>
              {expanded && (
                <div className="mt-3 space-y-3">
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
                  {m.notes && (
                    <div className="rounded-md bg-primary/5 px-3 py-2">
                      <p className="text-caption font-semibold uppercase tracking-wide text-primary">Notes for you</p>
                      <p className="mt-1 whitespace-pre-line text-caption text-ink-secondary">{m.notes}</p>
                    </div>
                  )}
                </div>
              )}
              {(m.detail || m.session_flow || m.notes) && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-2 text-caption font-medium text-primary hover:underline"
                >
                  {expanded ? 'Hide details' : 'Show full module'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <button disabled={isFirst} onClick={() => onMove(-1)} aria-label="Move up" className="text-ink-secondary disabled:opacity-30 hover:text-primary">▲</button>
          <button disabled={isLast} onClick={() => onMove(1)} aria-label="Move down" className="text-ink-secondary disabled:opacity-30 hover:text-primary">▼</button>
          <button onClick={onRemove} aria-label="Remove module" className="text-ink-secondary hover:text-error"><TrashIcon width={16} height={16} /></button>
        </div>
      </div>
    </Card>
  );
}

// Every rebuild creates a new build (max 6 kept). This lists them so the expert can
// compare results and pick which one is active. Builds arrive newest-first; they're
// numbered by age (oldest = Build 1) so "Build N" is stable as new ones are added.
function BuildSwitcher({
  builds, activeId, backend, onActivated,
}: {
  builds: Program[];
  activeId: string;
  backend: Backend | null;
  onActivated: () => Promise<void>;
}) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  // Nothing to switch between until there's more than one build.
  if (builds.length < 2 || !backend) return null;
  const numberOf = (id: string) => builds.length - builds.findIndex((b) => b.id === id);
  const preview = builds.find((b) => b.id === previewId) ?? null;

  return (
    <Card variant="plain" className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-caption font-semibold uppercase tracking-wide text-ink-secondary">Your builds</p>
        <p className="text-caption text-ink-secondary">{builds.length} of 6 kept</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {builds.map((b) => {
          const isActive = b.id === activeId;
          return (
            <button
              key={b.id}
              onClick={() => { if (!isActive) setPreviewId(b.id); }}
              aria-current={isActive}
              className={cn(
                'flex shrink-0 flex-col items-start gap-1 rounded-md border px-3 py-2 text-left transition-colors',
                isActive ? 'border-primary bg-primary/5' : 'border-line hover:border-primary/40',
              )}
            >
              <span className="flex items-center gap-2 text-body-sm font-semibold text-ink">
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
      <BuildPreviewSheet
        build={preview}
        buildNumber={preview ? numberOf(preview.id) : 0}
        backend={backend}
        onClose={() => setPreviewId(null)}
        onActivated={onActivated}
      />
    </Card>
  );
}

// Read-only preview of a non-active build, with a "Make this active" action.
function BuildPreviewSheet({
  build, buildNumber, backend, onClose, onActivated,
}: {
  build: Program | null;
  buildNumber: number;
  backend: Backend;
  onClose: () => void;
  onActivated: () => Promise<void>;
}) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (!build) { setModules([]); return; }
    let alive = true;
    setLoading(true);
    void backend.reads.getProgramModules(build.id).then((m) => {
      if (alive) { setModules(m); setLoading(false); }
    });
    return () => { alive = false; };
  }, [build, backend]);

  const activate = async () => {
    if (!build) return;
    setActivating(true);
    try {
      await backend.api.programActivate({ program_id: build.id });
      await onActivated();
      toast.success('Switched to this build.');
      onClose();
    } catch {
      toast.error("Couldn't switch to that build — try again");
    } finally {
      setActivating(false);
    }
  };

  return (
    <Sheet
      open={!!build}
      onClose={onClose}
      title={build ? `Build ${buildNumber}` : ''}
      footer={build && (
        <Button size="lg" loading={activating} disabled={build.status !== 'ready'} onClick={activate}>
          Make this active
        </Button>
      )}
    >
      {build && (
        <div className="space-y-4">
          <div>
            <h3 className="text-h3 font-semibold text-ink">{build.title}</h3>
            <p className="text-caption text-ink-secondary">Created {buildWhen(build.created_at)}</p>
          </div>
          {loading ? (
            <Skeleton variant="module-card" />
          ) : (
            <div className="space-y-3">
              {modules.map((m, i) => (
                <div key={m.id} className="rounded-md border border-line px-3 py-2">
                  <p className="text-body-sm font-semibold text-ink">{i + 1}. {m.title}</p>
                  {m.outcome && <p className="mt-1 text-caption text-ink-secondary">{m.outcome}</p>}
                  {m.detail && <p className="mt-2 whitespace-pre-line text-caption text-ink">{m.detail}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

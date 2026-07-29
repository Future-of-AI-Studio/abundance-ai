import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAX_UPLOAD_BYTES, ACCEPTED_UPLOAD_TYPES, ACCEPTED_UPLOAD_ACCEPT, isStepComplete } from '@abundance/shared';
import type { ContentSource } from '@abundance/shared';
import { Button, Card, Sheet, Skeleton, Spinner } from '@/components/ui';
import { StepLayout, RailLabel } from '@/components/StepLayout';
import { UploadIcon, MicIcon, PencilIcon, TrashIcon, SparkleIcon, PlayIcon } from '@/components/ui/icons';
import { useApp } from '@/store';
import { toast } from '@/store/toast';
import { cn } from '@/lib/cn';
import { blobToWav } from '@/lib/audio';

// [06] Add Your Content — upload files or record speech to feed the AI. ≥1 source
// to enable Build. 50 MB + type allowlist enforced inline.
//
// Inputs auto-save: every upload/recording is a content_sources row the instant
// it lands, so a user can leave and return weeks later and pick up their draft.
// "Build my program" is the finalize action. Once a program exists, this page
// becomes an EDIT surface — re-building warns first, then creates a NEW build
// (the prior builds are kept, up to 8) and makes it active. The user can switch
// between builds from the Program page.

// What the first-time visitor should bring to this step — shown as an
// orientation guide above the input options.
const SHARE_PROMPTS = [
  {
    title: 'What you know deeply and care about',
    body: 'Clarify the knowledge, experience, and perspectives you are uniquely able to guide.',
  },
  {
    title: 'Who your mentoring program is for',
    body: 'Describe the people you would most love to help and the transformation and outcomes they will achieve.',
  },
  {
    title: 'Your potential mentoring topics and sessions',
    body: 'Talk through the ideas you may want to cover, how they could be organized, and what you would like participants to experience or learn.',
  },
  {
    title: 'Your language and marketing ideas',
    body: 'Share your best ideas, phrases, stories, and keywords for compelling titles, program descriptions, marketing, and social media copy.',
  },
];

// Typed/pasted notes are stored as .txt file sources (see saveNote) — this is how
// we tell them apart from real uploads so they can be re-opened and edited.
function isTextNote(s: ContentSource): boolean {
  return s.kind === 'file' && /\.txt$/i.test(s.filename);
}

// How a saved source reads in the list.
function sourceMeta(s: ContentSource): { name: string; meta: string } {
  if (s.kind === 'voice') return { name: 'Voice note', meta: s.duration_sec ? `${s.duration_sec}s` : 'Recording' };
  if (isTextNote(s)) return { name: s.filename.replace(/\.txt$/i, ''), meta: `Written note · Saved ${new Date(s.created_at).toLocaleDateString()}` };
  return { name: s.filename, meta: `Saved ${new Date(s.created_at).toLocaleDateString()}` };
}

// Lazy audio playback for a saved source: fetch a signed URL on first Play, then
// hand off to the native <audio> controls (play/pause/scrub) for the rest.
function SourcePlayer({ load }: { load: () => Promise<string> }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const onPlay = async () => {
    setLoading(true);
    setFailed(false);
    try {
      setUrl(await load());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  if (url) return <audio className="mt-2 h-9 w-full" controls autoPlay src={url} />;
  return (
    <button
      type="button"
      onClick={onPlay}
      disabled={loading}
      className="mt-1 inline-flex items-center gap-1.5 text-caption font-medium text-primary hover:underline disabled:opacity-50"
    >
      {loading ? <Spinner size={12} /> : <PlayIcon width={14} height={14} />}
      {loading ? 'Loading…' : failed ? 'Unavailable - tap to retry' : 'Play'}
    </button>
  );
}

// Module-count choices offered in the UI. `null` = let the AI decide (1–6); the
// numbers pin the count exactly. Kept to 1–6, the range the program design supports.
const MODULE_COUNT_OPTIONS = [null, 1, 2, 3, 4, 5, 6] as const;

// Written-note ceiling — matches the textarea's maxLength; surfaced in the UI so
// the limit isn't a surprise.
const MAX_NOTE_CHARS = 20000;
// Voice limits: each recording auto-stops at 10 min, and total voice across all
// recordings is capped at 60 min (both enforced, not just displayed).
const MAX_RECORD_SECONDS = 10 * 60;
const MAX_TOTAL_RECORD_SECONDS = 60 * 60;

// mm:ss for a whole number of seconds.
const fmtDuration = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export function AddContentPage() {
  const navigate = useNavigate();
  const { backend, journey, contentSources, program, builds, refreshContent, refreshJourney } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savingLabel, setSavingLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  // Source pending delete confirmation (the trash icon asks before removing).
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmRebuild, setConfirmRebuild] = useState(false);
  const [building, setBuilding] = useState(false);
  // How many modules to generate. null = Auto (AI picks 1–6); a number pins it.
  const [moduleCount, setModuleCount] = useState<number | null>(null);

  // Once a program has been built, this visit is an edit — re-running build
  // creates a new build (keeping prior ones) and makes it active.
  const editing = isStepComplete(journey ?? { completed_steps: [] }, 'content');
  // We retain up to 8 builds. At the cap, rebuilding is blocked — builds can't be
  // deleted, so from here the user refines by editing their saved builds instead.
  const atBuildLimit = editing && builds.length >= 8;

  // On an edit, preselect the current program's module count so the choice reflects
  // what they already have. Applied once, so a manual change afterwards sticks.
  const didInitCount = useRef(false);
  useEffect(() => {
    if (didInitCount.current) return;
    const n = program.modules.length;
    if (editing && n >= 1 && n <= 6) {
      setModuleCount(n);
      didInitCount.current = true;
    }
  }, [editing, program.modules.length]);

  // Hydrate the saved draft on entry.
  useEffect(() => {
    let active = true;
    (async () => {
      await refreshContent();
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [refreshContent]);

  const addFiles = async (files: FileList | null) => {
    if (!files || !backend) return;
    setError(null);
    for (const file of Array.from(files)) {
      if (file.size > MAX_UPLOAD_BYTES) {
        setError("That file's a bit big (max 50 MB). Try a smaller one - or just record instead.");
        continue;
      }
      if (!ACCEPTED_UPLOAD_TYPES.includes(file.type)) {
        setError('Only PDF, image, or plain text files can be uploaded. You can also write it out or record yourself instead.');
        continue;
      }
      setBusy(true);
      setSavingLabel('Saving your file…');
      try {
        await backend.storage.upload(file, 'file');
        await refreshContent();
      } catch {
        setError('Upload failed - give it another try.');
      } finally {
        setBusy(false);
        setSavingLabel(null);
      }
    }
  };

  // Written note state — typed/pasted text is stored as a small .txt source so
  // it flows through the exact same pipeline as uploads (program-build extracts
  // .txt content into the prompt). Fills the gap left by dropping .docx, which
  // Gemini can't read through the API. `editingNoteId` set = we're editing an
  // existing note rather than adding a new one.
  const [writeOpen, setWriteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [openingNoteId, setOpeningNoteId] = useState<string | null>(null);

  const openNewNote = () => {
    setEditingNoteId(null);
    setNoteText('');
    setWriteOpen(true);
  };

  const closeWrite = () => {
    setWriteOpen(false);
    setEditingNoteId(null);
    setNoteText('');
  };

  // Re-open a saved note: fetch its text back from storage into the editor.
  const editNote = async (s: ContentSource) => {
    if (!backend) return;
    setOpeningNoteId(s.id);
    setError(null);
    try {
      const url = await backend.storage.signedUrl(s.storage_path);
      const text = await (await fetch(url)).text();
      setNoteText(text);
      setEditingNoteId(s.id);
      setWriteOpen(true);
    } catch {
      setError("Couldn't open that note - give it another try.");
    } finally {
      setOpeningNoteId(null);
    }
  };

  const saveNote = async () => {
    const text = noteText.trim();
    if (!text || !backend) return;
    const replacingId = editingNoteId;
    setWriteOpen(false);
    setError(null);
    setBusy(true);
    setSavingLabel(replacingId ? 'Saving your changes…' : 'Saving your note…');
    try {
      // First words become the filename so the source list stays meaningful.
      const name = text.replace(/\s+/g, ' ').slice(0, 48).trim() || 'Written note';
      const file = new File([text], `${name}.txt`, { type: 'text/plain' });
      // Store the new version first, then drop the old one — so an edit can never
      // lose the note if the upload fails partway.
      await backend.storage.upload(file, 'file');
      if (replacingId) await backend.storage.remove(replacingId);
      await refreshContent();
      setNoteText('');
      setEditingNoteId(null);
    } catch {
      setError("Couldn't save that note - give it another try.");
      setWriteOpen(true);
    } finally {
      setBusy(false);
      setSavingLabel(null);
    }
  };

  // Recording state
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const secondsRef = useRef(0); // authoritative duration for the save (state is stale in onstop)
  const timerRef = useRef<number | null>(null);

  // Total voice already recorded across saved sources — drives the 30-min cap.
  const recordedSeconds = contentSources.reduce(
    (sum, s) => sum + (s.kind === 'voice' ? s.duration_sec ?? 0 : 0),
    0,
  );
  const remainingRecordSeconds = Math.max(0, MAX_TOTAL_RECORD_SECONDS - recordedSeconds);
  const atRecordCap = remainingRecordSeconds <= 0;

  const startRecording = async () => {
    if (atRecordCap) {
      setError('You\'ve reached the 60-minute recording limit. Remove a recording to add more, or upload a file instead.');
      return;
    }
    // This take can run until the per-recording cap or whatever total time is left.
    const limit = Math.min(MAX_RECORD_SECONDS, remainingRecordSeconds);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const webm = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (!backend) return;
        setBusy(true);
        setSavingLabel('Saving your recording…');
        try {
          // Normalize to WAV so Gemini can analyze it; fall back to the raw
          // recording if this browser can't decode/convert it.
          let file: File;
          try {
            const wav = await blobToWav(webm);
            file = new File([wav], `recording-${Date.now()}.wav`, { type: 'audio/wav' });
          } catch {
            file = new File([webm], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
          }
          await backend.storage.upload(file, 'voice', secondsRef.current);
          await refreshContent();
        } catch {
          setError('Couldn\'t save that recording - give it another try.');
        } finally {
          setBusy(false);
          setSavingLabel(null);
        }
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setSeconds(0);
      secondsRef.current = 0;
      timerRef.current = window.setInterval(() => setSeconds((s) => {
        const next = s + 1;
        secondsRef.current = next;
        // Auto-stop at the per-take / remaining-total limit so the cap is honored
        // even if the user doesn't tap Stop.
        if (next >= limit) stopRecording();
        return next;
      }), 1000);
    } catch {
      setError('We need mic access to record. Enable it in your browser, or upload a file instead.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
  };

  const remove = async (id: string) => {
    if (!backend) return;
    setRemovingId(id);
    try {
      await backend.storage.remove(id);
      await refreshContent();
    } catch {
      toast.error("Couldn't remove that - tap to retry");
    } finally {
      setRemovingId(null);
    }
  };

  // Finalize: mark content done (first build) and run the build. The chosen module
  // count rides along in navigation state — BuildingPage passes it to program-build.
  const build = async () => {
    if (!backend || contentSources.length === 0) return;
    setBuilding(true);
    await backend.api.journeyUpdate({ current_step: 'building', complete_step: 'content' });
    await refreshJourney();
    navigate('/app/onboarding/building', { state: { moduleCount } });
  };

  // Rebuild after an edit: confirm first (it replaces the current program).
  const rebuild = async () => {
    if (!backend || contentSources.length === 0) return;
    setConfirmRebuild(false);
    setBuilding(true);
    await backend.api.journeyUpdate({ current_step: 'building' });
    await refreshJourney();
    navigate('/app/onboarding/building', { state: { moduleCount } });
  };

  const main = (
    <>
      <Card variant="plain">
        <p className="text-body font-semibold text-ink">What to Share With AbundanceAI</p>
        <p className="mt-1.5 text-body-sm text-ink-secondary">
          You can speak your answers, type them directly, or upload notes, documents, presentations, or other materials.
        </p>

        <p className="mt-5 text-body-sm font-semibold text-ink">As you share, think about:</p>
        <ol className="mt-3 grid gap-4 sm:grid-cols-2">
          {SHARE_PROMPTS.map((prompt, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-primary/10 font-mono text-caption font-semibold text-primary">
                {i + 1}
              </span>
              <span>
                <span className="block text-body-sm font-semibold text-ink">{prompt.title}</span>
                <span className="mt-0.5 block text-body-sm text-ink-secondary">{prompt.body}</span>
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-5 text-body-sm font-semibold text-ink">Share everything that feels relevant</p>
        <p className="mt-1.5 text-body-sm text-ink-secondary">
          You do not need to organize it perfectly. You can simply do a brain dump about your knowledge, experience,
          ideal participants, why you care, what makes you unique, and how you want to help. AbundanceAI will structure
          and organize it for you.
        </p>

        <p className="mt-5 text-body-sm font-semibold text-ink">The modules are your working guides</p>
        <p className="mt-1.5 text-body-sm text-ink-secondary">
          Your module content is for your own reference as you prepare for and lead each live session. <b>Participants will only see the portions you choose to share with them, so there is no need to over-edit or polish it.</b>
        </p>
      </Card>

      {!editing && (
        <Card variant="plain" className="border border-accent/25 bg-accent/5">
          <p className="text-body font-semibold text-ink">Recommended Mentoring Session Format</p>
          <p className="mt-1.5 text-body-sm text-ink-secondary">
            Most online group mentoring sessions work well at 75&ndash;90 minutes.
          </p>

          <p className="mt-4 text-body-sm font-semibold text-ink">We recommend:</p>
          <ul className="mt-2 flex flex-col gap-2">
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" />
              <span className="text-body-sm text-ink-secondary">
                20&ndash;40 minutes to share your knowledge, ideas, stories, or framework
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" />
              <span className="text-body-sm text-ink-secondary">
                The remaining time for participant discussion, exercises, personal guidance, and Q&amp;A
              </span>
            </li>
          </ul>

          <p className="mt-4 text-body-sm text-ink-secondary">
            This creates a balance between sharing your expertise and giving participants the opportunity to engage,
            apply what they are learning, and receive support.
          </p>
        </Card>
      )}

      <p className="text-eyebrow font-mono uppercase tracking-[0.12em] text-ink-secondary">Add your material</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Upload */}
        <button
          onClick={() => fileInput.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line-strong bg-surface-plain p-8 text-center transition-colors hover:border-primary/50"
        >
          <UploadIcon width={28} height={28} className="text-primary" />
          <span className="text-body font-medium text-ink">Upload a file</span>
          <span className="text-caption text-ink-secondary">PDF, image or .txt · max 50 MB</span>
          <input ref={fileInput} type="file" accept={ACCEPTED_UPLOAD_ACCEPT} multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        </button>

        {/* Write / paste */}
        <button
          onClick={openNewNote}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line-strong bg-surface-plain p-8 text-center transition-colors hover:border-primary/50"
        >
          <PencilIcon width={28} height={28} className="text-primary" />
          <span className="text-body font-medium text-ink">Write or paste it</span>
          <span className="text-caption text-ink-secondary">Type directly · up to {MAX_NOTE_CHARS.toLocaleString()} characters</span>
        </button>

        {/* Record */}
        <button
          onClick={recording ? stopRecording : startRecording}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-8 text-center transition-colors',
            recording ? 'border-primary bg-primary/5' : 'border-dashed border-line-strong bg-surface-plain hover:border-primary/50',
          )}
        >
          <MicIcon width={28} height={28} className="text-primary" />
          <span className="text-body font-medium text-ink">{recording ? 'Stop recording' : 'Just talk - I\'ll listen'}</span>
          {recording ? (
            <span className="flex items-center gap-2 font-mono text-data text-primary">
              <span className="h-2 w-2 animate-dot-pulse rounded-pill bg-error" />
              {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
            </span>
          ) : atRecordCap ? (
            <span className="text-caption text-error">30 min recording limit reached</span>
          ) : (
            <span className="text-caption text-ink-secondary">
              Tap to start · 10 min each, {fmtDuration(remainingRecordSeconds)} of 30 min left
            </span>
          )}
        </button>
      </div>

      {error && <p className="mt-4 text-caption text-error">{error}</p>}

      {/* Saving indicator — shown while an upload/recording is being stored. */}
      {savingLabel && (
        <Card variant="plain" className="mt-4 flex items-center gap-3 border-primary/30 bg-primary/5">
          <Spinner size={18} />
          <span className="text-body-sm font-medium text-ink">{savingLabel}</span>
        </Card>
      )}

      {/* Saved sources (auto-saved draft) */}
      {loading ? (
        <Card className="mt-6 divide-y divide-line p-0">
          {[0, 1].map((i) => (
            <div key={i} className="px-5 py-3"><Skeleton variant="line" className="w-1/2" /></div>
          ))}
        </Card>
      ) : contentSources.length > 0 ? (
        <>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-caption text-ink-secondary">
              {editing ? 'Your sources' : 'Draft saved - pick up any time.'}
            </p>
            <span className="text-caption text-ink-secondary">{contentSources.length} {contentSources.length === 1 ? 'item' : 'items'}</span>
          </div>
          <Card className="mt-2 divide-y divide-line p-0">
            {contentSources.map((s) => {
              const { name, meta } = sourceMeta(s);
              return (
                <div key={s.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm font-medium text-ink">{name}</p>
                    <p className="text-caption text-ink-secondary">{meta}</p>
                    {s.kind === 'voice' && backend && (
                      <SourcePlayer load={() => backend.storage.signedUrl(s.storage_path)} />
                    )}
                    {isTextNote(s) && backend && (
                      <button
                        type="button"
                        onClick={() => editNote(s)}
                        disabled={openingNoteId === s.id}
                        className="mt-1 inline-flex items-center gap-1.5 text-caption font-medium text-primary hover:underline disabled:opacity-50"
                      >
                        {openingNoteId === s.id ? <Spinner size={12} /> : <PencilIcon width={14} height={14} />}
                        {openingNoteId === s.id ? 'Loading…' : 'Edit'}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setConfirmDeleteId(s.id)}
                    disabled={removingId === s.id}
                    aria-label="Remove"
                    className="mt-0.5 shrink-0 text-ink-secondary hover:text-error disabled:opacity-40"
                  >
                    <TrashIcon width={18} height={18} />
                  </button>
                </div>
              );
            })}
          </Card>
        </>
      ) : (
        <p className="mt-6 text-center text-body-sm text-ink-secondary">
          Nothing to prepare - add one thing and we'll take it from there.
        </p>
      )}

      {/* How many modules — Auto lets the AI pick 1–6; a number pins it exactly. */}
      <div className="mt-6">
        <p className="text-body-sm font-semibold text-ink">How many modules?</p>
        <p className="text-caption text-ink-secondary">Pick a number, or let me choose the best fit for your material.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {MODULE_COUNT_OPTIONS.map((n) => {
            const active = moduleCount === n;
            return (
              <button
                key={n ?? 'auto'}
                type="button"
                onClick={() => setModuleCount(n)}
                aria-pressed={active}
                className={cn(
                  'min-w-[3rem] rounded-pill border px-4 py-2 text-body-sm font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-line-strong bg-surface-plain text-ink-secondary hover:border-primary/50',
                )}
              >
                {n === null ? 'Auto' : n}
              </button>
            );
          })}
        </div>
      </div>

      {atBuildLimit && (
        <Card variant="plain" className="mt-6 border-l-2 border-l-error bg-error/5">
          <p className="text-body-sm text-ink">
            You've reached the limit of 8 builds. You can keep refining your program by editing any of your saved builds on your Program page.
          </p>
        </Card>
      )}

      <div className="mt-6">
        <Button
          size="lg"
          disabled={contentSources.length === 0}
          loading={busy || building}
          variant={atBuildLimit ? 'secondary' : 'primary'}
          iconLeft={editing && !atBuildLimit ? <SparkleIcon width={18} height={18} /> : undefined}
          onClick={atBuildLimit ? () => navigate('/app/program') : editing ? () => setConfirmRebuild(true) : build}
        >
          {atBuildLimit ? 'Review your builds' : editing ? 'Rebuild my program' : 'Build my program'}
        </Button>
      </div>

      <Sheet
        open={writeOpen}
        onClose={closeWrite}
        title={editingNoteId ? 'Edit your note' : 'Write it out'}
        footer={
          <>
            <Button size="lg" disabled={!noteText.trim()} onClick={saveNote}>{editingNoteId ? 'Save changes' : 'Save note'}</Button>
            <Button size="lg" variant="ghost" onClick={closeWrite}>Cancel</Button>
          </>
        }
      >
        <p className="text-body-sm text-ink-secondary">
          Notes, an outline, a story you always tell clients - paste or type anything. Messy is fine; I'll find the structure.
        </p>
        <textarea
          autoFocus
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          maxLength={MAX_NOTE_CHARS}
          rows={10}
          placeholder="Start typing, or paste from anywhere…"
          className="mt-3 w-full resize-none rounded-md border border-line px-3 py-2 text-body-sm text-ink focus:border-primary"
        />
        <p className={cn('mt-1.5 text-right text-caption', noteText.length >= MAX_NOTE_CHARS ? 'text-error' : 'text-ink-secondary')}>
          {noteText.length.toLocaleString()} / {MAX_NOTE_CHARS.toLocaleString()} characters
        </p>
      </Sheet>

      <Sheet
        open={confirmRebuild}
        onClose={() => setConfirmRebuild(false)}
        title="Create a new build?"
        footer={
          <>
            <Button size="lg" loading={building} onClick={rebuild}>Yes, build a new one</Button>
            <Button size="lg" variant="ghost" onClick={() => setConfirmRebuild(false)}>Keep what I have</Button>
          </>
        }
      >
        <p className="text-body text-ink-secondary">
          We'll create a new build from your current sources and make it active. Your current build stays saved - you can
          switch back to it anytime from the Program page. Up to 8 builds are kept.
        </p>
      </Sheet>

      {/* Delete-source confirm sheet */}
      <Sheet
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        title="Remove this from your content?"
        footer={
          <>
            <Button
              variant="destructive"
              onClick={() => { if (confirmDeleteId) void remove(confirmDeleteId); setConfirmDeleteId(null); }}
            >
              Yes, remove it
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>Keep it</Button>
          </>
        }
      >
        <p className="text-body text-ink-secondary">
          &ldquo;{(() => {
            const s = contentSources.find((c) => c.id === confirmDeleteId);
            return s ? sourceMeta(s).name : 'This item';
          })()}&rdquo; will no longer be part of what your program is built from. This can&rsquo;t be undone.
        </p>
      </Sheet>
    </>
  );

  const aside = editing ? (
    <>
      <Card variant="plain" className="border border-primary/25 bg-primary/5 p-4">
        <RailLabel>What rebuilding does</RailLabel>
        <p className="text-body-sm text-ink-secondary">
          Creates a new build from these sources and makes it active. Your current build stays saved - switch back anytime from the Program page.
        </p>
      </Card>
      {builds.length > 0 && (
        <Card variant="plain" className="p-4">
          <RailLabel>Builds kept</RailLabel>
          <p className="font-mono text-h2 font-semibold text-ink">
            {builds.length}<span className="text-body-sm font-normal text-ink-secondary"> of 8</span>
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-pill bg-line">
            <div className="h-full rounded-pill bg-accent" style={{ width: `${Math.min(100, (builds.length / 8) * 100)}%` }} />
          </div>
        </Card>
      )}
    </>
  ) : (
    <Card variant="plain" className="border border-accent/25 bg-accent/5 p-4">
      <RailLabel>How this works</RailLabel>
      <div className="space-y-4">
        <div>
          <p className="text-body-sm font-semibold text-ink">1. Share your ideas and materials</p>
          <p className="mt-1 text-body-sm text-ink-secondary">
            Speak, type, upload, or bring in content from another AI - and pick how many sessions to create, or let
            AbundanceAI recommend. No need to organize first; it structures everything for you.
          </p>
        </div>
        <div>
          <p className="text-body-sm font-semibold text-ink">2. Build your mentoring program</p>
          <p className="mt-1 text-body-sm text-ink-secondary">
            Select Build and AbundanceAI creates your sessions. Review, edit, or make another version - your previous
            builds stay available to compare and pick from.
          </p>
        </div>
      </div>
    </Card>
  );

  return (
    <StepLayout
      back
      backTo={editing ? '/app/program' : '/app/onboarding/path'}
      eyebrow={editing ? 'Edit your content' : 'Step 2'}
      title={editing ? 'Update your material, then rebuild.' : 'The Mentoring Experience Lab'}
      subtitle={!editing ? 'Turn what you know and love into an experience that helps others to thrive.' : undefined}
      main={main}
      aside={aside}
    />
  );
}

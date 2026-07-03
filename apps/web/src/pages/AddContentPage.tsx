import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAX_UPLOAD_BYTES, ACCEPTED_UPLOAD_TYPES, ACCEPTED_UPLOAD_ACCEPT, isStepComplete } from '@abundance/shared';
import type { ContentSource } from '@abundance/shared';
import { Button, Card, Sheet, Skeleton, Spinner } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { JourneyStepper } from '@/components/JourneyStepper';
import { UploadIcon, MicIcon, TrashIcon, SparkleIcon, PlayIcon } from '@/components/ui/icons';
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
// becomes an EDIT surface — re-building warns first, then replaces (the chosen
// product behaviour), since program-build regenerates modules from scratch.

// How a saved source reads in the list.
function sourceMeta(s: ContentSource): { name: string; meta: string } {
  if (s.kind === 'voice') return { name: 'Voice note', meta: s.duration_sec ? `${s.duration_sec}s` : 'Recording' };
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
      {loading ? 'Loading…' : failed ? 'Unavailable — tap to retry' : 'Play'}
    </button>
  );
}

export function AddContentPage() {
  const navigate = useNavigate();
  const { backend, journey, contentSources, refreshContent, refreshJourney } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savingLabel, setSavingLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRebuild, setConfirmRebuild] = useState(false);
  const [building, setBuilding] = useState(false);

  // Once a program has been built, this visit is an edit — re-running build
  // regenerates (and replaces) the existing program.
  const editing = isStepComplete(journey ?? { completed_steps: [] }, 'content');

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
        setError("That file's a bit big (max 50 MB). Try a smaller one — or just record instead.");
        continue;
      }
      if (!ACCEPTED_UPLOAD_TYPES.includes(file.type)) {
        setError('Only PDF or image files can be uploaded. To share spoken material, use “Just talk” to record instead.');
        continue;
      }
      setBusy(true);
      setSavingLabel('Saving your file…');
      try {
        await backend.storage.upload(file, 'file');
        await refreshContent();
      } catch {
        setError('Upload failed — give it another try.');
      } finally {
        setBusy(false);
        setSavingLabel(null);
      }
    }
  };

  // Recording state
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const secondsRef = useRef(0); // authoritative duration for the save (state is stale in onstop)
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
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
          setError('Couldn\'t save that recording — give it another try.');
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
      timerRef.current = window.setInterval(() => setSeconds((s) => { secondsRef.current = s + 1; return s + 1; }), 1000);
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
      toast.error("Couldn't remove that — tap to retry");
    } finally {
      setRemovingId(null);
    }
  };

  // Finalize: mark content done (first build) and run the build.
  const build = async () => {
    if (!backend || contentSources.length === 0) return;
    setBuilding(true);
    await backend.api.journeyUpdate({ current_step: 'building', complete_step: 'content' });
    await refreshJourney();
    navigate('/app/onboarding/building');
  };

  // Rebuild after an edit: confirm first (it replaces the current program).
  const rebuild = async () => {
    if (!backend || contentSources.length === 0) return;
    setConfirmRebuild(false);
    setBuilding(true);
    await backend.api.journeyUpdate({ current_step: 'building' });
    await refreshJourney();
    navigate('/app/onboarding/building');
  };

  return (
    <div>
      <PageHeader
        back
        backTo={editing ? '/app/program' : '/app/onboarding/path'}
        eyebrow={editing ? 'Edit your content' : 'Step 2'}
        title={editing ? 'Update your material, then rebuild.' : 'Give me the raw material — messy is fine.'}
      />

      <JourneyStepper className="mb-5" />

      {editing && (
        <Card variant="plain" className="mb-4 border-l-2 border-l-primary bg-primary/5">
          <p className="text-body-sm text-ink">
            Rebuilding regenerates your program from these sources. Any edits you made to module titles or outcomes will be replaced.
          </p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Upload */}
        <button
          onClick={() => fileInput.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line-strong bg-surface-plain p-8 text-center transition-colors hover:border-primary/50"
        >
          <UploadIcon width={28} height={28} className="text-primary" />
          <span className="text-body font-medium text-ink">Upload a file</span>
          <span className="text-caption text-ink-secondary">PDF or image · max 50 MB</span>
          <input ref={fileInput} type="file" accept={ACCEPTED_UPLOAD_ACCEPT} multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
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
          <span className="text-body font-medium text-ink">{recording ? 'Stop recording' : 'Just talk — I\'ll listen'}</span>
          {recording ? (
            <span className="flex items-center gap-2 font-mono text-data text-primary">
              <span className="h-2 w-2 animate-dot-pulse rounded-pill bg-error" />
              {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
            </span>
          ) : (
            <span className="text-caption text-ink-secondary">Tap to start</span>
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
              {editing ? 'Your sources' : 'Draft saved — pick up any time.'}
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
                  </div>
                  <button
                    onClick={() => remove(s.id)}
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
          Nothing to prepare — add one thing and we'll take it from there.
        </p>
      )}

      <div className="mt-6">
        <Button
          size="lg"
          disabled={contentSources.length === 0}
          loading={busy || building}
          iconLeft={editing ? <SparkleIcon width={18} height={18} /> : undefined}
          onClick={editing ? () => setConfirmRebuild(true) : build}
        >
          {editing ? 'Rebuild my program' : 'Build my program'}
        </Button>
      </div>

      <Sheet
        open={confirmRebuild}
        onClose={() => setConfirmRebuild(false)}
        title="Rebuild your program?"
        footer={
          <>
            <Button size="lg" loading={building} onClick={rebuild}>Yes, rebuild it</Button>
            <Button size="lg" variant="ghost" onClick={() => setConfirmRebuild(false)}>Keep what I have</Button>
          </>
        }
      >
        <p className="text-body text-ink-secondary">
          We'll regenerate your program from your current sources. Your existing modules — including any edits you made to
          titles or outcomes — will be replaced.
        </p>
      </Sheet>
    </div>
  );
}

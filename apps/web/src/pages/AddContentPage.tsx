import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAX_UPLOAD_BYTES, ACCEPTED_UPLOAD_TYPES } from '@abundance/shared';
import { Button, Card } from '@/components/ui';
import { PageHeader } from '@/components/PageHeader';
import { UploadIcon, MicIcon, TrashIcon } from '@/components/ui/icons';
import { useApp } from '@/store';
import { cn } from '@/lib/cn';

interface Item { id: string; name: string; meta: string }

// [06] Add Your Content — upload files or record speech to feed the AI. ≥1 source
// to enable Build. 50 MB + type allowlist enforced inline.
export function AddContentPage() {
  const navigate = useNavigate();
  const { backend, refreshJourney } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recording state
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files || !backend) return;
    setError(null);
    for (const file of Array.from(files)) {
      if (file.size > MAX_UPLOAD_BYTES) {
        setError("That file's a bit big (max 50 MB). Try a smaller one — or just record instead.");
        continue;
      }
      if (file.type && !ACCEPTED_UPLOAD_TYPES.includes(file.type)) {
        setError("That file type isn't supported. Try a document, audio, or video — or record instead.");
        continue;
      }
      setBusy(true);
      try {
        const res = await backend.storage.upload(file, 'file');
        setItems((prev) => [...prev, { id: res.id, name: res.filename, meta: `${Math.round(file.size / 1024)} KB` }]);
      } catch {
        setError('Upload failed — give it another try.');
      } finally {
        setBusy(false);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        if (backend) {
          setBusy(true);
          try {
            const res = await backend.storage.upload(file, 'voice', seconds);
            setItems((prev) => [...prev, { id: res.id, name: 'Voice note', meta: `${seconds}s` }]);
          } finally {
            setBusy(false);
          }
        }
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError('We need mic access to record. Enable it in your browser, or upload a file instead.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
  };

  const build = async () => {
    if (!backend || items.length === 0) return;
    await backend.api.journeyUpdate({ current_step: 'building', complete_step: 'content' });
    await refreshJourney();
    navigate('/app/onboarding/building');
  };

  return (
    <div>
      <PageHeader back backTo="/app/onboarding/path" eyebrow="Step 2" title="Give me the raw material — messy is fine." />

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Upload */}
        <button
          onClick={() => fileInput.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line-strong bg-surface-plain p-8 text-center transition-colors hover:border-primary/50"
        >
          <UploadIcon width={28} height={28} className="text-primary" />
          <span className="text-body font-medium text-ink">Upload a file</span>
          <span className="text-caption text-ink-secondary">Docs, audio or video · max 50 MB</span>
          <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        </button>

        {/* Record */}
        <button
          onClick={recording ? stopRecording : startRecording}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-8 text-center transition-colors',
            recording ? 'border-primary bg-primary/5' : 'border-dashed border-line-strong bg-surface-plain hover:border-primary/50',
          )}
        >
          <MicIcon width={28} height={28} className={recording ? 'text-primary' : 'text-primary'} />
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

      {/* Added items */}
      {items.length > 0 ? (
        <Card className="mt-6 divide-y divide-line p-0">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-body-sm font-medium text-ink">{it.name}</p>
                <p className="text-caption text-ink-secondary">{it.meta}</p>
              </div>
              <button onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))} aria-label="Remove" className="text-ink-secondary hover:text-error">
                <TrashIcon width={18} height={18} />
              </button>
            </div>
          ))}
        </Card>
      ) : (
        <p className="mt-6 text-center text-body-sm text-ink-secondary">
          Nothing to prepare — add one thing and we'll take it from there.
        </p>
      )}

      <div className="mt-6">
        <Button size="lg" disabled={items.length === 0} loading={busy} onClick={build}>Build my program</Button>
      </div>
    </div>
  );
}

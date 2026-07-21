import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { NarratedLoader } from '@/components/media/NarratedLoader';
import { useApp } from '@/store';

// [07] Building Your Program — the hero loading moment while Gemini structures the
// content. Auto-advances to [08] on success; calm full-screen retry on failure.
const STEPS = [
  'Reading your notes…',
  'Finding the throughline…',
  'Shaping your modules…',
  'Writing the outcomes…',
  'Almost there…',
];

export function BuildingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { backend, journey, refreshProgram, refreshBuilds, refreshJourney } = useApp();
  const [failed, setFailed] = useState(false);
  // The server's message for the failure (e.g. the 8-build limit) — retrying
  // can't fix those, so the user needs to see the actual reason.
  const [failReason, setFailReason] = useState<string | null>(null);
  const started = useRef(false);
  // The module count chosen on the content step (null/absent = let the AI decide).
  // Lost on a hard refresh, which harmlessly falls back to Auto.
  const moduleCount = (location.state as { moduleCount?: number | null } | null)?.moduleCount ?? null;

  const run = async () => {
    if (!backend) return;
    setFailed(false);
    try {
      await backend.api.programBuild({
        path: journey?.path ?? undefined,
        ...(moduleCount ? { module_count: moduleCount } : {}),
      });
      await Promise.all([refreshProgram(), refreshBuilds(), backend.api.journeyUpdate({ current_step: 'program', complete_step: 'program' })]);
      await refreshJourney();
      navigate('/app/program', { replace: true });
    } catch (err) {
      setFailReason(err instanceof Error && err.message ? err.message : null);
      setFailed(true);
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend]);

  if (failed) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-bg px-8 text-center">
        <h1 className="text-h1 font-bold text-ink">We hit a snag building your program.</h1>
        <p className="mt-3 max-w-sm text-body text-ink-secondary">
          {failReason ?? "Your content is safe. Let's try that again."}
        </p>
        <div className="mt-6 w-full max-w-xs">
          <Button size="lg" onClick={() => { void run(); }}>Try again</Button>
        </div>
      </div>
    );
  }

  return <NarratedLoader steps={STEPS} subline="Hang tight - this is the good part." />;
}

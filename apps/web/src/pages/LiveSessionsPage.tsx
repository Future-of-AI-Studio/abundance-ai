import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MeetingPlatform } from '@abundance/shared';
import { isValidMeetingLink, MEETING_PLATFORM_LABEL } from '@abundance/shared';
import { Button, Card, TextInput, Select } from '@/components/ui';
import { CopyIcon, ArrowRight, VideoIcon } from '@/components/ui/icons';
import { StepLayout, RailLabel } from '@/components/StepLayout';
import { useApp } from '@/store';
import { toast } from '@/store/toast';

// Per-platform UI hints. Only Google Meet has a one-click "new room" URL; the
// others require the host to create a meeting and paste its link.
const PLATFORMS: { value: MeetingPlatform; label: string; placeholder: string; generate?: string }[] = [
  { value: 'google_meet', label: 'Google Meet', placeholder: 'https://meet.google.com/abc-defg-hij', generate: 'https://meet.google.com/new' },
  { value: 'zoom', label: 'Zoom', placeholder: 'https://us02web.zoom.us/j/1234567890' },
  { value: 'teams', label: 'Microsoft Teams', placeholder: 'https://teams.microsoft.com/l/meetup-join/…' },
  { value: 'other', label: 'Other (Webex, Whereby, …)', placeholder: 'https://…' },
];

// Mask a meeting link for the "what your group sees" preview — host + dots so the
// full URL isn't splashed on screen while still confirming a link is set.
function maskLink(url: string): string {
  try { return `${new URL(url).host}/•••-••••-•••`; } catch { return url; }
}

// [10] Set Up Live Sessions (Type A). Pick a video platform, then validate + save
// its link. Type B sees recording guidance instead.
export function LiveSessionsPage() {
  const navigate = useNavigate();
  const { backend, journey, program, session, refreshSession, refreshJourney } = useApp();
  const [platform, setPlatform] = useState<MeetingPlatform>(session?.platform ?? 'google_meet');
  const [link, setLink] = useState(session?.meet_link ?? '');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const current = PLATFORMS.find((p) => p.value === platform)!;

  const goNext = async () => {
    if (backend) { await backend.api.journeyUpdate({ complete_step: 'sessions', current_step: 'payments' }); await refreshJourney(); }
    navigate('/app/onboarding/payments');
  };

  if (journey?.path === 'B') {
    return (
      <StepLayout
        back
        eyebrow="Recording guidance"
        title="Record once, sell on repeat."
        main={
          <>
            <Card variant="plain">
              <p className="text-body text-ink">For a self-paced course, you'll record each module on your own time. A few tips:</p>
              <ul className="mt-3 space-y-2 text-body-sm text-ink-secondary">
                <li>• Use your phone - good light beats fancy gear.</li>
                <li>• One module per video. Keep it under 10 minutes.</li>
                <li>• Talk like you're helping one friend.</li>
              </ul>
            </Card>
            <Button size="lg" iconRight={<ArrowRight width={20} height={20} />} onClick={goNext}>Continue</Button>
          </>
        }
      />
    );
  }

  // Switching platform clears the link — a Meet URL won't validate as Zoom, etc.
  const changePlatform = (next: MeetingPlatform) => {
    setPlatform(next);
    setLink('');
    setError(undefined);
  };

  const save = async () => {
    if (!backend) return;
    if (!isValidMeetingLink(platform, link)) {
      setError(`That doesn't look like a ${MEETING_PLATFORM_LABEL[platform]} link.`);
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await backend.api.sessionsSetLink({ platform, meet_link: link });
      await refreshSession();
      toast.success('Link saved');
    } catch {
      setError(`That doesn't look like a ${MEETING_PLATFORM_LABEL[platform]} link.`);
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => { await navigator.clipboard.writeText(session?.meet_link ?? link); toast.success('Copied to clipboard'); };
  const savedLink = session?.meet_link;

  return (
    <StepLayout
      back
      eyebrow="Step 4 · Sessions"
      title="Where your group will meet."
      main={
        <>
          <Card variant="plain" className="space-y-4">
            <Select<MeetingPlatform>
              label="Video platform"
              value={platform}
              options={PLATFORMS.map((p) => ({ value: p.value, label: p.label }))}
              onChange={changePlatform}
            />

            {current.generate ? (
              <>
                <p className="text-body-sm text-ink-secondary">Google Meet is free and works everywhere. Generate a fresh room or paste your own link.</p>
                <Button variant="secondary" onClick={() => { setLink(current.generate!); setError(undefined); }}>
                  Generate a {current.label} link
                </Button>
                <TextInput
                  label="Or paste your link"
                  placeholder={current.placeholder}
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  error={error}
                />
              </>
            ) : (
              <>
                <p className="text-body-sm text-ink-secondary">Create a meeting in {current.label}, then paste its invite link here.</p>
                <TextInput
                  label={`${current.label} link`}
                  placeholder={current.placeholder}
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  error={error}
                />
              </>
            )}
            <Button size="lg" loading={saving} onClick={save}>Save</Button>
          </Card>

          <Button size="lg" variant="ghost" iconRight={<ArrowRight width={20} height={20} />} onClick={goNext}>
            {savedLink ? 'Continue' : 'Skip for now'}
          </Button>
        </>
      }
      aside={
        <>
          <Card variant="plain" className="p-4">
            <RailLabel>What your group sees</RailLabel>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <VideoIcon width={20} height={20} />
              </span>
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-ink">Live session</p>
                <p className="text-caption text-ink-secondary">{program.program?.title ?? 'Your program'} · Group</p>
              </div>
            </div>
            {savedLink ? (
              <>
                <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2">
                  <span className="truncate font-mono text-caption text-ink">{maskLink(savedLink)}</span>
                  <button onClick={copy} aria-label="Copy link" className="shrink-0 text-primary hover:text-primary-hover"><CopyIcon width={16} height={16} /></button>
                </div>
              </>
            ) : (
              <p className="mt-3 text-caption text-ink-secondary">Your meeting link will appear here once you save it.</p>
            )}
          </Card>

          <Card variant="plain" className="border border-accent/25 bg-accent/5 p-4">
            <p className="text-body-sm font-semibold text-ink">No link yet? That's fine.</p>
            {/* <p className="mt-1 text-body-sm text-ink-secondary">
              You can skip this and add your meeting link later from the Program page - nothing else is blocked.
            </p> */}
          </Card>
        </>
      }
    />
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MeetingPlatform } from '@abundance/shared';
import { isValidMeetingLink, MEETING_PLATFORM_LABEL } from '@abundance/shared';
import { Button, Card, TextInput, Select } from '@/components/ui';
import { CopyIcon, ArrowRight } from '@/components/ui/icons';
import { PageHeader } from '@/components/PageHeader';
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

// [10] Set Up Live Sessions (Type A). Pick a video platform, then validate + save
// its link. Type B sees recording guidance instead.
export function LiveSessionsPage() {
  const navigate = useNavigate();
  const { backend, journey, session, refreshSession, refreshJourney } = useApp();
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
      <div>
        <PageHeader back eyebrow="Recording guidance" title="Record once, sell on repeat." />
        <Card variant="plain">
          <p className="text-body text-ink">For a self-paced course, you'll record each module on your own time. A few tips:</p>
          <ul className="mt-3 space-y-2 text-body-sm text-ink-secondary">
            <li>• Use your phone — good light beats fancy gear.</li>
            <li>• One module per video. Keep it under 10 minutes.</li>
            <li>• Talk like you're helping one friend.</li>
          </ul>
        </Card>
        <div className="mt-6"><Button size="lg" iconRight={<ArrowRight width={20} height={20} />} onClick={goNext}>Continue</Button></div>
      </div>
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

  return (
    <div>
      <PageHeader back eyebrow="Step 4" title="Where your group will meet." />

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

      {session?.meet_link && (
        <Card className="mt-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-mono text-data text-ink-secondary">SAVED {MEETING_PLATFORM_LABEL[session.platform ?? 'google_meet'].toUpperCase()} LINK</p>
            <p className="truncate text-body-sm text-ink">{session.meet_link}</p>
          </div>
          <button onClick={copy} aria-label="Copy" className="text-primary"><CopyIcon width={20} height={20} /></button>
        </Card>
      )}

      <div className="mt-6">
        <Button size="lg" variant="ghost" iconRight={<ArrowRight width={20} height={20} />} onClick={goNext}>
          {session?.meet_link ? 'Continue' : 'Skip for now'}
        </Button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, TextInput } from '@/components/ui';
import { CopyIcon, ArrowRight } from '@/components/ui/icons';
import { PageHeader } from '@/components/PageHeader';
import { useApp } from '@/store';
import { toast } from '@/store/toast';

// [10] Set Up Live Sessions (Type A). Validate + save a Google Meet link. Type B
// sees recording guidance instead.
export function LiveSessionsPage() {
  const navigate = useNavigate();
  const { backend, journey, session, refreshSession, refreshJourney } = useApp();
  const [link, setLink] = useState(session?.meet_link ?? '');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

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

  const save = async () => {
    if (!backend) return;
    if (!/^https:\/\/meet\.google\.com\//.test(link)) {
      setError("That doesn't look like a Meet link — paste the full https://meet.google.com/… URL.");
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      await backend.api.sessionsSetLink({ meet_link: link });
      await refreshSession();
      toast.success('Link saved');
    } catch {
      setError("That doesn't look like a Meet link — paste the full https://meet.google.com/… URL.");
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => { await navigator.clipboard.writeText(session?.meet_link ?? link); toast.success('Copied to clipboard'); };

  return (
    <div>
      <PageHeader back eyebrow="Step 4" title="Where your group will meet." />

      <Card variant="plain" className="space-y-4">
        <p className="text-body-sm text-ink-secondary">Google Meet is free and works everywhere. Generate a link or paste your own.</p>
        <Button
          variant="secondary"
          onClick={() => setLink('https://meet.google.com/new')}
        >
          Generate a Meet link
        </Button>
        <TextInput
          label="Or paste your link"
          placeholder="https://meet.google.com/abc-defg-hij"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          error={error}
        />
        <Button size="lg" loading={saving} onClick={save}>Save</Button>
      </Card>

      {session?.meet_link && (
        <Card className="mt-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-mono text-data text-ink-secondary">SAVED LINK</p>
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

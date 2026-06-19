import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, ChecklistRow, Badge } from '@/components/ui';
import { ShieldIcon } from '@/components/ui/icons';
import { VideoPlayer } from '@/components/media/VideoPlayer';
import { PageHeader } from '@/components/PageHeader';
import { useApp } from '@/store';
import { toast } from '@/store/toast';

// [11] Get Paid — guided Stripe Connect + readiness checklist so the user can
// receive THEIR client payments. AbundanceAI never touches the money.
export function GetPaidPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { backend, program, payments, refreshPayments, refreshJourney } = useApp();
  const [connecting, setConnecting] = useState(false);

  // Reconcile status if we just returned from Stripe.
  useEffect(() => {
    if (params.get('stripe') === 'return' && backend) {
      void (async () => {
        try { await backend.api.stripeConnect({ reconcile: true }); await refreshPayments(); } catch { /* noop */ }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend]);

  // Gated too early.
  if (!program.program) {
    return (
      <div>
        <PageHeader back eyebrow="Get paid" title="Let's get you ready to receive payment." />
        <Card variant="plain" className="text-center">
          <p className="text-body text-ink-secondary">This unlocks once your program's ready — no rush, you're not selling yet.</p>
          <div className="mx-auto mt-4 max-w-xs"><Button onClick={() => navigate('/app/program')}>Build your program</Button></div>
        </Card>
      </div>
    );
  }

  const checklist = payments?.checklist ?? { bank: false, id: false, email: true };
  const connected = payments?.connected ?? false;

  const connect = async () => {
    if (!backend) return;
    setConnecting(true);
    try {
      const res = await backend.api.stripeConnect({});
      if (res.onboarding_url) {
        window.location.href = res.onboarding_url;
      } else {
        await refreshPayments();
        toast.info('Already set up.');
      }
    } catch {
      toast.error('Could not open Stripe — please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const finish = async () => {
    if (backend) { await backend.api.journeyUpdate({ complete_step: 'payments' }); await refreshJourney(); }
    navigate('/app');
  };

  return (
    <div>
      <PageHeader back eyebrow="Get paid" title="Let's get you ready to receive payment.">
        {connected && <Badge variant="done">Connected</Badge>}
      </PageHeader>

      <Card variant="plain" className="mb-4">
        <p className="mb-1 font-mono text-data text-ink-secondary">READINESS CHECKLIST</p>
        <ChecklistRow label="Email" status={checklist.email ? 'done' : 'todo'} />
        <ChecklistRow label="Bank account" status={checklist.bank ? 'done' : 'todo'} />
        <ChecklistRow label="Photo ID" status={checklist.id ? 'done' : 'todo'} />
      </Card>

      <div className="mb-4"><VideoPlayer poster="" label="Watch the walkthrough" /></div>

      {!connected ? (
        <Button size="lg" loading={connecting} onClick={connect}>Connect Stripe</Button>
      ) : (
        <Button size="lg" onClick={finish}>Done</Button>
      )}

      <div className="mt-4 flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-3">
        <ShieldIcon width={20} height={20} className="text-accent" />
        <p className="text-body-sm text-ink-secondary">AbundanceAI never touches your money. It goes straight to your account.</p>
      </div>
    </div>
  );
}

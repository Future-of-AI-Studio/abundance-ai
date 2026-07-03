import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isStepComplete } from '@abundance/shared';
import { Button, Card, Badge } from '@/components/ui';
import { ShieldIcon, ArrowRight, UsersIcon } from '@/components/ui/icons';
import { VideoPlayer } from '@/components/media/VideoPlayer';
import { PageHeader } from '@/components/PageHeader';
import { JourneyStepper } from '@/components/JourneyStepper';
import { ShareProgramLink } from '@/components/ShareProgramLink';
import { PriceEditor } from '@/components/PriceEditor';
import { useApp } from '@/store';
import { toast } from '@/store/toast';
import { env } from '@/lib/env';

// [11] Get Paid — connect payments so the user can receive THEIR client payments.
// Stripe Connect isn't wired yet, so this is MOCKED: one click marks the step done
// and reveals the shareable landing-page link. AbundanceAI never touches the money.
export function GetPaidPage() {
  const navigate = useNavigate();
  const { backend, program, journey, payments, refreshPayments, refreshJourney, refreshProgram } = useApp();
  const [connecting, setConnecting] = useState(false);

  const savePrice = async (cents: number) => {
    if (!backend || !program.program) return;
    try {
      await backend.api.programUpdate({ program_id: program.program.id, price_cents: cents });
      await refreshProgram();
      toast.success('Price updated.');
    } catch {
      toast.error("Couldn't save that price — try again.");
    }
  };

  // Gated too early.
  if (!program.program) {
    return (
      <div>
        <PageHeader back eyebrow="Get paid" title="Let's get you ready to receive payment." />
        <JourneyStepper className="mb-5" />
        <Card variant="plain" className="text-center">
          <p className="text-body text-ink-secondary">This unlocks once your program's ready — no rush, you're not selling yet.</p>
          <div className="mx-auto mt-4 max-w-xs"><Button onClick={() => navigate('/app/program')}>Build your program</Button></div>
        </Card>
      </div>
    );
  }

  // "Done" = payments step completed OR the connect flag is set. Keyed off the
  // journey so it survives a reload regardless of the (mocked) Stripe state.
  const paymentsDone = (payments?.connected ?? false) || isStepComplete(journey ?? { completed_steps: [] }, 'payments');
  const programId = program.program.id;

  // Mocked connect: flip the local connected flag (mock backend only), then mark
  // the step complete. No redirect to Stripe until Connect is configured.
  const connect = async () => {
    if (!backend) return;
    setConnecting(true);
    try {
      if (env.useMocks) {
        try { await backend.api.stripeConnect({ reconcile: true }); } catch { /* best effort */ }
      }
      await backend.api.journeyUpdate({ complete_step: 'payments' });
      await Promise.all([refreshPayments(), refreshJourney()]);
      toast.success("You're ready to sell — share your program link.");
    } catch {
      toast.error('Something went wrong — please try again.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div>
      <PageHeader back eyebrow="Get paid" title="Let's get you ready to receive payment.">
        {paymentsDone && <Badge variant="done">Connected</Badge>}
      </PageHeader>

      <JourneyStepper className="mb-5" />

      {!paymentsDone ? (
        <>
          <Card variant="plain" className="mb-4">
            <p className="text-body text-ink">
              Connect your payment account to accept payments from your clients. Payouts go straight to you —
              AbundanceAI never holds your money.
            </p>
          </Card>

          <div className="mb-4"><VideoPlayer poster="" label="Watch the walkthrough" /></div>

          <Button size="lg" loading={connecting} onClick={connect}>Connect Stripe</Button>

          <div className="mt-4 flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-3">
            <ShieldIcon width={20} height={20} className="text-accent" />
            <p className="text-body-sm text-ink-secondary">AbundanceAI never touches your money. It goes straight to your account.</p>
          </div>
        </>
      ) : (
        <>
          <Card variant="plain" className="mb-4 border-l-2 border-l-success bg-success-bg">
            <h2 className="text-h3 font-semibold text-ink">You're ready to sell.</h2>
            <p className="mt-1 text-body-sm text-ink-secondary">
              Set your price, then post the link anywhere — social, your bio, a DM. Anyone who opens it can preview your
              program and enroll.
            </p>
            <div className="mt-4 rounded-md border border-line bg-surface-plain px-4 py-3">
              <PriceEditor priceCents={program.program.price_cents} onSave={savePrice} />
            </div>
            <ShareProgramLink programId={programId} className="mt-4" />
          </Card>

          <div className="space-y-2">
            <Button size="lg" iconLeft={<UsersIcon width={18} height={18} />} onClick={() => navigate('/app/students')}>
              View my students
            </Button>
            <Button size="lg" variant="ghost" iconRight={<ArrowRight width={18} height={18} />} onClick={() => navigate('/app')}>
              Go to dashboard
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isStepComplete, AbundanceApiError } from '@abundance/shared';
import { Button, Card, Badge } from '@/components/ui';
import { ShieldIcon, ArrowRight, UsersIcon, CheckIcon } from '@/components/ui/icons';
import { StepLayout, RailLabel } from '@/components/StepLayout';
import { ShareProgramLink } from '@/components/ShareProgramLink';
import { PriceEditor } from '@/components/PriceEditor';
import { useApp } from '@/store';
import { toast } from '@/store/toast';
import { env } from '@/lib/env';

const NEXT_STEPS: Array<{ title: string; detail: string }> = [
  { title: 'Share your link', detail: 'Post it anywhere your people already are.' },
  { title: 'They enroll & pay', detail: 'Checkout is handled for you, securely.' },
  { title: 'You get paid', detail: 'Payouts land in your connected account.' },
];

// What connecting Stripe actually involves. We use Stripe Connect, so tapping
// "Connect Stripe" hands the user off to Stripe's own hosted onboarding — these
// are the screens they'll walk through there before returning to AbundanceAI.
const STRIPE_STEPS: Array<{ title: string; detail: string }> = [
  {
    title: 'Head to Stripe',
    detail: "Tap Connect Stripe and we'll hand you to Stripe's secure setup. Nothing new to create here - Stripe runs it.",
  },
  {
    title: 'Tell Stripe about you',
    detail: 'Enter your name, email, country, and business type. Most mentors choose “Individual.”',
  },
  {
    title: 'Verify your identity',
    detail: 'Add your date of birth, address, and a government ID or tax number so Stripe can confirm it’s really you.',
  },
  {
    title: 'Add where you get paid',
    detail: 'Connect the bank account or debit card where your payouts should land.',
  },
  {
    title: 'Review and finish',
    detail: 'Submit your details. Stripe brings you back here, verified and ready to accept payments.',
  },
];

// The Stripe onboarding walkthrough, shown in place of the old video.
function StripeSetupGuide() {
  return (
    <Card variant="plain">
      <div className="flex items-center gap-2">
        <ShieldIcon width={18} height={18} className="text-accent" />
        <p className="text-body-sm font-semibold text-ink">What setting up Stripe looks like</p>
      </div>
      <p className="mt-1 text-body-sm text-ink-secondary">
        About 5 minutes, all on Stripe’s secure site. You can pause and pick up where you left off.
      </p>
      <ol className="mt-4 space-y-4">
        {STRIPE_STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-primary/10 font-mono text-caption font-semibold text-primary">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-body-sm font-semibold text-ink">{s.title}</p>
              <p className="mt-0.5 text-body-sm text-ink-secondary">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// The right-rail "what happens next" checklist, shared by both states.
function WhatHappensNext() {
  return (
    <Card variant="plain" className="p-4">
      <RailLabel>What happens next</RailLabel>
      <ol className="space-y-3">
        {NEXT_STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-primary/10 font-mono text-caption font-semibold text-primary">{i + 1}</span>
            <div>
              <p className="text-body-sm font-semibold text-ink">{s.title}</p>
              <p className="text-caption text-ink-secondary">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// [11] Get Paid — connect payments so the user can receive THEIR client payments.
// Tapping "Connect Stripe" hands off to Stripe's hosted Connect onboarding; Stripe
// returns to this page (?stripe=return), where we reconcile the account and mark
// the step done only once the account can actually accept charges + payouts. The
// creator's enrollment revenue then lands straight in their own Stripe account —
// AbundanceAI never touches the money. In mock mode the redirect is simulated.
export function GetPaidPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { backend, program, journey, payments, refreshPayments, refreshJourney, refreshProgram } = useApp();
  const [connecting, setConnecting] = useState(false);
  // Set while we reconcile after returning from Stripe, so the button reflects it.
  const [returning, setReturning] = useState(false);
  // Set while we mint an Express dashboard login link ("Manage on Stripe").
  const [openingDashboard, setOpeningDashboard] = useState(false);

  // Handle the return from Stripe's hosted onboarding. Stripe sends the creator
  // back to ?stripe=return (finished or paused) or ?stripe=refresh (link expired).
  useEffect(() => {
    const flow = searchParams.get('stripe');
    if (!backend || env.useMocks || !flow) return;
    let cancelled = false;

    const clearParam = () => {
      if (cancelled) return;
      searchParams.delete('stripe');
      setSearchParams(searchParams, { replace: true });
    };

    (async () => {
      setReturning(true);
      try {
        if (flow === 'refresh') {
          // The onboarding link expired before completion — mint a fresh one.
          const returnUrl = `${window.location.origin}/app/onboarding/payments?stripe=return`;
          const link = await backend.api.stripeConnect({ return_url: returnUrl });
          if (!cancelled && link.onboarding_url) { window.location.href = link.onboarding_url; return; }
        }
        // Reconcile the account's real charges/payouts status from Stripe.
        const res = await backend.api.stripeConnect({ reconcile: true });
        if (cancelled) return;
        if (res.connected) {
          await backend.api.journeyUpdate({ complete_step: 'payments' });
          await Promise.all([refreshPayments(), refreshJourney()]);
          toast.success("Payments connected — you're ready to sell.");
        } else {
          await refreshPayments();
          toast.info('Almost there — finish your Stripe details to start accepting payments.');
        }
      } catch (err) {
        if (!cancelled) toast.error(err instanceof AbundanceApiError ? err.message : "We couldn't confirm your Stripe setup. Please try again.");
      } finally {
        if (!cancelled) setReturning(false);
        clearParam();
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend]);

  const savePrice = async (cents: number) => {
    if (!backend || !program.program) return;
    try {
      await backend.api.programUpdate({ program_id: program.program.id, price_cents: cents });
      await refreshProgram();
      toast.success('Price updated.');
    } catch {
      toast.error("Couldn't save that price - try again.");
    }
  };

  // Gated too early.
  if (!program.program) {
    return (
      <StepLayout
        back
        eyebrow="Get paid"
        title="Let's get you ready to receive payment."
        main={
          <Card variant="plain" className="text-center">
            <p className="text-body text-ink-secondary">This unlocks once your program's ready - no rush, you're not selling yet.</p>
            <div className="mx-auto mt-4 max-w-xs"><Button onClick={() => navigate('/app/program')}>Build your program</Button></div>
          </Card>
        }
      />
    );
  }

  // "Done" = payments step completed OR the connect flag is set. Keyed off the
  // journey so it survives a reload regardless of the (mocked) Stripe state.
  const paymentsDone = (payments?.connected ?? false) || isStepComplete(journey ?? { completed_steps: [] }, 'payments');
  const programId = program.program.id;

  // Connect Stripe. In mock mode we simulate a completed onboarding. Live, we hand
  // the creator off to Stripe's hosted onboarding and return to ?stripe=return,
  // where the effect above reconciles and marks the step done.
  const connect = async () => {
    if (!backend) return;
    setConnecting(true);
    try {
      if (env.useMocks) {
        try { await backend.api.stripeConnect({ reconcile: true }); } catch { /* best effort */ }
        await backend.api.journeyUpdate({ complete_step: 'payments' });
        await Promise.all([refreshPayments(), refreshJourney()]);
        toast.success("You're ready to sell - share your program link.");
        return;
      }
      const returnUrl = `${window.location.origin}/app/onboarding/payments?stripe=return`;
      const res = await backend.api.stripeConnect({ return_url: returnUrl });
      if (res.onboarding_url) {
        window.location.href = res.onboarding_url; // leaving the app for Stripe
        return;
      }
      // No link needed — the account is already fully onboarded. Mark done.
      if (res.connected) {
        await backend.api.journeyUpdate({ complete_step: 'payments' });
        await Promise.all([refreshPayments(), refreshJourney()]);
        toast.success("You're ready to sell - share your program link.");
      }
    } catch (err) {
      // Surface the mapped server message (e.g. "Payments aren't fully set up
      // yet…") instead of a bland generic, so setup issues are actionable.
      toast.error(err instanceof AbundanceApiError ? err.message : 'Something went wrong - please try again.');
    } finally {
      setConnecting(false);
    }
  };

  // Open the creator's Stripe Express dashboard (payouts, bank details, history).
  // In mock mode there's no real dashboard, so we just inform the user.
  const openDashboard = async () => {
    if (!backend) return;
    setOpeningDashboard(true);
    try {
      const res = await backend.api.stripeConnect({ dashboard: true });
      if (res.dashboard_url && !env.useMocks) {
        window.open(res.dashboard_url, '_blank', 'noopener,noreferrer');
      } else {
        toast.info('Your Stripe dashboard opens here once you connect a live account.');
      }
    } catch (err) {
      toast.error(err instanceof AbundanceApiError ? err.message : "We couldn't open your Stripe dashboard. Please try again.");
    } finally {
      setOpeningDashboard(false);
    }
  };

  return (
    <StepLayout
      back
      eyebrow="Get paid"
      title="Let's get you ready to receive payment."
      subtitle={paymentsDone ? <Badge variant="done">Connected</Badge> : undefined}
      main={
        !paymentsDone ? (
          <>
            <Card variant="plain">
              <p className="text-body text-ink">
                Connect your payment account to accept payments from your clients. Payouts go straight to you -
                AbundanceAI never holds your money.
              </p>
            </Card>

            <StripeSetupGuide />

            <Button size="lg" loading={connecting || returning} onClick={connect}>Connect Stripe</Button>

            <div className="flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-3">
              <ShieldIcon width={20} height={20} className="text-accent" />
              <p className="text-body-sm text-ink-secondary">AbundanceAI never touches your money. It goes straight to your account.</p>
            </div>
          </>
        ) : (
          <>
            <Card variant="plain" className="border-l-2 border-l-success bg-success-bg">
              <h2 className="text-h3 font-semibold text-ink">You're ready to sell.</h2>
              <p className="mt-1 text-body-sm text-ink-secondary">
                Set your price, then post the link anywhere - social, your bio, a DM. Anyone who opens it can preview your
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
              <Button size="lg" variant="secondary" loading={openingDashboard} iconLeft={<ShieldIcon width={18} height={18} />} onClick={openDashboard}>
                Manage on Stripe
              </Button>
              <Button size="lg" variant="ghost" iconRight={<ArrowRight width={18} height={18} />} onClick={() => navigate('/app')}>
                Go to dashboard
              </Button>
            </div>
          </>
        )
      }
      aside={
        <>
          <WhatHappensNext />
          {paymentsDone ? (
            <Card variant="plain" className="border border-success-border bg-success-bg p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-success text-white"><CheckIcon width={14} height={14} /></span>
                <p className="text-body-sm font-semibold text-ink">Payments connected</p>
              </div>
              <p className="mt-2 text-body-sm text-ink-secondary">Your account is verified and ready to receive payouts.</p>
            </Card>
          ) : (
            <Card variant="plain" className="border border-accent/25 bg-accent/5 p-4">
              <div className="flex items-center gap-2">
                <ShieldIcon width={18} height={18} className="text-accent" />
                <p className="text-body-sm font-semibold text-ink">Safe by design</p>
              </div>
              <p className="mt-2 text-body-sm text-ink-secondary">Payouts go straight to your own account - AbundanceAI never holds your money.</p>
            </Card>
          )}
        </>
      }
    />
  );
}

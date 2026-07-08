import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { Category, ProgramPublicResponse, EnrollResponse } from '@abundance/shared';
import { Button, TextInput, Avatar, Sheet, Spinner } from '@/components/ui';
import { Logo } from '@/layouts/PublicLayout';
import { CheckIcon, ShieldIcon, LockIcon, ArrowRight, MailIcon, SparkleIcon } from '@/components/ui/icons';
import { useApp } from '@/store';
import { formatPrice } from '@/lib/money';
import { env } from '@/lib/env';

// [Public] Program landing page (/p/:programId) — the page a creator shares so
// prospective students can preview the program, learn about the guide, and enroll.
// Fully public (no auth): data comes from the program-public Edge Function.

const CREATOR_ROLE: Record<Category, string> = {
  healer: 'Coach & Healer',
  hobbyist: 'Coach & Guide',
  professional: 'Coach & Consultant',
  other: 'Coach & Facilitator',
};

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function firstNameOf(full: string): string {
  return full.trim().split(/\s+/)[0] || full.trim();
}

export function ProgramLandingPage() {
  const { programId } = useParams<{ programId: string }>();
  const backend = useApp((s) => s.backend);
  const [data, setData] = useState<ProgramPublicResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound'>('loading');
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [done, setDone] = useState<{ name: string; res: EnrollResponse } | null>(null);
  // Guard so a view is counted once per program per mount (React 18 double-invokes
  // effects in dev; a shared /p link shouldn't inflate the creator's view count).
  const trackedId = useRef<string | null>(null);

  useEffect(() => {
    if (!backend || !programId) return;
    let active = true;
    setStatus('loading');
    backend.api
      .programPublic({ program_id: programId })
      .then((d) => { if (active) { setData(d); setStatus('ready'); } })
      .catch(() => { if (active) setStatus('notfound'); });
    // Record the visit (non-blocking, best-effort — never affects the page).
    if (trackedId.current !== programId) {
      trackedId.current = programId;
      void backend.api.programViewTrack({ program_id: programId }).catch(() => { /* non-blocking */ });
    }
    return () => { active = false; };
  }, [backend, programId]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-bg text-primary">
        <Spinner size={28} />
      </div>
    );
  }

  if (status === 'notfound' || !data) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-narrow flex-col items-center justify-center gap-3 px-6 text-center">
        <Logo />
        <h1 className="mt-4 text-h2 font-semibold text-ink">This program isn't available</h1>
        <p className="text-body-sm text-ink-secondary">The link may be mistyped, or the program isn't published yet.</p>
      </div>
    );
  }

  if (done) {
    return <ThankYou name={done.name} res={done.res} email={data.creator.email} />;
  }

  return (
    <>
      <Landing data={data} onEnroll={() => setEnrollOpen(true)} />
      <EnrollSheet
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        data={data}
        onEnrolled={(name, res) => { setEnrollOpen(false); setDone({ name, res }); }}
      />
    </>
  );
}

function Landing({ data, onEnroll }: { data: ProgramPublicResponse; onEnroll: () => void }) {
  const { program, modules, creator } = data;
  const price = formatPrice(program.price_cents);
  const subtitle = modules[0]?.outcome
    ? modules[0].outcome
    : `A step-by-step program from ${creator.first_name}, built to move you forward.`;

  return (
    <div className="min-h-[100dvh] bg-bg">
      {/* Header */}
      <header className="border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 lg:px-8 py-4">
          <Logo to="/" />
          <span className="inline-flex items-center gap-1.5 text-caption text-ink-secondary">
            <ShieldIcon width={16} height={16} /> Secure checkout
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[1200px] px-6 lg:px-8 pt-10 lg:pt-14">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="font-mono text-data uppercase tracking-wide text-accent">Live group program</p>
            <h1 className="mt-3 font-serif text-display leading-tight text-ink-deep">{program.title}</h1>
            <p className="mt-4 max-w-md text-body text-ink-secondary">{subtitle}</p>

            <div className="mt-6 flex items-center gap-3">
              <Avatar name={creator.first_name} src={creator.avatar_url} size={44} className="bg-accent/20 text-accent" />
              <p className="text-body-sm text-ink">
                with <span className="font-semibold">{creator.first_name}</span>
              </p>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <span className="font-serif text-display text-primary">{price}</span>
              <div className="w-full max-w-[220px]">
                <Button size="lg" iconRight={<ArrowRight width={20} height={20} />} onClick={onEnroll}>Enroll now</Button>
              </div>
            </div>
          </div>

          {/* Meet your guide — the creator's intro, front and center in the hero. */}
          <div className="relative rounded-xl bg-gradient-to-br from-accent/15 via-primary/10 to-surface p-8">
            <p className="font-mono text-data uppercase tracking-wide text-primary">Meet your guide</p>
            <div className="mt-4 flex items-center gap-5">
              <Avatar name={creator.first_name} src={creator.avatar_url} size={112} className="shadow-md ring-4 ring-surface-plain bg-accent/20 text-accent" />
              <div>
                <h2 className="font-serif text-h2 leading-tight text-ink-deep">{creator.first_name}</h2>
                <p className="text-body-sm text-ink-secondary">{CREATOR_ROLE[creator.category]}</p>
              </div>
            </div>
            {creator.bio?.trim() ? (
              <p className="mt-4 whitespace-pre-line text-body-sm leading-relaxed text-ink-secondary">{creator.bio}</p>
            ) : (
              <p className="mt-4 text-body-sm leading-relaxed text-ink-secondary">
                {creator.first_name} built this program from years of real work with real people — {modules.length} focused
                modules you can start today, unhurried and practical, made for people finally ready to begin.
              </p>
            )}
            <p className="mt-5 inline-flex flex-wrap items-center gap-1.5 text-body-sm text-ink-secondary">
              <MailIcon width={16} height={16} /> Questions before you enroll?{' '}
              <a href={`mailto:${creator.email}`} className="font-medium text-primary hover:underline">{creator.email}</a>
            </p>
          </div>
        </div>
      </section>

      {/* A look inside */}
      <section className="mx-auto max-w-[1200px] px-6 lg:px-8 py-14">
        <p className="font-mono text-data uppercase tracking-wide text-accent">A look inside the program</p>
        <h2 className="mt-2 font-serif text-h1 text-ink-deep">What you'll work through.</h2>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m, i) => (
            <div key={m.idx} className="rounded-lg border border-line bg-surface-plain p-5">
              <span className="font-mono text-data text-accent">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-1 text-h3 font-semibold text-ink">{m.title}</h3>
              {m.outcome && <p className="mt-1.5 text-body-sm text-ink-secondary">{m.outcome}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-[1200px] px-6 lg:px-8 py-16 text-center">
        <h2 className="mx-auto max-w-xl font-serif text-h1 text-ink-deep">Ready when you are.</h2>
        <p className="mx-auto mt-3 max-w-md text-body text-ink-secondary">
          Join now while there's still room. If it's not for you, the 90-day guarantee has you covered.
        </p>
        <div className="mx-auto mt-6 max-w-[280px]">
          <Button size="lg" iconRight={<ArrowRight width={20} height={20} />} onClick={onEnroll}>Enroll for {price}</Button>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-2 px-6 lg:px-8 py-6 text-caption text-ink-secondary sm:flex-row">
          <span className="inline-flex items-center gap-1.5"><SparkleIcon width={14} height={14} className="text-accent" /> Powered by AbundanceAI</span>
          <span>Secure checkout · Your details are shared only with {creator.first_name}</span>
        </div>
      </footer>
    </div>
  );
}

function EnrollSheet({
  open, onClose, data, onEnrolled,
}: {
  open: boolean;
  onClose: () => void;
  data: ProgramPublicResponse;
  onEnrolled: (name: string, res: EnrollResponse) => void;
}) {
  const backend = useApp((s) => s.backend);
  const [stage, setStage] = useState<'form' | 'pay'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; contact?: string }>({});
  const [preparing, setPreparing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);

  const useStripeFlow = !env.useMocks && !!env.stripePublishableKey;
  const price = formatPrice(data.program.price_cents);

  // Return to the contact step, dropping any half-created payment session.
  const backToForm = () => { setStage('form'); setClientSecret(null); setStripePromise(null); setFailed(null); };
  const close = () => { backToForm(); onClose(); };

  // Step 1 → 2: validate contact info, then create the PaymentIntent.
  const toPayment = async () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Your name, please.';
    if (!EMAIL_RE.test(email)) next.email = 'Enter a valid email.';
    if (!contact.trim()) next.contact = 'A contact number lets your host reach you.';
    setErrors(next);
    if (Object.keys(next).length || !backend) return;

    setPreparing(true);
    setFailed(null);
    try {
      const session = await backend.api.enrollSession({
        program_id: data.program.id, name: name.trim(), email: email.trim(), contact: contact.trim(),
      });
      if (useStripeFlow && session.client_secret) {
        setStripePromise(loadStripe(session.publishable_key || env.stripePublishableKey));
        setClientSecret(session.client_secret);
      }
      setStage('pay');
    } catch {
      setFailed("We couldn't start checkout. Please try again.");
    } finally {
      setPreparing(false);
    }
  };

  // Payment succeeded → record the enrollment, then show the thank-you page.
  const recordEnrollment = async (paymentIntentId: string) => {
    if (!backend) return;
    setRecording(true);
    setFailed(null);
    try {
      const res = await backend.api.enroll({
        program_id: data.program.id, name: name.trim(), email: email.trim(), contact: contact.trim(),
        payment_intent_id: paymentIntentId,
      });
      onEnrolled(name.trim(), res);
    } catch {
      setFailed('Your payment went through, but we hit a snag confirming your spot. Please reach out to your host.');
      setRecording(false);
    }
  };

  const stripeReady = useStripeFlow && clientSecret && stripePromise;

  return (
    <Sheet
      open={open}
      onClose={close}
      title={data.program.title}
      footer={
        stage === 'form' ? (
          <>
            <Button size="lg" loading={preparing} iconRight={<ArrowRight width={18} height={18} />} onClick={toPayment}>
              Continue to payment
            </Button>
            <Button size="lg" variant="ghost" onClick={close}>Cancel</Button>
          </>
        ) : (
          <Button size="lg" variant="ghost" onClick={backToForm}>Back</Button>
        )
      }
    >
      {stage === 'form' ? (
        <>
          <p className="text-caption font-medium uppercase tracking-wide text-accent">Complete your enrollment</p>
          <p className="mt-1 text-body-sm text-ink-secondary">
            with {data.creator.first_name} · {price} one-time · 90-day guarantee
          </p>
          <div className="mt-4 space-y-3">
            <TextInput label="Full name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required />
            <TextInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
            <TextInput label="Contact number" value={contact} onChange={(e) => setContact(e.target.value)} error={errors.contact} required />
          </div>
          {failed && <p className="mt-3 text-caption text-error">{failed}</p>}
          <p className="mt-3 text-caption text-ink-secondary">
            We share these only with {data.creator.first_name} so they can welcome you and send your session links.
          </p>
        </>
      ) : (
        <>
          <p className="text-caption font-medium uppercase tracking-wide text-accent">Payment</p>
          <p className="mt-1 text-body-sm text-ink-secondary">{price} · {data.program.title}</p>
          <div className="mt-4">
            {stripeReady ? (
              <Elements stripe={stripePromise!} options={{ clientSecret: clientSecret!, appearance: { theme: 'flat' } }}>
                <StripePay amountLabel={price} busy={recording} onPaid={recordEnrollment} />
              </Elements>
            ) : (
              <MockPay amountLabel={price} busy={recording} onPaid={recordEnrollment} />
            )}
          </div>
          {failed && <p className="mt-3 text-caption text-error">{failed}</p>}
          <p className="mt-3 inline-flex items-center gap-1.5 text-caption text-ink-secondary">
            <ShieldIcon width={14} height={14} className="text-success" /> 90-day money-back guarantee
          </p>
        </>
      )}
    </Sheet>
  );
}

// Real Stripe card fields + Pay button (inside <Elements>).
function StripePay({ amountLabel, busy, onPaid }: { amountLabel: string; busy: boolean; onPaid: (piId: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    const { error: err, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
    if (err) {
      setError("That card didn't go through. Try another — you won't be charged twice.");
      setLoading(false);
      return;
    }
    if (paymentIntent?.status === 'succeeded') {
      onPaid(paymentIntent.id);
    } else {
      setError('Payment is still processing. Hang tight a moment and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement onChange={(e) => setComplete(e.complete)} />
      {error && <p className="text-caption text-error">{error}</p>}
      <Button size="lg" loading={loading || busy} disabled={!complete} onClick={pay} iconLeft={<LockIcon width={18} height={18} />}>
        {loading || busy ? 'Processing…' : `Pay ${amountLabel}`}
      </Button>
    </div>
  );
}

// Demo pay form (no Stripe configured) — simulates a successful charge.
function MockPay({ amountLabel, busy, onPaid }: { amountLabel: string; busy: boolean; onPaid: (piId: string) => void }) {
  const [loading, setLoading] = useState(false);
  const fieldBase = 'w-full rounded-md border border-line bg-surface-plain px-4 text-body text-ink placeholder:text-ink-secondary/60';
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border border-line">
        <input className={`${fieldBase} h-12 rounded-none border-0`} placeholder="1234 1234 1234 1234" disabled />
        <div className="grid grid-cols-2 border-t border-line">
          <input className={`${fieldBase} h-12 rounded-none border-0 border-r`} placeholder="MM / YY" disabled />
          <input className={`${fieldBase} h-12 rounded-none border-0`} placeholder="CVC" disabled />
        </div>
      </div>
      <p className="text-caption text-ink-secondary">Demo mode — live Stripe card fields render here in production.</p>
      <Button
        size="lg"
        loading={loading || busy}
        iconLeft={<LockIcon width={18} height={18} />}
        onClick={() => { setLoading(true); setTimeout(() => onPaid(`pi_mock_${Date.now()}`), 700); }}
      >
        {loading || busy ? 'Processing…' : `Pay ${amountLabel}`}
      </Button>
    </div>
  );
}

function ThankYou({ name, res, email }: { name: string; res: EnrollResponse; email: string }) {
  return (
    <div className="min-h-[100dvh] bg-bg">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 lg:px-8 py-4">
          <Logo to="/" />
          <span className="inline-flex items-center gap-1.5 text-caption text-ink-secondary">
            <ShieldIcon width={16} height={16} /> Secure checkout
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-narrow px-6 lg:px-8 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-pill bg-success text-white">
          <CheckIcon width={30} height={30} />
        </div>
        <p className="mt-6 font-mono text-data uppercase tracking-wide text-success">You're in</p>
        <h1 className="mt-2 font-serif text-display text-ink-deep">Welcome, {firstNameOf(name)}.</h1>
        <p className="mx-auto mt-3 max-w-md text-body text-ink-secondary">
          Your spot in <span className="font-semibold text-ink">{res.program_title}</span> is confirmed. A receipt is on its way.
        </p>

        <div className="mx-auto mt-8 max-w-md rounded-xl border border-line bg-surface-plain p-6 text-left shadow-lg">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <p className="text-body font-semibold text-ink">{res.program_title}</p>
              <p className="text-caption text-ink-secondary">with {res.creator_first_name}</p>
            </div>
            <span className="font-serif text-h2 text-ink-deep">{formatPrice(res.amount_cents)}</span>
          </div>
          <p className="mt-4 font-mono text-data uppercase tracking-wide text-ink-secondary">What happens next</p>
          <ol className="mt-3 space-y-3">
            {[
              'A confirmation & receipt land in your email within a few minutes.',
              `${res.creator_first_name} reaches out to welcome you and share how to get started.`,
              'Keep an eye on your inbox for your first session details.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-body-sm text-ink">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-primary/10 font-mono text-caption text-primary">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-6 text-caption text-ink-secondary">
          Questions in the meantime? <a href={`mailto:${email}`} className="font-medium text-primary hover:underline">{email}</a>
        </p>
      </div>
    </div>
  );
}

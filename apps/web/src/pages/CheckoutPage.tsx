import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button, TextInput, Eyebrow, Avatar } from '@/components/ui';
import { ShieldIcon, ArrowLeft, CheckIcon, LockIcon } from '@/components/ui/icons';
import { useApp } from '@/store';
import { env } from '@/lib/env';
import { LegalLink } from '@/components/LegalLink';
import { PaymentResultOverlay, type PayResult } from '@/components/PaymentResultOverlay';

// [02] Checkout — $25 via Stripe, two-column layout: a value panel (what you get
// + guarantee + proof) beside the payment form. The checkout session is created
// up front so email and card fields live on one screen. The Pay button locks on
// submit (no double-charge). On a real Stripe success (or mock success) → /welcome.

const INCLUDED = [
  'Your program, sessions, and marketing copy',
  'Mindset coaching and peer community support',
  'Guidance to launch and invite participants',
  '90-day money-back guarantee',
];

function ValuePanel() {
  return (
    <aside className="relative hidden flex-col justify-between gap-8 bg-lp-teal p-8 text-white md:flex lg:p-10">
      <div>
        <Eyebrow className="text-white/80">One step away</Eyebrow>
        <h1 className="mt-3 font-serif text-h1 leading-tight text-white lg:text-display">
          You're one step from your program.
        </h1>

        <div className="mt-8 flex items-baseline justify-between border-b border-white/20 pb-5">
          <div>
            <p className="text-h3 font-semibold text-white">Your introductory price</p>
            <p className="text-body-sm text-white/80">
              6 months of full access. Then $88/year.
            </p>
          </div>
          <span className="font-serif text-display text-white">$25</span>
        </div>

        <p className="mt-5 text-body-sm font-semibold text-white">Included:</p>

        <ul className="mt-3 space-y-3">
          {INCLUDED.map((i) => (
            <li key={i} className="flex items-start gap-3 text-body-sm text-white/90">
              <CheckIcon width={18} height={18} className="mt-0.5 shrink-0 text-white" />
              {i}
            </li>
          ))}
        </ul>

        <p className="mt-6 text-body-sm text-white/90">
          Your program starts here. Let&rsquo;s bring it to life.
        </p>
      </div>

      <figure className="border-t border-white/20 pt-6">
        <blockquote className="font-serif text-body italic text-white">
          “I'd been ‘going to' do this for five years. I had a program by Sunday night.”
        </blockquote>
        <figcaption className="mt-3 flex items-center gap-2.5">
          <Avatar name="Maya R." size={32} className="bg-white/15 text-white" />
          <span className="text-body-sm text-white">
            <span className="font-semibold">Maya R.</span>
            <span className="text-white/80"> · Breathwork coach</span>
          </span>
        </figcaption>
      </figure>
    </aside>
  );
}

// Compact summary shown on top on mobile, where the value panel is hidden.
function MobileSummary() {
  return (
    <div className="border-b border-line px-6 py-5 md:hidden">
      <div className="flex items-baseline justify-between">
        <p className="text-h3 font-semibold text-ink">AbundanceAI</p>
        <span className="font-serif text-h1 text-primary">$25</span>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-md border border-success-border bg-success-bg px-3 py-2">
        <ShieldIcon width={18} height={18} className="shrink-0 text-success" />
        <p className="text-caption font-medium text-success">90-day money-back guarantee.</p>
      </div>
    </div>
  );
}

function TrustRow() {
  return (
    <p className="mt-5 text-center font-mono text-data text-ink-secondary">
      🔒 Powered by Stripe · charged $25 today · 90-day full refund
    </p>
  );
}

// Real Stripe payment fields + Pay button (inside <Elements>).
function StripeForm({ paymentIntentId, onPaid }: { paymentIntentId: string; onPaid: (piId: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    const { error: err, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (err) {
      setError("That card didn't go through. Try another - you won't be charged twice.");
      setLoading(false);
      return;
    }
    if (paymentIntent?.status === 'succeeded') {
      onPaid(paymentIntent.id || paymentIntentId);
    } else {
      setError('Payment is still processing. Hang tight a moment and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-body-sm font-medium text-ink">Card information</p>
        <PaymentElement onChange={(e) => setComplete(e.complete)} />
      </div>
      {error && <p className="text-caption text-error">{error}</p>}
      <Button variant="orange" size="lg" loading={loading} disabled={!complete} onClick={pay} iconLeft={<LockIcon width={18} height={18} />}>
        {loading ? 'Processing…' : 'Pay $25'}
      </Button>
    </div>
  );
}

// Mock card fields (no Stripe configured) — simulates a successful charge.
function MockForm({ onPaid }: { onPaid: (piId: string) => void }) {
  const [loading, setLoading] = useState(false);
  const fieldBase =
    'w-full rounded-md border border-line bg-surface-plain px-4 text-body text-ink placeholder:text-ink-secondary/60';
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-body-sm font-medium text-ink">Card information</p>
        <div className="overflow-hidden rounded-md border border-line">
          <input className={`${fieldBase} h-12 rounded-none border-0`} placeholder="1234 1234 1234 1234" disabled />
          <div className="grid grid-cols-2 border-t border-line">
            <input className={`${fieldBase} h-12 rounded-none border-0 border-r`} placeholder="MM / YY" disabled />
            <input className={`${fieldBase} h-12 rounded-none border-0`} placeholder="CVC" disabled />
          </div>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-body-sm font-medium text-ink">Name on card</p>
        <input className={`${fieldBase} h-12`} placeholder="Full name" disabled />
      </div>
      <p className="text-caption text-ink-secondary">Demo mode - live Stripe card fields render here in production.</p>
      <Button
        variant="orange"
        size="lg"
        loading={loading}
        iconLeft={<LockIcon width={18} height={18} />}
        onClick={() => { setLoading(true); setTimeout(() => onPaid(`pi_mock_${Date.now()}`), 700); }}
      >
        {loading ? 'Processing…' : 'Pay $25'}
      </Button>
    </div>
  );
}

// Placeholder while the Stripe checkout session is being created.
function PaymentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-12 animate-pulse rounded-md bg-surface" />
        <div className="h-12 animate-pulse rounded-md bg-surface" />
      </div>
      <div className="h-[52px] animate-pulse rounded-md bg-surface" />
    </div>
  );
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function CheckoutPage() {
  const navigate = useNavigate();
  const backend = useApp((s) => s.backend);
  const refreshProfile = useApp((s) => s.refreshProfile);
  const userEmail = useApp((s) => s.user?.email);
  // Prefill from the auth step (signed-in user, or the email entered at /auth).
  const [email, setEmail] = useState(() => userEmail ?? sessionStorage.getItem('abundance_pending_email') ?? '');
  const [emailErr, setEmailErr] = useState<string>();
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [clientSecret, setClientSecret] = useState<string>();
  const [piId, setPiId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [initing, setIniting] = useState(false);
  // Post-payment feedback overlay (null = still on the form).
  const [result, setResult] = useState<PayResult | null>(null);
  const startedRef = useRef(false);

  const useStripeFlow = !env.useMocks && !!env.stripePublishableKey;

  // The signed-in user's email may resolve after mount — adopt it if we have none yet.
  useEffect(() => {
    if (userEmail) setEmail((cur) => cur || userEmail);
  }, [userEmail]);

  // Create the checkout session once we have a backend + a valid email, so the
  // card fields render alongside the email. Runs at most once (startedRef guard).
  const beginPayment = useCallback(async (forEmail: string) => {
    if (startedRef.current || !backend || !EMAIL_RE.test(forEmail)) return;
    startedRef.current = true;
    setIniting(true);
    setError(null);
    try {
      const res = await backend.api.checkoutSession({ email: forEmail, is_related_party: false });
      setPiId(res.payment_intent_id);
      if (useStripeFlow && res.client_secret) {
        setStripePromise(loadStripe(res.publishable_key || env.stripePublishableKey));
        setClientSecret(res.client_secret);
      }
    } catch {
      // Mock backend or unconfigured Stripe — fall through to the mock form.
    } finally {
      setIniting(false);
    }
  }, [backend, useStripeFlow]);

  useEffect(() => {
    if (EMAIL_RE.test(email)) void beginPayment(email);
  }, [email, beginPayment]);

  // Payment succeeded on Stripe's side: confirm server-side (marks the order paid
  // → stamps profiles.paid_at) and refresh the profile, showing a "confirming"
  // then "success" overlay so the buyer gets clear feedback before entering the
  // app. A verify hiccup after a real charge falls through to 'success' (the money
  // moved; the /app guard re-checks paid_at). Only an explicit unpaid result → 'error'.
  const onPaid = useCallback(async (paymentIntentId: string) => {
    setResult('confirming');
    try {
      if (backend && !env.useMocks) {
        const res = await backend.api.verifyPayment({ payment_intent_id: paymentIntentId });
        if (!res.paid) { setResult('error'); return; }
      }
      await refreshProfile();
      setResult('success');
    } catch {
      setResult('success');
    }
  }, [backend, refreshProfile]);

  const continueToApp = useCallback(() => navigate('/app', { replace: true }), [navigate]);

  // On success, briefly hold the confirmation, then proceed automatically (the
  // Continue button lets the user skip the wait).
  useEffect(() => {
    if (result !== 'success') return;
    const t = window.setTimeout(() => navigate('/app', { replace: true }), 3500);
    return () => window.clearTimeout(t);
  }, [result, navigate]);

  const started = startedRef.current;
  const emailValid = EMAIL_RE.test(email);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg px-0 py-0 sm:px-5 sm:py-8">
      {result && (
        <PaymentResultOverlay
          state={result}
          success={{
            body: "You're all set — let's build your program.",
            onContinue: continueToApp,
            autoNote: 'Taking you there automatically…',
          }}
          error={{
            title: "We're still confirming your payment",
            body: "If you were charged, your spot is safe — this can take a moment. Continue to your account, or reach out and we'll help.",
            primary: { label: 'Go to my account', onClick: continueToApp },
            secondary: { label: 'Back to checkout', onClick: () => setResult(null) },
          }}
        />
      )}
      <div className="grid w-full max-w-[960px] grid-cols-1 overflow-hidden bg-surface-plain shadow-lg sm:rounded-xl md:grid-cols-2">
        <ValuePanel />

        <section className="flex flex-col">
          <MobileSummary />
          <div className="flex flex-1 flex-col p-6 sm:p-8 lg:p-10">
            <button
              onClick={() => navigate('/')}
              className="mb-6 inline-flex items-center gap-1 self-start text-body-sm text-ink-secondary hover:text-ink"
            >
              <ArrowLeft width={18} height={18} /> Back
            </button>

            <h2 className="text-h1 font-bold text-ink-deep">Complete your purchase</h2>
            <p className="mt-1 text-body-sm text-ink-secondary">Pay once. Start building in minutes.</p>

            <div className="mt-6 space-y-4">
              <TextInput
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailErr(emailValid || !email ? undefined : 'Enter a valid email.')}
                error={emailErr}
                helperText="We'll send your receipt here and use it to set up your account."
                required
              />

              {error && <p className="text-caption text-error">{error}</p>}

              {!emailValid ? (
                <Button variant="orange" size="lg" disabled iconLeft={<LockIcon width={18} height={18} />}>Pay $25</Button>
              ) : useStripeFlow && clientSecret && stripePromise ? (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'flat' } }}>
                  <StripeForm paymentIntentId={piId} onPaid={onPaid} />
                </Elements>
              ) : initing || (useStripeFlow && started && !clientSecret) ? (
                <PaymentSkeleton />
              ) : (
                <MockForm onPaid={onPaid} />
              )}
            </div>

            {/* Consent — the payment action is the agreement; no checkbox needed. */}
            <p className="mt-4 text-caption leading-relaxed text-ink-secondary">
              By paying, you agree to our <LegalLink doc="terms">Terms of Service</LegalLink>,{' '}
              <LegalLink doc="refunds">Refund &amp; Cancellation Policy</LegalLink>, and{' '}
              <LegalLink doc="privacy">Privacy Policy</LegalLink>. Access is delivered per our{' '}
              <LegalLink doc="delivery">Delivery Policy</LegalLink>.
            </p>

            <TrustRow />
          </div>
        </section>
      </div>
    </div>
  );
}

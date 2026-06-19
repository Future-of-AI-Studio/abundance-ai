import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button, Card, TextInput, Eyebrow } from '@/components/ui';
import { ShieldIcon, ArrowLeft } from '@/components/ui/icons';
import { useApp } from '@/store';
import { env } from '@/lib/env';

// [02] Checkout — $25 via Stripe with the 90-day guarantee front and centre.
// No tab bar. The button locks on submit (no double-charge). On confirmation →
// /welcome (only on real Stripe success, or mock success).

const INCLUDED = [
  'Your program, built for you by AI',
  'Marketing posts written and ready',
  'Mindset coaching + a peer circle',
];

function OrderSummary() {
  return (
    <Card variant="plain">
      <div className="flex items-baseline justify-between">
        <span className="text-h3 font-semibold text-ink">AbundanceAI</span>
        <span className="text-h2 font-bold text-primary">$25</span>
      </div>
      <ul className="mt-4 space-y-2">
        {INCLUDED.map((i) => (
          <li key={i} className="flex items-start gap-2 text-body-sm text-ink-secondary">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" />{i}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function GuaranteeBadge() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-success-border bg-success-bg px-4 py-3">
      <ShieldIcon width={22} height={22} className="text-success" />
      <p className="text-body-sm font-medium text-success">90-day money-back guarantee. No hard feelings.</p>
    </div>
  );
}

function TrustRow() {
  return (
    <p className="mt-4 text-center font-mono text-data text-ink-secondary">🔒 Secured by Stripe · 90-day refund</p>
  );
}

function proceed(navigate: ReturnType<typeof useNavigate>, email: string, paymentIntentId: string) {
  // Post-payment token for the /welcome gate.
  sessionStorage.setItem('abundance_pay_token', JSON.stringify({ email, payment_intent_id: paymentIntentId }));
  navigate('/welcome');
}

// Real Stripe form.
function StripeForm({ email, paymentIntentId }: { email: string; paymentIntentId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
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
      setError("That card didn't go through. Try another — you won't be charged twice.");
      setLoading(false);
      return;
    }
    if (paymentIntent?.status === 'succeeded') {
      proceed(navigate, email, paymentIntent.id || paymentIntentId);
    } else {
      setError('Payment is still processing. Hang tight a moment and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement onChange={(e) => setComplete(e.complete)} />
      {error && <p className="text-caption text-error">{error}</p>}
      <Button size="lg" loading={loading} disabled={!complete} onClick={pay}>
        {loading ? 'Processing…' : 'Pay $25'}
      </Button>
    </div>
  );
}

// Mock form (no Stripe configured) — simulates a successful charge.
function MockForm({ email }: { email: string }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-dashed border-line-strong bg-surface px-4 py-6 text-center text-body-sm text-ink-secondary">
        Demo mode — Stripe Payment Element renders here in production.
      </div>
      <Button
        size="lg"
        loading={loading}
        onClick={() => { setLoading(true); setTimeout(() => proceed(navigate, email, `pi_mock_${Date.now()}`), 700); }}
      >
        {loading ? 'Processing…' : 'Pay $25'}
      </Button>
    </div>
  );
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const backend = useApp((s) => s.backend);
  const userEmail = useApp((s) => s.user?.email);
  // Prefill from the auth step (signed-in user, or the email entered at /auth).
  const [email, setEmail] = useState(() => userEmail ?? sessionStorage.getItem('abundance_pending_email') ?? '');
  const [emailErr, setEmailErr] = useState<string>();
  const [started, setStarted] = useState(false);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [clientSecret, setClientSecret] = useState<string>();
  const [piId, setPiId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // The signed-in user's email may resolve after mount — adopt it if we have none yet.
  useEffect(() => {
    if (userEmail) setEmail((cur) => cur || userEmail);
  }, [userEmail]);

  const useStripeFlow = !env.useMocks && !!env.stripePublishableKey;

  const beginPayment = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) { setEmailErr('Enter a valid email.'); return; }
    setEmailErr(undefined);
    setError(null);
    if (!backend) return;
    try {
      const res = await backend.api.checkoutSession({ email, is_related_party: false });
      setPiId(res.payment_intent_id);
      if (useStripeFlow && res.client_secret) {
        setStripePromise(loadStripe(res.publishable_key || env.stripePublishableKey));
        setClientSecret(res.client_secret);
      }
      setStarted(true);
    } catch {
      // Mock backend or unconfigured Stripe — fall through to mock form.
      setStarted(true);
    }
  };

  return (
    <div className="mx-auto min-h-[100dvh] max-w-narrow px-5 py-6">
      <button onClick={() => navigate('/')} className="mb-4 inline-flex items-center gap-1 text-body-sm text-ink-secondary hover:text-ink">
        <ArrowLeft width={18} height={18} /> Back
      </button>

      <Eyebrow className="mb-2">Checkout</Eyebrow>
      <div className="space-y-4">
        <OrderSummary />
        <GuaranteeBadge />

        {!started ? (
          <Card variant="plain" className="space-y-4">
            <TextInput
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailErr}
              helperText="We'll send your receipt here and use it to set up your account."
              required
            />
            {error && <p className="text-caption text-error">{error}</p>}
            <Button size="lg" onClick={beginPayment}>Continue to payment</Button>
          </Card>
        ) : (
          <Card variant="plain">
            {useStripeFlow && clientSecret && stripePromise ? (
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'flat' } }}>
                <StripeForm email={email} paymentIntentId={piId} />
              </Elements>
            ) : (
              <MockForm email={email} />
            )}
          </Card>
        )}

        <TrustRow />
      </div>
    </div>
  );
}

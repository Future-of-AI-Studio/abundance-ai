import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { Category, ProgramPublicResponse, EnrollResponse } from '@abundance/shared';
import { Button, TextInput, Avatar, Sheet, Spinner } from '@/components/ui';
import { Logo } from '@/layouts/PublicLayout';
import { CheckIcon, ShieldIcon, LockIcon, ArrowRight, MailIcon, SparkleIcon, InstagramIcon, LinkedInIcon, GlobeIcon } from '@/components/ui/icons';
import { useApp } from '@/store';
import { priceLabel } from '@/lib/money';
import { freeOfferOpen, tryFreeLabel } from '@/lib/freeOffer';
import { env } from '@/lib/env';
import { resolveLanding, landingBackground, landingRadii, externalHref, heroGradient } from '@/lib/landingTheme';

// [Public] Program landing page (/p/:programId) — the page a creator shares so
// prospective students can preview the program, learn about the guide, and enroll.
// Fully public (no auth): data comes from the program-public Edge Function.

// Currently unused (the role line under the guide's name is commented out) but
// kept exported so it can be restored without rebuilding the mapping.
export const CREATOR_ROLE: Record<Category, string> = {
  healer: 'Coach & Expert',
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
    return <ThankYou name={done.name} res={done.res} email={data.creator.email} landing={data.creator.landing_page} />;
  }

  return (
    <>
      <LandingView data={data} onEnroll={() => setEnrollOpen(true)} />
      <EnrollSheet
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        data={data}
        onEnrolled={(name, res) => { setEnrollOpen(false); setDone({ name, res }); }}
      />
    </>
  );
}

// The themed page body. Exported so the Landing Studio (/app/landing) can render
// a live preview of the exact same markup with draft settings injected.
// Palette colors are inline styles (runtime values); layout stays Tailwind.
export function LandingView({ data, onEnroll }: { data: ProgramPublicResponse; onEnroll: () => void }) {
  const { program, modules, creator } = data;
  const { settings, palette: t } = resolveLanding(creator.landing_page);
  const headingFont = settings.heading_font === 'sans' ? 'font-sans' : 'font-serif';
  const radii = landingRadii(settings.corners);
  const eyebrow = settings.eyebrow?.trim() || 'Live group program';
  const ctaLabel = settings.cta_label?.trim() || 'Enroll now';
  const guideHeading = settings.guide_heading?.trim() || 'Meet your guide';
  const insideEyebrow = settings.inside_eyebrow?.trim() || 'A look inside the program';
  const insideHeading = settings.inside_heading?.trim() || "What you will experience";
  const closingHeading = settings.closing_heading?.trim() || 'Join us now.';
  const price = priceLabel(program.price_cents);
  // A time-limited "join free" offer on a paid program — advertised beside the
  // price so visitors know the free option exists before they open the sheet.
  const freeOpen = freeOfferOpen(program) && program.price_cents > 0;
  const subtitle = settings.tagline?.trim()
    || modules[0]?.outcome
    || `A step-by-step program from ${creator.first_name}, built to move you forward.`;
  const btnStyle = { backgroundColor: t.primary, color: t.onPrimary, borderRadius: radii.button };
  const included = settings.included.map((s) => s.trim()).filter(Boolean);
  const socials = [
    { label: 'Instagram', value: settings.social_instagram, Icon: InstagramIcon },
    { label: 'LinkedIn', value: settings.social_linkedin, Icon: LinkedInIcon },
    { label: 'Website', value: settings.social_website, Icon: GlobeIcon },
  ].filter((s): s is typeof s & { value: string } => !!s.value?.trim());

  return (
    <div className="min-h-[100dvh]" style={{ background: landingBackground(t, settings.background), color: t.ink }}>
      {/* Header — logo drawn inline (not <Logo/>) so it recolors with the theme. */}
      <header className="border-b" style={{ borderColor: t.line }}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 lg:px-8 py-4">
          <Link to="/" className="inline-flex items-center gap-2 font-semibold" style={{ color: t.ink }}>
            <span className="flex h-7 w-7 items-center justify-center rounded-pill" style={btnStyle}>
              <span className="font-mono text-data">A</span>
            </span>
            <span className="text-h3">AbundanceAI</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 text-caption" style={{ color: t.inkSoft }}>
            <ShieldIcon width={16} height={16} /> Secure checkout
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[1200px] px-6 lg:px-8 pt-10 lg:pt-14">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="font-mono text-data uppercase tracking-wide" style={{ color: t.accent }}>{eyebrow}</p>
            <h1 className={`mt-3 text-display leading-tight ${headingFont}`} style={{ color: t.inkDeep }}>{program.title}</h1>
            <p className="mt-4 max-w-md text-body" style={{ color: t.inkSoft }}>{subtitle}</p>

            <div className="mt-6 flex items-center gap-3">
              <Avatar name={creator.first_name} src={creator.avatar_url} size={44} className="bg-accent/20 text-accent" />
              <p className="text-body-sm" style={{ color: t.ink }}>
                with <span className="font-semibold">{creator.first_name}</span>
              </p>
            </div>

            {freeOpen && (
              <div className="mt-5">
                <span
                  className="inline-flex items-center rounded-pill px-3 py-1 text-caption font-semibold uppercase tracking-wide"
                  style={{ backgroundColor: `${t.accent}1A`, color: t.accent }}
                >
                  {tryFreeLabel(program.free_offer_until)}
                </span>
              </div>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <span className={`text-display ${headingFont}`} style={{ color: t.primary }}>{price}</span>
              <div className="w-full max-w-[220px]">
                <Button size="lg" style={btnStyle} iconRight={<ArrowRight width={20} height={20} />} onClick={onEnroll}>{ctaLabel}</Button>
              </div>
            </div>

            {/* What's included — the creator's own bullets (hidden when empty). */}
            {included.length > 0 && (
              <div className="mt-7">
                <p className="font-mono text-data uppercase tracking-wide" style={{ color: t.accent }}>What's included</p>
                <ul className="mt-3 space-y-2">
                  {included.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-body-sm" style={{ color: t.ink }}>
                      <CheckIcon width={16} height={16} className="mt-0.5 shrink-0" style={{ color: t.accent }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Meet your guide — the creator's intro, front and center in the hero.
              Card tokens: schemes like Royal Blue put a light card on a dark page. */}
          <div
            className="relative rounded-xl p-8"
            style={{ background: heroGradient(t), borderRadius: radii.card }}
          >
            <p className="font-mono text-data uppercase tracking-wide" style={{ color: t.cardAccent }}>{guideHeading}</p>
            <div className="mt-4 flex items-center gap-5">
              <Avatar name={creator.first_name} src={creator.avatar_url} size={112} className="shadow-md bg-accent/20 text-accent" />
              <div>
                <h2 className={`text-h2 leading-tight ${headingFont}`} style={{ color: t.cardInk }}>{creator.first_name}</h2>
                {/* <p className="text-body-sm" style={{ color: t.cardInkSoft }}>{CREATOR_ROLE[creator.category]}</p> */}
              </div>
            </div>
            {creator.bio?.trim() ? (
              <p className="mt-4 whitespace-pre-line text-body-sm leading-relaxed" style={{ color: t.cardInkSoft }}>{creator.bio}</p>
            ) : (
              <p className="mt-4 text-body-sm leading-relaxed" style={{ color: t.cardInkSoft }}>
                {creator.first_name} built this program from years of real work with real people - {modules.length} focused
                modules you can start today, unhurried and practical, made for people finally ready to begin.
              </p>
            )}
            <p className="mt-5 inline-flex flex-wrap items-center gap-1.5 text-body-sm" style={{ color: t.cardInkSoft }}>
              <MailIcon width={16} height={16} /> {' '}
              <a href={`mailto:${creator.email}`} className="font-medium hover:underline" style={{ color: t.cardAccent }}>{creator.email}</a>
            </p>
            {/* Social links — only the ones the creator filled in. */}
            {socials.length > 0 && (
              <p className="mt-3 flex items-center gap-3">
                {socials.map(({ label, value, Icon }) => (
                  <a
                    key={label}
                    href={externalHref(value)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="transition-opacity hover:opacity-70"
                    style={{ color: t.cardAccent }}
                  >
                    <Icon width={18} height={18} />
                  </a>
                ))}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* A look inside */}
      <section className="mx-auto max-w-[1200px] px-6 lg:px-8 pt-14 pb-6">
        <p className="font-mono text-data uppercase tracking-wide" style={{ color: t.accent }}>{insideEyebrow}</p>
        <h2 className={`mt-2 text-h1 ${headingFont}`} style={{ color: t.inkDeep }}>{insideHeading}</h2>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <div key={m.idx} className="rounded-lg border p-5" style={{ backgroundColor: t.surface, borderColor: t.line, borderRadius: radii.card }}>
              {/* <span className="font-mono text-data" style={{ color: t.cardAccent }}>{String(i + 1).padStart(2, '0')}</span> */}
              <h3 className="mt-1 text-h3 font-semibold" style={{ color: t.cardInk }}>{m.title}</h3>
              {(m.description || m.outcome) && <p className="mt-1.5 text-body-sm" style={{ color: t.cardInkSoft }}>{m.description || m.outcome}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-[1200px] px-6 lg:px-8 pt-6 pb-16 text-center">
        <h2 className={`mx-auto max-w-xl text-h1 ${headingFont}`} style={{ color: t.inkDeep }}>{closingHeading}</h2>
        <div className="mx-auto mt-6 max-w-[280px]">
          <Button size="lg" style={btnStyle} iconRight={<ArrowRight width={20} height={20} />} onClick={onEnroll}>{ctaLabel} · {price}</Button>
        </div>
      </section>

      <footer className="border-t" style={{ borderColor: t.line }}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-center px-6 lg:px-8 py-6 text-body" style={{ color: t.inkSoft }}>
          <span className="inline-flex items-center gap-2"><SparkleIcon width={18} height={18} style={{ color: t.accent }} /> Powered by AbundanceAI</span>
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
  // Which action is mid-flight, so the right button shows its spinner (there can
  // be two — "Pay" and "Enroll for free" — when the program offers a free option).
  const [submitting, setSubmitting] = useState<'free' | 'paid' | null>(null);
  const [recording, setRecording] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);

  const useStripeFlow = !env.useMocks && !!env.stripePublishableKey;
  const isFullyFree = data.program.price_cents === 0;
  // A paid program whose time-limited free offer is open → the buyer gets to
  // choose Free or paid. (A fully-free program has no choice; neither does a paid
  // program with no open offer.)
  const hasChoice = !isFullyFree && freeOfferOpen(data.program);
  const price = priceLabel(data.program.price_cents);
  const payLabel = `Pay ${price}`;
  const headerSummary = isFullyFree
    ? 'Free'
    : hasChoice
      ? `Try it for free, or ${price} one-time`
      : `${price} one-time`;

  // Return to the contact step, dropping any half-created payment session.
  const backToForm = () => { setStage('form'); setClientSecret(null); setStripePromise(null); setFailed(null); };
  const close = () => { backToForm(); onClose(); };

  // Validate contact info, then either record a free enrollment straight away
  // (no payment) or create the PaymentIntent and move to the pay step. The `free`
  // flag is re-checked server-side, so it can't grant a $0 spot on its own.
  const submit = async (mode: 'free' | 'paid') => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Your name, please.';
    if (!EMAIL_RE.test(email)) next.email = 'Enter a valid email.';
    if (!contact.trim()) next.contact = 'A contact number lets your host reach you.';
    setErrors(next);
    if (Object.keys(next).length || !backend) return;

    setSubmitting(mode);
    setFailed(null);
    try {
      if (mode === 'free') {
        const res = await backend.api.enroll({
          program_id: data.program.id, name: name.trim(), email: email.trim(), contact: contact.trim(), free: true,
        });
        onEnrolled(name.trim(), res);
        return;
      }
      const session = await backend.api.enrollSession({
        program_id: data.program.id, name: name.trim(), email: email.trim(), contact: contact.trim(),
      });
      if (useStripeFlow && session.client_secret) {
        setStripePromise(loadStripe(session.publishable_key || env.stripePublishableKey));
        setClientSecret(session.client_secret);
      }
      setStage('pay');
    } catch {
      setFailed(mode === 'free' ? "We couldn't complete your enrollment. Please try again." : "We couldn't start checkout. Please try again.");
    } finally {
      setSubmitting(null);
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
          hasChoice ? (
            <>
              <Button size="lg" loading={submitting === 'paid'} disabled={submitting !== null} iconRight={<ArrowRight width={18} height={18} />} onClick={() => submit('paid')}>
                {payLabel}
              </Button>
              <Button size="lg" variant="secondary" loading={submitting === 'free'} disabled={submitting !== null} onClick={() => submit('free')}>
                Try it for free
              </Button>
              <Button size="lg" variant="ghost" onClick={close}>Cancel</Button>
            </>
          ) : (
            <>
              <Button size="lg" loading={submitting !== null} iconRight={<ArrowRight width={18} height={18} />} onClick={() => submit(isFullyFree ? 'free' : 'paid')}>
                {isFullyFree ? 'Complete enrollment' : 'Continue to payment'}
              </Button>
              <Button size="lg" variant="ghost" onClick={close}>Cancel</Button>
            </>
          )
        ) : (
          <Button size="lg" variant="ghost" onClick={backToForm}>Back</Button>
        )
      }
    >
      {stage === 'form' ? (
        <>
          <p className="text-caption font-medium uppercase tracking-wide text-accent">Complete your enrollment</p>
          <p className="mt-1 text-body-sm text-ink-secondary">
            with {data.creator.first_name} · {headerSummary}
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
                <StripePay payLabel={payLabel} busy={recording} onPaid={recordEnrollment} />
              </Elements>
            ) : (
              <MockPay payLabel={payLabel} busy={recording} onPaid={recordEnrollment} />
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
function StripePay({ payLabel, busy, onPaid }: { payLabel: string; busy: boolean; onPaid: (piId: string) => void }) {
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
      setError("That card didn't go through. Try another - you won't be charged twice.");
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
        {loading || busy ? 'Processing…' : payLabel}
      </Button>
    </div>
  );
}

// Demo pay form (no Stripe configured) — simulates a successful charge.
function MockPay({ payLabel, busy, onPaid }: { payLabel: string; busy: boolean; onPaid: (piId: string) => void }) {
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
      <p className="text-caption text-ink-secondary">Demo mode - live Stripe card fields render here in production.</p>
      <Button
        size="lg"
        loading={loading || busy}
        iconLeft={<LockIcon width={18} height={18} />}
        onClick={() => { setLoading(true); setTimeout(() => onPaid(`pi_mock_${Date.now()}`), 700); }}
      >
        {loading || busy ? 'Processing…' : payLabel}
      </Button>
    </div>
  );
}

function ThankYou({ name, res, email, landing }: {
  name: string;
  res: EnrollResponse;
  email: string;
  landing: ProgramPublicResponse['creator']['landing_page'];
}) {
  const { settings, palette: t } = resolveLanding(landing);
  const headingFont = settings.heading_font === 'sans' ? 'font-sans' : 'font-serif';
  const radii = landingRadii(settings.corners);

  return (
    <div className="min-h-[100dvh]" style={{ background: landingBackground(t, settings.background), color: t.ink }}>
      {/* Header — logo drawn inline (not <Logo/>) so it recolors with the theme. */}
      <header className="border-b" style={{ borderColor: t.line }}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 lg:px-8 py-4">
          <Link to="/" className="inline-flex items-center gap-2 font-semibold" style={{ color: t.ink }}>
            <span
              className="flex h-7 w-7 items-center justify-center rounded-pill"
              style={{ backgroundColor: t.primary, color: t.onPrimary, borderRadius: radii.button }}
            >
              <span className="font-mono text-data">A</span>
            </span>
            <span className="text-h3">AbundanceAI</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 text-caption" style={{ color: t.inkSoft }}>
            <ShieldIcon width={16} height={16} /> Secure checkout
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[760px] px-6 lg:px-8 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-pill bg-success text-white">
          <CheckIcon width={30} height={30} />
        </div>
        <p className="mt-6 font-mono text-data uppercase tracking-wide" style={{ color: t.accent }}>You're in</p>
        <h1 className={`mt-2 text-display ${headingFont}`} style={{ color: t.inkDeep }}>Welcome, {firstNameOf(name)}.</h1>
        <p className="mx-auto mt-3 max-w-lg text-body" style={{ color: t.inkSoft }}>
          Your spot in <span className="font-semibold" style={{ color: t.ink }}>{res.program_title}</span> is confirmed.{res.amount_cents > 0 && ' A receipt is on its way.'}
        </p>

        <div
          className="mx-auto mt-8 max-w-xl rounded-xl border p-6 sm:p-8 text-left shadow-lg"
          style={{ backgroundColor: t.surface, borderColor: t.line, borderRadius: radii.card }}
        >
          <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: t.line }}>
            <div>
              <p className="text-body font-semibold" style={{ color: t.cardInk }}>{res.program_title}</p>
              <p className="text-caption" style={{ color: t.cardInkSoft }}>with {res.creator_first_name}</p>
            </div>
            <span className={`text-h2 ${headingFont}`} style={{ color: t.cardInk }}>{priceLabel(res.amount_cents)}</span>
          </div>
          <p className="mt-4 font-mono text-data uppercase tracking-wide" style={{ color: t.cardInkSoft }}>What happens next</p>
          <ol className="mt-3 space-y-3">
            {[
              res.amount_cents > 0
                ? 'A confirmation & receipt land in your email within a few minutes.'
                : 'A confirmation lands in your email within a few minutes.',
              `${res.creator_first_name} reaches out to welcome you and share how to get started.`,
              'Keep an eye on your inbox for your first session details.',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-body-sm" style={{ color: t.cardInk }}>
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill font-mono text-caption"
                  style={{ backgroundColor: `${t.cardAccent}1A`, color: t.cardAccent }}
                >{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-6 text-caption" style={{ color: t.inkSoft }}>
          Questions in the meantime? <a href={`mailto:${email}`} className="font-medium hover:underline" style={{ color: t.primary }}>{email}</a>
        </p>
      </div>
    </div>
  );
}

import { useRef, useState } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { CATEGORY_OPTIONS, CATEGORY_VALUES, type Category } from '@abundance/shared';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';
import {
  CheckIcon,
  ShieldIcon,
  ArrowRight,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  GoogleIcon,
} from '@/components/ui/icons';
import { useApp } from '@/store';
import { toast } from '@/store/toast';
import { LegalLink } from '@/components/LegalLink';

// [Auth] Create account / Sign in — the split-panel front door reached from every
// landing CTA. Signup creates the account then continues to $25 checkout; sign-in
// drops returning users straight into the app. Mode is driven by ?mode=signin.

type Mode = 'signup' | 'signin';

const BRAND_BULLETS = [
  'It\'s your time to share your knowledge with the world',
  'Mindset Coaching & Peer Circles to Support You',
  'No tech or writing skills required',
];

const signupSchema = z
  .object({
    firstName: z.string().min(1, 'Your name, please.'),
    email: z.string().email('Enter a valid email.'),
    // What best describes you — feeds automatic circle matching (same category).
    category: z.enum(CATEGORY_VALUES, {
      errorMap: () => ({ message: 'Pick the option that fits you best.' }),
    }),
    // Free text shown only when 'Other' is chosen; required in that case.
    categoryOther: z.string(),
    password: z.string().min(8, 'At least 8 characters.'),
    confirmPassword: z.string().min(1, 'Re-enter your password.'),
    terms: z.literal(true, { errorMap: () => ({ message: 'Please accept the terms to continue.' }) }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  })
  .refine((d) => d.category !== 'other' || d.categoryOther.trim().length > 0, {
    message: 'Tell us what best describes you.',
    path: ['categoryOther'],
  });
const signinSchema = z.object({
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(1, 'Enter your password.'),
});

interface FormValues {
  firstName: string;
  email: string;
  category: Category | '';
  categoryOther: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}

const fieldBase =
  'w-full rounded-[11px] border bg-bg px-4 py-3 text-body text-ink placeholder:text-ink-secondary/60 ' +
  'transition-colors focus:border-primary focus:bg-surface-plain';

export function AuthPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const backend = useApp((s) => s.backend);
  const ready = useApp((s) => s.ready);
  const user = useApp((s) => s.user);

  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signin' ? 'signin' : 'signup');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Resolver reads the latest mode via ref so toggling swaps validation rules.
  const modeRef = useRef<Mode>(mode);
  modeRef.current = mode;
  const resolver: Resolver<FormValues> = (values) => {
    const schema = modeRef.current === 'signup' ? signupSchema : signinSchema;
    const parsed = schema.safeParse(values);
    if (parsed.success) return { values, errors: {} };
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!errors[key]) errors[key] = { type: 'zod', message: issue.message };
    }
    return { values: {} as FormValues, errors: errors as never };
  };

  const { register, handleSubmit, watch, formState: { errors }, setError, clearErrors } = useForm<FormValues>({
    resolver,
    defaultValues: { firstName: '', email: '', category: '', categoryOther: '', password: '', confirmPassword: '', terms: false },
  });

  const isSignup = mode === 'signup';
  const showCategoryOther = watch('category') === 'other';

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    clearErrors();
    setSubmitting(false);
    const p = new URLSearchParams(params);
    if (next === 'signin') p.set('mode', 'signin');
    else p.delete('mode');
    setParams(p, { replace: true });
  };

  const onGoogle = () => {
    // OAuth isn't wired into the backend seam yet — keep the entry point honest.
    toast.info('Google sign-in is coming soon - continue with email for now.');
  };

  const onSubmit = handleSubmit(async (data) => {
    if (!backend) return;
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await backend.auth.signInWithPassword({ email: data.email, password: data.password });
        navigate('/app', { replace: true });
        return;
      }
      // Signup → create the account, then continue to $25 checkout.
      sessionStorage.setItem('abundance_pending_email', data.email);
      const { needsConfirmation } = await backend.auth.signUpWithPassword({
        email: data.email, password: data.password, firstName: data.firstName,
        category: data.category as Category,
        categoryOther: data.category === 'other' ? data.categoryOther.trim() : null,
      });
      if (needsConfirmation) {
        toast.info('Confirm your email, then sign in to continue.');
        switchMode('signin');
        return;
      }
      navigate('/checkout');
    } catch (e) {
      setSubmitting(false);
      const msg = e instanceof Error ? e.message : '';
      if (/already/i.test(msg)) {
        setError('email', { message: "That email's already in use - sign in instead." });
        switchMode('signin');
      } else if (mode === 'signin') {
        setError('password', { message: "That email and password don't match." });
      } else {
        toast.error('Network hiccup - give it another try.');
      }
    }
  });

  // Already signed in (e.g. opened /auth in a new tab) → straight into the app.
  // AppShell forwards unpaid accounts on to /checkout.
  if (ready && user) return <Navigate to="/app" replace />;

  return (
    <div className="theme-warm dots-warm flex min-h-[100dvh] items-center justify-center bg-bg px-4 py-8">
      <div className="flex w-full max-w-[980px] flex-col overflow-hidden rounded-[24px] border border-line bg-surface-plain shadow-lg md:flex-row">

        {/* ============ BRAND / VALUE PANEL ============ */}
        <div className="dots-cream flex flex-1 flex-col justify-between gap-16 bg-lp-teal p-8 text-white md:p-11">
          <div className="flex items-center gap-2.5">
            <span className="flex gap-1">
              <span className="h-2.5 w-2.5 rounded-pill bg-ink-cream" />
              <span className="h-2.5 w-2.5 rounded-pill bg-accent" />
            </span>
            <span className="text-h3 font-bold text-white">AbundanceAI</span>
          </div>

          <div>
            <p className="font-mono text-eyebrow uppercase tracking-[0.14em] text-white/80">
              You&rsquo;re one step away
            </p>
            <p className="mt-4 font-serif text-[clamp(26px,3.5vw,34px)] font-medium leading-[1.12] tracking-[-0.01em]">
              It&rsquo;s your time to share your knowledge with the world.
            </p>

            <div className="mb-8 mt-7 hidden flex-col gap-3.5 md:flex">
              {BRAND_BULLETS.map((line) => (
                <div key={line} className="flex items-start gap-3">
                  <CheckIcon width={18} height={18} className="mt-0.5 shrink-0 text-white" />
                  <span className="text-body-sm leading-relaxed text-white/90">{line}</span>
                </div>
              ))}
            </div>

            <div className="mt-7 flex items-center gap-3 rounded-lg border border-white/15 bg-white/10 px-4 py-3.5 md:mt-0">
              <ShieldIcon width={24} height={24} className="shrink-0 text-white" />
              <div>
                <p className="text-body-sm font-semibold text-white">$25 to begin</p>
                <p className="mt-0.5 text-caption text-white/80">
                  Build something you&rsquo;re proud of.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ============ FORM PANEL ============ */}
        <div className="flex flex-1 flex-col p-8 md:p-11">
          {/* mode toggle */}
          <div className="mb-7 flex rounded-[11px] bg-surface p-1">
            {(['signup', 'signin'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={cn(
                  'flex-1 rounded-md py-2.5 text-body-sm font-semibold transition-colors',
                  mode === m ? 'bg-surface-plain text-ink shadow-sm' : 'text-ink-secondary hover:text-ink',
                )}
              >
                {m === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            ))}
          </div>

          {/* heading */}
          <h1 className="font-serif text-[clamp(24px,3vw,28px)] font-medium leading-[1.12] text-ink">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mb-6 mt-1.5 text-body-sm text-ink-secondary">
            {isSignup ? 'Then continue to secure $25 checkout.' : 'Pick up right where you left off.'}
          </p>

          {/* Google */}
          <button
            type="button"
            onClick={onGoogle}
            className="flex w-full items-center justify-center gap-2.5 rounded-[11px] border border-line-strong bg-surface-plain py-3 text-body-sm font-semibold text-ink transition-colors hover:bg-bg"
          >
            <GoogleIcon width={18} height={18} />
            Continue with Google
          </button>

          {/* divider */}
          <div className="my-5 flex items-center gap-3.5">
            <span className="h-px flex-1 bg-line" />
            <span className="font-mono text-eyebrow uppercase tracking-[0.1em] text-ink-secondary">or with email</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={onSubmit} className="flex flex-col" noValidate>
            {/* name (signup only) */}
            {isSignup && (
              <div className="mb-4">
                <label htmlFor="auth-name" className="mb-1.5 block text-caption font-semibold text-ink">Full name</label>
                <input
                  id="auth-name"
                  type="text"
                  placeholder="Maya Robins"
                  aria-invalid={!!errors.firstName}
                  className={cn(fieldBase, errors.firstName ? 'border-error' : 'border-line')}
                  {...register('firstName')}
                />
                {errors.firstName && <p className="mt-1.5 text-caption text-error">{errors.firstName.message}</p>}
              </div>
            )}

            {/* category (signup only) — what best describes you; drives circle matching */}
            {isSignup && (
              <div className="mb-4">
                <label htmlFor="auth-category" className="mb-1.5 block text-caption font-semibold text-ink">
                  What best describes you?
                </label>
                <select
                  id="auth-category"
                  aria-invalid={!!errors.category}
                  defaultValue=""
                  className={cn(fieldBase, 'appearance-none', errors.category ? 'border-error' : 'border-line')}
                  {...register('category')}
                >
                  <option value="" disabled>Choose one…</option>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.category && <p className="mt-1.5 text-caption text-error">{errors.category.message}</p>}

                {/* Custom category — revealed only when "Other" is chosen. */}
                {showCategoryOther && (
                  <div className="mt-3">
                    <label htmlFor="auth-category-other" className="sr-only">Describe what best fits you</label>
                    <input
                      id="auth-category-other"
                      type="text"
                      placeholder="Tell us in your own words…"
                      aria-invalid={!!errors.categoryOther}
                      className={cn(fieldBase, errors.categoryOther ? 'border-error' : 'border-line')}
                      {...register('categoryOther')}
                    />
                    {errors.categoryOther && <p className="mt-1.5 text-caption text-error">{errors.categoryOther.message}</p>}
                  </div>
                )}
              </div>
            )}

            {/* email */}
            <div className="mb-4">
              <label htmlFor="auth-email" className="mb-1.5 block text-caption font-semibold text-ink">Email</label>
              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                className={cn(fieldBase, errors.email ? 'border-error' : 'border-line')}
                {...register('email')}
              />
              {errors.email && <p className="mt-1.5 text-caption text-error">{errors.email.message}</p>}
            </div>

            {/* password */}
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="auth-password" className="text-caption font-semibold text-ink">Password</label>
                {!isSignup && (
                  <button
                    type="button"
                    onClick={() => toast.info("Enter your email above and we'll send a reset link.")}
                    className="text-caption font-medium text-primary"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
                  aria-invalid={!!errors.password}
                  className={cn(fieldBase, 'pr-12', errors.password ? 'border-error' : 'border-line')}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-ink-secondary transition-colors hover:text-ink"
                >
                  {showPw ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-caption text-error">{errors.password.message}</p>}
            </div>

            {/* confirm password (signup only) */}
            {isSignup && (
              <div className="mt-4">
                <label htmlFor="auth-confirm" className="mb-1.5 block text-caption font-semibold text-ink">
                  Confirm password
                </label>
                <input
                  id="auth-confirm"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  aria-invalid={!!errors.confirmPassword}
                  className={cn(fieldBase, errors.confirmPassword ? 'border-error' : 'border-line')}
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && <p className="mt-1.5 text-caption text-error">{errors.confirmPassword.message}</p>}
              </div>
            )}

            {/* terms (signup only) */}
            {isSignup && (
              <>
                <label className="mt-4 flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-[17px] w-[17px] shrink-0 accent-primary"
                    {...register('terms')}
                  />
                  <span className="text-caption leading-relaxed text-ink-secondary">
                    I agree to the <LegalLink doc="terms">Terms of Service</LegalLink> and{' '}
                    <LegalLink doc="privacy">Privacy Policy</LegalLink>, and to the use of cookies as
                    described in the <LegalLink doc="cookies">Cookie Policy</LegalLink>.
                  </span>
                </label>
                {errors.terms && <p className="mt-1.5 text-caption text-error">{errors.terms.message}</p>}
              </>
            )}

            <Button
              type="submit"
              variant="orange"
              size="lg"
              loading={submitting}
              iconRight={<ArrowRight width={18} height={18} />}
              className="mt-6"
            >
              {isSignup ? 'Continue to checkout' : 'Sign in'}
            </Button>
          </form>

          {/* footer note */}
          <p className="mt-5 text-center text-body-sm text-ink-secondary">
            {isSignup ? (
              <>
                Already have an account?{' '}
                <button type="button" onClick={() => switchMode('signin')} className="font-semibold text-primary">Sign in</button>
              </>
            ) : (
              <>
                New here?{' '}
                <button type="button" onClick={() => switchMode('signup')} className="font-semibold text-primary">Start for $25</button>
              </>
            )}
          </p>

          <p className="mt-4 flex items-center justify-center gap-1.5 font-mono text-caption text-ink-secondary">
            <LockIcon width={12} height={12} /> Secured by Stripe · 256-bit encryption
          </p>
        </div>
      </div>
    </div>
  );
}

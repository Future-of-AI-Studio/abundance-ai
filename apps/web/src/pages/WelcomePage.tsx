import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, TextInput, Eyebrow } from '@/components/ui';
import { Logo } from '@/layouts/PublicLayout';
import { useApp } from '@/store';
import { toast } from '@/store/toast';

// [03] Welcome / Create Account — only reachable with a valid post-payment token.
// Captures name + login; account creation is gated on the paid order (server-side).

const schema = z.object({
  firstName: z.string().min(1, 'Your first name, please.'),
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(8, 'At least 8 characters.'),
});
type Form = z.infer<typeof schema>;

function readToken(): { email: string; payment_intent_id: string } | null {
  try {
    const raw = sessionStorage.getItem('abundance_pay_token');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function WelcomePage() {
  const navigate = useNavigate();
  const { backend, user } = useApp();
  const token = useMemo(readToken, []);
  const [magicLink, setMagicLink] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, setError } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: token?.email ?? '', firstName: '', password: '' },
  });

  // Gate: no token and not already signed in → bounce to landing.
  useEffect(() => {
    if (!token && !user) navigate('/', { replace: true });
  }, [token, user, navigate]);

  // Already signed in → into the app.
  useEffect(() => {
    if (user) navigate('/app', { replace: true });
  }, [user, navigate]);

  const onContinue = handleSubmit(async (data) => {
    if (!backend) return;
    setSubmitting(true);
    try {
      if (magicLink) {
        await backend.auth.signInWithMagicLink(data.email);
        toast.success('Check your email for a sign-in link.');
        setSubmitting(false);
        return;
      }
      const { needsConfirmation } = await backend.auth.signUpWithPassword({
        email: data.email, password: data.password, firstName: data.firstName,
      });
      sessionStorage.removeItem('abundance_pay_token');
      if (needsConfirmation) {
        toast.info('Confirm your email, then sign in to continue.');
        setSubmitting(false);
        return;
      }
      navigate('/app', { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      if (/already/i.test(msg)) setError('email', { message: "That email's already in use — sign in instead." });
      else if (/payment_required|paid order/i.test(msg)) setError('email', { message: "We couldn't find your payment for this email." });
      else toast.error('Network hiccup — give it another try.');
      setSubmitting(false);
    }
  });

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[440px] flex-col px-5 py-8">
      <Logo />
      <div className="flex flex-1 flex-col justify-center">
        <Eyebrow className="mb-2">Welcome</Eyebrow>
        <h1 className="text-h1 font-bold text-ink">You're in.</h1>
        <p className="mt-2 text-body text-ink-secondary">Let's set up your account. This takes a minute.</p>

        <Card variant="plain" className="mt-6 space-y-4">
          <TextInput label="First name" placeholder="Ruby" error={errors.firstName?.message} required {...register('firstName')} />
          <TextInput label="Email" type="email" error={errors.email?.message} required {...register('email')} />
          {!magicLink && (
            <TextInput label="Password" type="password" helperText="At least 8 characters." error={errors.password?.message} {...register('password')} />
          )}
          <button type="button" onClick={() => setMagicLink((m) => !m)} className="text-body-sm font-medium text-primary">
            {magicLink ? 'Use a password instead' : 'Email me a magic link instead'}
          </button>
          <Button size="lg" loading={submitting} onClick={onContinue}>
            {magicLink ? 'Send magic link' : 'Continue'}
          </Button>
        </Card>

        <p className="mt-4 text-center text-caption text-ink-secondary">
          Next: we'll turn your expertise into a program you can sell.
        </p>
      </div>
    </div>
  );
}

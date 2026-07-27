import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, TextInput, Eyebrow } from '@/components/ui';
import { Logo } from '@/layouts/PublicLayout';
import { useApp } from '@/store';
import { toast } from '@/store/toast';

// [Auth] Reset password — the landing target for the emailed reset link. Supabase
// establishes a short-lived recovery session from the link (detectSessionInUrl),
// which surfaces here as a signed-in `user`. The person sets a new password via
// updatePassword, then continues into the app. An invalid/expired link arrives
// with no session — we send them back to sign-in to request a fresh one.

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const backend = useApp((s) => s.backend);
  const ready = useApp((s) => s.ready);
  const user = useApp((s) => s.user);

  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async () => {
    if (!backend || saving) return;
    if (newPw.length < 8) { toast.error('Your new password needs at least 8 characters.'); return; }
    if (newPw !== confirmPw) { toast.error("Those passwords don't match."); return; }
    setSaving(true);
    try {
      await backend.auth.updatePassword(newPw);
      toast.success('Password updated - you\'re all set.');
      navigate('/app', { replace: true });
    } catch (e) {
      // Supabase's messages here are user-readable (e.g. "New password should be
      // different from the old password.") — show them rather than a generic error.
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't update your password - try again.");
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[440px] flex-col px-5 py-8">
      <Logo />
      <div className="flex flex-1 flex-col justify-center">
        <Eyebrow className="mb-2">Reset password</Eyebrow>

        {ready && !user ? (
          // No recovery session — the link was invalid or has expired.
          <>
            <h1 className="text-h1 font-bold text-ink">This link has expired.</h1>
            <p className="mt-2 text-body text-ink-secondary">
              Reset links are single-use and time out for your security. Request a fresh one from sign-in.
            </p>
            <Button size="lg" className="mt-6" onClick={() => navigate('/auth?mode=signin', { replace: true })}>
              Back to sign in
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-h1 font-bold text-ink">Choose a new password.</h1>
            <p className="mt-2 text-body text-ink-secondary">Pick something you'll remember - you'll use it to sign in.</p>

            <Card variant="plain" className="mt-6 space-y-4">
              <TextInput
                label="New password"
                type="password"
                helperText="At least 8 characters."
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
              <TextInput
                label="Confirm new password"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
              <Button size="lg" loading={saving} disabled={!ready} onClick={onSubmit}>
                Update password
              </Button>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

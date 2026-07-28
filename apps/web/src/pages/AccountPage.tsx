import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { categoryLabel, AbundanceApiError, type Category } from '@abundance/shared';
import { Button, Card, TextInput, Textarea, Select, Sheet, Eyebrow, Avatar, Spinner, Badge } from '@/components/ui';
import {
  PencilIcon, CardIcon, LockIcon, HelpIcon, BookIcon, CircleTabIcon, ShieldIcon, ArrowRight, UploadIcon, MailIcon,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { useApp } from '@/store';
import { toast } from '@/store/toast';
import { env } from '@/lib/env';

const CATEGORIES: Array<{ value: Category; label: string }> = [
  { value: 'healer', label: 'Expert' },
  { value: 'hobbyist', label: 'Hobbyist' },
  { value: 'professional', label: 'Professional' },
  { value: 'other', label: 'Other' },
];
const EMAIL_RE = /^\S+@\S+\.\S+$/;

type Cadence = 'gentle' | 'balanced' | 'active';
const CADENCE: Array<{ value: Cadence; label: string; note: string }> = [
  { value: 'gentle', label: 'Gentle', note: 'up to 1 check-in a week' },
  { value: 'balanced', label: 'Balanced', note: 'up to 3 check-ins a week' },
  { value: 'active', label: 'Active', note: 'up to 5 check-ins a week' },
];

// [14] Account & settings — profile, path/program, account & security, the
// notification + cadence preferences, and the one-tap 90-day refund (confirm
// sheet). Two-column dashboard on desktop, stacked on mobile.
export function AccountPage() {
  const navigate = useNavigate();
  const { backend, profile, journey, program, payments, refreshProfile, refreshPayments, refreshJourney } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  // Edit-profile sheet
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(profile?.first_name ?? '');
  const [category, setCategory] = useState<Category>(profile?.category ?? 'other');
  const [categoryOther, setCategoryOther] = useState(profile?.category_other ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [savingName, setSavingName] = useState(false);

  // Profile picture upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Local notification preferences (UI-only for now).
  const [mindsetNudges, setMindsetNudges] = useState(true);
  const [circleTalks, setCircleTalks] = useState(true);
  const [productEmails, setProductEmails] = useState(false);
  const [cadence, setCadence] = useState<Cadence>('balanced');

  // Change-email sheet — the password must be re-entered before the change goes through.
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailPw, setEmailPw] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Change-password sheet
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  // Payment & billing (payouts) sheet
  const [payoutsOpen, setPayoutsOpen] = useState(false);
  const [connectingPayouts, setConnectingPayouts] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);

  // Refund flow
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundResult, setRefundResult] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);

  // Sign-out confirmation
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const saveProfile = async () => {
    if (!backend) return;
    if (!name.trim()) { toast.error("Your name can't be empty."); return; }
    const trimmedOther = categoryOther.trim();
    if (category === 'other' && !trimmedOther) { toast.error('Tell us what best describes you.'); return; }
    setSavingName(true);
    try {
      await backend.reads.updateProfile({
        first_name: name,
        category,
        category_other: category === 'other' ? trimmedOther : null,
        bio: bio.trim() || null,
      });
      await refreshProfile();
      toast.success('Saved');
      setEditOpen(false);
    }
    catch { toast.error("Couldn't save - try again."); }
    finally { setSavingName(false); }
  };

  // Upload a new profile picture as soon as one is chosen, then persist the URL.
  const onAvatarPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file later
    if (!file || !backend) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB.'); return; }
    setUploadingAvatar(true);
    try {
      const url = await backend.storage.uploadAvatar(file);
      await backend.reads.updateProfile({ avatar_url: url });
      await refreshProfile();
      toast.success('Photo updated');
    }
    catch { toast.error("Couldn't upload that photo - try again."); }
    finally { setUploadingAvatar(false); }
  };

  const saveEmail = async () => {
    if (!backend) return;
    const email = newEmail.trim();
    if (!emailPw) { toast.error('Confirm your current password first.'); return; }
    if (!EMAIL_RE.test(email)) { toast.error('Enter a valid email address.'); return; }
    if (email.toLowerCase() === (profile?.email ?? '').toLowerCase()) { toast.error("That's already your email."); return; }
    setSavingEmail(true);
    try {
      await backend.auth.updateEmail({ currentPassword: emailPw, newEmail: email });
      // Fresh start under the new address: sign out and back to the sign-in page.
      toast.success(`Check ${email} for a confirmation link, then sign in with your new email address.`);
      await backend.auth.signOut();
      navigate('/');
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't update your email - try again.");
      setSavingEmail(false);
    }
  };

  const savePassword = async () => {
    if (!backend) return;
    if (newPw.length < 8) { toast.error('Your new password needs at least 8 characters.'); return; }
    if (newPw !== confirmPw) { toast.error("Those passwords don't match."); return; }
    setSavingPw(true);
    try {
      await backend.auth.updatePassword(newPw);
      toast.success('Password updated');
      setPwOpen(false);
      setNewPw('');
      setConfirmPw('');
    } catch (e) {
      // Supabase's messages here are user-readable (e.g. "New password should be
      // different from the old password.") — show them rather than a generic error.
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't update your password - try again.");
    } finally {
      setSavingPw(false);
    }
  };

  const requestRefund = async () => {
    if (!backend) return;
    setRefunding(true);
    try { const res = await backend.api.refundRequest(); setRefundResult(res.message); }
    catch { setRefundResult('Something went wrong - please reach out to us directly.'); }
    finally { setRefunding(false); }
  };

  // Whether the creator's Stripe payout account is live (can accept charges + payouts).
  const payoutsConnected = payments?.connected ?? false;

  // Start / resume Stripe payout onboarding. In mock mode we simulate a completed
  // connection; live, we redirect to Stripe's hosted onboarding and come back to
  // ?stripe=return, where the effect below reconciles the account.
  const connectPayouts = async () => {
    if (!backend) return;
    setConnectingPayouts(true);
    try {
      if (env.useMocks) {
        try { await backend.api.stripeConnect({ reconcile: true }); } catch { /* best effort */ }
        await backend.api.journeyUpdate({ complete_step: 'payments' });
        await Promise.all([refreshPayments(), refreshJourney()]);
        toast.success("You're all set to get paid.");
        return;
      }
      const returnUrl = `${window.location.origin}/app/account?stripe=return`;
      const res = await backend.api.stripeConnect({ return_url: returnUrl });
      if (res.onboarding_url) { window.location.href = res.onboarding_url; return; }
      if (res.connected) {
        await backend.api.journeyUpdate({ complete_step: 'payments' });
        await Promise.all([refreshPayments(), refreshJourney()]);
        toast.success("You're all set to get paid.");
      }
    } catch (err) {
      toast.error(err instanceof AbundanceApiError ? err.message : 'Something went wrong - please try again.');
    } finally {
      setConnectingPayouts(false);
    }
  };

  // Open the creator's Stripe Express dashboard (payouts, bank details, history).
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

  // Reconcile after returning from Stripe's hosted onboarding (?stripe=return),
  // then reflect payout-readiness and mark the payments step done if connected.
  useEffect(() => {
    if (!backend || env.useMocks || searchParams.get('stripe') !== 'return') return;
    let cancelled = false;
    (async () => {
      setPayoutsOpen(true);
      try {
        const res = await backend.api.stripeConnect({ reconcile: true });
        if (cancelled) return;
        if (res.connected) {
          await backend.api.journeyUpdate({ complete_step: 'payments' });
          await Promise.all([refreshPayments(), refreshJourney()]);
          toast.success("Payments connected — you're all set to get paid.");
        } else {
          await refreshPayments();
          toast.info('Almost there — finish your Stripe details to start accepting payments.');
        }
      } catch (err) {
        if (!cancelled) toast.error(err instanceof AbundanceApiError ? err.message : "We couldn't confirm your Stripe setup. Please try again.");
      } finally {
        if (!cancelled) {
          searchParams.delete('stripe');
          setSearchParams(searchParams, { replace: true });
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend]);

  const signOut = async () => {
    setSigningOut(true);
    try { await backend?.auth.signOut(); navigate('/'); }
    catch { toast.error("Couldn't sign you out - try again."); setSigningOut(false); }
  };

  const displayName = profile?.first_name?.trim() || 'Friend';
  const pathLabel = journey?.path === 'A' ? 'Live group coaching' : journey?.path === 'B' ? 'Self-paced program' : 'Path not chosen yet';
  const pathSub = journey?.path ? `Type ${journey.path} · your chosen path` : 'Pick a path to begin';
  const moduleCount = program.modules.length;
  const cadenceNote = CADENCE.find((c) => c.value === cadence)!;

  // Day X of 90 within the guarantee window.
  const dayOfGuarantee = (() => {
    if (!profile?.created_at) return 1;
    const days = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86_400_000) + 1;
    return Math.min(90, Math.max(1, days));
  })();

  return (
    <div>
      {/* Header */}
      <h1 className="font-serif text-h1 font-medium text-ink">Account &amp; settings</h1>
      <p className="mt-1.5 text-body text-ink-secondary">Manage your profile, how we reach you, and your guarantee.</p>

      {/* Profile */}
      <Card variant="plain" className="mt-6">
        <div className="flex items-center gap-4">
          {/* Profile picture — click to upload/replace. */}
          <div className="relative shrink-0">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarPicked}
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label="Upload profile picture"
              className="group relative block h-14 w-14 rounded-pill focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Avatar name={displayName} src={profile?.avatar_url} size={56} className="h-14 w-14 bg-accent text-white" />
              {uploadingAvatar ? (
                <span className="absolute inset-0 flex items-center justify-center rounded-pill bg-ink/45 text-white">
                  <Spinner size={18} />
                </span>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center rounded-pill bg-ink/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <UploadIcon width={18} height={18} />
                </span>
              )}
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-h3 font-semibold text-ink">{displayName}</p>
            {profile?.email && <p className="truncate text-body-sm text-ink-secondary">{profile.email}</p>}
            {profile?.category && (
              <span className="mt-1.5 inline-flex rounded-pill border border-success-border bg-success-bg px-2.5 py-0.5 font-mono text-data text-success">
                {categoryLabel(profile.category, profile.category_other)}
              </span>
            )}
          </div>
          <Button variant="secondary" size="md" fullWidth={false} aria-label="Edit profile" className="shrink-0 max-sm:gap-0 max-sm:px-3" iconLeft={<PencilIcon width={16} height={16} />} onClick={() => { setName(profile?.first_name ?? ''); setCategory(profile?.category ?? 'other'); setCategoryOther(profile?.category_other ?? ''); setBio(profile?.bio ?? ''); setEditOpen(true); }}>
            <span className="hidden sm:inline">Edit profile</span>
          </Button>
        </div>

        {/* Bio — shown publicly as "Meet your guide" on your program landing page. */}
        <div className="mt-4 border-t border-line pt-4">
          <Eyebrow className="mb-1.5">Your bio · shown on your landing page</Eyebrow>
          {profile?.bio?.trim() ? (
            <p className="whitespace-pre-line text-body-sm leading-relaxed text-ink-secondary">{profile.bio}</p>
          ) : (
            <p className="text-body-sm italic text-ink-secondary">
              No bio yet - add one so buyers meet the real you in “Meet your guide.”
            </p>
          )}
        </div>
      </Card>

      {/* Two-column dashboard */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* ---- Left column ---- */}
        <div className="min-w-0 space-y-6">
          {/* Your path */}
          <section>
            <Eyebrow className="mb-3">Your path</Eyebrow>
            <div className="overflow-hidden rounded-lg border border-line bg-surface-plain shadow-sm">
              <Row icon={<CircleTabIcon width={20} height={20} />} title={pathLabel} sub={pathSub} />
              <div className="border-t border-line" />
              <Row
                icon={<BookIcon width={20} height={20} />}
                title={program.program?.title ?? 'No program yet'}
                sub={program.program ? `${moduleCount} module${moduleCount === 1 ? '' : 's'} · ${program.program.status === 'ready' ? 'ready' : 'in progress'}` : 'Build yours in a few minutes'}
                onClick={() => navigate('/app/program')}
              />
            </div>
          </section>

          {/* Notifications */}
          <section>
            <Eyebrow className="mb-3">Notifications</Eyebrow>
            <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface-plain shadow-sm">
              <Toggle title="Mindset check-ins" sub="Gentle nudges at the hard moments" on={mindsetNudges} onChange={setMindsetNudges} />
              <Toggle title="Circle & expert talks" sub="When your circle meets or a talk is live" on={circleTalks} onChange={setCircleTalks} />
              <Toggle title="Product emails" sub="Tips and occasional updates" on={productEmails} onChange={setProductEmails} />
            </div>
          </section>

          {/* Check-in rhythm */}
          <section>
            <Eyebrow className="mb-3">Check-in rhythm</Eyebrow>
            <Card variant="plain">
              <p className="text-body text-ink">How often should we reach out for mindset support?</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {CADENCE.map((c) => {
                  const active = c.value === cadence;
                  return (
                    <button
                      key={c.value}
                      onClick={() => setCadence(c.value)}
                      className={cn(
                        'rounded-lg border px-3 py-2.5 text-body-sm font-medium transition-colors',
                        active ? 'border-transparent bg-primary text-white' : 'border-line bg-surface-plain text-ink hover:border-primary/40',
                      )}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 font-mono text-data text-ink-secondary">{cadenceNote.label} · {cadenceNote.note}</p>
            </Card>
          </section>
        </div>

        {/* ---- Right column ---- */}
        <div className="min-w-0 space-y-6">
          {/* Account & security */}
          <section>
            <Eyebrow className="mb-3">Account &amp; security</Eyebrow>
            <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface-plain shadow-sm">
              <NavRow icon={<CardIcon width={20} height={20} />} label="Payment & billing" onClick={() => setPayoutsOpen(true)} />
              <NavRow icon={<MailIcon width={20} height={20} />} label="Email address" onClick={() => { setEmailPw(''); setNewEmail(''); setEmailOpen(true); }} />
              <NavRow icon={<LockIcon width={20} height={20} />} label="Password & security" onClick={() => { setNewPw(''); setConfirmPw(''); setPwOpen(true); }} />
              <NavRow icon={<HelpIcon width={20} height={20} />} label="Help & contact us" onClick={() => toast.info('Reach us anytime at hello@abundance.ai')} />
            </div>
          </section>

          {/* Your guarantee */}
          <section>
            <Eyebrow className="mb-3">Your guarantee</Eyebrow>
            <Card className="border-accent/20 bg-success-bg/50">
              <div className="flex items-center gap-2.5">
                <ShieldIcon width={22} height={22} className="shrink-0 text-success" />
                <p className="text-body font-semibold text-ink">90-day money-back guarantee</p>
              </div>
              <p className="mt-2.5 text-body-sm text-ink-secondary">
                You&rsquo;re on day {dayOfGuarantee} of 90. If this isn&rsquo;t right for you, you can request a full refund - no questions, no friction.
              </p>
              <div className="mt-4">
                <Button variant="accent-secondary" fullWidth={false} onClick={() => { setRefundResult(null); setRefundOpen(true); }}>
                  Request a refund
                </Button>
              </div>
            </Card>
          </section>
        </div>
      </div>

      {/* Sign out */}
      <div className="mt-8">
        <Button variant="ghost" fullWidth={false} onClick={() => setSignOutOpen(true)}>Sign out</Button>
      </div>

      {/* Edit profile sheet */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit profile" footer={
        <>
          <Button loading={savingName} onClick={saveProfile}>Save changes</Button>
          <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
        </>
      }>
        <div className="space-y-3">
          {/* Profile picture — reuses the same hidden input + handler as the card. */}
          <div className="flex items-center gap-4">
            <Avatar name={name || displayName} src={profile?.avatar_url} size={64} className="h-16 w-16 bg-accent text-white" />
            <div>
              <Button
                variant="secondary"
                size="md"
                fullWidth={false}
                loading={uploadingAvatar}
                iconLeft={<UploadIcon width={16} height={16} />}
                onClick={() => avatarInputRef.current?.click()}
              >
                {profile?.avatar_url ? 'Change photo' : 'Upload photo'}
              </Button>
              <p className="mt-1.5 text-caption text-ink-secondary">JPG, PNG, or GIF · up to 5 MB</p>
            </div>
          </div>
          <TextInput label="First name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select<Category> label="Category" value={category} options={CATEGORIES} onChange={setCategory} />
          {category === 'other' && (
            <TextInput
              label="Describe what best fits you"
              placeholder="Tell us in your own words…"
              value={categoryOther}
              onChange={(e) => setCategoryOther(e.target.value)}
            />
          )}
          <Textarea
            label="Bio"
            rows={5}
            maxLength={600}
            placeholder="A few sentences about who you are and who you help - this is your “Meet your guide” intro on your program's landing page."
            helperText={`Shown publicly on your landing page · ${bio.trim().length}/600`}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>
      </Sheet>

      {/* Change-email sheet */}
      <Sheet
        open={emailOpen}
        onClose={() => { if (!savingEmail) setEmailOpen(false); }}
        title="Change your email"
        footer={
          <>
            <Button loading={savingEmail} onClick={saveEmail}>Update email</Button>
            <Button variant="ghost" disabled={savingEmail} onClick={() => setEmailOpen(false)}>Cancel</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-body-sm text-ink-secondary">
            You&rsquo;re currently signed in as <span className="font-medium text-ink">{profile?.email}</span>.
            Confirm your password, then tell us the new address. You&rsquo;ll be signed out and can sign
            back in with your new email. Your progress stays saved.
          </p>
          <TextInput
            label="Current password"
            type="password"
            value={emailPw}
            onChange={(e) => setEmailPw(e.target.value)}
          />
          <TextInput
            label="New email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
        </div>
      </Sheet>

      {/* Change-password sheet */}
      <Sheet
        open={pwOpen}
        onClose={() => { if (!savingPw) setPwOpen(false); }}
        title="Change your password"
        footer={
          <>
            <Button loading={savingPw} onClick={savePassword}>Update password</Button>
            <Button variant="ghost" disabled={savingPw} onClick={() => setPwOpen(false)}>Cancel</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-body-sm text-ink-secondary">
            You&rsquo;ll stay signed in here - use the new password the next time you sign in.
          </p>
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
        </div>
      </Sheet>

      {/* Payment & billing (payouts) sheet */}
      <Sheet
        open={payoutsOpen}
        onClose={() => setPayoutsOpen(false)}
        title="Payment & billing"
        footer={<Button variant="ghost" onClick={() => setPayoutsOpen(false)}>Close</Button>}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-caption font-medium uppercase tracking-wide text-accent">Getting paid</p>
          <Badge variant={payoutsConnected ? 'done' : 'pending'}>{payoutsConnected ? 'Connected' : 'Not connected'}</Badge>
        </div>
        <p className="mt-2 text-body-sm text-ink-secondary">
          Your students&rsquo; payments go straight to your own Stripe account — AbundanceAI never holds your money.
        </p>

        {payoutsConnected ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-2.5 rounded-md border border-line bg-surface-plain px-4 py-3">
              <ShieldIcon width={20} height={20} className="shrink-0 text-success" />
              <p className="text-body-sm text-ink-secondary">Your account is verified and ready to receive payouts.</p>
            </div>
            <Button size="lg" loading={openingDashboard} iconLeft={<CardIcon width={18} height={18} />} onClick={openDashboard}>
              Manage on Stripe
            </Button>
            <p className="text-caption text-ink-secondary">Opens your Stripe dashboard to review payouts, transactions, and bank details.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <Button size="lg" loading={connectingPayouts} onClick={connectPayouts}>Connect Stripe</Button>
            <p className="text-caption text-ink-secondary">
              Set up your payout account with Stripe so you can accept enrollments. Takes about 5 minutes on Stripe&rsquo;s secure site.
            </p>
          </div>
        )}
      </Sheet>

      {/* Refund confirm sheet */}
      <Sheet
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title={refundResult ? 'Done' : 'Request your refund?'}
        footer={
          refundResult ? (
            <Button onClick={() => setRefundOpen(false)}>Close</Button>
          ) : (
            <>
              <Button variant="destructive" loading={refunding} onClick={requestRefund}>Yes, request refund</Button>
              <Button variant="ghost" onClick={() => setRefundOpen(false)}>Never mind</Button>
            </>
          )
        }
      >
        {refundResult ? (
          <p className="text-body text-ink">{refundResult}</p>
        ) : (
          <p className="text-body text-ink-secondary">You&rsquo;re within your 90-day window. We&rsquo;ll process it right away - no questions asked.</p>
        )}
      </Sheet>

      {/* Sign-out confirm sheet */}
      <Sheet
        open={signOutOpen}
        onClose={() => { if (!signingOut) setSignOutOpen(false); }}
        title="Sign out?"
        footer={
          <>
            <Button variant="destructive" loading={signingOut} onClick={signOut}>Yes, sign out</Button>
            <Button variant="ghost" disabled={signingOut} onClick={() => setSignOutOpen(false)}>Stay signed in</Button>
          </>
        }
      >
        <p className="text-body text-ink-secondary">
          You&rsquo;ll need to sign back in with your email to pick up where you left off. Your progress is saved.
        </p>
      </Sheet>
    </div>
  );
}

// A path/program row — static, or a tappable nav row when onClick is given.
function Row({ icon, title, sub, onClick }: { icon: ReactNode; title: string; sub: string; onClick?: () => void }) {
  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface text-primary">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold text-ink">{title}</p>
        <p className="truncate text-caption text-ink-secondary">{sub}</p>
      </div>
      {onClick && <ArrowRight width={18} height={18} className="shrink-0 text-ink-secondary" />}
    </>
  );
  return onClick ? (
    <button onClick={onClick} className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition-colors hover:bg-surface/50">{inner}</button>
  ) : (
    <div className="flex items-center gap-3.5 px-5 py-4">{inner}</div>
  );
}

// A labelled nav row with a chevron (Account & security).
function NavRow({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition-colors hover:bg-surface/50">
      <span className="shrink-0 text-ink-secondary">{icon}</span>
      <span className="flex-1 text-body text-ink">{label}</span>
      <ArrowRight width={18} height={18} className="shrink-0 text-ink-secondary" />
    </button>
  );
}

function Toggle({ title, sub, on, onChange }: { title: string; sub: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-body font-semibold text-ink">{title}</p>
        <p className="text-caption text-ink-secondary">{sub}</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={title}
        onClick={() => onChange(!on)}
        className={cn('relative h-6 w-11 shrink-0 rounded-pill transition-colors', on ? 'bg-accent' : 'bg-line-strong')}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-pill bg-white transition-transform', on ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </button>
    </div>
  );
}

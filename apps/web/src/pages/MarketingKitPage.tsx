import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MarketingPost, Platform, MarketingPhase } from '@abundance/shared';
import { PLATFORM_LABELS, PHASE_LABELS, postsPerTarget, MARKETING_ROUNDS_PER_MONTH, marketingRoundsUsedThisMonth, AbundanceApiError } from '@abundance/shared';
import { Button, Card, SegmentedControl, Skeleton, Badge, EmptyState, Sheet } from '@/components/ui';
import { CopyIcon, CheckIcon, SparkleIcon, StarIcon, ArrowRight, ShareIcon, XIcon, FacebookIcon, InstagramIcon, LinkedInIcon, MailIcon } from '@/components/ui/icons';
import { StepLayout } from '@/components/StepLayout';
import { useApp } from '@/store';
import { toast } from '@/store/toast';
import { cn } from '@/lib/cn';
import { plainText } from '@/lib/text';
import { buildShareText, canNativeShare, nativeShare, intentUrl, type SharePlatform } from '@/lib/share';

const ALL_PLATFORMS: Platform[] = ['facebook', 'instagram', 'x', 'linkedin'];
const PLATFORM_ICON = { facebook: FacebookIcon, instagram: InstagramIcon, x: XIcon, linkedin: LinkedInIcon } as const;
// Selectable targets = the four networks plus Email, shown as one row of chips.
type Target = Platform | 'email';
const ALL_TARGETS: Target[] = [...ALL_PLATFORMS, 'email'];
// Default selection / first auto-generation targets: Facebook, Instagram + Email.
const DEFAULT_TARGETS: Target[] = ['facebook', 'instagram', 'email'];
const DEFAULT_PLATFORMS: Platform[] = ['facebook', 'instagram'];
const TARGET_ICON = { ...PLATFORM_ICON, email: MailIcon } as const;
const TARGET_LABEL = { facebook: 'Facebook', instagram: 'Instagram', x: 'X', linkedin: 'LinkedIn', email: 'Email' } as const;
const PHASE_ORDER: MarketingPhase[] = ['launch', 'ongoing', 'evergreen'];
const PHASE_SEGMENTS = PHASE_ORDER.map((v) => ({ value: v, label: PHASE_LABELS[v] }));

// The copy formats AbundanceAI can draft — shown in the "How it works" guide.
const MARKETING_FORMATS = [
  'Program titles',
  'Program descriptions',
  'Invitations and outreach messages',
  'Social media posts',
  'Other promotional copy',
];

// [09] Marketing Kit — pick the platforms you want, then AI writes a post tailored
// to each (Facebook / Instagram / X / LinkedIn), plus an optional email.
export function MarketingKitPage() {
  const navigate = useNavigate();
  const { backend, program, posts, refreshMarketing, refreshJourney } = useApp();
  const [selected, setSelected] = useState<Set<Target>>(new Set(DEFAULT_TARGETS));
  const [phase, setPhase] = useState<MarketingPhase>('launch');
  const [generating, setGenerating] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Target>('facebook');

  const toggle = (t: Target) =>
    setSelected((cur) => {
      const next = new Set(cur);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });

  const generate = async () => {
    if (!backend || selected.size === 0) return;
    setGenerating(true);
    setFailed(false);
    try {
      const platforms = ALL_PLATFORMS.filter((p) => selected.has(p));
      await backend.api.marketingGenerate({ platforms, include_email: selected.has('email'), phase });
      await refreshMarketing();
      setTab(platforms[0] ?? 'email');
    } catch (e) {
      // At the monthly round cap the existing library is intact — a toast beats
      // the "couldn't write your posts" retry card.
      if (e instanceof AbundanceApiError && e.code === 'marketing_limit') {
        toast.error(e.message);
      } else {
        setFailed(true);
      }
    } finally {
      setGenerating(false);
    }
  };

  // On the first visit (program just built, nothing generated yet), automatically
  // draft the "Just starting" launch content. This is a real marketing-generate
  // call — Gemini writes it, grounded in this program's modules — not static copy.
  // After that, the picker + phase options drive any regeneration or new stages.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current || !backend || !program.program || posts.length > 0) return;
    autoRan.current = true;
    setGenerating(true);
    setFailed(false);
    (async () => {
      try {
        await backend.api.marketingGenerate({ platforms: DEFAULT_PLATFORMS, include_email: true, phase: 'launch' });
        await refreshMarketing();
        setPhase('launch');
        setTab('facebook');
      } catch {
        setFailed(true);
      } finally {
        setGenerating(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, program.program, posts.length]);

  if (!program.program) {
    return (
      <EmptyState
        icon={<SparkleIcon width={30} height={30} />}
        headline="Your marketing kit unlocks once your program is ready"
        subline="Build your program first, then we'll write your posts."
        action={<Button size="lg" onClick={() => navigate('/app/program')}>Go to program</Button>}
      />
    );
  }

  // The stage picker only shapes what gets WRITTEN next; `phasePosts` exists just
  // to word the generate button. The library below always shows every saved post
  // across all stages, so generating for one stage or platform never hides the rest.
  const phasePosts = posts.filter((p) => p.phase === phase);
  const platformTabs = ALL_PLATFORMS.filter((p) => posts.some((post) => post.platform === p));
  const hasEmail = posts.some((p) => p.channel === 'email');
  const tabSegments: { value: Platform | 'email'; label: string }[] = [
    ...platformTabs.map((p) => ({ value: p, label: PLATFORM_LABELS[p] })),
    ...(hasEmail ? [{ value: 'email' as const, label: 'Email' }] : []),
  ];
  const activeTab = tabSegments.some((s) => s.value === tab) ? tab : (tabSegments[0]?.value ?? 'facebook');
  const visible = posts.filter((p) => (activeTab === 'email' ? p.channel === 'email' : p.platform === activeTab));
  const perTarget = postsPerTarget(selected.size);

  // Generation is append-only — every round stays. Group the tab's posts by
  // (stage, round), newest batch first, each labelled once there's more than one.
  type RoundGroup = { phase: MarketingPhase; round: number; when: string; posts: MarketingPost[] };
  const groups: RoundGroup[] = [];
  for (const p of visible) {
    const round = p.round ?? 1;
    const g = groups.find((x) => x.phase === p.phase && x.round === round);
    if (g) {
      g.posts.push(p);
      if (p.created_at < g.when) g.when = p.created_at;
    } else {
      groups.push({ phase: p.phase, round, when: p.created_at, posts: [p] });
    }
  }
  groups.sort((a, b) => (a.when < b.when ? 1 : -1));
  const roundsUsed = marketingRoundsUsedThisMonth(posts);
  const atRoundLimit = roundsUsed >= MARKETING_ROUNDS_PER_MONTH;
  const groupDate = (g: RoundGroup) =>
    new Date(g.when).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <StepLayout back backTo="/app/program" eyebrow="Marketing kit" title="Pick your platforms — we'll write for each.">
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start xl:gap-8">
        {/* Picker column */}
        <div className="space-y-4">
          {/* Target picker — the four networks plus Email, all as toggle chips. */}
          <Card variant="plain" className="space-y-3">
            <p className="text-body-sm font-medium text-ink">Where do you want to share?</p>
            <div className="flex flex-wrap gap-2">
              {ALL_TARGETS.map((t) => {
                const Icon = TARGET_ICON[t];
                const on = selected.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggle(t)}
                    aria-pressed={on}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-body-sm transition-colors',
                      on ? 'border-primary bg-primary/10 text-ink' : 'border-line text-ink-secondary hover:border-primary/40',
                    )}
                  >
                    <Icon width={16} height={16} />
                    {TARGET_LABEL[t]}
                  </button>
                );
              })}
            </div>

            <p className="pt-1 text-body-sm font-medium text-ink">Which stage are you at?</p>
            <SegmentedControl<MarketingPhase> segments={PHASE_SEGMENTS} value={phase} onChange={setPhase} />

            <p className="text-caption text-ink-secondary">
              {atRoundLimit
                ? `You've used all ${MARKETING_ROUNDS_PER_MONTH} rounds for this month — new rounds unlock next month. Everything below is still yours to edit and share.`
                : selected.size === 0
                  ? 'Pick at least one place to share.'
                  : `We'll write ${perTarget} ${perTarget === 1 ? 'post' : 'posts'} for each of the ${selected.size} selected — ${PHASE_LABELS[phase].toLowerCase()} content you can post over the coming weeks. Earlier rounds always stay saved.`}
            </p>

            <Button size="lg" loading={generating} disabled={selected.size === 0 || atRoundLimit} onClick={generate}>
              {phasePosts.length ? `Write more ${PHASE_LABELS[phase].toLowerCase()} content` : `Generate ${PHASE_LABELS[phase].toLowerCase()} content`}
            </Button>
            <p className="text-center text-caption text-ink-secondary">
              {roundsUsed} of {MARKETING_ROUNDS_PER_MONTH} rounds used this month
            </p>
          </Card>

          <button onClick={() => navigate('/app/circle')} className="text-body-sm font-medium text-primary">
            Not on social? See other ways to share →
          </button>

          {/* How it works — orients first-timers to what the kit produces. */}
          <Card variant="plain" className="border border-accent/25 bg-accent/5">
            <p className="text-body-sm font-semibold text-ink">How it works</p>
            <p className="mt-1.5 text-body-sm text-ink-secondary">
              Once you are happy with your mentoring program, AbundanceAI will help you create the marketing copy to
              share it with the world.
            </p>
            <p className="mt-3 text-body-sm text-ink-secondary">
              Choose the marketing and social media formats you would like, and receive multiple options for:
            </p>
            <ul className="mt-2 space-y-1.5">
              {MARKETING_FORMATS.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-body-sm text-ink">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-body-sm text-ink-secondary">
              Star your favorites with the <StarIcon width={14} height={14} className="inline align-[-2px] text-primary" /> icon
              and create additional versions until it feels like you.
            </p>
          </Card>

          <Button
            size="lg"
            iconRight={<ArrowRight width={20} height={20} />}
            onClick={async () => {
              if (backend) {
                const path = useApp.getState().journey?.path;
                await backend.api.journeyUpdate({ complete_step: 'marketing', current_step: path === 'A' ? 'sessions' : 'payments' });
                await refreshJourney();
              }
              navigate(useApp.getState().journey?.path === 'B' ? '/app/onboarding/payments' : '/app/onboarding/sessions');
            }}
          >
            Continue
          </Button>
        </div>

        {/* Library column — everything ever generated, across all stages */}
        <div className="min-w-0 space-y-3">
          {generating && posts.length === 0 ? (
            [0, 1, 2].map((i) => <Skeleton key={i} variant="post-card" />)
          ) : failed ? (
            <Card variant="plain" className="text-center">
              <p className="text-body text-ink">Couldn't write your posts just now.</p>
              <div className="mx-auto mt-4 max-w-xs"><Button onClick={generate}>Try again</Button></div>
            </Card>
          ) : posts.length === 0 ? (
            <Card variant="plain" className="py-12 text-center">
              <p className="text-body-sm text-ink-secondary">
                No content yet — pick your platforms and generate.
              </p>
            </Card>
          ) : (
            <>
              <SegmentedControl<Platform | 'email'> segments={tabSegments} value={activeTab} onChange={setTab} />
              {groups.map((g) => (
                <div key={`${g.phase}-${g.round}`} className="mt-3 space-y-3">
                  {groups.length > 1 && (
                    <p className="flex items-baseline gap-2 pt-1 text-eyebrow font-mono uppercase tracking-[0.12em] text-ink-secondary">
                      {PHASE_LABELS[g.phase]} · Round {g.round}
                      <span className="normal-case tracking-normal">· {groupDate(g)}</span>
                    </p>
                  )}
                  {g.posts.map((p) => <PostCard key={p.id} post={p} />)}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </StepLayout>
  );
}

function PostCard({ post }: { post: MarketingPost }) {
  const { backend, refreshMarketing } = useApp();
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const shareText = buildShareText(plainText(caption), post.hashtags);
  const PlatformIcon = post.platform ? PLATFORM_ICON[post.platform] : null;
  const platformLabel = post.platform ? PLATFORM_LABELS[post.platform] : 'Email';

  const copy = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const save = async () => {
    if (!caption.trim()) { toast.error("A post can't be empty."); return; }
    setEditing(false);
    if (backend) { await backend.api.marketingUpdate({ id: post.id, caption }); await refreshMarketing(); }
  };

  const markShared = async () => {
    if (backend && !post.posted) { await backend.api.marketingUpdate({ id: post.id, posted: true }); await refreshMarketing(); }
  };

  const togglePosted = async () => {
    if (backend) { await backend.api.marketingUpdate({ id: post.id, posted: !post.posted }); await refreshMarketing(); }
  };

  const toggleFavorite = async () => {
    if (backend) { await backend.api.marketingUpdate({ id: post.id, favorited: !post.favorited }); await refreshMarketing(); }
  };

  // Mobile: hand to the OS share sheet. Desktop: open the per-platform menu.
  const share = async () => {
    if (canNativeShare(shareText)) {
      if (await nativeShare(shareText)) await markShared();
    } else {
      setShareOpen(true);
    }
  };

  const shareTo = async (platform: SharePlatform) => {
    setShareOpen(false);
    const url = intentUrl(platform, shareText, window.location.origin);
    if (url) {
      // FB & LinkedIn can't prefill the caption — copy it so the user can paste.
      if (platform === 'facebook' || platform === 'linkedin') {
        await navigator.clipboard.writeText(shareText);
        toast.success('Caption copied — paste it into your post');
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      // Instagram has no web composer — copy and let the user paste in the app.
      await navigator.clipboard.writeText(shareText);
      toast.success('Caption copied — open Instagram and paste');
    }
    await markShared();
  };

  return (
    <Card variant="plain" className={cn(post.favorited && 'border-primary/40 bg-primary/[0.03]')}>
      <div className="mb-2 flex items-center gap-1.5 text-caption font-medium text-ink-secondary">
        {PlatformIcon && <PlatformIcon width={14} height={14} />}
        {platformLabel}
        <button
          type="button"
          onClick={toggleFavorite}
          aria-pressed={post.favorited}
          aria-label={post.favorited ? 'Remove from favorites' : 'Add to favorites'}
          title={post.favorited ? 'Favorited' : 'Add to favorites'}
          className={cn(
            'ml-auto transition-colors',
            post.favorited ? 'text-primary' : 'text-ink-secondary/50 hover:text-primary',
          )}
        >
          <StarIcon width={18} height={18} fill={post.favorited ? 'currentColor' : 'none'} />
        </button>
      </div>
      {editing ? (
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={save}
          rows={4}
          autoFocus
          className="w-full resize-none rounded-md border border-primary px-3 py-2 text-body text-ink"
        />
      ) : (
        <button onClick={() => setEditing(true)} className="w-full whitespace-pre-wrap text-left text-body text-ink">
          {plainText(caption)}
        </button>
      )}
      {post.hashtags.length > 0 && (
        <p className="mt-2 text-body-sm text-primary">{post.hashtags.join(' ')}</p>
      )}
      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" variant="secondary" fullWidth={false} onClick={() => setEditing(true)}>Edit</Button>
        <Button size="sm" variant="secondary" fullWidth={false} iconLeft={copied ? <CheckIcon width={15} height={15} /> : <CopyIcon width={15} height={15} />} onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button size="sm" variant="secondary" fullWidth={false} iconLeft={<ShareIcon width={15} height={15} />} onClick={share}>
          Share
        </Button>
        <button onClick={togglePosted} className="ml-auto">
          {post.posted ? <Badge variant="done">Posted</Badge> : <span className="text-body-sm font-medium text-ink-secondary hover:text-ink">Mark posted</span>}
        </button>
      </div>

      <Sheet open={shareOpen} onClose={() => setShareOpen(false)} title="Share this post">
        <div className="space-y-2">
          <Button variant="secondary" iconLeft={<XIcon width={18} height={18} />} onClick={() => shareTo('x')}>
            Share to X
          </Button>
          <Button variant="secondary" iconLeft={<FacebookIcon width={18} height={18} />} onClick={() => shareTo('facebook')}>
            Share to Facebook
          </Button>
          <Button variant="secondary" iconLeft={<InstagramIcon width={18} height={18} />} onClick={() => shareTo('instagram')}>
            Share to Instagram
          </Button>
          <Button variant="secondary" iconLeft={<LinkedInIcon width={18} height={18} />} onClick={() => shareTo('linkedin')}>
            Share to LinkedIn
          </Button>
          <p className="pt-1 text-center text-body-sm text-ink-secondary">
            Facebook, Instagram & LinkedIn don't accept pre-filled captions, so we copy yours to paste.
          </p>
        </div>
      </Sheet>
    </Card>
  );
}

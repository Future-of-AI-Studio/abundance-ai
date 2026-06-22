import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MarketingPost, Channel } from '@abundance/shared';
import { Button, Card, SegmentedControl, Skeleton, Badge, EmptyState, Sheet } from '@/components/ui';
import { CopyIcon, CheckIcon, SparkleIcon, ArrowRight, ShareIcon, XIcon, FacebookIcon, InstagramIcon } from '@/components/ui/icons';
import { PageHeader } from '@/components/PageHeader';
import { useApp } from '@/store';
import { toast } from '@/store/toast';
import { buildShareText, canNativeShare, nativeShare, intentUrl, type SharePlatform } from '@/lib/share';

// [09] Marketing Kit — AI-written posts to copy, edit, publish. Skeletons while
// generating. Email segment enabled only if the user has a list.
export function MarketingKitPage() {
  const navigate = useNavigate();
  const { backend, program, posts, refreshMarketing, refreshJourney } = useApp();
  const [segment, setSegment] = useState<Channel>('social');
  const [generating, setGenerating] = useState(false);
  const [hasEmailList, setHasEmailList] = useState(false);
  const [failed, setFailed] = useState(false);

  const generate = async (includeEmail: boolean) => {
    if (!backend) return;
    setGenerating(true);
    setFailed(false);
    try {
      await backend.api.marketingGenerate({ include_email: includeEmail });
      await refreshMarketing();
    } catch {
      setFailed(true);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (program.program && posts.length === 0 && !generating) void generate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program.program]);

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

  const visible = posts.filter((p) => p.channel === segment);

  return (
    <div>
      <PageHeader eyebrow="Marketing kit" title="Your posts are written. Just make them yours." />

      <SegmentedControl<Channel>
        segments={[
          { value: 'social', label: 'Social posts' },
          { value: 'email', label: 'Email', disabled: !hasEmailList },
        ]}
        value={segment}
        onChange={setSegment}
      />

      <label className="mt-3 flex items-center gap-2 text-body-sm text-ink-secondary">
        <input
          type="checkbox"
          checked={hasEmailList}
          onChange={(e) => { setHasEmailList(e.target.checked); if (e.target.checked) void generate(true); }}
          className="h-4 w-4 accent-[#B5532A]"
        />
        I have an email list
      </label>

      <div className="mt-5 space-y-3">
        {generating && posts.length === 0 ? (
          [0, 1, 2].map((i) => <Skeleton key={i} variant="post-card" />)
        ) : failed ? (
          <Card variant="plain" className="text-center">
            <p className="text-body text-ink">Couldn't write your posts just now.</p>
            <div className="mx-auto mt-4 max-w-xs"><Button onClick={() => generate(hasEmailList)}>Try again</Button></div>
          </Card>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-body-sm text-ink-secondary">No {segment} posts yet.</p>
        ) : (
          visible.map((p) => <PostCard key={p.id} post={p} />)
        )}
      </div>

      <button onClick={() => navigate('/app/circle')} className="mt-4 text-body-sm font-medium text-primary">
        Not on social? See other ways to share →
      </button>

      <div className="mt-6">
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
    </div>
  );
}

function PostCard({ post }: { post: MarketingPost }) {
  const { backend, refreshMarketing } = useApp();
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const shareText = buildShareText(caption, post.hashtags);

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

  // Reflect that the user took the post out to a platform. We can't know they
  // hit "publish", but opening the composer is the strongest signal we get.
  const markShared = async () => {
    if (backend && !post.posted) { await backend.api.marketingUpdate({ id: post.id, posted: true }); await refreshMarketing(); }
  };

  const togglePosted = async () => {
    if (backend) { await backend.api.marketingUpdate({ id: post.id, posted: !post.posted }); await refreshMarketing(); }
  };

  // Mobile: hand to the OS share sheet (covers IG/FB/X). Desktop: open the menu.
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
      // FB can't prefill the caption — copy it so the user can paste.
      if (platform === 'facebook') {
        await navigator.clipboard.writeText(shareText);
        toast.success('Caption copied — paste it into your Facebook post');
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
    <Card variant="plain">
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
          {caption}
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
          <p className="pt-1 text-center text-body-sm text-ink-secondary">
            Facebook & Instagram don't accept pre-filled captions, so we copy yours to paste.
          </p>
        </div>
      </Sheet>
    </Card>
  );
}

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { LandingPageSettings, ProgramPublicResponse } from '@abundance/shared';
import { Button, Card, TextInput, Textarea, Eyebrow } from '@/components/ui';
import { ArrowRight, CheckIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { useApp } from '@/store';
import { toast } from '@/store/toast';
import { LANDING_THEMES, LANDING_THEME_IDS, resolveLanding } from '@/lib/landingTheme';
import { LandingView } from '@/pages/ProgramLandingPage';

// Landing Studio — creators style their public /p/:id page: pick a background
// color (button & text colors follow automatically), a background style, and a
// heading font, and rewrite the hero copy. The right-hand pane is a live,
// scaled-down render of the real landing page (same component).

const BACKGROUNDS: Array<{ value: LandingPageSettings['background']; label: string; note: string }> = [
  { value: 'solid', label: 'Solid', note: 'One calm color' },
  { value: 'gradient', label: 'Gradient', note: 'A soft fade' },
];
const FONTS: Array<{ value: LandingPageSettings['heading_font']; label: string; note: string }> = [
  { value: 'serif', label: 'Classic', note: 'Serif headings' },
  { value: 'sans', label: 'Modern', note: 'Sans-serif headings' },
];
const CORNERS: Array<{ value: LandingPageSettings['corners']; label: string; note: string }> = [
  { value: 'soft', label: 'Rounded', note: 'Soft, friendly corners' },
  { value: 'sharp', label: 'Square', note: 'Crisp, editorial edges' },
];

// Stand-in modules so the preview reads like a real page before a program exists.
const SAMPLE_MODULES = [
  { idx: 0, title: 'Find your footing', outcome: 'Get clear on where you are and where you want to go.', detail: '' },
  { idx: 1, title: 'Build the practice', outcome: 'Turn insight into a simple weekly rhythm.', detail: '' },
  { idx: 2, title: 'Make it stick', outcome: 'Leave with a plan you will actually follow.', detail: '' },
];

export function LandingStudioPage() {
  const { backend, profile, program, refreshProfile } = useApp();

  const saved = useMemo(() => resolveLanding(profile?.landing_page).settings, [profile?.landing_page]);
  const [draft, setDraft] = useState<LandingPageSettings>(saved);
  // "What's included" is edited as one-per-line text, parsed into the draft array.
  const [includedText, setIncludedText] = useState(saved.included.join('\n'));
  const [saving, setSaving] = useState(false);

  // Re-sync the draft whenever the stored settings change (e.g. after a save).
  useEffect(() => { setDraft(saved); setIncludedText(saved.included.join('\n')); }, [saved]);

  const set = <K extends keyof LandingPageSettings>(key: K, value: LandingPageSettings[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const onIncludedChange = (text: string) => {
    setIncludedText(text);
    set('included', text.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 8));
  };

  // Text fields store null for "use the default", so trim empties away on save.
  const normalized: LandingPageSettings = {
    ...draft,
    eyebrow: draft.eyebrow?.trim() || null,
    tagline: draft.tagline?.trim() || null,
    cta_label: draft.cta_label?.trim() || null,
    guide_heading: draft.guide_heading?.trim() || null,
    inside_eyebrow: draft.inside_eyebrow?.trim() || null,
    inside_heading: draft.inside_heading?.trim() || null,
    closing_heading: draft.closing_heading?.trim() || null,
    social_instagram: draft.social_instagram?.trim() || null,
    social_linkedin: draft.social_linkedin?.trim() || null,
    social_website: draft.social_website?.trim() || null,
  };
  const dirty = JSON.stringify(normalized) !== JSON.stringify(saved);

  const save = async () => {
    if (!backend) return;
    setSaving(true);
    try {
      await backend.reads.updateProfile({ landing_page: normalized });
      await refreshProfile();
      toast.success('Landing page updated');
    }
    catch { toast.error("Couldn't save — try again."); }
    finally { setSaving(false); }
  };

  const liveReady = program.program?.status === 'ready';
  const liveUrl = liveReady ? `/p/${program.program!.id}` : null;

  // The exact data shape the public page renders, with the draft injected.
  const previewData: ProgramPublicResponse = {
    program: {
      id: program.program?.id ?? 'preview',
      title: program.program?.title ?? 'Your program title',
      price_cents: program.program?.price_cents ?? 2000,
    },
    modules: program.modules.length
      ? program.modules.map((m) => ({ idx: m.idx, title: m.title, outcome: m.outcome, detail: m.detail }))
      : SAMPLE_MODULES,
    creator: {
      first_name: profile?.first_name ?? 'You',
      category: profile?.category ?? 'other',
      avatar_url: profile?.avatar_url ?? null,
      email: profile?.email ?? 'you@example.com',
      bio: profile?.bio ?? null,
      landing_page: draft,
    },
  };

  return (
    <div>
      {/* Header — sticky on desktop so Save stays reachable from deep in the controls. */}
      <div className="flex flex-wrap items-end justify-between gap-3 lg:sticky lg:top-0 lg:z-20 lg:-mx-2 lg:bg-bg/95 lg:px-2 lg:py-3 lg:backdrop-blur">
        <div>
          <h1 className="font-serif text-h1 font-medium text-ink">Your program page</h1>
          <p className="mt-1.5 text-body text-ink-secondary">
            Make the page participants see yours — colors, style, and the words that greet them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {liveUrl && (
            <a href={liveUrl} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="md" fullWidth={false} iconRight={<ArrowRight width={16} height={16} />}>
                View live page
              </Button>
            </a>
          )}
          <Button size="md" fullWidth={false} loading={saving} disabled={!dirty} onClick={save}>
            {dirty ? 'Save changes' : 'Saved'}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[340px,1fr] lg:items-start">
        {/* ---- Controls ---- */}
        <div className="space-y-6">
          {/* Background color — each preset fixes the bio box, button & text colors. */}
          <section>
            <Eyebrow className="mb-3">Background color</Eyebrow>
            <Card variant="plain" className="space-y-2">
              {LANDING_THEME_IDS.map((id) => {
                const t = LANDING_THEMES[id];
                const active = draft.theme === id;
                return (
                  <button
                    key={id}
                    onClick={() => set('theme', id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                      active ? 'border-primary bg-primary/5' : 'border-line hover:border-primary/40',
                    )}
                  >
                    {/* Swatch: the page background color (everything else follows from it) */}
                    <span className="h-6 w-6 shrink-0 rounded-pill border border-line" style={{ backgroundColor: t.bg }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-body-sm font-medium text-ink">{t.label}</span>
                      <span className="block truncate text-caption text-ink-secondary">{t.note}</span>
                    </span>
                    {active && <CheckIcon width={18} height={18} className="shrink-0 text-primary" />}
                  </button>
                );
              })}
              <p className="pt-1 font-mono text-data text-ink-secondary">
                Button &amp; text colors are matched to your background automatically.
              </p>
            </Card>
          </section>

          {/* Style */}
          <section>
            <Eyebrow className="mb-3">Style</Eyebrow>
            <Card variant="plain" className="space-y-4">
              <ChoiceRow label="Background" options={BACKGROUNDS} value={draft.background} onChange={(v) => set('background', v)} />
              <ChoiceRow label="Headings" options={FONTS} value={draft.heading_font} onChange={(v) => set('heading_font', v)} />
              <ChoiceRow label="Corners" options={CORNERS} value={draft.corners} onChange={(v) => set('corners', v)} />
            </Card>
          </section>

          {/* Copy */}
          <section>
            <Eyebrow className="mb-3">Words</Eyebrow>
            <Card variant="plain" className="space-y-3">
              <TextInput
                label="Badge"
                placeholder="Live group program"
                maxLength={60}
                helperText="The small label above your program title"
                value={draft.eyebrow ?? ''}
                onChange={(e) => set('eyebrow', e.target.value)}
              />
              <Textarea
                label="Tagline"
                rows={3}
                maxLength={200}
                placeholder="A step-by-step program built to move you forward."
                helperText="One sentence under the title — leave blank to use your first module's outcome"
                value={draft.tagline ?? ''}
                onChange={(e) => set('tagline', e.target.value)}
              />
              <TextInput
                label="Button text"
                placeholder="Enroll now"
                maxLength={40}
                helperText="What the big button says"
                value={draft.cta_label ?? ''}
                onChange={(e) => set('cta_label', e.target.value)}
              />
            </Card>
          </section>

          {/* Section titles */}
          <section>
            <Eyebrow className="mb-3">Section titles</Eyebrow>
            <Card variant="plain" className="space-y-3">
              <TextInput
                label="Guide card"
                placeholder="Meet your guide"
                maxLength={60}
                value={draft.guide_heading ?? ''}
                onChange={(e) => set('guide_heading', e.target.value)}
              />
              <TextInput
                label="Modules label"
                placeholder="A look inside the program"
                maxLength={60}
                value={draft.inside_eyebrow ?? ''}
                onChange={(e) => set('inside_eyebrow', e.target.value)}
              />
              <TextInput
                label="Modules title"
                placeholder="What you'll work through."
                maxLength={80}
                value={draft.inside_heading ?? ''}
                onChange={(e) => set('inside_heading', e.target.value)}
              />
              <TextInput
                label="Closing title"
                placeholder="Join us now."
                maxLength={80}
                helperText="Leave any of these blank to keep the default"
                value={draft.closing_heading ?? ''}
                onChange={(e) => set('closing_heading', e.target.value)}
              />
            </Card>
          </section>

          {/* What's included */}
          <section>
            <Eyebrow className="mb-3">What's included</Eyebrow>
            <Card variant="plain">
              <Textarea
                label="Bullet list"
                rows={5}
                placeholder={'8 live group sessions\n90-day money-back guarantee\nSmall group — 12 spots'}
                helperText={`One per line, up to 8 · shown under the price · ${draft.included.length}/8`}
                value={includedText}
                onChange={(e) => onIncludedChange(e.target.value)}
              />
            </Card>
          </section>

          {/* Social links */}
          <section>
            <Eyebrow className="mb-3">Social links</Eyebrow>
            <Card variant="plain" className="space-y-3">
              <TextInput
                label="Instagram"
                placeholder="instagram.com/you"
                maxLength={200}
                value={draft.social_instagram ?? ''}
                onChange={(e) => set('social_instagram', e.target.value)}
              />
              <TextInput
                label="LinkedIn"
                placeholder="linkedin.com/in/you"
                maxLength={200}
                value={draft.social_linkedin ?? ''}
                onChange={(e) => set('social_linkedin', e.target.value)}
              />
              <TextInput
                label="Website"
                placeholder="yourwebsite.com"
                maxLength={200}
                helperText="Shown as icons in your guide card — leave blank to hide"
                value={draft.social_website ?? ''}
                onChange={(e) => set('social_website', e.target.value)}
              />
            </Card>
          </section>
        </div>

        {/* ---- Live preview — sticky beside the scrolling controls (desktop);
             taller-than-viewport pages scroll inside the frame. ---- */}
        <section className="min-w-0 lg:sticky lg:top-24">
          <div className="mb-3 flex items-center justify-between">
            <Eyebrow>Live preview</Eyebrow>
            {!liveReady && (
              <span className="text-caption text-ink-secondary">Showing sample content until your program is ready</span>
            )}
          </div>
          <div className="overflow-hidden rounded-xl border border-line shadow-sm lg:max-h-[calc(100dvh-10rem)] lg:overflow-y-auto">
            <ScaledPreview>
              <LandingView data={previewData} onEnroll={() => { /* preview only */ }} />
            </ScaledPreview>
          </div>
        </section>
      </div>
    </div>
  );
}

// A labelled pair/triple of pill buttons (same pattern as Account's cadence picker).
function ChoiceRow<V extends string>({
  label, options, value, onChange,
}: {
  label: string;
  options: Array<{ value: V; label: string; note: string }>;
  value: V;
  onChange: (v: V) => void;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <div>
      <p className="text-body-sm font-medium text-ink">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={cn(
                'rounded-lg border px-3 py-2 text-body-sm font-medium transition-colors',
                active ? 'border-transparent bg-primary text-white' : 'border-line bg-surface-plain text-ink hover:border-primary/40',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {current && <p className="mt-1.5 font-mono text-data text-ink-secondary">{current.note}</p>}
    </div>
  );
}

// Renders children at desktop width (1200px) scaled down to fit the pane, so the
// preview shows the real desktop layout. Height tracks the scaled content.
const PREVIEW_W = 1200;

function ScaledPreview({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [height, setHeight] = useState(600);

  useLayoutEffect(() => {
    const measure = () => {
      const w = outerRef.current?.clientWidth ?? PREVIEW_W;
      const s = w / PREVIEW_W;
      setScale(s);
      setHeight((innerRef.current?.offsetHeight ?? 1200) * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outerRef.current) ro.observe(outerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="w-full overflow-hidden">
      <div style={{ height }}>
        <div
          ref={innerRef}
          className="pointer-events-none select-none"
          aria-hidden
          style={{ width: PREVIEW_W, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

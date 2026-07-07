import { Card, Eyebrow } from '@/components/ui';
import {
  HelpIcon,
  MicIcon,
  WandSparklesIcon,
  MegaphoneIcon,
  CardIcon,
} from '@/components/ui/icons';

// [Help] A calm reference page: how to run a good mentoring session, and how the
// AbundanceAI creation flow works end to end. Static guidance, no backend calls.

// The recommended split of a session's time, rendered as two labelled bars.
const SESSION_SPLIT = [
  { label: 'Share your knowledge, ideas, stories, or framework', range: '20–40 min', pct: 40 },
  { label: 'Discussion, exercises, personal guidance, and Q&A', range: 'The rest', pct: 60 },
];

type Step = {
  Icon: (p: { width?: number; height?: number }) => JSX.Element;
  title: string;
  lead?: string;
  bullets?: string[];
  outro?: string;
};

const STEPS: Step[] = [
  {
    Icon: MicIcon,
    title: 'Share your ideas and materials',
    lead:
      'Choose whether to create one to six mentoring sessions, or let AbundanceAI recommend the right number based on everything you share.',
    bullets: [
      'Speak naturally and talk through your ideas',
      'Type directly into the platform',
      'Upload notes, documents, presentations, or other materials',
      'Bring in useful content you have created with another AI',
    ],
    outro:
      "You don't need to organize everything first. Share as much as you can, and AbundanceAI will structure it for you.",
  },
  {
    Icon: WandSparklesIcon,
    title: 'Build your mentoring program',
    lead: 'When you are ready, select Build. AbundanceAI will create your mentoring sessions.',
    outro:
      'You can review the complete program, edit it, or create another version. Your previous builds remain available, so you can compare them and choose the sections you want to use.',
  },
  {
    Icon: MegaphoneIcon,
    title: 'Create your marketing and social media',
    lead:
      'Once you are happy with your program, AbundanceAI will help you create the marketing copy to share it with the world. Choose the formats you would like and receive multiple options for:',
    bullets: [
      'Program titles',
      'Program descriptions',
      'Invitations and outreach messages',
      'Social media posts',
      'Other promotional copy',
    ],
    outro:
      'You can select your favorites, edit the language, and create additional versions until it feels like you.',
  },
  {
    Icon: CardIcon,
    title: 'Set up payment',
    lead: 'Connect how you want to get paid so participants can join your program.',
  },
];

export function HelpPage() {
  return (
    <div className="-mx-5 -mt-4 min-h-[calc(100dvh-7rem)] bg-gradient-to-b from-surface to-bg px-5 pt-6">
      <div className="mx-auto max-w-calm">
        <Eyebrow className="mb-2 text-accent">Help</Eyebrow>
        <h1 className="flex items-center gap-2.5 font-serif text-h1 font-medium text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-pill bg-primary/10 text-primary">
            <HelpIcon width={20} height={20} />
          </span>
          Getting started
        </h1>
        <p className="mt-2 text-body text-ink-secondary">
          A quick guide to running a great session and building your program with AbundanceAI.
        </p>

        {/* Session format */}
        <Card className="mt-6">
          <Eyebrow className="text-accent">Recommended session format</Eyebrow>
          <h2 className="mt-2 font-serif text-h2 text-ink">Aim for 75–90 minutes</h2>
          <p className="mt-2 text-body text-ink-secondary">
            Most online group mentoring sessions work well at 75–90 minutes. We recommend:
          </p>
          <div className="mt-4 space-y-3">
            {SESSION_SPLIT.map((s) => (
              <div key={s.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-body-sm text-ink">{s.label}</span>
                  <span className="shrink-0 font-mono text-data text-ink-secondary">{s.range}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-pill bg-accent/15">
                  <div className="h-full rounded-pill bg-accent" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-body-sm text-ink-secondary">
            This creates a balance between sharing your expertise and giving participants the
            opportunity to engage, apply what they are learning, and receive support.
          </p>
        </Card>

        {/* Creation process */}
        <section className="mt-8">
          <Eyebrow className="mb-1 text-accent">How the creation process works</Eyebrow>
          <h2 className="font-serif text-h2 text-ink">From your ideas to a program you can sell</h2>
          <div className="mt-4 space-y-3">
            {STEPS.map(({ Icon, title, lead, bullets, outro }, i) => (
              <Card key={title} variant="plain">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-primary/10 text-primary">
                    <Icon width={20} height={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-data text-ink-secondary">STEP {i + 1}</p>
                    <h3 className="mt-0.5 text-h3 font-semibold text-ink">{title}</h3>
                    {lead && <p className="mt-2 text-body text-ink-secondary">{lead}</p>}
                    {bullets && (
                      <ul className="mt-3 space-y-2">
                        {bullets.map((b) => (
                          <li key={b} className="flex items-start gap-2.5 text-body-sm text-ink">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {outro && <p className="mt-3 text-body-sm text-ink-secondary">{outro}</p>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <p className="mt-8 pb-4 text-center text-body-sm text-ink-secondary">
          Still stuck? Reach out any time — we&apos;re here to help.
        </p>
      </div>
    </div>
  );
}

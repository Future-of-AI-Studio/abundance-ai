import { useMemo, useState } from 'react';
import { Card, Eyebrow } from '@/components/ui';
import { env } from '@/lib/env';
import {
  SearchIcon,
  PlusIcon,
  MinusIcon,
  MicIcon,
  PencilIcon,
  MegaphoneIcon,
  CardIcon,
  HeartHandshakeIcon,
  WandSparklesIcon,
  PlayIcon,
} from '@/components/ui/icons';

// [Help] The Guidance page: search, five expandable guide sections (bold
// headings only — click a heading for the details), popular questions, and
// video guides. Static guidance, no backend calls.

// TODO: set this once a polished demo program page exists (public pages live
// at /p/<program-id>). Until then the "example page" links are hidden.
const EXAMPLE_PROGRAM_PAGE_URL: string | null = null;

type GuideItem = {
  heading: string;
  bullets: string[];
  proTip?: boolean;
};

type Guide = {
  Icon: (p: { width?: number; height?: number }) => JSX.Element;
  title: string;
  items: GuideItem[];
};

const GUIDES: Guide[] = [
  {
    Icon: MicIcon,
    title: 'Start Here',
    items: [
      {
        heading: 'Begin with what you already know',
        bullets: [
          'You do not need to have your entire program figured out before you begin.',
          'Start with your knowledge, experience, ideas, stories, methods, or materials.',
          'Share as much or as little as you have now.',
          'AbundanceAI will help organize what you share into a clear mentoring program.',
        ],
      },
      {
        heading: 'Three ways to add your content',
        bullets: [
          'Speak: Talk through your ideas in your own words.',
          'Type: Write directly into the text fields.',
          'Upload: Add your notes, outlines, or other source material as PDF, text (.txt), or image files.',
          'If your material is in Word or PowerPoint, save it as a PDF first and upload that.',
          'You can use one method or combine all three.',
        ],
      },
      {
        heading: 'Voice input guidelines',
        bullets: [
          'Each voice recording can be up to 10 minutes.',
          'You can add up to 30 minutes of voice input altogether.',
          'Even if you already have strong written materials, we encourage you to include some voice input so your personality, natural language, and way of expressing ideas can come through.',
          'You do not need to speak perfectly or follow a prepared script.',
          'Talk naturally about what you know, who you want to help, and what you want participants to learn or experience.',
          'AbundanceAI will organize your thoughts for you.',
        ],
      },
      {
        heading: 'What to share',
        bullets: [
          'What you know deeply.',
          'What you enjoy helping other people to experience.',
          'Who your program is for.',
          'The results or transformation you want participants to receive.',
          'Topics you may want to cover.',
          'Stories, examples, exercises, methods, or resources you may want to include.',
          'Any existing notes or materials that could be useful.',
        ],
      },
      {
        heading: 'Choose your number of modules',
        bullets: [
          'Select the number of modules you want for your program.',
          'Or allow AbundanceAI to recommend the number of modules based on your content.',
          'You can review and adjust the structure before creating your next build.',
        ],
      },
      {
        heading: 'Pro tip: Bring in work you have already done with AI',
        proTip: true,
        bullets: [
          'Already using ChatGPT, Claude, Gemini, or another AI tool? Bring your strongest ideas and wording into AbundanceAI.',
          'You can paste in conversations, summaries, outlines, titles, or other content you have already developed.',
          'AbundanceAI will use that material to help build and organize your program.',
          "If you haven't used any other AI yet, that is totally fine. You can begin entirely within AbundanceAI.",
        ],
      },
      {
        heading: 'Pro tip: Spend extra time on your program title',
        proTip: true,
        bullets: [
          'Your title is one of the most important parts of attracting the right participants.',
          'Most people are not professional copywriters, so it can help to explore title ideas with an AI tool before finalizing yours.',
          'Ask for several options and continue refining them until the title feels clear, compelling, and true to your program.',
          'Bring your preferred title into AbundanceAI and continue personalizing it from there.',
          'It is not necessary to include another AI tool, but if you would like to explore, Microsoft Copilot is free and easy to use.',
        ],
      },
    ],
  },
  {
    Icon: PencilIcon,
    title: 'Create & Edit Your Program',
    items: [
      {
        heading: 'Create your first build',
        bullets: [
          'After adding your content, select Create a New Build.',
          'AbundanceAI will turn what you shared into a structured mentoring program.',
          'Each build creates a new version of your program.',
          'Your program will include content organized for each module.',
          "The number of modules will be based on the choice you made or AbundanceAI's recommendation.",
        ],
      },
      {
        heading: 'Review what AbundanceAI creates',
        bullets: [
          'Read through the full program structure.',
          'Review the content created for each module.',
          'Look for wording, ideas, and sections that feel especially strong.',
          'Notice anything you want to clarify, expand, remove, or change.',
          'The first build does not need to be your final program.',
        ],
      },
      {
        heading: 'Edit everything',
        bullets: [
          'Your module content is your own working guide for structuring, preparing, and leading each live mentoring session.',
          'Participants will not see it, so it does not need to be polished or perfect.',
          'They will only see the participant notes or other materials you send them.',
          'Change the wording so it sounds like you.',
          'Add your own stories, examples, exercises, or methods.',
          'Remove anything that does not belong.',
          'Reorganize the content when another sequence feels better.',
          'Adjust the module structure as your program becomes clearer.',
          'Keep refining until the program reflects your knowledge, approach, and voice.',
        ],
      },
      {
        heading: 'Create up to eight builds',
        bullets: [
          'You can create up to eight different builds.',
          'Each build gives you another opportunity to refine your content and generate a stronger version.',
          'Your early builds may help you discover what you really want your program to become.',
          'Later builds can become more focused and polished.',
        ],
      },
      {
        heading: 'Compare your builds',
        bullets: [
          'Every build is saved separately.',
          'Return to earlier builds at any time.',
          'Compare the structure, wording, and ideas across different versions.',
          'Keep the best parts from one build and combine them with the best parts from another.',
          'You do not need to choose one version exactly as it was generated.',
          'Mix, match, edit, and personalize until the program feels fully yours.',
        ],
      },
      {
        heading: 'Before creating another build',
        bullets: [
          'Review your latest version carefully.',
          'Edit your input or instructions to tell AbundanceAI what you want changed.',
          'Add more detail where the content feels too general.',
          'Remove or clarify ideas that are leading the program in the wrong direction.',
          'Be specific about what you want to keep.',
          'Then select Create a New Build again.',
        ],
      },
      {
        heading: 'Remember it is YOUR program',
        bullets: [
          'AbundanceAI gives you a strong starting point.',
          'You remain the expert and final decision-maker.',
          'Every part of the program should be reviewed and personalized by you.',
          'The goal is not simply to accept what AI creates.',
          'The goal is to use AI to help you create something that feels genuinely yours.',
        ],
      },
    ],
  },
  {
    Icon: MegaphoneIcon,
    title: 'Invite & Guide Your Group',
    items: [
      {
        heading: 'Create your marketing content',
        bullets: [
          'After completing a program build, you will be taken to the marketing section.',
          'AbundanceAI will create email and social media content based on that version of your program.',
          'The content will reflect your program title, audience, benefits, and module structure.',
        ],
      },
      {
        heading: 'Email invitations',
        bullets: [
          'Every mentor receives email copy.',
          'Use the emails to introduce your program and invite people to learn more or enroll.',
          'Personalize the wording before sending.',
          'Add personal details when reaching out to people who already know you.',
          'You can use the emails as written, combine different versions, or create your own final version from the strongest parts.',
        ],
      },
      {
        heading: 'Choose your social platforms',
        bullets: [
          'Select the platforms you already use:',
          'Facebook',
          'LinkedIn',
          'Instagram',
          'X, formerly Twitter',
        ],
      },
      {
        heading: 'Receive platform-specific content',
        bullets: [
          'AbundanceAI will create several examples for each platform you select.',
          'The copy will be written to suit the style and length of each platform.',
          'Review every post before publishing.',
          'Personalize the voice, examples, and call to action.',
          'Add an image, video, or personal story where appropriate.',
        ],
      },
      {
        heading: 'Create up to eight marketing rounds each month',
        bullets: [
          'Each time you generate marketing content, you create a new round.',
          'You can create up to eight rounds each month.',
          'Every round stays saved - new content never replaces your earlier rounds or edits.',
          'Each round gives you new wording and approaches to consider.',
          'Compare the different versions and keep your favorite lines from each.',
          'Combine and edit the strongest ideas until the copy feels natural and compelling.',
        ],
      },
      {
        heading: 'Start with people you would love to invite',
        bullets: [
          'Make a list of people who may genuinely benefit from your program.',
          'Begin with people who already know, trust, or understand your work.',
          'Reach out personally rather than relying only on public posts.',
          'Tell them why you thought of them specifically.',
          'Invite a conversation rather than a sales pitch.',
          'Ask interested people what questions they have.',
          'Use their responses to improve your messaging.',
        ],
      },
      {
        heading: 'After people enroll',
        bullets: [
          'Whenever someone enrolls, you will be notified via email and receive their contact information.',
          'You can begin your live mentoring sessions when you have the group size you want, whether that is 2 people or 20.',
          'Contact participants directly by email to welcome them, coordinate session times, and share meeting details, reminders, and updates.',
          'If you already have a paid Zoom account, we recommend using it for your live sessions. Otherwise, create a free Google account and use Google Meet.',
        ],
      },
      {
        heading: 'Prepare to guide your live sessions',
        bullets: [
          'Review the content for each module before the session.',
          'Decide what you want to explain, demonstrate, discuss, or help participants practice.',
          'Add personal stories and examples that bring the material to life.',
          'Most group mentoring sessions work well at 75–90 minutes, although you can choose the length that best fits your program.',
          'As a helpful guideline, plan to spend about 20–40 minutes sharing your knowledge, approach, or framework.',
          'Use the rest of the session for the part participants often value most: discussion, questions, exercises, individual guidance, and learning from one another.',
          'Invite people to participate rather than only listen. Group mentoring is most powerful when members can apply what they are learning and receive support from you in real time.',
          'Think of your session as a guided experience, not simply a presentation. The interaction is what makes it different from watching a video or attending a lecture.',
        ],
      },
    ],
  },
  {
    Icon: CardIcon,
    title: 'Your Program Page & Payments',
    items: [
      {
        heading: 'Your Program Page',
        bullets: [
          'Every program includes a customizable Program Page.',
          'This is the page you will share with people who may want to join your program.',
          'Visitors can learn about your program, review the modules, learn about you, and enroll.',
          'AbundanceAI adds the module descriptions from the program you created.',
          'You can personalize almost everything else on the Program Page.',
        ],
      },
      {
        heading: 'Make the page your own',
        bullets: [
          'Review every section before sharing it.',
          'Replace general wording with language that sounds like you.',
          'Make sure the benefits are clear to someone who does not already understand your work.',
          'Check that your title, program description, and module information all feel compelling.',
          'Preview the full page before publishing or sharing the link.',
        ],
      },
      {
        heading: 'Share your Program Page',
        bullets: [
          'Send the link through personal email.',
          'Include it in your AbundanceAI email invitations.',
          'Share it on the social platforms you use.',
          'Send it through text, WhatsApp, or other communities where appropriate.',
          'Use it as the central place where people can learn about your program and enroll.',
        ],
      },
      {
        heading: 'Connect Stripe',
        bullets: [
          'Connect an existing Stripe account or follow our guidelines to create a new one.',
          'Stripe allows participants to pay you directly.',
          'Your program revenue goes into your own Stripe account.',
          'AbundanceAI does not take a percentage of your program sales.',
        ],
      },
      {
        heading: 'Manage your own payments',
        bullets: [
          'You choose the price for your program.',
          'You receive payments directly through Stripe.',
          'You can review payments and transactions in your Stripe account.',
          'You are responsible for issuing any participant refunds through your Stripe account.',
          "Review Stripe's account requirements and processing fees when setting up your account.",
        ],
      },
      {
        heading: 'Your account',
        bullets: [
          'Keep your name, contact information and bio for your Program Page current.',
          'Update your password and account settings when needed.',
          'Make sure the information connected to your Program Page and Stripe account is accurate.',
        ],
      },
    ],
  },
  {
    Icon: HeartHandshakeIcon,
    title: 'Mindset & Peer Support',
    items: [
      {
        heading: 'Your knowledge and the best AI tools are only part of the journey',
        bullets: [
          'Creating a successful mentoring program is not only about your expertise and the latest tech.',
          'It also takes confidence, clarity, momentum, and the passion to share your gifts.',
          'Doubt, hesitation, and feeling stuck are normal parts of creating something new.',
          'AbundanceAI supports both the practical work and the personal growth behind it.',
        ],
      },
      {
        heading: 'Mindset coaching whenever you need it',
        bullets: [
          'Mindset coaching is available 24/7.',
          'Use it whenever you feel uncertain, overwhelmed, discouraged, or stuck.',
          'Get help moving through fears about being visible, inviting people, or leading a group.',
          'Talk through decisions when you are unsure what to do next.',
          'Receive encouragement and practical guidance to help you keep moving.',
          'Return whenever you need a fresh perspective or an extra boost.',
        ],
      },
      {
        heading: 'You do not need to feel fully confident before beginning',
        bullets: [
          'Confidence often grows through taking action.',
          'You do not need to have every answer before sharing what you know.',
          'Your program does not need to be perfect before you invite your first group.',
          'Small, consistent steps can help you develop trust in yourself and your work.',
          'Mindset coaching can help you identify the next step rather than trying to solve everything at once.',
        ],
      },
      {
        heading: 'Human support and community',
        bullets: [
          'Building and launching a program can feel easier when other people are beside you.',
          'The AbundanceAI community gives you a place to learn, connect, and grow with others creating their own programs.',
          'Learn from what other mentors are experimenting with and discovering.',
          'Share questions, progress, challenges, and breakthroughs.',
          "Celebrate one another's success.",
        ],
      },
      {
        heading: 'Small peer support teams',
        bullets: [
          'You can choose to join a small peer support team.',
          'Teams are designed to provide encouragement, accountability, fresh ideas, and human connection.',
          'Encourage each other to keep going when doubts or obstacles arise.',
          'Learn from the different experience and perspectives within the group.',
          'Grow together as you create and launch your programs.',
        ],
      },
    ],
  },
];

type Faq = { q: string; a: string };

const FAQS: Faq[] = [
  {
    q: 'How many mentoring sessions should I create?',
    a: 'You can create anywhere from one to six sessions. If you are not sure, let AbundanceAI recommend the right number based on the ideas and materials you share. You can always adjust the number afterward.',
  },
  {
    q: 'How long should each session be?',
    a: 'Most online group mentoring sessions work well at 75–90 minutes. You might spend 20–40 minutes sharing your knowledge, approach, or framework, then use the remaining time for discussion, exercises, individual guidance, and Q&A.',
  },
  {
    q: 'What can I share as source material?',
    a: 'You can speak your ideas aloud, type or paste text directly into AbundanceAI, or upload your notes and materials as PDF, text (.txt), or image files. If something is in Word or PowerPoint, save it as a PDF first and upload that. You can also include useful content you have created with another AI. You do not need to organize everything first. AbundanceAI will help structure it for you.',
  },
  {
    q: 'Can I edit what AbundanceAI builds?',
    a: 'Yes. You can review and edit every part of your program or create a new version. Your previous builds remain available, so you can compare versions and combine the sections and wording you like best.',
  },
  {
    q: 'What is a build?',
    a: 'A build is a new AI-generated version of your mentoring program. Each time you create a build, AbundanceAI uses your latest ideas, materials, and edits to generate the content for your sessions.',
  },
  {
    q: 'How many builds can I create?',
    a: 'You can create up to eight builds. Your previous versions stay available, allowing you to compare them and combine your favorite ideas, sections, and wording.',
  },
  {
    q: 'How much can I share by voice?',
    a: 'Each voice recording can be up to 10 minutes, with up to 30 minutes of voice input altogether. You can also combine voice recordings with typed text and uploaded materials.',
  },
  {
    q: 'What marketing content will AbundanceAI create for me?',
    a: 'After each program build, AbundanceAI creates email copy and several examples tailored to each social platform where you have a presence, including Facebook, LinkedIn, Instagram, and X.\n\nYou can create up to eight rounds of marketing content each month, and every round stays saved, giving you a rich library of posts and messages to personalize, combine, and post through your own social media accounts over time to promote your program.',
  },
  {
    q: 'What is my Program Page?',
    a: 'Your Program Page is the customizable page people visit to learn about your program, review the sessions, learn about you, and enroll. You can personalize the wording, colors, pricing, and other details before sharing it.',
  },
  {
    q: 'How do I get paid by participants?',
    a: 'Connect your own Stripe account or follow the steps we provide to create one. Participant payments go directly through Stripe to your connected bank account or debit card. AbundanceAI never holds your money or takes a percentage of your program sales.',
  },
  {
    q: 'What is mindset coaching?',
    a: 'Mindset coaching helps you move through the doubts, fears, and uncertainty that can arise while creating and launching your program. It is available 24/7 whenever you need encouragement, clarity, a fresh perspective, or help deciding what to do next.',
  },
  {
    q: 'What are peer support teams?',
    a: 'Peer support teams are small groups of AbundanceAI members who encourage one another as they create and launch their programs. Members can share ideas, ask for feedback, stay accountable, celebrate progress, and learn from one another. Joining a peer support team is not required.',
  },
];

// Videos live in the public `guides` Supabase storage bucket (hosted project,
// uploaded via `supabase storage cp`), configured via VITE_GUIDES_BUCKET_URL.
// A guide without a src (or an unset bucket URL) renders as "Coming soon".
type VideoGuide = { title: string; blurb: string; src?: string };

const guideVideo = (file: string) =>
  env.guidesBucketUrl ? `${env.guidesBucketUrl}/${file}` : undefined;

const VIDEOS: VideoGuide[] = [
  {
    title: 'Set Yourself Up for a Successful First Program',
    blurb: 'Clarify who you would most love to support, choose the program topic they will be most excited to join, and approach your first offering as an enjoyable learning experience and real-world test.',
    src: guideVideo('guidance-1.mp4'),
  },
  {
    title: 'Make it yours: editing & rebuilding',
    blurb: 'Edit any section, create new builds, and combine the best of each version until the program sounds like you.',
  },
  {
    title: 'Launch: your Program Page, payments & invitations',
    blurb: 'Personalize your Program Page, connect Stripe, and use your marketing content to invite your first group.',
  },
];

export function HelpPage() {
  const [query, setQuery] = useState('');
  const [openFaq, setOpenFaq] = useState(-1);
  // Which guide items are expanded, keyed as "<guide title>-<item heading>".
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) =>
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const q = query.trim().toLowerCase();

  // When searching, keep only the guide items that match and drop empty guides.
  const guides = useMemo(() => {
    if (!q) return GUIDES;
    return GUIDES.map((g) => ({
      ...g,
      items: g.items.filter((it) =>
        (g.title + ' ' + it.heading + ' ' + it.bullets.join(' ')).toLowerCase().includes(q),
      ),
    })).filter((g) => g.items.length > 0);
  }, [q]);

  const faqs = useMemo(
    () => (q ? FAQS.filter((f) => (f.q + ' ' + f.a).toLowerCase().includes(q)) : FAQS),
    [q],
  );

  const videos = useMemo(
    () => (q ? VIDEOS.filter((v) => (v.title + ' ' + v.blurb).toLowerCase().includes(q)) : VIDEOS),
    [q],
  );

  return (
    <div>
      {/* Hero — page title over the whole guidance page */}
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow className="text-accent">Guidance</Eyebrow>
        <h1 className="mt-2 font-serif text-h1 font-medium text-ink">How can we help?</h1>
        <p className="mx-auto mt-2 max-w-md text-body text-ink-secondary">
          Explore the questions and guides below, or search for a topic, to get the most out of AbundanceAI.
        </p>
      </div>

      {/* Popular questions + contact rail */}
      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <section>
          <h2 className="font-serif text-h2 text-ink">Frequently Asked Questions</h2>

          {faqs.length === 0 ? (
            <p className="mt-4 text-body-sm text-ink-secondary">No questions match “{query}”.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {faqs.map((f) => {
                const idx = FAQS.indexOf(f);
                const isOpen = openFaq === idx;
                return (
                  <Card key={f.q} variant="plain" className="p-0">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                      className="flex w-full items-center justify-between gap-4 p-5 text-left"
                    >
                      <span className="text-h3 font-semibold text-primary">{f.q}</span>
                      <span className="shrink-0 text-accent">
                        {isOpen ? <MinusIcon width={18} height={18} /> : <PlusIcon width={18} height={18} />}
                      </span>
                    </button>
                    {isOpen && <p className="whitespace-pre-line px-5 pb-5 text-body-sm text-ink-secondary">{f.a}</p>}
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* <aside className="space-y-4 lg:sticky lg:top-6">
          <Card variant="plain" className="border border-accent/25 bg-accent/5">
            <Eyebrow className="text-accent">Still stuck?</Eyebrow>
            <p className="mt-2 text-body-sm text-ink-secondary">
              Reach out any time - we usually reply within a day.
            </p>
            <Button className="mt-4" iconLeft={<ChatIcon width={18} height={18} />}>
              Contact support
            </Button>
          </Card>
        </aside> */}
      </div>

      {/* Guides — five sections, bold headings only until expanded */}
      <section className="mt-10">
        <h2 className="font-serif text-h2 text-ink">Your Complete AbundanceAI Guide</h2>

        {guides.length === 0 ? (
          <p className="mt-4 text-body-sm text-ink-secondary">No guides match “{query}”.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {guides.map((guide) => {
              const guideIdx = GUIDES.findIndex((g) => g.title === guide.title);
              const { Icon } = guide;
              return (
                <Card key={guide.title} variant="plain" className="p-0">
                  <div className="flex items-center gap-3 border-b border-line p-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon width={20} height={20} />
                    </span>
                    <div>
                      <h3 className="text-h3 font-semibold text-ink">{guide.title}</h3>
                    </div>
                  </div>

                  <div className="divide-y divide-line">
                    {guide.items.map((item) => {
                      const key = `${guide.title}-${item.heading}`;
                      const isOpen = openItems.has(key);
                      return (
                        <div key={item.heading}>
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            onClick={() => toggleItem(key)}
                            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                          >
                            <span
                              className={`text-body font-semibold ${item.proTip ? 'text-accent' : 'text-primary'}`}
                            >
                              {item.proTip && (
                                <WandSparklesIcon
                                  width={16}
                                  height={16}
                                  aria-hidden
                                  className="mr-2 inline-block align-[-2px]"
                                />
                              )}
                              {item.heading}
                            </span>
                            <span className="shrink-0 text-accent">
                              {isOpen ? <MinusIcon width={18} height={18} /> : <PlusIcon width={18} height={18} />}
                            </span>
                          </button>
                          {isOpen && (
                            <ul className="space-y-2 px-5 pb-5">
                              {item.bullets.map((b) => (
                                <li key={b} className="flex gap-2 text-body-sm leading-relaxed text-ink-secondary">
                                  <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                                  <span>{b}</span>
                                </li>
                              ))}
                              {guide.title === 'Your Program Page & Payments' &&
                                item.heading === 'Your Program Page' &&
                                EXAMPLE_PROGRAM_PAGE_URL && (
                                  <li className="flex gap-2 text-body-sm leading-relaxed text-ink-secondary">
                                    <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/60" />
                                    <span>
                                      See an example:{' '}
                                      <a
                                        href={EXAMPLE_PROGRAM_PAGE_URL}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="font-semibold text-primary underline underline-offset-2"
                                      >
                                        example Program Page
                                      </a>
                                    </span>
                                  </li>
                                )}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Video guides — recorded walkthroughs; guides without a video yet show
          a "Coming soon" placeholder. */}
      {videos.length > 0 && (
        <section className="mt-10">
          <Eyebrow className="mb-1 text-accent">Video Coaching & Insights</Eyebrow>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => (
              <Card key={v.title} variant="plain" className="flex h-full flex-col p-0">
                {v.src ? (
                  <video
                    src={v.src}
                    controls
                    preload="metadata"
                    playsInline
                    className="aspect-video w-full rounded-t-lg bg-ink-deep"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-t-lg bg-primary/10">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-plain text-primary shadow-sm">
                      <PlayIcon width={22} height={22} />
                    </span>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-h3 font-semibold text-ink">{v.title}</h3>
                  <p className="mt-1 flex-1 text-body-sm text-ink-secondary">{v.blurb}</p>
                  {!v.src && <p className="mt-3 font-mono text-data text-ink-secondary">Coming soon</p>}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Search — filters the questions, guides, and videos on this page */}
      <section className="mx-auto mt-10 max-w-2xl">
        <div className="text-center">
          <Eyebrow className="text-accent">Search</Eyebrow>
          <h2 className="mt-1 font-serif text-h2 text-ink">Looking for something specific?</h2>
        </div>
        <div className="relative mt-4">
          <SearchIcon
            width={20}
            height={20}
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-secondary"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a topic, e.g. “session length”"
            className="h-12 w-full rounded-pill border border-line bg-surface-plain pl-11 pr-14 text-body text-ink shadow-sm outline-none placeholder:text-ink-secondary/60 focus:border-primary"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-surface px-2 py-1 font-mono text-eyebrow uppercase tracking-wide text-ink-secondary sm:block">
            ⌘K
          </kbd>
        </div>
      </section>

    </div>
  );
}

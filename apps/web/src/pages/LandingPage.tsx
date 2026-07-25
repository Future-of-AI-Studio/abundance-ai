import { useEffect, useRef, useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useApp } from '@/store';

// [01] Landing — port of "AbundanceAI Landing v17.dc.html" (claude.ai/design
// project 5affb7dc-41b7-49bc-a3d4-70c30615697f). The design is styled inline,
// so this page mirrors that: inline styles plus one scoped <style> block for
// the animation classes/keyframes. IntersectionObservers replace the design's
// poll-based wiring; media queries replace its JS applyLayout(). Art assets
// (full-res Canva exports the design references) live in /public/landing/.

const ASSET = {
  heroFlow: '/landing/hero-flow.png',
  heroPanel: '/landing/hero-panel.png',
  whoFlowBg: '/landing/who-flow-bg.png',
  ribbonV4: '/landing/ribbon-teal-gold-v4.png',
  ribbonV3: '/landing/ribbon-teal-gold-v3.png',
  pillarsDivider: '/landing/wave-divider-pillars.png',
  pricingTestiDivider: '/landing/wave-divider-pricing-testi.png',
  testiProgramsDivider: '/landing/wave-divider-testi-programs.png',
  sunrise: '/landing/proof-sunrise-v6.png',
};

const GOLD_GRAD = 'linear-gradient(799deg, #F59C30, #F8BF39)';

const goldTextGrad: React.CSSProperties = {
  background: GOLD_GRAD,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  fontStyle: 'italic',
};

const blueBadge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#65ADCF',
  backgroundColor: '#65ADCF1F',
  border: '1px solid #65ADCF47',
  borderRadius: 999,
  whiteSpace: 'nowrap',
};

// Nav tabs in page order; `section` is the element id the scroll-spy tracks.
const NAV_LINKS = [
  { label: 'Home', href: '#top', section: 'top' },
  { label: 'Who It’s For', href: '#community', section: 'community' },
  { label: 'How It Works', href: '#how', section: 'how' },
  { label: 'What You Get', href: '#pillars', section: 'pillars' },
  { label: 'Pricing', href: '#start-today', section: 'start-today' },
] as const;

const WHO_CARDS = [
  {
    variant: 'who-card-orange',
    width: 380,
    label: 'Subject Experts',
    labelGrad: GOLD_GRAD,
    role: 'Breathwork Practitioner',
    lead: 'Years of 1-on-1 clients:',
    body: 'Would you love to help more people, guide online groups and make more money?',
  },
  {
    variant: 'who-card-teal',
    width: 390,
    label: 'Experienced Professionals',
    labelGrad: GOLD_GRAD,
    role: 'Divorce Attorney',
    lead: 'Deep expertise, billed by the hour:',
    body: 'Want to expand your reach & income through online group mentoring programs while making better use of your time?',
  },
  {
    variant: 'who-card-purple',
    width: 380,
    label: 'Master Hobbyists',
    labelGrad: 'linear-gradient(180deg, #F59C30, #F8BF39)',
    role: 'Fly Fisherman',
    lead: 'Decades of passion & mastery:',
    body: 'Can you imagine sharing what you love with more people as your gift to the world, and maybe even getting paid for it?',
  },
] as const;

const STEPS = [
  {
    no: '01',
    numColor: '#F59C30',
    numSize: 40,
    titleColor: '#E8932C',
    title: 'Share your Knowledge',
    arrow: { color: '#E8932C', glow: '#E8932C', top: 13 },
    body: (
      <>
        Upload your notes or just talk. Messy is fine, the <b>AI listens</b>.
      </>
    ),
  },
  {
    no: '02',
    numColor: '#88C4E0',
    numSize: 40,
    titleColor: '#88C4E0',
    title: 'Build with AI',
    arrow: { color: '#88C4E0', glow: '#3FA9A0', top: 16 },
    body: (
      <>
        The <b>AI structures</b> a <b>3-6 module program</b> that appears in minutes. Yours to shape.
      </>
    ),
  },
  {
    no: '03',
    numColor: '#FFA0AA',
    numSize: 40,
    titleColor: '#FFA0AA',
    title: 'Launch with Confidence',
    titleWidth: 270,
    arrow: { color: '#FFA0AA', glow: '#E05A3A', top: 16 },
    body: (
      <>
        <b>Marketing written for you</b>, plus coaching at every wall.
      </>
    ),
  },
  {
    no: '04',
    numColor: '#7BD1E0',
    numSize: 32,
    titleColor: '#7BD1E0',
    title: 'Invite Your First Group',
    arrow: null,
    body: (
      <>
        A <b>matched circle</b> and weekly expert talks keep you going.
      </>
    ),
  },
] as const;

const PILLARS = [
  {
    gradId: 'lp17ArcGold',
    stop: '#E8932C',
    label: 'AI BUILDER',
    labelColor: '#E8932C',
    body: (
      <>
        Latest AI to build with you: <strong>content, programs, marketing copy</strong> and more, in
        minutes.
      </>
    ),
  },
  {
    gradId: 'lp17ArcTeal',
    stop: '#88C4E0',
    label: 'Mindset Support',
    labelColor: '#88C4E0',
    body: (
      <>
        <b>Private AI coach</b> always there for you 24/7.
      </>
    ),
  },
  {
    gradId: 'lp17ArcLav',
    stop: '#FFA0AA',
    label: 'PEER CIRCLES',
    labelColor: '#FFA0AA',
    body: (
      <>
        <b>A matched group of 3-5 people</b> on the same path, plus weekly expert talks.
      </>
    ),
  },
] as const;

const TESTIMONIALS = [
  {
    color: '#E8932C',
    quote: (
      <>
        I finally turned what I know into <strong>a course I’m proud to sell</strong>, and making
        income I love.
      </>
    ),
    name: 'Maya L.',
    role: 'Wellness Coach',
  },
  {
    color: '#88C4E0',
    quote: (
      <>
        AbundanceAI gave me the <strong>structure and confidence</strong> to launch my first program
        fast.
      </>
    ),
    name: 'Daniel T.',
    role: 'Leadership Mentor',
  },
  {
    color: '#FFA0AA',
    quote: (
      <>
        The support from my peer circle is everything, <strong>real feedback, real growth</strong>,
        every single week.
      </>
    ),
    name: 'Priya S.',
    role: 'Creativity Guide',
  },
] as const;

const START_TODAY_INCLUDES = [
  'Your 1–6 module program, built by AI',
  'Social posts written and ready',
  'Mindset coaching at every step',
  'A peer circle & weekly expert talks',
] as const;

// Guide photo crops replicate the design's <image-slot> geometry: cover-fit
// baseline in a 64px circle, then the stored per-slot pan (x in frame-%).
const PROGRAMS = [
  {
    title: 'The Conscious Consumer',
    sub: 'Unmasking Processed Foods for a Healthy Future',
    cardStyle: { background: '#000000', border: '1px solid rgba(255,255,255,0.08)' },
    titleColor: '#FFFFFF',
    subColor: '#C9C9C9',
    tagColor: '#FFD54F',
    panelStyle: {
      background: 'linear-gradient(160deg, #6E6E6E, #1A1A1A)',
      border: '1px solid rgba(255,255,255,0.08)',
    },
    guideLabelColor: '#FFD54F',
    guide: 'Mary Rocha',
    guideColor: '#FFFFFF',
    img: '/landing/prog-guide-1.webp',
    imgBox: { width: '100%', height: '133.34%', left: '50%', top: '50%' },
    checkColor: '#FFD54F',
    bulletColor: '#cfcfcf',
    bullets: ['4 live 75 minute Zoom meetings', 'Experiential', 'Learn to identify processed foods'],
  },
  {
    title: 'The Sovereign Feminine',
    sub: 'Reclaiming the Lost Wisdom of Mary Magdalene',
    cardStyle: { background: '#FBF6F1', border: '1px solid rgba(178,90,52,0.14)' },
    titleColor: '#1A1A1A',
    subColor: '#4A4A52',
    tagColor: '#2F6B57',
    panelStyle: {
      background: 'linear-gradient(160deg, #E6EDE4, #F3E4DA)',
      border: '1px solid rgba(178,90,52,0.14)',
    },
    guideLabelColor: '#B25A34',
    guide: 'Christiane “Christy” Grace Michaels',
    guideColor: '#1A1A1A',
    img: '/landing/prog-guide-2.webp',
    imgBox: { width: '150.59%', height: '100%', left: '32.5%', top: '50%' },
    checkColor: '#2F6B57',
    bulletColor: '#1A1A1A',
    bullets: null, // design shows skeleton bars here
  },
  {
    title: 'The Art of Becoming the Realized Self',
    sub: 'A journey to conscious creation, flow and abundance.',
    cardStyle: { background: '#FBF6F1', border: '1px solid rgba(178,90,52,0.14)' },
    titleColor: '#1A1A1A',
    subColor: '#4A4A52',
    tagColor: '#2F6B57',
    panelStyle: {
      background: 'linear-gradient(160deg, #E6EDE4, #F3E4DA)',
      border: '1px solid rgba(178,90,52,0.14)',
    },
    guideLabelColor: '#B25A34',
    guide: 'Victoria Marie von Gorski',
    guideColor: '#1A1A1A',
    img: '/landing/prog-guide-3.webp',
    imgBox: { width: '150.59%', height: '100%', left: '58.13%', top: '50%' },
    checkColor: '#2F6B57',
    bulletColor: '#1A1A1A',
    bullets: ['Special Introductory Rate', '4 Live group sessions', 'Group Chat Support'],
  },
  {
    title: 'Your Group Mentoring Launchpad',
    sub: 'Your idea. Your people. Your impact.',
    cardStyle: { background: '#FFFFFF', border: '1px solid rgba(26,26,26,0.08)' },
    titleColor: '#1A1A1A',
    subColor: '#4A4A52',
    tagColor: '#FF7F50',
    panelStyle: {
      background: 'linear-gradient(160deg, #FDF7F5, #FBEEE8)',
      border: '1px solid rgba(255,127,80,0.16)',
    },
    guideLabelColor: '#FF7F50',
    guide: 'Ruby Yeh',
    guideColor: '#1A1A1A',
    img: '/landing/prog-guide-4.webp',
    imgBox: { width: '100%', height: '100%', left: '50%', top: '50%' },
    checkColor: '#FF7F50',
    bulletColor: '#1A1A1A',
    bullets: [
      '3 Live 90 Minute Group Sessions',
      'Personal Attention in Small Groups',
      'Mindset Coaching 24/7 via AI',
    ],
  },
] as const;

const FOOT_COLS = [
  {
    heading: 'Product',
    links: [
      { label: 'How It Works', href: '#how' },
      { label: 'Features', href: '#pillars' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Updates', href: '#' },
    ],
  },
  {
    heading: 'Community',
    links: [
      { label: 'Peer Circles', href: '#pillars' },
      { label: 'Events', href: '#' },
      { label: 'Success Stories', href: '#' },
      { label: 'Blog', href: '#' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Mission', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
] as const;

const SOCIALS = [
  {
    label: 'Instagram',
    path: (
      <>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </>
    ),
  },
  {
    label: 'YouTube',
    path: (
      <>
        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <path d="m10 15 5-3-5-3z" />
      </>
    ),
  },
  {
    label: 'LinkedIn',
    path: (
      <>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </>
    ),
  },
  {
    label: 'Email',
    path: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </>
    ),
  },
] as const;

// Scoped stylesheet: animation classes/keyframes + responsive overrides that
// the design handled with its DCLogic applyLayout() script.
const CSS = `
.lp17 {
  --ink:#22293D; --ink-2:#5B6072; --ink-3:#8C8FA0; --hair:rgba(34,41,61,0.10);
  --gold-1:#F0A93C; --gold-2:#E8932C; --teal:#1FA89B;
  --display:'Playfair Display',serif; --body:'Inter',system-ui,sans-serif;
}
.lp17 ::selection { background:#FBDFAE; color:var(--ink); }
.lp17 button { font: inherit; }
.lp17 .eyebrow { font-size:12px; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; }
.lp17 .btn-gold { background:linear-gradient(100deg,var(--gold-1),var(--gold-2)); box-shadow:0 12px 28px rgba(232,147,44,0.32); transition:filter 180ms ease, transform 180ms ease, box-shadow 180ms ease; }
.lp17 .btn-gold:hover { filter:brightness(1.05); transform:translateY(-2px); box-shadow:0 18px 38px rgba(232,147,44,0.42); }
.lp17 .lnk { transition:gap 180ms ease; }
.lp17 .lnk:hover { gap:11px !important; }
.lp17 .navlink { transition:color 160ms ease; }
.lp17 .footlink { transition:color 160ms ease; }
.lp17 .footlink:hover { color:#F6C36B !important; }
.lp17 .lp17-balance { text-wrap:balance; }
.lp17 .lp17-pretty { text-wrap:pretty; }

.lp17 .who-card { border-radius:22px; margin:-14px; padding:22px 18px !important; border:1px solid transparent; background:transparent; backdrop-filter:blur(0px); -webkit-backdrop-filter:blur(0px); box-shadow:none; transition:background .7s ease, border-color .7s ease, box-shadow .7s ease, backdrop-filter .7s ease, transform .7s ease; }
.lp17 .who-card:hover, .lp17 .who-card.seq-active { background:rgba(255,255,255,0.4); backdrop-filter:blur(14px) saturate(140%); -webkit-backdrop-filter:blur(14px) saturate(140%); transform:translateY(-4px); }
.lp17 .who-card-orange:hover, .lp17 .who-card-orange.seq-active { border-color:rgba(255,92,37,0.35); box-shadow:0 12px 34px rgba(255,92,37,0.18), inset 0 1px 0 rgba(255,255,255,0.6); }
.lp17 .who-card-teal:hover, .lp17 .who-card-teal.seq-active { border-color:rgba(101,173,207,0.35); box-shadow:0 12px 34px rgba(101,173,207,0.18), inset 0 1px 0 rgba(255,255,255,0.6); }
.lp17 .who-card-purple:hover, .lp17 .who-card-purple.seq-active { border-color:rgba(124,92,191,0.35); box-shadow:0 12px 34px rgba(124,92,191,0.18), inset 0 1px 0 rgba(255,255,255,0.6); }

.lp17 .step-item.step-in { opacity:1 !important; transform:translateY(0) !important; }
.lp17 .step-item.step-in .step-arrow { transition:stroke-dashoffset 1s ease-out .5s; stroke-dashoffset:0; }
.lp17 .step-item.step-in .step-arrowhead { transition:opacity .4s ease 1.6s; opacity:1 !important; }
.lp17 .step-item h3 { transition:color .3s ease, text-shadow .3s ease, transform .3s ease; }
.lp17 .step-item:hover h3 { transform:translateY(-2px); text-shadow:0 0 18px currentColor; }
.lp17 .step-light { offset-distance:0%; opacity:0; }
@keyframes lp17StepLightTravel { 0% { offset-distance:0%; opacity:1; } 100% { offset-distance:100%; opacity:1; } }
.lp17 .step-item:hover .step-light { animation:lp17StepLightTravel 1s ease-in-out forwards; opacity:1 !important; }

.lp17 .pillar-arc { transition:stroke-dashoffset 1s ease-out; }
.lp17 .pillar-item.pillar-in .pillar-arc { stroke-dashoffset:0 !important; }
.lp17 .pillar-item.pillar-in .pillar-text { opacity:1 !important; transform:translateY(0) !important; }

@keyframes lp17Rise { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
.lp17 .reveal { animation:lp17Rise 0.8s cubic-bezier(.22,.61,.36,1) both; }
.lp17 .scroll-fade { opacity:0; transform:translateY(24px); transition:opacity 1s ease-out, transform 1s ease-out; animation:none; }
.lp17 .scroll-fade.in-view { opacity:1; transform:none; }

@keyframes lp17HeroWaveReveal { from { opacity:0.92; clip-path:inset(0 0 0 100%); } to { opacity:0.92; clip-path:inset(0 0 0 0); } }
.lp17 .hero-wave-anim { opacity:0; animation:lp17HeroWaveReveal 3.2s ease-out 0.2s forwards; }
@keyframes lp17WaveBackRevealDim { from { opacity:0.5; clip-path:inset(0 100% 0 0); } to { opacity:0.5; clip-path:inset(0 0 0 0); } }
.lp17 .wave-back-dim.wave-play { animation:lp17WaveBackRevealDim 3.2s ease-out 0.1s forwards; }
@keyframes lp17DividerFlowReveal { from { opacity:0.85; clip-path:inset(0 100% 0 0); } to { opacity:0.85; clip-path:inset(0 0 0 0); } }
.lp17 .divider-flow { opacity:0; }
.lp17 .divider-flow.wave-play { animation:lp17DividerFlowReveal 3.2s ease-out 0.1s forwards; }
@keyframes lp17PillarsDividerReveal { to { clip-path:inset(0 0 0 0); } }
.lp17 .pillars-divider-flow.wave-play { animation:lp17PillarsDividerReveal 3.2s ease-out 0.1s forwards; }
@keyframes lp17ClipReveal { to { clip-path:inset(0 0 0 0); } }
.lp17 .how-divider-flow.wave-play { animation:lp17ClipReveal 3.2s ease-out 0.1s forwards; }
.lp17 .pricing-divider-flow-anim { clip-path:inset(0 0 0 100%); }
.lp17 .pricing-divider-flow-anim.wave-play { animation:lp17ClipReveal 3.2s ease-out 0.1s forwards; }
.lp17 .sun-art-flow { clip-path:inset(0 0 0 100%); }
.lp17 .sun-art-flow.wave-play { animation:lp17ClipReveal 3.2s ease-out 0.1s forwards; }
.lp17 .testi-programs-flow { clip-path:inset(0 100% 0 0); }
.lp17 .testi-programs-flow.wave-play { animation:lp17ClipReveal 3.2s ease-out 0.1s forwards; }

.lp17 .program-card { transition:transform 260ms cubic-bezier(.22,.61,.36,1), box-shadow 260ms ease, border-color 260ms ease; }
.lp17 .program-card:hover { transform:translateY(-8px); box-shadow:0 26px 54px rgba(34,41,61,0.14); }
.lp17 .lp17-guide-img { transition:transform 320ms cubic-bezier(.22,.61,.36,1); }
.lp17 .program-card:hover .lp17-guide-img { transform:translate(-50%,-50%) scale(1.06); }

/* Responsive: replaces the design's JS applyLayout(). */
@media (max-width: 1099px) {
  .lp17 .lp17-who-grid { grid-template-columns: 1fr !important; justify-items: center; }
  .lp17 .lp17-who-vdiv { display: none; }
  .lp17 .who-card { width: auto !important; max-width: 440px; }
  .lp17 .lp17-who-band { min-height: 0 !important; }
}
@media (max-width: 1039px) {
  .lp17 .lp17-navlinks { display: none !important; }
}
@media (max-width: 959px) {
  .lp17 .lp17-foot-grid { grid-template-columns: repeat(3,1fr) !important; }
}
@media (max-width: 899px) {
  .lp17 .lp17-hero-block { height: auto !important; }
  .lp17 .lp17-hero-grid { grid-template-columns: 1fr !important; }
  .lp17 .lp17-hero-right { justify-self: center !important; margin-right: 0 !important; }
  .lp17 .lp17-programs { grid-template-columns: 1fr !important; }
}
@media (max-width: 859px) {
  .lp17 .lp17-steps { grid-template-columns: repeat(2,1fr) !important; }
}
@media (max-width: 819px) {
  .lp17 .lp17-pillars { grid-template-columns: repeat(2,1fr) !important; }
}
@media (max-width: 759px) {
  .lp17 .lp17-hero-art { display: none; }
  .lp17 .lp17-ribbon-v4-wrap, .lp17 .lp17-divider-flow-wrap, .lp17 .lp17-pillars-divider-wrap, .lp17 .lp17-pricing-divider-wrap, .lp17 .lp17-testi-programs-wrap { display: none; }
  .lp17 #how, .lp17 #why-now, .lp17 #pillars, .lp17 #start-today, .lp17 #pricing { margin-top: 0 !important; }
  .lp17 #start-today { padding-bottom: 60px !important; }
  .lp17 .lp17-why-h2, .lp17 .lp17-why-p, .lp17 .lp17-hero-sub { height: auto !important; }
  .lp17 .lp17-pillars-h2 { width: auto !important; }
  .lp17 .lp17-hero-tags span { height: auto !important; white-space: normal; }
  .lp17 .lp17-hero-h1 { width: 100% !important; }
  .lp17 .why-card { width: 100% !important; }
  .lp17 .lp17-programs-eyebrow { white-space: normal !important; width: auto !important; max-width: 100%; text-align: center; }
  .lp17 .lp17-nav { padding: 16px 20px !important; }
  .lp17 .lp17-nav-inner, .lp17 .lp17-nav-actions { gap: 12px !important; }
  .lp17 .lp17-logo-text { font-size: 26px !important; }
  .lp17 .lp17-join-btn { padding: 10px 16px !important; font-size: 13px !important; }
}
@media (max-width: 619px) {
  .lp17 .lp17-foot-grid { grid-template-columns: repeat(2,1fr) !important; }
}
@media (max-width: 599px) {
  .lp17 .lp17-founder { max-width: 100% !important; }
}
@media (max-width: 539px) {
  .lp17 .lp17-pillars { grid-template-columns: 1fr !important; }
}
@media (max-width: 519px) {
  .lp17 .lp17-steps { grid-template-columns: 1fr !important; }
  .lp17 .lp17-step-arrow { display: none; }
  .lp17 .program-card { grid-template-columns: 1fr !important; }
  .lp17 .lp17-start-includes { grid-template-columns: 1fr !important; }
}
@media (max-width: 419px) {
  .lp17 .lp17-foot-grid { grid-template-columns: 1fr !important; }
}
`;

export function LandingPage() {
  const navigate = useNavigate();
  const ready = useApp((s) => s.ready);
  const user = useApp((s) => s.user);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('top');
  const [testiIdx, setTestiIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const start = () => navigate('/auth');

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cleanups: Array<() => void> = [];

    const prevScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    cleanups.push(() => {
      document.documentElement.style.scrollBehavior = prevScrollBehavior;
    });

    // Nav: translucent backdrop once scrolled + scroll-spy for the active tab
    // (last section whose top has passed under the sticky nav wins).
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
      let current: string = NAV_LINKS[0].section;
      for (const { section } of NAV_LINKS) {
        const el = document.getElementById(section);
        if (el && el.getBoundingClientRect().top <= 140) current = section;
      }
      setActiveSection(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    cleanups.push(() => window.removeEventListener('scroll', onScroll));

    // Generic scroll-in fades.
    const fadeIo = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in-view')),
      { threshold: 0.1, rootMargin: '0px 0px -10% 0px' },
    );
    root.querySelectorAll('.scroll-fade').forEach((el) => fadeIo.observe(el));
    cleanups.push(() => fadeIo.disconnect());

    // Steps: staggered entrance, one per 700ms.
    const stepsWrap = root.querySelector('.steps-wrap');
    if (stepsWrap) {
      const items = stepsWrap.querySelectorAll('.step-item');
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            items.forEach((it, i) => setTimeout(() => it.classList.add('step-in'), i * 700));
            io.disconnect();
          }),
        { threshold: 0.3 },
      );
      io.observe(stepsWrap);
      cleanups.push(() => io.disconnect());
    }

    // Pillars: arc draw + text rise, one per 500ms.
    const pillarsWrap = root.querySelector('[data-role="pillars"]');
    if (pillarsWrap) {
      const items = pillarsWrap.querySelectorAll('.pillar-item');
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            items.forEach((it, i) => setTimeout(() => it.classList.add('pillar-in'), i * 500));
            io.disconnect();
          }),
        { threshold: 0.3 },
      );
      io.observe(pillarsWrap);
      cleanups.push(() => io.disconnect());
    }

    // "Who is this for": card highlight sequence + wave art reveal.
    const whoHeader = root.querySelector('#community .scroll-fade');
    if (whoHeader) {
      let played = false;
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (!e.isIntersecting || played) return;
            played = true;
            const cards = root.querySelectorAll('.who-card');
            [150, 450, 750].forEach((delay, i) => {
              const card = cards[i];
              if (card) setTimeout(() => card.classList.add('seq-active'), delay);
            });
            setTimeout(() => cards.forEach((c) => c.classList.remove('seq-active')), 1600);
            root.querySelectorAll('.wave-back-dim').forEach((w) => w.classList.add('wave-play'));
          }),
        { threshold: 0.4 },
      );
      io.observe(whoHeader);
      cleanups.push(() => io.disconnect());
    }

    // Flow dividers/art: wipe in the first time their wrapper enters the
    // viewport. Observe wrappers, not the imgs — several start fully clipped
    // (e.g. inset(0 100% 0 0)) and a zero-area element never intersects in
    // Chrome.
    const DIVIDER_TRIGGERS: Array<[string, string]> = [
      ['.lp17-ribbon-v4-wrap', '.how-divider-flow'],
      ['.lp17-divider-flow-wrap', '.divider-flow'],
      ['.lp17-pillars-divider-wrap', '.pillars-divider-flow'],
      ['.lp17-pricing-divider-wrap', '.pricing-divider-flow-anim'],
      ['.lp17-testi-programs-wrap', '.testi-programs-flow'],
      ['#pricing', '.sun-art-flow'],
    ];
    const dividerTargets = new Map<Element, string>();
    const dividerIo = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const sel = dividerTargets.get(e.target);
          if (sel) e.target.querySelectorAll(sel).forEach((img) => img.classList.add('wave-play'));
          dividerIo.unobserve(e.target);
        }),
      { threshold: 0.01 },
    );
    DIVIDER_TRIGGERS.forEach(([wrapSel, imgSel]) => {
      root.querySelectorAll(wrapSel).forEach((el) => {
        dividerTargets.set(el, imgSel);
        dividerIo.observe(el);
      });
    });
    cleanups.push(() => dividerIo.disconnect());

    return () => cleanups.forEach((fn) => fn());
  }, []);

  // Testimonial carousel auto-advance.
  useEffect(() => {
    const timer = setInterval(() => setTestiIdx((i) => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(timer);
  }, []);

  // Returning signed-in user hitting the marketing page (e.g. a fresh tab) →
  // drop straight into the app. AppShell forwards unpaid accounts to /checkout.
  if (ready && user) return <Navigate to="/app" replace />;

  const testiNav = (dir: number) =>
    setTestiIdx((i) => (i + dir + TESTIMONIALS.length) % TESTIMONIALS.length);

  return (
    <div
      ref={rootRef}
      className="lp17"
      style={{
        position: 'relative',
        fontFamily: 'var(--body)',
        color: 'var(--ink)',
        WebkitFontSmoothing: 'antialiased',
        overflowX: 'clip',
        background: '#FFFFFF',
        minHeight: '100dvh',
      }}
    >
      <style>{CSS}</style>

      {/* ===================== NAV ===================== */}
      <nav
        className="lp17-nav"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 60,
          padding: '20px 44px',
          transition: 'background 240ms ease, box-shadow 240ms ease',
          background: scrolled
            ? 'linear-gradient(180deg, rgba(253,251,247,0.9) 0%, rgba(253,251,247,0.6) 60%, rgba(253,251,247,0) 100%)'
            : 'transparent',
          backdropFilter: scrolled ? 'saturate(1.2) blur(10px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'saturate(1.2) blur(10px)' : 'none',
        }}
      >
        <div
          className="lp17-nav-inner"
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
          }}
        >
          <a
            href="#top"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 2,
              position: 'relative',
            }}
          >
            <span
              className="lp17-logo-text"
              style={{
                fontFamily: 'var(--display)',
                fontWeight: 700,
                fontSize: 32,
                letterSpacing: '-0.01em',
                color: 'var(--ink)',
              }}
            >
              Abundance<span style={{ color: '#F59C30' }}>AI</span>
            </span>
            <span
              style={{
                fontFamily: 'var(--body)',
                fontWeight: 600,
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--ink-2)',
              }}
            >
              A Human-First AI Platform
            </span>
          </a>
          <div className="lp17-navlinks" style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
            {NAV_LINKS.map((link) => {
              const active = activeSection === link.section;
              return (
                <a
                  key={link.section}
                  href={link.href}
                  className="navlink"
                  aria-current={active ? 'true' : undefined}
                  style={{
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: active ? 600 : 500,
                    color: active ? 'var(--ink)' : 'var(--ink-2)',
                    position: 'relative',
                    paddingBottom: 3,
                    borderBottom: active ? '2px solid #F59C30' : '2px solid transparent',
                    transition: 'color 160ms ease, border-color 160ms ease',
                  }}
                >
                  {link.label}
                </a>
              );
            })}
          </div>
          <div className="lp17-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <a
              href="#start-today"
              className="btn-gold lp17-join-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                textDecoration: 'none',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: 14,
                padding: '11px 22px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
                background: GOLD_GRAD,
              }}
            >
              Join Now <span style={{ fontSize: 15 }}>→</span>
            </a>
            <button
              onClick={start}
              className="navlink"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--ink)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                whiteSpace: 'nowrap',
              }}
            >
              Log In
            </button>
          </div>
        </div>
      </nav>

      {/* ===================== HERO ===================== */}
      <div className="lp17-hero-block" style={{ background: '#FFFFFF', height: 574 }}>
        <header
          id="top"
          style={{
            position: 'relative',
            padding: 'clamp(24px,3vw,46px) 44px clamp(40px,5vw,72px)',
            background: '#FFFFFF',
          }}
        >
          {/* hero background: flowing wave ribbons sweeping in from the right */}
          <img
            src={ASSET.heroFlow}
            alt=""
            aria-hidden="true"
            className="lp17-hero-art hero-wave-anim"
            style={{
              position: 'absolute',
              right: 0,
              top: 74,
              width: 1350,
              height: 763,
              objectFit: 'contain',
              objectPosition: 'right top',
              zIndex: 10,
              pointerEvents: 'none',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0%, black 22%), linear-gradient(to bottom, transparent 0%, black 14%, black 78%, transparent 100%)',
              WebkitMaskComposite: 'source-in',
              maskImage:
                'linear-gradient(to right, transparent 0%, black 22%), linear-gradient(to bottom, transparent 0%, black 14%, black 78%, transparent 100%)',
              maskComposite: 'intersect',
              transform: 'scaleX(1.23)',
            }}
          />

          <div
            className="lp17-hero-grid"
            style={{
              position: 'relative',
              zIndex: 12,
              maxWidth: 1240,
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'clamp(32px,4vw,60px)',
              alignItems: 'center',
            }}
          >
            {/* LEFT */}
            <div className="reveal" style={{ zIndex: 99 }}>
              <p
                className="eyebrow"
                style={{
                  ...blueBadge,
                  padding: '9px 20px',
                  margin: '0 0 28px',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                }}
              >
                INCOME + IMPACT
              </p>
              <h1
                className="lp17-pretty lp17-hero-h1"
                style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 600,
                  fontSize: 'clamp(54px,7vw,66px)',
                  lineHeight: 1,
                  letterSpacing: '0.01em',
                  color: '#1A1A1A',
                  margin: '0 0 34px',
                  width: 540,
                  maxWidth: '100%',
                }}
              >
                What You Know is <span style={goldTextGrad}>Worth</span> Sharing
              </h1>
              <p
                className="lp17-hero-sub"
                style={{
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: '#1A1A1A',
                  margin: '0 0 7px',
                  height: 50,
                  lineHeight: 1.45,
                }}
              >
                You already have the knowledge. <br />
                AbundanceAI gives you the tools to build a real program.
              </p>
              <div
                className="lp17-hero-tags"
                style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0, margin: '0 0 32px' }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 16,
                    color: 'rgb(101,173,207)',
                    paddingRight: 20,
                    height: 14,
                  }}
                >
                  No curriculum to create&nbsp; | No Marketing to write | No tech to learn
                </span>
              </div>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 20, margin: '0 0 28px', flexWrap: 'wrap' }}
              >
                <a
                  href="#start-today"
                  className="btn-gold"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    textDecoration: 'none',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: 17,
                    padding: '17px 34px',
                    borderRadius: 999,
                    background: GOLD_GRAD,
                    boxShadow: '0px 12px 28px 0px #F8BF397D',
                  }}
                >
                  Try it for $25 <span style={{ fontSize: 18 }}>→</span>
                </a>
                <a
                  href="#how"
                  style={{ textDecoration: 'none', color: '#1A1A1A', fontWeight: 600, fontSize: 16 }}
                >
                  See how it Works →
                </a>
              </div>
              <p style={{ fontSize: 14.5, fontWeight: 600, color: '#1A1A1A', margin: '0 0 7px' }}>
                Introductory price. Regularly $88
              </p>
              <p style={{ fontSize: 14.5, color: '#1A1A1A59', margin: 0 }}>
                90-day money-back guarantee.
              </p>
            </div>

            {/* RIGHT: video panel */}
            <div
              className="reveal lp17-hero-right"
              style={{
                position: 'relative',
                minHeight: 'clamp(280px,32vw,390px)',
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                maxWidth: 390,
                justifySelf: 'end',
                marginRight: 40,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  zIndex: 2,
                  width: '100%',
                  height: 'clamp(270px,30vw,368px)',
                  borderRadius: 45,
                  overflow: 'hidden',
                  border: '3px solid rgba(255,255,255,0.9)',
                  boxShadow: '0 30px 70px rgba(34,41,61,0.16)',
                }}
              >
                <img
                  src={ASSET.heroPanel}
                  alt="A sunlit path winding through hills at sunrise — Turn What You Know Into Abundance"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'fill',
                    objectPosition: 'center top',
                  }}
                />
                <button
                  aria-label="Play video"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: 76,
                    height: 76,
                    borderRadius: '50%',
                    border: 0,
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.94)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 30px rgba(34,41,61,0.28)',
                    zIndex: 3,
                  }}
                >
                  <span
                    style={{
                      width: 0,
                      height: 0,
                      borderStyle: 'solid',
                      borderWidth: '13px 0 13px 22px',
                      borderColor: 'transparent transparent transparent var(--gold-2)',
                      marginLeft: 5,
                    }}
                  />
                </button>
                <div
                  style={{
                    position: 'absolute',
                    left: 16,
                    bottom: 16,
                    zIndex: 3,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(34,41,61,0.78)',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 500,
                    padding: '8px 14px',
                    borderRadius: 999,
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: 'var(--gold-1)',
                      display: 'inline-block',
                    }}
                  />
                  Watch Ruby’s story · 2 min
                </div>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* ===================== WHO IS THIS FOR ===================== */}
      <section
        id="community"
        style={{
          position: 'relative',
          padding: '0 44px 0',
          scrollMarginTop: 80,
          overflow: 'hidden',
          background: '#FFFFFF',
        }}
      >
        <img
          src={ASSET.whoFlowBg}
          alt=""
          aria-hidden="true"
          className="wave-back-dim"
          style={{
            position: 'absolute',
            left: 0,
            top: 'clamp(200px,24vw,280px)',
            width: '100%',
            maxWidth: 'none',
            height: 'auto',
            objectFit: 'contain',
            objectPosition: 'left top',
            zIndex: 0,
            pointerEvents: 'none',
            opacity: 0.5,
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1080, margin: '0 auto' }}>
          {/* full-bleed band that holds title + columns */}
          <div
            className="lp17-who-band"
            style={{
              position: 'relative',
              width: '100vw',
              left: '50%',
              marginLeft: '-50vw',
              minHeight: 'clamp(820px,78vw,1080px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              padding: '0 0 clamp(48px,6vw,80px)',
            }}
          >
            <div
              className="reveal scroll-fade"
              style={{
                position: 'relative',
                zIndex: 3,
                maxWidth: 900,
                margin: 'clamp(220px,10vw,380px) auto clamp(36px,2vw,56px)',
                textAlign: 'center',
                padding: '0 44px',
              }}
            >
              <p
                className="eyebrow"
                style={{
                  ...blueBadge,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                  padding: '8px 18px',
                  margin: '0 0 18px',
                  letterSpacing: '0.16em',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Who Is This For?
              </p>
              <h2
                style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 600,
                  fontSize: 'clamp(30px,4.4vw,50px)',
                  lineHeight: 1.33,
                  letterSpacing: '-0.01em',
                  color: '#303841',
                  margin: 0,
                  textShadow: '0 2px 12px rgba(0,0,0,0.2)',
                }}
              >
                Your <span style={goldTextGrad}>Experience</span> Could be Exactly What Someone Needs
              </h2>
            </div>
            <div
              className="reveal lp17-who-grid"
              style={{
                position: 'relative',
                zIndex: 3,
                width: '100%',
                maxWidth: 1320,
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: '1fr 1px 1.15fr 1px 1fr',
                gap: 'clamp(28px,3.2vw,48px)',
                alignItems: 'stretch',
                padding: '40px 44px 141px',
              }}
            >
              {WHO_CARDS.map((card, i) => (
                <div key={card.label} style={{ display: 'contents' }}>
                  {i > 0 && (
                    <div
                      aria-hidden="true"
                      className="lp17-who-vdiv"
                      style={{
                        width: 2,
                        alignSelf: 'stretch',
                        background:
                          'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%)',
                      }}
                    />
                  )}
                  <div
                    className={`who-card ${card.variant}`}
                    style={{ textAlign: 'center', width: card.width }}
                  >
                    <p
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 19,
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: '#FFFFFF',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        margin: '0 0 22px',
                        background: card.labelGrad,
                        borderRadius: 6,
                        boxShadow: '0px 4px 12px 0px #00000026',
                      }}
                    >
                      {card.label}
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--display)',
                        fontSize: 22,
                        fontWeight: 700,
                        color: '#303841',
                        margin: '0 0 18px',
                        textShadow: '-7px 6px 20px #E0902DDD',
                      }}
                    >
                      {card.role}
                    </p>
                    <p style={{ fontSize: 17, lineHeight: 1.45, color: '#1A1A1A', margin: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontWeight: 800,
                          color: '#303841',
                          marginBottom: 10,
                          fontSize: 17,
                        }}
                      >
                        {card.lead}
                      </span>
                      {card.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section
        id="how"
        style={{
          position: 'relative',
          padding: 'clamp(64px,7.4vw,100px) 44px clamp(28px,3.4vw,54px)',
          scrollMarginTop: 80,
          zIndex: 999,
          background: 'transparent',
          marginTop: -113,
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto' }}>
          <div className="reveal scroll-fade" style={{ textAlign: 'center', margin: '0 auto 22px' }}>
            <p
              className="eyebrow"
              style={{ ...blueBadge, gap: 8, padding: '9px 22px', margin: '0 0 22px' }}
            >
              <strong>How It Works</strong>
            </p>
            <h2
              className="lp17-balance"
              style={{
                fontFamily: 'var(--display)',
                fontWeight: 600,
                fontSize: 'clamp(32px,4.8vw,56px)',
                lineHeight: 1.1,
                color: '#1A1A1A',
                margin: 0,
              }}
            >
              From What You Know to a <span style={goldTextGrad}>Launch-Ready</span> Program
            </h2>
          </div>

          {/* steps: numerals with hand-drawn arrows between them */}
          <div
            data-role="steps"
            className="steps-wrap lp17-steps"
            style={{
              position: 'relative',
              marginTop: 'clamp(48px,5.4vw,76px)',
              display: 'grid',
              gridTemplateColumns: 'repeat(4,1fr)',
              gap: 'clamp(28px,3.4vw,58px)',
              alignItems: 'start',
            }}
          >
            {STEPS.map((step) => (
              <div
                key={step.no}
                className="step-item"
                style={{
                  position: 'relative',
                  opacity: 0,
                  transform: 'translateY(24px)',
                  transition: 'opacity .6s ease, transform .6s ease',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    fontFamily: 'var(--display)',
                    fontWeight: 600,
                    fontSize: step.numSize,
                    lineHeight: 1,
                    color: step.numColor,
                  }}
                >
                  {step.no}
                </span>
                {step.arrow && (
                  <svg
                    viewBox="0 0 100 34"
                    aria-hidden="true"
                    className="lp17-step-arrow"
                    style={{
                      position: 'absolute',
                      top: step.arrow.top,
                      left: 60,
                      width: 'clamp(60px,6vw,88px)',
                      height: 30,
                      overflow: 'visible',
                    }}
                  >
                    <path
                      className="step-arrow"
                      d="M4,24 C30,6 58,14 86,14"
                      fill="none"
                      stroke={step.arrow.color}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeDasharray={110}
                      strokeDashoffset={110}
                    />
                    <path
                      className="step-arrowhead"
                      d="M86,14 L76,8 M86,14 L76,20"
                      fill="none"
                      stroke={step.arrow.color}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ opacity: 0 }}
                    />
                    <circle
                      className="step-light"
                      r={4.5}
                      fill={step.arrow.color}
                      style={{
                        offsetPath: "path('M4,24 C30,6 58,14 86,14')",
                        filter: `drop-shadow(0 0 4px ${step.arrow.glow}) drop-shadow(0 0 8px ${step.arrow.glow})`,
                      }}
                    />
                  </svg>
                )}
                <h3
                  style={{
                    fontFamily: 'var(--display)',
                    fontWeight: 600,
                    fontSize: 'clamp(22px,1.9vw,27px)',
                    lineHeight: 1.18,
                    color: step.titleColor,
                    margin: '20px 0 14px',
                    ...('titleWidth' in step ? { width: step.titleWidth, maxWidth: '100%' } : {}),
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ fontSize: 16.5, lineHeight: 1.65, color: '#1A1A1AE4', margin: 0, maxWidth: '26ch' }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ribbon divider */}
      <div
        aria-hidden="true"
        className="lp17-ribbon-v4-wrap"
        style={{ width: '100%', overflow: 'hidden', lineHeight: 0, margin: '16px 0', position: 'relative', zIndex: 2 }}
      >
        <img
          className="how-divider-flow"
          src={ASSET.ribbonV4}
          alt=""
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            opacity: 0.85,
            transform: 'scaleX(1.21)',
            clipPath: 'inset(0 100% 0 0)',
          }}
        />
      </div>

      {/* ===================== HUMAN-FIRST ===================== */}
      <section
        id="why-now"
        style={{
          position: 'relative',
          padding: '0 44px 0',
          scrollMarginTop: 80,
          overflow: 'hidden',
          background: '#FFFFFF',
          marginTop: -266,
        }}
      >
        <div
          className="reveal why-card"
          style={{
            position: 'relative',
            zIndex: 1,
            width: 'min(1400px, 92vw)',
            maxWidth: 1400,
            minHeight: 'clamp(180px,20vw,260px)',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 32,
            border: '4px solid rgba(23,36,115,0)',
            background: 'rgba(255,255,255,0)',
            padding: 'clamp(28px,4vw,48px)',
            overflow: 'hidden',
          }}
        >
          <div style={{ maxWidth: 880, textAlign: 'center' }}>
            <p
              className="eyebrow"
              style={{
                ...blueBadge,
                gap: 10,
                border: '1px solid rgba(101,173,207,0.28)',
                padding: '8px 18px',
                margin: '0 0 20px',
              }}
            >
              HUMAN-FIRST AI PLATFORM
            </p>
            <h2
              className="lp17-why-h2"
              style={{
                fontFamily: 'var(--display)',
                fontWeight: 600,
                fontSize: 'clamp(30px,4.4vw,42px)',
                lineHeight: 1.6,
                letterSpacing: '-0.01em',
                color: '#1A1A1A',
                margin: '0 0 28px',
                height: 35,
              }}
            >
              AI helps you build your mentor program.
            </h2>
            <p
              className="lp17-why-p"
              style={{
                fontFamily: 'var(--display)',
                fontWeight: 600,
                fontSize: 'clamp(24px,3vw,34px)',
                lineHeight: 1.05,
                color: '#1A1A1A',
                margin: '34px auto 0',
                maxWidth: '46ch',
                height: 63,
              }}
            >
              You bring the{' '}
              <span style={{ ...goldTextGrad, position: 'relative', display: 'inline-block' }}>
                human experience
              </span>{' '}
              people are craving.
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 'clamp(28px,4vw,56px)',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '20px auto 0',
              }}
            >
              {['No curriculum to create', 'No Marketing to write', 'No tech to learn'].map((line) => (
                <span
                  key={line}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 18, fontWeight: 600, color: '#1A1A1A' }}
                >
                  <span style={{ color: '#F59C30', fontSize: 26 }}>→</span>
                  {line}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="cta-footer" style={{ position: 'relative' }}>
        {/* flowing divider into the pillars */}
        <div
          aria-hidden="true"
          className="lp17-divider-flow-wrap"
          style={{
            width: '120%',
            marginLeft: 0,
            overflow: 'hidden',
            lineHeight: 0,
            position: 'relative',
            marginTop: -8,
            marginBottom: -80,
          }}
        >
          <img
            className="scroll-fade divider-flow"
            src={ASSET.ribbonV3}
            alt=""
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              transform: 'translate(166px, -5px) scaleX(-1.32)',
            }}
          />
        </div>

        {/* ===================== THREE PILLARS ===================== */}
        <section
          id="pillars"
          style={{
            position: 'relative',
            padding: 'clamp(4px,1vw,12px) 44px clamp(44px,5vw,72px)',
            scrollMarginTop: 80,
            background: 'transparent',
            marginTop: -440,
          }}
        >
          <div style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto' }}>
            <div
              className="reveal scroll-fade"
              style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto clamp(40px,4.5vw,64px)' }}
            >
              <p
                className="eyebrow"
                style={{ ...blueBadge, gap: 8, padding: '8px 20px', margin: '0 0 18px', fontWeight: 800 }}
              >
                THE THREE PILLARS
              </p>
              <h2
                className="lp17-balance lp17-pillars-h2"
                style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 600,
                  fontSize: 'clamp(34px,4.8vw,52px)',
                  lineHeight: 1.12,
                  letterSpacing: '-0.01em',
                  color: '#1A1A1A',
                  margin: '0 0 16px',
                  width: 708,
                }}
              >
                Everything you need to <span style={goldTextGrad}>thrive</span>: create, launch, and
                grow.
              </h2>
            </div>
            <div
              data-role="pillars"
              className="lp17-pillars"
              style={{
                position: 'relative',
                display: 'grid',
                gridTemplateColumns: 'repeat(3,1fr)',
                gap: 'clamp(40px,5vw,80px)',
              }}
            >
              {/* faint abundance bloom behind the whole row */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: '-40px -10px -60px',
                  zIndex: 0,
                  pointerEvents: 'none',
                  overflow: 'visible',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: '6%',
                    top: '30%',
                    width: 280,
                    height: 280,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.5), rgba(255,255,255,0) 68%)',
                    filter: 'blur(8px)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    right: '8%',
                    top: '34%',
                    width: 300,
                    height: 300,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.46), rgba(255,255,255,0) 68%)',
                    filter: 'blur(8px)',
                  }}
                />
              </div>

              {PILLARS.map((pillar) => (
                <div
                  key={pillar.label}
                  className="reveal pillar-item"
                  style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 clamp(4px,1vw,16px)' }}
                >
                  <svg
                    viewBox="0 0 320 96"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    style={{ display: 'block', width: '100%', height: 64, margin: '0 auto 6px', overflow: 'visible' }}
                  >
                    <defs>
                      <linearGradient id={pillar.gradId} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={pillar.stop} stopOpacity={0} />
                        <stop offset="50%" stopColor={pillar.stop} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={pillar.stop} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <path
                      className="pillar-arc"
                      d="M-90,110 C40,24 250,0 410,70"
                      fill="none"
                      stroke={`url(#${pillar.gradId})`}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      pathLength={1}
                      strokeDasharray={1}
                      strokeDashoffset={1}
                    />
                  </svg>
                  <p
                    className="pillar-text"
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: pillar.labelColor,
                      margin: '0 0 20px',
                      opacity: 0,
                      transform: 'translateY(14px)',
                      transition: 'opacity .5s ease, transform .5s ease',
                    }}
                  >
                    {pillar.label}
                  </p>
                  <p
                    className="pillar-text"
                    style={{
                      fontSize: 17,
                      lineHeight: 1.75,
                      color: '#1A1A1A',
                      fontWeight: 500,
                      margin: '0 auto',
                      maxWidth: '30ch',
                      opacity: 0,
                      transform: 'translateY(14px)',
                      transition: 'opacity .5s ease .08s, transform .5s ease .08s',
                    }}
                  >
                    {pillar.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* wave divider into the sunrise */}
        <div
          aria-hidden="true"
          className="lp17-pillars-divider-wrap"
          style={{ position: 'relative', width: '100%', overflow: 'hidden', lineHeight: 0, margin: '-70px 0 -70px', zIndex: 1 }}
        >
          <img
            className="pillars-divider-flow"
            src={ASSET.pillarsDivider}
            alt=""
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              opacity: 0.7,
              transform: 'translate(0px, -75px) scaleY(0.74)',
              clipPath: 'inset(0 100% 0 0)',
            }}
          />
        </div>

        {/* ===================== START TODAY / $25 ===================== */}
        <section
          id="start-today"
          style={{
            position: 'relative',
            zIndex: 10,
            marginTop: -420,
            padding: 'clamp(56px,6vw,90px) 44px clamp(120px,12vw,180px)',
            scrollMarginTop: 80,
            background: 'transparent',
          }}
        >
          <div
            className="reveal scroll-fade"
            style={{ position: 'relative', zIndex: 2, maxWidth: 860, margin: '0 auto', textAlign: 'center' }}
          >
            <p
              className="eyebrow"
              style={{
                ...blueBadge,
                backgroundColor: 'rgba(101,173,207,0.12)',
                border: '1px solid rgba(101,173,207,0.28)',
                padding: '9px 22px',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.18em',
                margin: '0 0 22px',
              }}
            >
              Start Today
            </p>
            <h2
              style={{
                fontFamily: 'var(--display)',
                fontWeight: 700,
                fontSize: 'clamp(46px,6.4vw,78px)',
                lineHeight: 1.02,
                letterSpacing: '-0.01em',
                color: '#1A1A1A',
                margin: '0 0 22px',
              }}
            >
              All of it for{' '}
              <span
                style={{
                  background: GOLD_GRAD,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                $25.
              </span>
            </h2>
            <p
              className="lp17-pretty"
              style={{
                fontSize: 'clamp(18px,2vw,23px)',
                lineHeight: 1.5,
                color: '#5B6072',
                margin: '0 auto 44px',
                maxWidth: '44ch',
              }}
            >
              So small it removes all hesitation - and backed by a 90-day money-back guarantee. Build
              something you’re proud of, or you don’t pay.
            </p>
            <div
              className="lp17-start-includes"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
                gap: '22px clamp(32px,4vw,64px)',
                textAlign: 'left',
                margin: '0 auto 48px',
                maxWidth: 760,
              }}
            >
              {START_TODAY_INCLUDES.map((item) => (
                <span
                  key={item}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 14, fontSize: 17, lineHeight: 1.45, color: '#1A1A1A' }}
                >
                  <svg
                    width={19}
                    height={19}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1FA89B"
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flex: '0 0 auto', marginTop: 2 }}
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {item}
                </span>
              ))}
            </div>
            <button
              onClick={start}
              className="btn-gold"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 21,
                padding: '22px 52px',
                borderRadius: 999,
                background: GOLD_GRAD,
                boxShadow: '0 16px 36px rgba(245,156,48,0.36)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Start your program <span style={{ fontSize: 22 }}>→</span>
            </button>
            <p
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 13,
                letterSpacing: '0.04em',
                color: '#8C8FA0',
                margin: '26px 0 0',
              }}
            >
              Secure checkout by Stripe · cancel anytime within 90 days
            </p>
          </div>
        </section>

        {/* flowing divider into the testimonials */}
        <div
          aria-hidden="true"
          className="lp17-pricing-divider-wrap"
          style={{ position: 'relative', width: '100%', overflow: 'hidden', lineHeight: 0, margin: '-360px 0 -60px', zIndex: 1 }}
        >
          <img
            className="pricing-divider-flow pricing-divider-flow-anim"
            src={ASSET.pricingTestiDivider}
            alt=""
            style={{
              display: 'block',
              width: '118%',
              maxWidth: 'none',
              marginLeft: '-18%',
              height: 'auto',
              opacity: 0.8,
              transform: 'translate(-216px, 20px) scaleX(1.38)',
            }}
          />
        </div>

        {/* ===================== TESTIMONIALS + CLOSING CTA ===================== */}
        <section
          id="pricing"
          style={{
            position: 'relative',
            padding: 'clamp(20px,2vw,32px) 44px clamp(30px,3.6vw,56px)',
            scrollMarginTop: 80,
            overflow: 'visible',
            background: 'transparent',
            marginTop: -220,
          }}
        >
          <div
            className="sun-art-flow"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              backgroundImage: `url('${ASSET.sunrise}')`,
              backgroundSize: '110% auto',
              backgroundPosition: 'right -20px bottom',
              backgroundRepeat: 'no-repeat',
              filter: 'saturate(1.35) contrast(1.08) brightness(1.03)',
              WebkitMaskImage:
                'linear-gradient(to left, black 0%, black 75%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 8%, black 100%)',
              WebkitMaskComposite: 'source-in',
              maskImage:
                'linear-gradient(to left, black 0%, black 75%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 8%, black 100%)',
              maskComposite: 'intersect',
            }}
          />
          {/* scattered dots in the margins */}
          <svg
            aria-hidden="true"
            viewBox="0 0 1920 900"
            preserveAspectRatio="xMidYMid slice"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}
          >
            <g fill="#E0962B">
              <circle cx={90} cy={320} r={3} opacity={0.5} />
              <circle cx={1870} cy={300} r={3} opacity={0.5} />
              <circle cx={60} cy={500} r={2.5} opacity={0.45} />
              <circle cx={1900} cy={700} r={2.5} opacity={0.45} />
              <circle cx={300} cy={80} r={2.5} opacity={0.5} />
              <circle cx={1640} cy={60} r={2.5} opacity={0.5} />
            </g>
          </svg>

          <div style={{ position: 'relative', zIndex: 2, maxWidth: 1180, margin: '0 auto' }}>
            <div className="testi-wrap" style={{ padding: 'clamp(120px,10vw,180px) 0 clamp(140px,7vw,100px)' }}>
              <div
                className="reveal scroll-fade"
                style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto clamp(48px,5.6vw,72px)', position: 'relative' }}
              >
                <p
                  className="eyebrow"
                  style={{
                    ...blueBadge,
                    backgroundColor: 'rgba(101,173,207,0.12)',
                    border: '1px solid rgba(101,173,207,0.28)',
                    padding: '9px 22px',
                    margin: '0 0 24px',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  Real People. Real Impact.
                </p>
                <h2
                  style={{
                    fontFamily: 'var(--display)',
                    fontWeight: 600,
                    fontSize: 'clamp(38px,5vw,58px)',
                    lineHeight: 1.08,
                    color: '#1A1A1A',
                    margin: '0 0 22px',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <span style={goldTextGrad}>Enrich</span> your life.
                </h2>
                <p
                  style={{
                    fontSize: 'clamp(17px,1.8vw,21px)',
                    lineHeight: 1.6,
                    color: '#1A1A1AE4',
                    margin: '0 0 36px',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  Here’s what other users had to say about{' '}
                  <strong style={{ color: '#1A1A1A' }}>Abundance</strong>
                  <strong style={{ color: '#F59C30' }}>AI</strong>.
                </p>
              </div>

              <div
                className="reveal"
                style={{ position: 'relative', minHeight: 260, maxWidth: 820, margin: '0 auto', textAlign: 'center' }}
              >
                {TESTIMONIALS.map((t, i) => (
                  <div
                    key={t.name}
                    className="testi-item"
                    style={{
                      ...(i === 0 ? {} : { position: 'absolute', inset: 0 }),
                      opacity: testiIdx === i ? 1 : 0,
                      transition: 'opacity .5s ease',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--display)',
                        fontSize: 72,
                        lineHeight: 1,
                        color: t.color,
                        display: 'block',
                        marginBottom: 8,
                      }}
                    >
                      “
                    </span>
                    <p
                      className="lp17-pretty"
                      style={{
                        fontFamily: 'var(--display)',
                        fontWeight: 500,
                        fontSize: 'clamp(26px,3.2vw,38px)',
                        lineHeight: 1.38,
                        color: '#1A1A1A',
                        margin: '0 0 32px',
                      }}
                    >
                      {t.quote}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                      <span
                        style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: t.color, flex: '0 0 auto' }}
                      />
                      <span>
                        <span style={{ display: 'block', fontWeight: 700, fontSize: 18, color: '#1A1A1A' }}>
                          {t.name}
                        </span>
                        <span style={{ fontSize: 16, color: '#1A1A1AE4' }}>{t.role}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 32 }}>
                <button
                  type="button"
                  aria-label="Previous testimonial"
                  onClick={() => testiNav(-1)}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    border: 'none',
                    background: '#FFFFFF',
                    boxShadow: '0px 12px 28px 0px #F8BF394D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <svg
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#F59C30"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Next testimonial"
                  onClick={() => testiNav(1)}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    border: 'none',
                    background: '#FFFFFF',
                    boxShadow: '0px 12px 28px 0px #F8BF394D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <svg
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#F59C30"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <p style={{ fontSize: 14, color: '#1A1A1A80', margin: '12px 0 0', textAlign: 'center' }}>
                Check other testimonials
              </p>
            </div>

            {/* flowing divider into the programs */}
            <div
              aria-hidden="true"
              className="lp17-testi-programs-wrap"
              style={{
                position: 'relative',
                width: '100vw',
                left: '50%',
                marginLeft: '-50vw',
                marginTop: -486,
                marginBottom: -40,
                overflow: 'hidden',
                lineHeight: 0,
                zIndex: 1,
              }}
            >
              <img
                className="testi-programs-flow"
                src={ASSET.testiProgramsDivider}
                alt=""
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  opacity: 0.85,
                  transform: 'translate(156px, 0px) scaleX(1.26)',
                }}
              />
            </div>

            {/* ===================== WHAT OTHERS ARE CREATING ===================== */}
            <div
              className="reveal scroll-fade"
              style={{
                position: 'relative',
                zIndex: 2,
                maxWidth: 1180,
                margin: '0 auto clamp(64px,7vw,100px)',
                paddingTop: 'clamp(20px,3vw,40px)',
              }}
            >
              <p
                className="eyebrow lp17-programs-eyebrow"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 'max-content',
                  margin: '0 auto 20px',
                  color: '#65ADCF',
                  background: 'rgba(101,173,207,0.12)',
                  border: '1px solid rgba(101,173,207,0.28)',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                  padding: '9px 22px',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                }}
              >
                What Others Are Already Creating
              </p>
              <h2
                className="lp17-balance"
                style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 600,
                  fontSize: 'clamp(32px,4.4vw,50px)',
                  lineHeight: 1.12,
                  color: '#1A1A1A',
                  margin: '0 0 clamp(36px,4vw,56px)',
                  textAlign: 'center',
                }}
              >
                Real <span style={goldTextGrad}>group programs</span>, built by real people.
              </h2>
              <div
                data-role="programs"
                className="lp17-programs"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
                  gridAutoRows: '1fr',
                  alignItems: 'stretch',
                  gap: 'clamp(24px,3vw,44px)',
                }}
              >
                {PROGRAMS.map((prog) => (
                  <div key={prog.title}>
                    <div
                      className="program-card"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 0.95fr',
                        gap: 20,
                        alignItems: 'stretch',
                        height: '100%',
                        borderRadius: 16,
                        padding: 24,
                        ...prog.cardStyle,
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: 11.5,
                            fontWeight: 700,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            color: prog.tagColor,
                            margin: '0 0 14px',
                          }}
                        >
                          Live Group Program
                        </p>
                        <h3
                          style={{
                            fontFamily: 'var(--display)',
                            fontWeight: 600,
                            fontSize: 26,
                            lineHeight: 1.16,
                            color: prog.titleColor,
                            margin: '0 0 12px',
                          }}
                        >
                          {prog.title}
                        </h3>
                        <p style={{ fontSize: 14.5, lineHeight: 1.5, color: prog.subColor, margin: 0 }}>
                          {prog.sub}
                        </p>
                      </div>
                      <div style={{ borderRadius: 12, padding: 16, ...prog.panelStyle }}>
                        <p
                          style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: 10.5,
                            fontWeight: 700,
                            letterSpacing: '0.13em',
                            textTransform: 'uppercase',
                            color: prog.guideLabelColor,
                            margin: '0 0 12px',
                          }}
                        >
                          Meet Your Guide
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 14, alignItems: 'center' }}>
                          <div
                            style={{
                              width: 64,
                              height: 64,
                              borderRadius: '50%',
                              overflow: 'hidden',
                              position: 'relative',
                              background: 'rgba(0,0,0,0.04)',
                            }}
                          >
                            <img
                              className="lp17-guide-img"
                              src={prog.img}
                              alt={prog.guide}
                              style={{
                                position: 'absolute',
                                maxWidth: 'none',
                                transform: 'translate(-50%,-50%)',
                                ...prog.imgBox,
                              }}
                            />
                          </div>
                          <p style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3, color: prog.guideColor, margin: 0 }}>
                            {prog.guide}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
                          {(prog.bullets ?? [null, null, null]).map((bullet, bi) => (
                            <span
                              key={bi}
                              style={
                                bullet
                                  ? { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 10, lineHeight: 1.4, color: prog.bulletColor }
                                  : { display: 'flex', alignItems: 'center', gap: 10 }
                              }
                            >
                              <svg
                                width={13}
                                height={13}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={prog.checkColor}
                                strokeWidth={3.2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={bullet ? { flex: '0 0 auto', marginTop: 2 } : { flex: '0 0 auto' }}
                              >
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                              {bullet ?? (
                                <span
                                  style={{
                                    flex: 1,
                                    height: 7,
                                    borderRadius: 99,
                                    background: '#E3D9D1',
                                    ...(bi === 2 ? { width: '80%' } : {}),
                                  }}
                                />
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* closing CTA, left-aligned */}
            <div className="reveal lp17-founder" style={{ maxWidth: 680, margin: 0, textAlign: 'left' }}>
              <h2
                style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 600,
                  fontSize: 'clamp(32px,4.8vw,52px)',
                  lineHeight: 1.05,
                  color: '#1A1A1A',
                  margin: '0 0 18px',
                  letterSpacing: '-0.01em',
                }}
              >
                Turn your knowledge into&nbsp;
                <br />
                income and positive impact.
              </h2>
              <p
                style={{
                  fontSize: 'clamp(16px,1.8vw,19px)',
                  lineHeight: 1.55,
                  color: '#1A1A1AE4',
                  margin: '0 0 32px',
                  maxWidth: '40ch',
                }}
              >
                The world is waiting for what only you can give.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 22 }}>
                <button
                  onClick={start}
                  className="lnk"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: 17,
                    padding: '16px 34px',
                    borderRadius: 999,
                    background: GOLD_GRAD,
                    boxShadow: '0px 12px 28px 0px #F8BF3957',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Start for $25 <span style={{ fontSize: 18 }}>→</span>
                </button>
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                left: 456,
                top: -216,
                width: 320,
                height: 320,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.42), rgba(255,255,255,0) 68%)',
                filter: 'blur(8px)',
              }}
            />
          </div>
        </section>
      </div>

      {/* ===================== FOOTER ===================== */}
      <footer
        id="footer"
        style={{
          position: 'relative',
          zIndex: 1,
          marginTop: 0,
          padding: 'clamp(40px,4vw,60px) 44px 30px',
          backgroundColor: '#E2FDF8',
        }}
      >
        {/* wavy top edge, same color as footer */}
        <svg
          viewBox="0 0 400 160"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: -42.61,
            width: '100%',
            height: 'clamp(48px,6vw,96px)',
            display: 'block',
          }}
        >
          <path
            fill="#E2FDF8"
            d="M0,58 C100,132 180,-6 280,42 C340,70 380,112 400,90 L400,118 C320,150 220,104 140,132 C82,152 38,138 0,150 Z"
          />
        </svg>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div
            className="lp17-foot-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1.5fr',
              gap: 'clamp(24px,2.6vw,48px)',
              position: 'relative',
            }}
          >
            <div>
              <a
                href="#top"
                style={{
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  position: 'relative',
                  marginBottom: 16,
                }}
              >
                <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22, color: '#4A4A52' }}>
                  Abundance<span style={{ color: '#F59C30' }}>AI</span>
                </span>
              </a>
              <p style={{ fontSize: 14, lineHeight: 1.5, color: '#4A4A52', margin: '0 0 18px', maxWidth: '24ch' }}>
                Build your knowledge. Impact more lives.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                {SOCIALS.map((social) => (
                  <a
                    key={social.label}
                    href="#"
                    aria-label={social.label}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      border: '1px solid rgba(74,74,82,0.22)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#4A4A52',
                      textDecoration: 'none',
                    }}
                  >
                    <svg
                      width={17}
                      height={17}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {social.path}
                    </svg>
                  </a>
                ))}
              </div>
            </div>
            {FOOT_COLS.map((col) => (
              <div key={col.heading}>
                <p className="eyebrow" style={{ color: '#65ADCF', margin: '0 0 16px' }}>
                  {col.heading}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {col.links.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="footlink"
                      style={{ textDecoration: 'none', fontSize: 14, color: '#4A4A52' }}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="eyebrow" style={{ color: '#65ADCF', margin: '0 0 16px' }}>
                Stay Inspired
              </p>
              <p style={{ fontSize: 13.5, lineHeight: 1.5, color: '#4A4A52', margin: '0 0 14px' }}>
                Get tips, stories, and updates to grow your impact.
              </p>
              <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  aria-label="Email address"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: '1px solid rgba(74,74,82,0.22)',
                    borderRadius: 10,
                    padding: '11px 14px',
                    fontFamily: 'var(--body)',
                    fontSize: 14,
                    color: '#4A4A52',
                    background: '#FFFFFF',
                  }}
                />
                <button
                  type="submit"
                  className="btn-gold"
                  aria-label="Subscribe"
                  style={{
                    border: 'none',
                    cursor: 'pointer',
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: '0 0 auto',
                    background: 'linear-gradient(100deg, #F59C30, #F8BF39)',
                    boxShadow: '0px 12px 28px 0px #F8BF3952',
                  }}
                >
                  <span style={{ fontSize: 17 }}>→</span>
                </button>
              </form>
            </div>
          </div>
          <div
            style={{
              margin: 'clamp(28px,3vw,42px) 0 0',
              paddingTop: 22,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 14,
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            <span style={{ fontSize: 13, color: '#7A7A82' }}>© 2025 AbundanceAI. All rights reserved.</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 26px' }}>
              <Link to="/privacy" className="footlink" style={{ textDecoration: 'none', fontSize: 13, color: '#7A7A82' }}>
                Privacy Policy
              </Link>
              <Link to="/terms" className="footlink" style={{ textDecoration: 'none', fontSize: 13, color: '#7A7A82' }}>
                Terms of Service
              </Link>
              <Link to="/cookies" className="footlink" style={{ textDecoration: 'none', fontSize: 13, color: '#7A7A82' }}>
                Cookie Policy
              </Link>
              <Link to="/delivery" className="footlink" style={{ textDecoration: 'none', fontSize: 13, color: '#7A7A82' }}>
                Delivery Policy
              </Link>
              <Link to="/refunds" className="footlink" style={{ textDecoration: 'none', fontSize: 13, color: '#7A7A82' }}>
                Refund & Cancellation
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

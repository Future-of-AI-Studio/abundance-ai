import { useEffect, useRef, useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useApp } from '@/store';
import { LEGAL_PAGES } from '@/pages/legal/LegalLayout';

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
  sunrise: '/landing/founder-wave.png',
  star: '/landing/star.png',
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
  color: '#24729b',
  backgroundColor: '#65ADCF1F',
  border: '1px solid #65ADCF47',
  borderRadius: 999,
  whiteSpace: 'nowrap',
};

// Nav tabs in page order; `section` is the element id the scroll-spy tracks.
const NAV_LINKS = [
  { label: 'Home', href: '#home', section: 'home' },
  { label: 'Who It’s For', href: '#who-is-this-for', section: 'who-is-this-for' },
  { label: 'How It Works', href: '#how', section: 'how' },
  { label: 'What You Get', href: '#pillars', section: 'pillars' },
  { label: 'Pricing', href: '#start-today', section: 'start-today' },
  { label: 'Community', href: '#join-community', section: 'join-community' },
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
        Upload your notes <b>or just talk.</b> Messy or unorganize is fine.
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
        <b>AI organizes your ideas</b> into a 2–6 session online mentoring program.
      </>
    ),
  },
  {
    no: '03',
    numColor: '#FFA0AA',
    numSize: 40,
    titleColor: '#FFA0AA',
    title: 'Make it Yours',
    titleWidth: 270,
    arrow: { color: '#FFA0AA', glow: '#E05A3A', top: 16 },
    body: (
      <>
        Review, edit, and personalize everything to <b>reflect your voice</b>, style, and approach.
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
        <b>AI creates your emails</b> and <b>social posts</b> for you to invite your participants.
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
    label: 'PEER SUPPORT CIRCLES',
    labelColor: '#FFA0AA',
    body: (
      <>
        Peer groups to help you build momentum and <strong>bring your program to life.</strong>
      </>
    ),
  },
] as const;

const TESTIMONIALS = [
  {
    color: '#E8932C',
    quote: (
      <>
        The whole process was incredibly easy. In under three hours, I had my program, marketing posts, 
        and guidance setting up Stripe so could start taking payments.
      </>
    ),
    name: 'Victoria',
    role: 'Wellness Coach',
  },
  {
    color: '#88C4E0',
    quote: (
      <>
        I went from an idea to a complete program page and marketing posts in half a day. 
        I only shared eight minutes of audio and half a page of notes and hardly had to edit a thing.
      </>
    ),
    name: 'Mary',
    role: 'Elementary Teacher',
  },
  {
    color: '#FFA0AA',
    quote: (
      <>
      I expected the technology to help me create my program.
      What surprised me was the human warmth of the AbundanceAl Peer Community - 
      and how thoughtful and deep the mindset coaching questions were.
      </>
    ),
    name: 'Christy',
    role: 'Creativity Guide',
  },
] as const;

const START_TODAY_INCLUDES = [
  'Your 2–6 module program, built by AI',
  'Social posts written and ready',
  'AI Mindset coaching at every step',
  'A peer community support',
] as const;

// Guide photo crops replicate the design's <image-slot> geometry: cover-fit
// baseline in a 64px circle, then the stored per-slot pan (x in frame-%).
const PROGRAMS = [
    {
    title: 'Your Group Mentoring Launchpad',
    sub: 'From Idea to Impact',
    cardStyle: { background: 'linear-gradient(168deg, rgba(232,240,231,0.72), rgba(246,232,222,0.72))' },
    titleColor: '#2c2b2a',
    subColor: '#4A4A52',
    tagColor: '#FF7F50',
    panelStyle: {
      background: 'linear-gradient(160deg, #E6EDE4, #F3E4DA)',
      border: '1px solid rgba(178,90,52,0.14)',
    },
    guideLabelColor: '#24729b',
    guide: 'Ruby Yeh',
    firstName: 'Ruby',
    url: 'https://www.abundanceai.net/p/1c0831ad-e00f-4af7-a624-535c724ea61c',
    guideColor: '#24729b',
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
  {
    title: 'The Conscious Consumer',
    sub: 'Unmasking Processed Foods for a Healthy Future',
    cardStyle: { background: 'linear-gradient(168deg, rgba(232,240,231,0.72), rgba(246,232,222,0.72))' },
    titleColor: '#2c2b2a',
    subColor: '#C9C9C9',
    tagColor: '#FFD54F',
    panelStyle: {
      background: 'linear-gradient(160deg, #E6EDE4, #F3E4DA)',
      border: '1px solid rgba(178,90,52,0.14)',
    },
    guideLabelColor: '#24729b',
    guide: 'Mary Rocha',
    firstName: 'Mary',
    url: 'https://www.abundanceai.net/p/ea722fc4-532f-433b-8619-88c9d8108552',
    guideColor: '#24729b',
    img: '/landing/prog-guide-1.webp',
    imgBox: { width: '100%', height: '133.34%', left: '50%', top: '50%' },
    checkColor: '#FFD54F',
    bulletColor: '#cfcfcf',
    bullets: ['4 live 75 minute Zoom meetings', 'Experiential', 'Learn to identify processed foods'],
  },
  {
    title: 'The Sovereign Feminine',
    sub: 'Reclaiming the Lost Wisdom of Mary Magdalene',
    cardStyle: { background: 'linear-gradient(168deg, rgba(232,240,231,0.72), rgba(246,232,222,0.72))' },
    titleColor: '#2c2b2a',
    subColor: '#4A4A52',
    tagColor: '#2F6B57',
    panelStyle: {
      background: 'linear-gradient(160deg, #E6EDE4, #F3E4DA)',
      border: '1px solid rgba(178,90,52,0.14)',
    },
    guideLabelColor: '#24729b',
    guide: 'Christiane “Christy” Grace Michaels',
    firstName: 'Christy',
    url: 'https://www.abundanceai.net/p/b6f38d0e-d9e2-4122-b279-2a38d2d338cd',
    guideColor: '#24729b',
    img: '/landing/prog-guide-2.webp',
    imgBox: { width: '150.59%', height: '100%', left: '32.5%', top: '50%' },
    checkColor: '#2F6B57',
    bulletColor: '#1A1A1A',
    bullets: null, // design shows skeleton bars here
  },
  {
    title: 'The Art of Becoming the Realized Self',
    sub: 'A journey to conscious creation, flow and abundance.',
    cardStyle: { background: 'linear-gradient(168deg, rgba(232,240,231,0.72), rgba(246,232,222,0.72))' },
    titleColor: '#2c2b2a',
    subColor: '#4A4A52',
    tagColor: '#2F6B57',
    panelStyle: {
      background: 'linear-gradient(160deg, rgb(230, 237, 228), rgb(243, 228, 218))',
      border: '1px solid rgba(178,90,52,0.14)',
    },
    guideLabelColor: '#24729b',
    guide: 'Victoria Marie von Gorski',
    firstName: 'Victoria',
    url: 'https://www.abundanceai.net/p/ce398efa-ed14-4b50-8800-b397ecdd163d',
    guideColor: '#24729b',
    img: '/landing/prog-guide-3.webp',
    imgBox: { width: '150.59%', height: '100%', left: '58.13%', top: '50%' },
    checkColor: '#2F6B57',
    bulletColor: '#1A1A1A',
    bullets: ['Special Introductory Rate', '4 Live group sessions', 'Group Chat Support'],
  },

] as const;

const FOOT_COLS = [
  {
    heading: 'Product',
    links: [
      // { label: 'FAQ', href: '#' },
      { label: 'How It Works', href: '#how' },
      { label: 'Features', href: '#pillars' },
      { label: 'Pricing', href: '#start-today' },
      { label: 'Testimonials', href: '#pricing' },
    ],
  },
  {
    heading: 'LEGAL',
    // Same source of truth as the legal pages' own footer.
    links: LEGAL_PAGES.map((page) => ({ label: page.label, href: page.path })),
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

/* Permanent glass backing keeps card text legible over the wave art at every
   viewport width (the art scales with the page and gets busy behind the cards
   on wide screens); hover deepens it. */
.lp17 .who-card { border-radius:22px; margin:-14px; padding:22px 18px !important; transition:background .7s ease, border-color .7s ease, box-shadow .7s ease, backdrop-filter .7s ease, transform .7s ease; cursor:pointer }
.lp17 .who-card:hover, .lp17 .who-card.seq-active { background:rgba(255,255,255,0.55); backdrop-filter:blur(14px) saturate(140%); -webkit-backdrop-filter:blur(14px) saturate(140%); transform:translateY(-4px); }
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

/* Hero play button: gold fill + white triangle on hover, matching the
   testimonial arrows. The lift composes with the centering translate. */
.lp17 .lp17-play-btn { transition: transform 200ms ease, background 200ms ease, box-shadow 200ms ease; }
.lp17 .lp17-play-btn span { transition: border-left-color 200ms ease; }
.lp17 .lp17-play-btn:hover { transform: translate(-50%,-50%) scale(1.09) !important; background: linear-gradient(100deg, #F59C30, #F8BF39) !important; box-shadow: 0 18px 40px rgba(245,156,48,0.48) !important; }
.lp17 .lp17-play-btn:hover span { border-left-color: #FFFFFF !important; }
.lp17 .lp17-play-btn:active { transform: translate(-50%,-50%) scale(1.03) !important; }

/* Cards are a soft portrait panel; stage height tracks card width × ratio. */
.lp17 .lp17-programs-carousel { position: relative; height: calc(min(280px, 64vw) * 1.3 + 14px); }
.lp17 .lp17-tg-btn { transition: filter 180ms ease, transform 180ms ease, box-shadow 180ms ease; }
.lp17 .lp17-tg-btn:hover { filter: brightness(1.06); transform: translateY(-2px); box-shadow: 0 18px 38px rgba(34,158,217,0.44) !important; }
.lp17 .lp17-prog-cta { transition: background 180ms ease, border-color 180ms ease, color 180ms ease, transform 180ms ease, box-shadow 180ms ease; }
.lp17 .lp17-prog-cta:hover { background: linear-gradient(100deg, #F59C30, #F8BF39) !important; border-color: transparent !important; color: #FFFFFF !important; transform: translateY(-2px); box-shadow: 0 12px 26px rgba(245,156,48,0.38); }
.lp17 .program-card { transition:transform 260ms cubic-bezier(.22,.61,.36,1), box-shadow 260ms ease, border-color 260ms ease; }
.lp17 .program-card:hover { transform:translateY(-8px); box-shadow:0 26px 54px rgba(34,41,61,0.14); }
.lp17 .lp17-guide-img { transition:transform 320ms cubic-bezier(.22,.61,.36,1); }
.lp17 .program-card:hover .lp17-guide-img { transform:translate(-50%,-50%) scale(1.06); }

/* Decorative wave dividers overlap real content via negative margins — they
   must never intercept clicks/hover (the testi→programs band was swallowing
   the carousel arrows' pointer events). */
.lp17 .lp17-ribbon-v4-wrap, .lp17 .lp17-divider-flow-wrap, .lp17 .lp17-pillars-divider-wrap,
.lp17 .lp17-pricing-divider-wrap, .lp17 .lp17-testi-programs-wrap { pointer-events: none; }

/* Responsive: replaces the design's JS applyLayout(). */
/* Testimonial carousel arrows: flank the quote on wide screens, sit below it
   on narrower ones (the buttons stay in the row layout by default). */
.lp17 .lp17-testi-nav button { transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease; }
.lp17 .lp17-testi-nav button svg { transition: stroke 180ms ease; }
.lp17 .lp17-testi-nav button:hover { background: linear-gradient(100deg, #F59C30, #F8BF39) !important; box-shadow: 0 14px 30px rgba(245,156,48,0.45) !important; transform: translateY(-2px); }
.lp17 .lp17-testi-nav button:hover svg { stroke: #FFFFFF; }
@media (min-width: 1100px) {
  .lp17 .lp17-testi-nav { position: absolute; inset: 0; margin: 0 !important; pointer-events: none; }
  .lp17 .lp17-testi-nav button { position: absolute; top: 50%; transform: translateY(-50%); pointer-events: auto; }
  /* compose the lift with the vertical centering so the button doesn't jump */
  .lp17 .lp17-testi-nav button:hover { transform: translateY(calc(-50% - 2px)); }
  .lp17 .lp17-testi-btn-prev { left: 0; }
  .lp17 .lp17-testi-btn-next { right: 0; }
}
/* Mid widths (760–1199): the desktop divider transforms were tuned for ≥1240 —
   their fixed-px translates detach the art from the page edges here, and the
   deep pull-up margins overlap shorter content. Tame both; art stays visible. */
@media (min-width: 760px) and (max-width: 1199px) {
  .lp17 .lp17-testi-programs-wrap { margin-top: -140px !important; margin-bottom: -30px !important; }
  .lp17 .lp17-testi-programs-wrap img { transform: scaleX(1.26) !important; }
  .lp17 .lp17-pricing-divider-wrap { margin-top: -486px !important; margin-bottom: -65px !important; }
  .lp17 .lp17-pricing-divider-wrap img { transform: translate(0px, 20px) scaleX(1.38) !important; }
}
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
}
@media (max-width: 859px) {
  .lp17 .lp17-steps { grid-template-columns: repeat(2,1fr) !important; }
}
@media (max-width: 819px) {
  .lp17 .lp17-pillars { grid-template-columns: repeat(2,1fr) !important; }
}
@media (max-width: 759px) {
  /* Hero art: anchor a smaller sweep behind the video panel instead of hiding it. */
  .lp17 .lp17-hero-art {
    top: auto !important;
    bottom: -30px !important;
    right: -35vw !important;
    width: 170vw !important;
    height: auto !important;
    max-width: none !important;
    transform: none !important;
  }
  /* Wave dividers: keep them visible on phones as clean full-width bands —
     the desktop overlap system (big negative margins + oversized transforms)
     is neutralized here so each ribbon just flows between sections. */
  /* The how-ribbon's desktop transform/overlap is tuned in fixed px — reset
     on phones so the band shows at its natural size in normal flow. */
  .lp17 .lp17-ribbon-v4-wrap { margin: 0 !important; }
  .lp17 .lp17-ribbon-v4-wrap img { transform: none !important; height: auto !important; }
  .lp17 .lp17-divider-flow-wrap { width: 100% !important; margin: -8px 0 -24px !important; }
  .lp17 .lp17-divider-flow-wrap img { transform: scaleX(-1) !important; }
  .lp17 .lp17-pillars-divider-wrap { margin: -16px 0 -16px !important; }
  .lp17 .lp17-pillars-divider-wrap img { transform: none !important; }
  .lp17 .lp17-pricing-divider-wrap { margin: -40px 0 -16px !important; }
  .lp17 .lp17-pricing-divider-wrap img { width: 100% !important; margin-left: 0 !important; transform: none !important; }
  /* Longhand only: the margin shorthand would wipe this wrapper's inline
     margin-left:-50vw full-bleed shift. */
  .lp17 .lp17-testi-programs-wrap { margin-top: -30px !important; margin-bottom: -16px !important; }
  .lp17 .lp17-testi-programs-wrap img { transform: none !important; }
  .lp17 #how, .lp17 #why-now, .lp17 #pillars, .lp17 #start-today, .lp17 #pricing { margin-top: 0 !important; }
  .lp17 #start-today { padding-bottom: 60px !important; }
  .lp17 .lp17-why-h2, .lp17 .lp17-why-p { height: auto !important; }
  .lp17 .lp17-pillars-h2 { width: auto !important; }
  .lp17 .lp17-hero-tags span { white-space: normal; }
  .lp17 .why-card { width: 100% !important; }
  .lp17 .lp17-programs-eyebrow { white-space: normal !important; width: auto !important; max-width: 100%; text-align: center; }
  .lp17 .lp17-nav { padding: 16px 20px !important; }
  .lp17 .lp17-nav-inner, .lp17 .lp17-nav-actions { gap: 12px !important; }
  .lp17 .lp17-logo-text { font-size: 26px !important; }
  .lp17 .lp17-logo-star { width: 56px !important; height: 56px !important; margin-left: -12px !important; margin-right: -15px !important; transform: translateY(-17px) !important; }
  .lp17 .lp17-logo-star-footer { transform: translateY(-14px) !important; }
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
  /* Single-column steps read as a centered list on phones. */
  .lp17 .lp17-steps .step-item { text-align: center; }
  .lp17 .lp17-steps .step-item > span { margin: 0 auto; }
  .lp17 .lp17-steps .step-item h3 { margin-left: auto !important; margin-right: auto !important; }
  .lp17 .lp17-steps .step-item p { margin-left: auto !important; margin-right: auto !important; }
  .lp17 .lp17-who-label { font-size: 13.5px !important; letter-spacing: 0.08em !important; }
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
  const [activeSection, setActiveSection] = useState<string>('home');
  const [testiIdx, setTestiIdx] = useState(0);
  const [programIdx, setProgramIdx] = useState(0);
  const progTouchX = useRef(0);
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

  // Program carousel auto-advance — keyed on programIdx so any manual
  // navigation (dot, side card, swipe) restarts the 7s countdown.
  useEffect(() => {
    const timer = setInterval(() => setProgramIdx((i) => (i + 1) % PROGRAMS.length), 5000);
    return () => clearInterval(timer);
  }, [programIdx]);

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
          // Above every section — #how carries z-index 999 (design-inherited,
          // needed over the community band art), so the nav must beat that.
          zIndex: 1000,
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
            href="#home"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              position: 'relative',
            }}
          >
            {/* The source PNG carries ~20% transparent padding each side, so the
                negative margins pull the wordmark in against the visible star. */}
            <img
              className="lp17-logo-star"
              src={ASSET.star}
              alt=""
              aria-hidden="true"
              style={{
                width: 72,
                height: 72,
                flex: '0 0 auto',
                objectFit: 'contain',
                marginLeft: -15,
                marginRight: -26,
                // Centring against the logo+tagline column drops the star below
                // the wordmark; lift it so its right ray lines up with the "A".
                transform: 'translateY(-10px)',
              }}
            />
            <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
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
                  fontWeight: 1000,
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-2)',
                }}
              >
                <b>A Human-First AI Platform</b>
              </span>
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
          id="home"
          style={{
            position: 'relative',
            padding: 'clamp(24px,3vw,46px) 44px clamp(40px,5vw,72px)',
            background: '#FFFFFF',
            scrollMarginTop: 120,
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
                IMPACT + INCOME
              </p>
              <h1
                className="lp17-pretty lp17-hero-h1"
                style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 600,
                  fontSize: 'clamp(42px,5.4vw,66px)',
                  lineHeight: 1,
                  letterSpacing: '0.01em',
                  color: '#1A1A1A',
                  margin: '0 0 34px',
                  maxWidth: 540,
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
                  margin: '0 0 10px',
                  lineHeight: 1.45,
                }}
              >
                You already have the knowledge. <br />
                AbundanceAI gives you the tools to build a real online program.
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
                  }}
                >
                  No tech to learn | No Marketing to write | No curriculum to create&nbsp; 
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
                  Launch Your Program for $25 <span style={{ fontSize: 18 }}>→</span>
                </a>
                {/* <a
                  href="#how"
                  style={{ textDecoration: 'none', color: '#1A1A1A', fontWeight: 600, fontSize: 16 }}
                >
                  See how it Works →
                </a> */}
              </div>
              <p style={{ fontSize: 14.5, fontWeight: 600, color: '#1A1A1A', margin: '0 0 7px' }}>
                Introductory price. Regularly $88
              </p>
              <p style={{ fontSize: 14.5, color: '#1A1A1A59', margin: 0 }}>
                Love it or get your money back within 90 days.
              </p>
            </div>

            {/* RIGHT: video panel — fixed aspect so the artwork never distorts */}
            <div
              className="reveal lp17-hero-right"
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 390,
                justifySelf: 'end',
                marginRight: 40,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  width: '100%',
                  aspectRatio: '390 / 368',
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
                    objectFit: 'cover',
                    objectPosition: 'center top',
                  }}
                />
                <button
                  aria-label="Play video"
                  className="lp17-play-btn"
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
                {/* <div
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
                  Watch Founder's story · 2 min
                </div> */}
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* ===================== WHO IS THIS FOR ===================== */}
      <section
        id="who-is-this-for"
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
                margin: 'clamp(220px,17vw,340px) auto clamp(36px,2vw,56px)',
                background:
                  'radial-gradient(ellipse 62% 130% at 50% 42%, rgba(255,255,255,0.78), rgba(255,255,255,0) 72%)',
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
                      className="lp17-who-label"
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 17,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#FFFFFF',
                        padding: '7px 14px',
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

                                    <p
              className="lp17-why-p"
              style={{
                fontFamily: 'var(--display)',
                fontWeight: 600,
                fontSize: 'clamp(23px, 1vw, 30px)',
                lineHeight: 1.15,
                color: '#1A1A1A',
                margin: '32px auto 0',
                maxWidth: '46ch',
                height: 19,
              }}
            >
              We walk you through everything, you just show up.{' '}
              {/* <span style={{ ...goldTextGrad, position: 'relative', display: 'inline-block' }}>
                human touch
              </span> */}
              {' '}
            </p>
          </div>

          {/* steps: numerals with hand-drawn arrows between them */}
          <div
            data-role="steps"
            className="steps-wrap lp17-steps"
            style={{
              position: 'relative',
              marginTop: 'clamp(3px, 0.5vw, 5px)',
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
                    // Sized so the longest title ("Invite Your First Group")
                    // stays on one line in its column at desktop widths.
                    fontSize: 'clamp(17px,1.7vw,23px)',
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

          {/* closing line — same gold-gradient chip treatment as the who-card labels */}
          {/* <p
            className="reveal scroll-fade"
              style={{
                fontFamily: 'var(--display)',
                fontWeight: 600,
                fontSize: 'clamp(23px, 1vw, 30px)',
                lineHeight: 1.15,
                color: '#1A1A1A',
                margin: '35px auto 0',
                maxWidth: '46ch',
                height: 63,
                textAlign: 'center'
              }}
          >
            You never have to do it alone
          </p> */}
        </div>
      </section>

      {/* ribbon divider */}
      <div
        aria-hidden="true"
        className="lp17-ribbon-v4-wrap"
        style={{ width: '100%', overflow: 'hidden', lineHeight: 0, margin: '-100px 0 0', position: 'relative', zIndex: 1 }}
      >
        <img
          className="how-divider-flow"
          src={ASSET.ribbonV4}
          alt=""
          style={{
            display: 'block',
            width: '100%',
            // Cap the band's height so the 16:9 art doesn't fill the whole
            // screen on wide viewports; cover-crop keeps it a wide ribbon.
            height: 'clamp(235px, 59vw, 644px)',
            objectFit: 'cover',
            opacity: 0.85,
            transform: 'translate(44px, -94px) scale(1.27, 0.58)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, black 18%, black 78%, transparent 100%)',
            maskImage:
              'linear-gradient(to bottom, transparent 0%, black 18%, black 78%, transparent 100%)',
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
          background: 'transparent',
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
            padding: 'clamp(13px, 4vw, 14px)',
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
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
                color: '#1A1A1A',
                margin: '0 0 28px',
                height: 32,
              }}
            >
              AI helps you build your mentor program.
            </h2>
            <p
              className="lp17-why-p"
              style={{
                fontFamily: 'var(--display)',
                fontWeight: 600,
                fontSize: 'clamp(30px, 4.4vw, 41px)',
                lineHeight: 1.05,
                color: '#1A1A1A',
                margin: '34px auto 0',
                maxWidth: '46ch',
              }}
            >
              You bring the{' '}
              <span style={{ ...goldTextGrad, position: 'relative', display: 'inline-block' }}>
                human touch
              </span>{' '}
              people are craving.
            </p>
            {/* <div
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
            </div> */}
                        <p
              className="lp17-why-p"
            style={{
              display: 'table',
              margin: '7px auto 0',
              fontFamily: 'var(--display)',
              fontSize: 22,
              fontWeight: 700,
              // letterSpacing: '0.14em',
              // textTransform: 'uppercase',
              textAlign: 'center',
              color: '#000000',
              // background: GOLD_GRAD,
              // borderRadius: 10,
              // boxShadow: '6px 7px 14px 3px #00000026',
              padding: '10px 22px',
            }}
            >
              Your programs gives them  a real person to learn from and a group to grow with.{' '}
              {/* <span style={{ ...goldTextGrad, position: 'relative', display: 'inline-block' }}>
                human touch
              </span> */}
              {' '}
            </p>
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
            marginTop: -108,
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
              transform: 'translate(166px, -113px) scale(-2.68, 0.7)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0%, black 16%, black 74%, transparent 96%)',
              maskImage:
                'linear-gradient(to bottom, transparent 0%, black 16%, black 74%, transparent 96%)',
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
            marginTop: -560,
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

                          <p
            className="reveal scroll-fade"
              style={{
                fontFamily: 'var(--display)',
                fontWeight: 600,
                fontSize: 'clamp(23px, 1vw, 30px)',
                lineHeight: 1.15,
                color: '#1A1A1A',
                margin: '35px auto 0',
                maxWidth: '46ch',
                height: 5,
                textAlign: 'center'
              }}
          >
            You never have to do it alone
          </p>
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
                      // Tracking/size tuned so "PEER SUPPORT CIRCLES" fits on
                      // one line in its column at desktop widths.
                      fontSize: 'clamp(17px,1.5vw,21px)',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
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
                      {/* <p
            className="reveal scroll-fade"
              style={{
                fontFamily: 'var(--display)',
                fontWeight: 600,
                fontSize: 'clamp(23px, 1vw, 30px)',
                lineHeight: 1.15,
                color: '#1A1A1A',
                margin: '35px auto 0',
                maxWidth: '46ch',
                height: 63,
                textAlign: 'center'
              }}
          >
            You never have to do it alone
          </p> */}
          </div>
        </section>

        {/* wave divider into the sunrise */}
        <div
          aria-hidden="true"
          className="lp17-pillars-divider-wrap"
          style={{ position: 'relative', width: '100%', overflow: 'hidden', lineHeight: 0, margin: '-155px 0 -70px', zIndex: 1 }}
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
              transform: 'translate(89px, -115px) scale(1.21, 0.64)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0%, black 16%, black 74%, transparent 96%)',
              maskImage:
                'linear-gradient(to bottom, transparent 0%, black 16%, black 74%, transparent 96%)',
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
            marginTop: -555,
            padding: 'clamp(56px,6vw,90px) 44px clamp(28px,3.4vw,52px)',
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
                margin: '0 0 35px',
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
              Backed by a 90-day money-back guarantee. 
              <br/>Build something you’re proud of.
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

        {/* ===================== COMMUNITY / TELEGRAM =====================
            NB: the "Who It's For" band already owns id="community", so this
            section uses its own id to keep the nav scroll-spy correct. */}
        <section
          id="join-community"
          style={{
            position: 'relative',
            zIndex: 10,
            padding: 'clamp(115px, 7vw, 217px) 44px clamp(40px, 5vw, 72px)',
            scrollMarginTop: 80,
            background: 'transparent',
          }}
        >
          <div
            className="reveal scroll-fade"
            style={{ position: 'relative', zIndex: 2, maxWidth: 720, margin: '0 auto', textAlign: 'center' }}
          >
            <p
              className="eyebrow"
              style={{
                ...blueBadge,
                // Sits centered on the wave art (by design) rather than plain
                // background, so it needs more than the usual 12% tint to
                // stay legible against the brightest part of the sweep.
                backgroundColor: 'rgba(255,255,255,0.55)',
                border: '1px solid rgba(101,173,207,0.4)',
                backdropFilter: 'blur(8px) saturate(140%)',
                WebkitBackdropFilter: 'blur(8px) saturate(140%)',
                boxShadow: '0 4px 16px rgba(34,41,61,0.08)',
                padding: '9px 22px',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.18em',
                margin: '0 0 20px',
              }}
            >
              Community
            </p>
            <h2
              className="lp17-balance"
              style={{
                fontFamily: 'var(--display)',
                fontWeight: 600,
                fontSize: 'clamp(28px,3.8vw,44px)',
                lineHeight: 1.12,
                letterSpacing: '-0.01em',
                color: '#1A1A1A',
                margin: '0 0 16px',
              }}
            >
              You never have to build <span style={goldTextGrad}>alone</span>.
            </h2>
            <p
              className="lp17-pretty"
              style={{
                fontSize: 'clamp(16px,1.7vw,19px)',
                lineHeight: 1.55,
                color: '#1A1A1AE4',
                margin: '0 auto 30px',
                maxWidth: '48ch',
              }}
            >
              Join our Telegram community to meet other mentors, ask questions, and share what
              you’re building.
            </p>
            <a
              className="lp17-tg-btn"
              href="https://t.me/AbundanceAI"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 11,
                textDecoration: 'none',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: 'clamp(15px,1.4vw,17px)',
                padding: '15px 32px',
                borderRadius: 999,
                background: 'linear-gradient(100deg, #2AABEE, #229ED9)',
                boxShadow: '0 12px 28px rgba(34,158,217,0.34)',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width={21} height={21} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M21.94 4.6l-3.02 14.25c-.23 1.01-.83 1.26-1.68.78l-4.65-3.43-2.24 2.16c-.25.25-.46.46-.94.46l.33-4.73 8.6-7.77c.37-.33-.08-.52-.58-.19L6.17 12.9 1.6 11.47c-.99-.31-1.01-.99.21-1.47l17.87-6.89c.83-.3 1.55.2 1.26 1.49z" />
              </svg>
              Join us on Telegram
            </a>
          </div>
        </section>

        {/* flowing divider into the testimonials */}
        <div
          aria-hidden="true"
          className="lp17-pricing-divider-wrap"
          style={{
            position: 'relative',
            width: '100%',
            // overflow:hidden here would clip the transformed image to this
            // element's untransformed (pre-transform) layout box, cutting it
            // mid-wave — the root's overflowX:clip already guards against
            // horizontal bleed, so this can stay visible and rely on the
            // mask below for soft top/bottom edges instead of a hard clip.
            overflow: 'visible',
            lineHeight: 0,
            margin: '-405px 0 -531px',
            zIndex: 1,
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 86%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 86%, transparent 100%)',
          }}
        >
          <img
            className="pricing-divider-flow pricing-divider-flow-anim"
            src={ASSET.pricingTestiDivider}
            alt=""
            style={{
              display: 'block',
              width: '118%',
              maxWidth: 'none',
              marginLeft: '-13%',
              height: 'auto',
              opacity: 0.8,
              transform: 'translate(100px, -99px) scale(-1.68, 1)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0%, black 16%, black 74%, transparent 96%)',
              maskImage:
                'linear-gradient(to bottom, transparent 0%, black 16%, black 74%, transparent 96%)',
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
            marginTop: 0,
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
            <div className="testi-wrap" style={{ padding: 'clamp(59px, 4vw, 168px) 0px clamp(46px, 3vw, 54px);' }}>
              <div
                className="reveal scroll-fade"
                style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto clamp(30px, 4.6vw, 34px)', position: 'relative' }}
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
                  Here’s what other mentors had to say about{' '}
                  <strong style={{ color: '#1A1A1A' }}>Abundance</strong>
                  <strong style={{ color: '#F59C30' }}>AI</strong>.
                </p>
              </div>

              <div className="lp17-testi-carousel" style={{ position: 'relative' }}>
              <div
                className="reveal"
                style={{ position: 'relative', minHeight: 220, maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}
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
                    {/* <span
                      style={{
                        fontFamily: 'var(--display)',
                        fontSize: 54,
                        lineHeight: 1,
                        color: t.color,
                        display: 'block',
                        marginBottom: 8,
                      }}
                    >
                      “
                    </span> */}
                    <p
                      className="lp17-pretty"
                      style={{
                        fontFamily: 'var(--display)',
                        fontWeight: 500,
                        fontSize: 'clamp(20px,2.4vw,28px)',
                        lineHeight: 1.45,
                        color: '#1A1A1A',
                        margin: '0 0 28px',
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
              <div className="lp17-testi-nav" style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 32 }}>
                <button
                  type="button"
                  aria-label="Previous testimonial"
                  className="lp17-testi-btn-prev"
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
                  className="lp17-testi-btn-next"
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
              </div>
              {/* <p style={{ fontSize: 14, color: '#1A1A1A80', margin: '12px 0 0', textAlign: 'center' }}>
                Check other testimonials
              </p> */}
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
                  color: '#24729b',
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
                Real <span style={goldTextGrad}>mentor programs</span>, built by real people.
              </h2>
              {/* Cover-flow carousel: active card centered, neighbours tucked
                  behind in grayscale; dots + side-card clicks + swipe navigate. */}
              <div
                data-role="programs"
                className="lp17-programs-carousel"
                onTouchStart={(e) => {
                  const t = e.touches[0];
                  if (t) progTouchX.current = t.clientX;
                }}
                onTouchEnd={(e) => {
                  const t = e.changedTouches[0];
                  if (!t) return;
                  const dx = t.clientX - progTouchX.current;
                  if (Math.abs(dx) > 45) {
                    setProgramIdx((i) => (i + (dx < 0 ? 1 : -1) + PROGRAMS.length) % PROGRAMS.length);
                  }
                }}
              >
                {PROGRAMS.map((prog, i) => {
                  const n = PROGRAMS.length;
                  const r = (((i - programIdx) % n) + n) % n;
                  const rel = r === n - 1 ? -1 : r; // -1 left, 0 center, 1 right, 2 hidden
                  const transforms: Record<number, string> = {
                    [-1]: 'translateX(calc(-50% - 56%)) scale(0.8)',
                    0: 'translateX(-50%) scale(1)',
                    1: 'translateX(calc(-50% + 56%)) scale(0.8)',
                    2: 'translateX(-50%) scale(0.66)',
                  };
                  return (
                    <div
                      key={prog.title}
                      aria-hidden={rel === 2 || undefined}
                      onClick={rel === 0 ? undefined : () => setProgramIdx(i)}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: 0,
                        width: 'min(280px, 64vw)',
                        // Keep the stage height in the CSS above in sync with
                        // this width × ratio, or the carousel reserves dead space.
                        aspectRatio: '1 / 1.3',
                        transform: transforms[rel],
                        zIndex: rel === 0 ? 3 : rel === 2 ? 0 : 2,
                        opacity: rel === 2 ? 0 : rel === 0 ? 1 : 0.9,
                        filter: rel === 0 ? 'none' : 'grayscale(1)',
                        pointerEvents: rel === 2 ? 'none' : 'auto',
                        cursor: rel === 0 ? 'default' : 'pointer',
                        transition:
                          'transform .55s cubic-bezier(.22,.61,.36,1), opacity .55s ease, filter .55s ease',
                        willChange: 'transform',
                      }}
                    >
                    <div
                      className="program-card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'center',
                        gap: 'clamp(8px,2.5%,16px)',
                        height: '100%',
                        borderRadius: 20,
                        border: 'none',
                        boxShadow: '0 18px 44px rgba(34,41,61,0.07)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        padding: 'clamp(18px,6%,28px)',
                        ...prog.cardStyle,
                      }}
                    >
                       <p
                        style={{
                          fontSize: 'clamp(15px,1.2vw,18px)',
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          lineHeight: 1.28,
                          color: prog.guideColor,
                          margin: 0,
                        }}
                      >
                        {prog.guide}
                      </p>
                      <div
                        style={{
                          width: 'clamp(104px,45%,150px)',
                          aspectRatio: '1 / 1',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          position: 'relative',
                          background: 'rgba(0,0,0,0.05)',
                          flex: '0 0 auto',
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
                     
                      {/* Title + sub read as one left-aligned block. */}
                      <div style={{ width: '100%', textAlign: 'center' }}>
                        <h3
                          className="lp17-pretty"
                          style={{
                            fontFamily: 'var(--display)',
                            fontWeight: 600,
                            fontSize: 'clamp(19px,1.7vw,20px)',
                            lineHeight: 1.18,
                            color: prog.titleColor,
                            margin: '0 0 7px',
                          }}
                        >
                          {prog.title}
                        </h3>
                        <p
                          className="lp17-pretty"
                          style={{
                            fontFamily: 'var(--display)',
                            fontWeight: 400,
                            fontSize: 'clamp(12px,1.05vw,14.5px)',
                            lineHeight: 1.34,
                            color: prog.titleColor,
                            opacity: 0.86,
                            margin: 0,
                          }}
                        >
                          {prog.sub}
                        </p>
                      </div>
                      <a
                        className="lp17-prog-cta"
                        href={prog.url}
                        target="_blank"
                        rel="noreferrer"
                        // Only the centred card is interactive; the side cards
                        // act as "bring me to front" targets.
                        tabIndex={rel === 0 ? undefined : -1}
                        onClick={(e) => {
                          if (rel !== 0) e.preventDefault();
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          textDecoration: 'none',
                          fontSize: 'clamp(13px,1.05vw,15px)',
                          fontWeight: 700,
                          color: prog.guideColor,
                          background: 'rgba(255,255,255,0.72)',
                          border: '1px solid rgba(36,114,155,0.28)',
                          borderRadius: 12,
                          padding: '11px 18px',
                          width: '100%',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {prog.firstName}’s Program <span aria-hidden="true">→</span>
                      </a>
                    </div>
                    </div>
                  );
                })}
              </div>

              {/* carousel dots */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 28 }}>
                {PROGRAMS.map((prog, i) => (
                  <button
                    key={prog.title}
                    type="button"
                    aria-label={`Show ${prog.title}`}
                    aria-current={i === programIdx || undefined}
                    onClick={() => setProgramIdx(i)}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      background: i === programIdx ? '#F59C30' : 'rgba(26,26,26,0.18)',
                      transform: i === programIdx ? 'scale(1.3)' : 'none',
                      transition: 'background .25s ease, transform .25s ease',
                    }}
                  />
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
              gridTemplateColumns: '1.6fr 1fr 1fr 1.5fr',
              gap: 'clamp(24px,2.6vw,48px)',
              position: 'relative',
            }}
          >
            <div>
              <a
                href="#home"
                style={{
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  position: 'relative'
                }}
              >
                <img
                  className="lp17-logo-star lp17-logo-star-footer"
                  src={ASSET.star}
                  alt=""
                  aria-hidden="true"
                  style={{
                    width: 66,
                    height: 66,
                    flex: '0 0 auto',
                    objectFit: 'contain',
                    marginLeft: -14,
                    marginRight: -26,
                    transform: 'translateY(-11px)',
                  }}
                />
                <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 29, color: '#4A4A52', margin: '0 0 5px' }}>
                    Abundance<span style={{ color: '#F59C30' }}>AI</span>
                  </span>
                  <span style={{ fontSize: 14, lineHeight: 1, color: '#4A4A52', maxWidth: '24ch' }}>
                    A Human-First AI Platform
                  </span>
                </span>
              </a>
            </div>
            {FOOT_COLS.map((col) => (
              <div key={col.heading}>
                <p className="eyebrow" style={{ color: '#65ADCF', margin: '0 0 16px' }}>
                  {col.heading}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {col.links.map((link) =>
                    link.href.startsWith('/') ? (
                      <Link
                        key={link.label}
                        to={link.href}
                        className="footlink"
                        style={{ textDecoration: 'none', fontSize: 14, color: '#4A4A52', }}
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        key={link.label}
                        href={link.href}
                        className="footlink"
                        style={{ textDecoration: 'none', fontSize: 14, color: '#4A4A52', }}
                      >
                        {link.label}
                      </a>
                    ),
                  )}
                </div>
              </div>
            ))}
            <div>
              <p className="eyebrow" style={{ color: '#65ADCF', margin: '0 0 16px' }}>
                Stay Updated
              </p>
              {/* <p style={{ fontSize: 13.5, lineHeight: 1.5, color: '#4A4A52', margin: '0 0 14px' }}>
                Get tips, stories, and updates to grow your impact.
              </p> */}
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
            <span style={{ fontSize: 13, color: '#7A7A82' }}>© 2026 AbundanceAI. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

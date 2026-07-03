// Minimal inline icon set (stroke, currentColor) — no icon dependency. The tab
// glyphs match the spec's ⌂ ▦ ♡ ◎ ◔ motifs.
import type { SVGProps } from 'react';

type I = SVGProps<SVGSVGElement>;
const base = (p: I) => ({
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  ...p,
});

export const HomeIcon = (p: I) => (<svg {...base(p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /></svg>);
export const ProgramIcon = (p: I) => (<svg {...base(p)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></svg>);
export const HeartIcon = (p: I) => (<svg {...base(p)}><path d="M12 20s-7-4.35-9.5-8.5C1 8.5 2.5 5.5 6 5.5c2 0 3 1.2 4 2.5 1-1.3 2-2.5 4-2.5 3.5 0 5 3 3.5 6C19 15.65 12 20 12 20Z" /></svg>);
export const CircleTabIcon = (p: I) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /></svg>);
export const ArrowRight = (p: I) => (<svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const ArrowLeft = (p: I) => (<svg {...base(p)}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>);
export const CheckIcon = (p: I) => (<svg {...base(p)}><path d="M5 12.5 10 17l9-10" /></svg>);
export const CopyIcon = (p: I) => (<svg {...base(p)}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>);
export const UploadIcon = (p: I) => (<svg {...base(p)}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" /></svg>);
export const MicIcon = (p: I) => (<svg {...base(p)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>);
export const PlayIcon = (p: I) => (<svg {...base(p)}><path d="M7 5l11 7-11 7V5Z" /></svg>);
export const CloseIcon = (p: I) => (<svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const TrashIcon = (p: I) => (<svg {...base(p)}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" /></svg>);
export const PlusIcon = (p: I) => (<svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>);
export const DragIcon = (p: I) => (<svg {...base(p)}><circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" /></svg>);
export const ShieldIcon = (p: I) => (<svg {...base(p)}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /><path d="M9 12l2 2 4-4" /></svg>);
export const SparkleIcon = (p: I) => (<svg {...base(p)}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /></svg>);
export const TargetIcon = (p: I) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></svg>);
export const WandSparklesIcon = (p: I) => (<svg {...base(p)}><path d="M5 19 14.5 9.5" /><path d="M14.5 9.5 17 7" /><path d="M9 3.5l.6 1.7L11.3 5.8 9.6 6.4 9 8.1 8.4 6.4 6.7 5.8 8.4 5.2 9 3.5Z" /><path d="M18.5 11l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5.5-1.4Z" /></svg>);
export const HeartHandshakeIcon = (p: I) => (<svg {...base(p)}><path d="M12 20s-7-4.35-9.5-8.5C1 8.5 2.5 5.5 6 5.5c2 0 3 1.2 4 2.5 1-1.3 2-2.5 4-2.5 3.5 0 5 3 3.5 6C19 15.65 12 20 12 20Z" /><path d="m12.5 8.5-2.2 2.2a1.1 1.1 0 0 0 0 1.6l.2.2a1.1 1.1 0 0 0 1.6 0L13.5 11" /></svg>);
export const CalendarIcon = (p: I) => (<svg {...base(p)}><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /></svg>);
export const VideoIcon = (p: I) => (<svg {...base(p)}><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" /></svg>);
export const ChatIcon = (p: I) => (<svg {...base(p)}><path d="M21 11.5a7.5 7.5 0 0 1-10.9 6.7L4 20l1.8-5.1A7.5 7.5 0 1 1 21 11.5Z" /></svg>);
export const PencilIcon = (p: I) => (<svg {...base(p)}><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M14.5 7.5l3 3" /></svg>);
export const CardIcon = (p: I) => (<svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>);
export const HelpIcon = (p: I) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3" /><path d="M12 17h.01" /></svg>);
export const MegaphoneIcon = (p: I) => (<svg {...base(p)}><path d="M3 11v2a1 1 0 0 0 1 1h2l9 5V5L6 10H4a1 1 0 0 0-1 1Z" /><path d="M18 8a4 4 0 0 1 0 8" /></svg>);
export const ShareIcon = (p: I) => (<svg {...base(p)}><circle cx="6" cy="12" r="2.5" /><circle cx="17" cy="6" r="2.5" /><circle cx="17" cy="18" r="2.5" /><path d="M8.2 10.8l6.6-3.6M8.2 13.2l6.6 3.6" /></svg>);
export const InstagramIcon = (p: I) => (<svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17" cy="7" r="1" /></svg>);
export const LinkedInIcon = (p: I) => (<svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 0 1 4 0v4M11 10v7" /></svg>);
export const MailIcon = (p: I) => (<svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>);
export const BookIcon = (p: I) => (<svg {...base(p)}><path d="M4 5a2 2 0 0 1 2-2h6v17H6a2 2 0 0 0-2 2V5Z" /><path d="M20 5a2 2 0 0 0-2-2h-6v17h6a2 2 0 0 1 2 2V5Z" /></svg>);
export const LockIcon = (p: I) => (<svg {...base(p)}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>);
export const UsersIcon = (p: I) => (<svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 6.2a3.2 3.2 0 0 1 0 6M17.5 19a5.5 5.5 0 0 0-3-4.9" /></svg>);
export const EyeIcon = (p: I) => (<svg {...base(p)}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>);
export const EyeOffIcon = (p: I) => (<svg {...base(p)}><path d="M3 3l18 18" /><path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" /><path d="M9.4 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-3.2 4M6.2 6.2A18.2 18.2 0 0 0 2 12s3.5 7 10 7a10.6 10.6 0 0 0 4-.8" /></svg>);

// Brand glyphs for social sharing — filled marks (not stroked), use currentColor.
export const XIcon = (p: I) => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
  </svg>
);
export const FacebookIcon = (p: I) => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

// Brand-coloured Google mark (fixed fills, not currentColor) for the OAuth button.
export const GoogleIcon = (p: I) => (
  <svg width={18} height={18} viewBox="0 0 48 48" {...p}>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.1-2.1 3.9-3.9 5.2l6.2 5.2C39.9 35.7 44 30.4 44 24c0-1.3-.1-2.3-.4-3.5z" />
  </svg>
);

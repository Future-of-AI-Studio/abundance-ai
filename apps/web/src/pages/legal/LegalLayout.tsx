import { ReactNode, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Shared shell for the legal/policy pages — same type system as the landing
// page (Playfair display + Inter body, lp17 ink palette), stripped down to a
// readable document column. A few bracketed placeholders (legal entity name,
// registered address, support hours, billing email) remain in the Delivery
// and Refund policies until those business details are confirmed.

export const LEGAL_PAGES = [
  { path: '/privacy', label: 'Privacy Policy' },
  { path: '/terms', label: 'Terms of Service' },
  { path: '/cookies', label: 'Cookie Policy' },
  { path: '/delivery', label: 'Delivery Policy' },
  { path: '/refunds', label: 'Refund & Cancellation' },
] as const;

const CSS = `
.legal { --ink:#22293D; --ink-2:#5B6072; --ink-3:#8C8FA0; }
.legal ::selection { background:#FBDFAE; color:var(--ink); }
.legal-main h2 { font-family:'Playfair Display',serif; font-weight:600; font-size:26px; line-height:1.25; color:var(--ink); margin:42px 0 12px; }
.legal-main h3 { font-family:'Inter',system-ui,sans-serif; font-size:17px; font-weight:700; color:var(--ink); margin:26px 0 8px; }
.legal-main p { font-size:16px; line-height:1.7; color:#3A4152; margin:0 0 14px; }
.legal-main ul { list-style:disc; margin:0 0 16px; padding-left:24px; }
.legal-main ol { list-style:decimal; margin:0 0 16px; padding-left:24px; }
.legal-main li { font-size:16px; line-height:1.65; color:#3A4152; margin-bottom:8px; }
.legal-main strong, .legal-main b { color:var(--ink); }
.legal-main table { width:100%; border-collapse:collapse; margin:0 0 20px; font-size:15px; }
.legal-main th, .legal-main td { border:1px solid rgba(34,41,61,0.14); padding:10px 14px; text-align:left; vertical-align:top; line-height:1.55; color:#3A4152; }
.legal-main th { background:#F2F9F7; font-weight:700; color:var(--ink); }
.legal-main em { color:var(--ink-2); }
.legal-nav-link { transition:color 160ms ease; }
.legal-nav-link:hover { color:#E8932C !important; }
.legal-foot-link { text-decoration:none; font-size:13px; color:#4A4A52; transition:color 160ms ease; }
.legal-foot-link:hover { color:#F6C36B; }
@media (max-width: 560px) {
  .legal-main { padding-left:20px !important; padding-right:20px !important; }
}
`;

export function LegalLayout({
  title,
  effective,
  children,
}: {
  title: string;
  effective?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    window.scrollTo(0, 0);
    const prevTitle = document.title;
    document.title = `${title} · AbundanceAI`;
    return () => {
      document.title = prevTitle;
    };
  }, [title]);

  return (
    <div
      className="legal"
      style={{
        minHeight: '100dvh',
        background: '#FFFFFF',
        fontFamily: "'Inter',system-ui,sans-serif",
        color: '#22293D',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{CSS}</style>

      <nav style={{ padding: '20px 24px', borderBottom: '1px solid rgba(34,41,61,0.08)' }}>
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <Link
            to="/"
            style={{ textDecoration: 'none', display: 'inline-flex', flexDirection: 'column', gap: 2 }}
          >
            <span
              style={{
                fontFamily: "'Playfair Display',serif",
                fontWeight: 700,
                fontSize: 26,
                letterSpacing: '-0.01em',
                color: '#22293D',
              }}
            >
              Abundance<span style={{ color: '#F59C30' }}>AI</span>
            </span>
            <span
              style={{
                fontWeight: 600,
                fontSize: 9,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#5B6072',
              }}
            >
              A Human-First AI Platform
            </span>
          </Link>
          <Link
            to="/"
            className="legal-nav-link"
            style={{ textDecoration: 'none', fontSize: 14, fontWeight: 600, color: '#5B6072', whiteSpace: 'nowrap' }}
          >
            ← Back to Home
          </Link>
        </div>
      </nav>

      <main className="legal-main" style={{ flex: 1, width: '100%', maxWidth: 820, margin: '0 auto', padding: '40px 32px 90px' }}>
        <h1
          style={{
            fontFamily: "'Playfair Display',serif",
            fontWeight: 600,
            fontSize: 'clamp(34px,5vw,48px)',
            lineHeight: 1.1,
            margin: '0 0 10px',
          }}
        >
          {title}
        </h1>
        {effective && (
          <p style={{ fontSize: 14, color: '#8C8FA0', margin: '0 0 8px', fontStyle: 'italic' }}>{effective}</p>
        )}
        <div
          aria-hidden="true"
          style={{
            width: 64,
            height: 4,
            borderRadius: 999,
            background: 'linear-gradient(100deg, #F59C30, #F8BF39)',
            margin: '22px 0 8px',
          }}
        />
        {children}
      </main>

      <footer style={{ backgroundColor: '#E2FDF8', padding: '26px 24px' }}>
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px 26px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 13, color: '#7A7A82' }}>© 2025 AbundanceAI. All rights reserved.</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 22px' }}>
            {LEGAL_PAGES.map((page) => (
              <Link key={page.path} to={page.path} className="legal-foot-link">
                {page.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

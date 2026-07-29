// Transactional email transport, via Resend's HTTP API (works cleanly under Deno,
// no SMTP). Keys live in Supabase secrets and never reach the client. Like the
// Stripe helpers, email degrades gracefully: when RESEND_API_KEY isn't set,
// emailConfigured() is false and callers skip sending — a feature never fails an
// enrollment because email isn't wired up yet.
//
// Configure on a project with:
//   supabase secrets set RESEND_API_KEY=re_xxx
//   supabase secrets set EMAIL_FROM="AbundanceAI <hello@your-verified-domain>"
// The from-address domain must be verified in Resend or delivery is rejected.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';

// Sender shown to recipients. Defaults to Resend's shared test sender so local /
// staging sends work before a domain is verified; override with EMAIL_FROM once a
// real domain is set up in production.
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'AbundanceAI <onboarding@resend.dev>';

export function emailConfigured(): boolean {
  return RESEND_API_KEY.trim().length > 0;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  // Optional reply-to — used so a participant replying to a confirmation reaches
  // their host directly rather than a no-reply void.
  replyTo?: string;
}

// Sends one email. Returns true on success, false when skipped (not configured)
// or on a delivery error — it never throws, so a failed send can't roll back the
// action that triggered it. Errors are logged for debugging.
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  if (!emailConfigured()) {
    console.warn('Email not configured (RESEND_API_KEY unset) — skipping send to', msg.to);
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('Resend send failed:', res.status, detail);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Resend send error:', err);
    return false;
  }
}

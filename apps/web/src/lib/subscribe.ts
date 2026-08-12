// "Stay Updated" footer capture. POSTs to a Google Apps Script web app that
// appends one row per signup to a monitoring spreadsheet — see
// scripts/subscribe-sheet.gs for the script and its deployment steps.
//
// The sheet is the ONLY store for these emails; nothing is written to Postgres.
// A failed append is therefore a permanently lost signup, which is why this
// reports failure to the user instead of silently swallowing it.

export type SubscribeResult = 'ok' | 'duplicate' | 'invalid' | 'error';

/** Mirrors EMAIL_RE in scripts/subscribe-sheet.gs — the script re-checks. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Apps Script is slow, and a too-tight timeout fails submissions that were about
// to succeed. Measured against a live deployment: ~3.2-5.0s warm, ~8.6s on a
// cold start. 20s leaves headroom over a cold start on a bad connection while
// still giving up before a dead endpoint spins forever. Do not lower this
// without re-measuring — the UI's "this can take a few seconds" copy assumes it.
const TIMEOUT_MS = 20_000;

const SUBSCRIBE_URL = import.meta.env.VITE_SUBSCRIBE_URL ?? '';

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length <= 254 && EMAIL_RE.test(trimmed);
}

export interface SubscribeArgs {
  email: string;
  /** Which surface the signup came from — recorded in the sheet's Source column. */
  source?: string;
  /** Honeypot value. Non-empty means a bot filled a CSS-hidden field. */
  trap?: string;
}

export async function subscribeEmail({
  email,
  source = 'landing-footer',
  trap = '',
}: SubscribeArgs): Promise<SubscribeResult> {
  if (!isValidEmail(email)) return 'invalid';

  if (!SUBSCRIBE_URL) {
    // Unset is the normal state in local dev and mock mode, where there is no
    // sheet to write to. Resolve happily there so the footer is exercisable,
    // but never in a real build — a missing URL in production means every lead
    // is being dropped, and that must surface as an error, not a fake success.
    if (import.meta.env.DEV) {
      console.warn('[subscribe] VITE_SUBSCRIBE_URL unset — signup not recorded:', email);
      return 'ok';
    }
    console.error('[subscribe] VITE_SUBSCRIBE_URL unset in a production build.');
    return 'error';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(SUBSCRIBE_URL, {
      method: 'POST',
      // text/plain is deliberate. application/json would make this a non-simple
      // request, triggering a CORS preflight that Apps Script does not answer —
      // the request would fail before it ever left the browser. The body is
      // still JSON; the script parses it with JSON.parse. Do not "correct" this.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), source, company: trap }),
      redirect: 'follow', // Apps Script 302s to script.googleusercontent.com
      signal: controller.signal,
    });

    if (!res.ok) return 'error';

    const data = (await res.json()) as { status?: string };
    return data.status === 'ok' || data.status === 'duplicate' || data.status === 'invalid'
      ? (data.status as SubscribeResult)
      : 'error';
  } catch {
    // Network failure, timeout, or a non-JSON body (Apps Script returns an HTML
    // error page when a deployment is misconfigured).
    return 'error';
  } finally {
    clearTimeout(timer);
  }
}

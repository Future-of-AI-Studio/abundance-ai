// Enrollment confirmation emails — two versions, chosen by how the participant
// enrolled:
//   • free  — took the "Try first session for free" offer (amount_cents === 0)
//   • paid  — paid the full program fee (amount_cents > 0)
// Both are built from one branded shell so they read as the same product. Content
// is plain, warm, and free of any credential/link a phisher would want — these are
// pure confirmations. Stripe still sends its own payment receipt for paid spots.

import { emailConfigured, sendEmail } from './email.ts';

const BRAND_TEAL = '#1E7268'; // --c-primary-deep
const BRAND_ACCENT = '#43A981'; // --c-accent
const INK = '#1a1a1a';
const INK_SOFT = '#555555';
const CREAM = '#F0FBFA';

export interface EnrollmentEmailParams {
  participantName: string;
  programTitle: string;
  hostName: string; // creator first name (already defaulted to "your host")
  amountCents: number; // 0 for free trial, > 0 for paid
  // Link back to the app / program. Optional — omitted cleanly when unknown.
  appUrl?: string;
}

// Escape user-supplied text before dropping it into HTML. Names and titles are
// participant/creator input, so never trust them raw in markup.
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Shared responsive email shell. `bodyHtml` is trusted, pre-escaped markup.
function shell(opts: { preheader: string; heading: string; bodyHtml: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:${CREAM};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e3ede9;">
        <tr>
          <td style="background:${BRAND_TEAL};padding:28px 32px;">
            <span style="display:inline-block;height:10px;width:10px;border-radius:50%;background:${CREAM};margin-right:5px;"></span>
            <span style="display:inline-block;height:10px;width:10px;border-radius:50%;background:${BRAND_ACCENT};"></span>
            <span style="color:#ffffff;font-size:18px;font-weight:700;margin-left:10px;vertical-align:top;line-height:20px;">AbundanceAI</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 12px;">
            <h1 style="margin:0;font-size:24px;line-height:1.2;color:${INK};font-weight:600;">${esc(opts.heading)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 36px;font-size:16px;line-height:1.6;color:${INK_SOFT};">
            ${opts.bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;border-top:1px solid #eef4f1;font-size:12px;line-height:1.5;color:#9aa5a1;">
            You're receiving this because you enrolled in a program on AbundanceAI.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:14px;color:#9aa5a1;">${esc(label)}</td>
    <td style="padding:6px 0;font-size:14px;color:${INK};font-weight:600;text-align:right;">${esc(value)}</td>
  </tr>`;
}

// ── Free trial: "Try first session for free" ──────────────────────────────────
export function freeTrialEnrollmentEmail(p: EnrollmentEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const name = p.participantName.trim() || 'there';
  const subject = `You're in — your free first session of ${p.programTitle}`;

  const details = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;padding:16px 18px;background:${CREAM};border-radius:12px;">
    ${detailRow('Program', p.programTitle)}
    ${detailRow('Host', p.hostName)}
    ${detailRow('Your first session', 'Free')}
  </table>`;

  const bodyHtml = `
    <p style="margin:0 0 16px;">Hi ${esc(name)},</p>
    <p style="margin:0 0 16px;">Your spot is reserved — you've claimed a <strong>free first session</strong> of <strong>${esc(p.programTitle)}</strong> with ${esc(p.hostName)}. There's nothing to pay to try it.</p>
    ${details}
    <p style="margin:0 0 16px;"><strong>What happens next:</strong> ${esc(p.hostName)} will reach out using the contact details you provided to share the schedule and how to join your first session.</p>
    <p style="margin:0 0 16px;">Loved it? You can enroll in the full program afterwards to keep going. No pressure — come as you are and see if it's a fit.</p>
    <p style="margin:24px 0 0;">See you there,<br>The AbundanceAI team</p>`;

  const text = `Hi ${name},

Your spot is reserved — you've claimed a FREE first session of ${p.programTitle} with ${p.hostName}. There's nothing to pay to try it.

  Program: ${p.programTitle}
  Host: ${p.hostName}
  Your first session: Free

What happens next: ${p.hostName} will reach out using the contact details you provided to share the schedule and how to join your first session.

Loved it? You can enroll in the full program afterwards to keep going. No pressure — come as you are and see if it's a fit.

See you there,
The AbundanceAI team`;

  return { subject, html: shell({ preheader: `Your free first session of ${p.programTitle} is reserved.`, heading: "You're in! 🎉", bodyHtml }), text };
}

// ── Paid: full program enrollment ─────────────────────────────────────────────
export function paidEnrollmentEmail(p: EnrollmentEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const name = p.participantName.trim() || 'there';
  const amount = formatUsd(p.amountCents);
  const subject = `You're enrolled in ${p.programTitle} 🎉`;

  const details = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;padding:16px 18px;background:${CREAM};border-radius:12px;">
    ${detailRow('Program', p.programTitle)}
    ${detailRow('Host', p.hostName)}
    ${detailRow('Amount paid', amount)}
  </table>`;

  const bodyHtml = `
    <p style="margin:0 0 16px;">Hi ${esc(name)},</p>
    <p style="margin:0 0 16px;">You're all set — your enrollment in <strong>${esc(p.programTitle)}</strong> with ${esc(p.hostName)} is confirmed and your payment of <strong>${esc(amount)}</strong> went through.</p>
    ${details}
    <p style="margin:0 0 16px;"><strong>What happens next:</strong> ${esc(p.hostName)} will reach out using the contact details you provided to share the schedule, session links, and everything you need to get started.</p>
    <p style="margin:0 0 16px;">A separate payment receipt is on its way from our payment processor for your records.</p>
    <p style="margin:24px 0 0;">Welcome aboard,<br>The AbundanceAI team</p>`;

  const text = `Hi ${name},

You're all set — your enrollment in ${p.programTitle} with ${p.hostName} is confirmed and your payment of ${amount} went through.

  Program: ${p.programTitle}
  Host: ${p.hostName}
  Amount paid: ${amount}

What happens next: ${p.hostName} will reach out using the contact details you provided to share the schedule, session links, and everything you need to get started.

A separate payment receipt is on its way from our payment processor for your records.

Welcome aboard,
The AbundanceAI team`;

  return { subject, html: shell({ preheader: `Your enrollment in ${p.programTitle} is confirmed.`, heading: "You're enrolled! 🎉", bodyHtml }), text };
}

// ── Creator notification: "someone just enrolled" ────────────────────────────
// Sent to the program's host so they know a participant signed up (free or paid)
// and can follow up. Carries the participant's contact details; replies route
// back to the participant.
export interface CreatorNotificationParams {
  hostName: string; // creator first name (already defaulted to "there")
  participantName: string;
  participantEmail: string;
  participantContact: string; // may be blank — the Contact row is omitted then
  programTitle: string;
  amountCents: number; // 0 for free trial, > 0 for paid
  appUrl?: string;
}

export function newEnrollmentCreatorEmail(p: CreatorNotificationParams): {
  subject: string;
  html: string;
  text: string;
} {
  const host = p.hostName.trim() || 'there';
  const participant = p.participantName.trim() || 'Someone';
  const isFree = p.amountCents <= 0;
  const type = isFree ? 'Free first session' : `Paid — ${formatUsd(p.amountCents)}`;
  const contact = p.participantContact.trim();
  const subject = `New enrollment in ${p.programTitle} 🎉`;

  const details = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;padding:16px 18px;background:${CREAM};border-radius:12px;">
    ${detailRow('Participant', participant)}
    ${detailRow('Type', type)}
    ${detailRow('Email', p.participantEmail)}
    ${contact ? detailRow('Contact', contact) : ''}
  </table>`;

  const bodyHtml = `
    <p style="margin:0 0 16px;">Hi ${esc(host)},</p>
    <p style="margin:0 0 16px;">Good news — <strong>${esc(participant)}</strong> just enrolled in <strong>${esc(p.programTitle)}</strong>${isFree ? ' with a free first session' : ''}.</p>
    ${details}
    <p style="margin:0 0 16px;"><strong>What happens next:</strong> reach out to welcome them and share the schedule and how to join. They're expecting to hear from you — just reply to this email to reach ${esc(participant)} directly.</p>
    <p style="margin:24px 0 0;">Congrats,<br>The AbundanceAI team</p>`;

  const text = `Hi ${host},

Good news — ${participant} just enrolled in ${p.programTitle}${isFree ? ' with a free first session' : ''}.

  Participant: ${participant}
  Type: ${type}
  Email: ${p.participantEmail}${contact ? `\n  Contact: ${contact}` : ''}

What happens next: reach out to welcome them and share the schedule and how to join. They're expecting to hear from you — just reply to this email to reach ${participant} directly.

Congrats,
The AbundanceAI team`;

  return { subject, html: shell({ preheader: `${participant} just enrolled in ${p.programTitle}.`, heading: 'New enrollment 🎉', bodyHtml }), text };
}

// Sends the creator notification. Never throws — mirrors sendEnrollmentConfirmation.
// Returns true only when an email was actually accepted for delivery.
export async function sendCreatorEnrollmentNotification(
  params: CreatorNotificationParams & { to: string; replyToParticipant?: string },
): Promise<boolean> {
  if (!emailConfigured()) return false;
  const built = newEnrollmentCreatorEmail(params);
  return sendEmail({
    to: params.to,
    subject: built.subject,
    html: built.html,
    text: built.text,
    replyTo: params.replyToParticipant,
  });
}

// Picks the right version by amount and sends it. Never throws — a failed send is
// logged and swallowed so it can't roll back a completed enrollment. Returns true
// only when an email was actually accepted for delivery.
export async function sendEnrollmentConfirmation(
  params: EnrollmentEmailParams & { to: string; replyToHost?: string },
): Promise<boolean> {
  if (!emailConfigured()) return false;
  const isFree = params.amountCents <= 0;
  const built = isFree ? freeTrialEnrollmentEmail(params) : paidEnrollmentEmail(params);
  return sendEmail({
    to: params.to,
    subject: built.subject,
    html: built.html,
    text: built.text,
    replyTo: params.replyToHost,
  });
}

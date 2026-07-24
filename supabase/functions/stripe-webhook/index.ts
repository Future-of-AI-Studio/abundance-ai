// stripe-webhook — public, signature-verified. On payment_intent.succeeded it
// marks the order paid (which unblocks account creation — the $25 gate). On
// account.updated (a Connect event, delivered when "listen to connected accounts"
// is enabled on this endpoint) it refreshes the creator's payout-readiness so the
// UI reflects onboarding progress without them re-clicking. Handling is idempotent:
// re-delivery of the same event never double-creates or double-marks.
import { stripeClient } from '../_shared/stripe.ts';
import { adminClient } from '../_shared/supabase.ts';

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event;
  try {
    const stripe = stripeClient();
    event = await stripe.webhooks.constructEventAsync(body, signature ?? '', WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  const admin = adminClient();

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as { id: string; status: string };
        // Idempotent: only flip 'created' → 'paid'; ignore if already paid/refunded.
        await admin
          .from('orders')
          .update({ status: 'paid' })
          .eq('stripe_payment_intent', pi.id)
          .eq('status', 'created');
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as { id: string };
        await admin
          .from('orders')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent', pi.id)
          .eq('status', 'created');
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as { payment_intent: string };
        if (charge.payment_intent) {
          await admin
            .from('orders')
            .update({ status: 'refunded' })
            .eq('stripe_payment_intent', charge.payment_intent);
        }
        break;
      }
      case 'account.updated': {
        // A creator's connected account changed (finished onboarding, added a
        // bank account, etc.). Mirror payout-readiness into stripe_connect so the
        // Get Paid page reflects it. Matched by account_id, so no user context needed.
        const acct = event.data.object as {
          id: string;
          charges_enabled?: boolean;
          payouts_enabled?: boolean;
          details_submitted?: boolean;
          email?: string | null;
          external_accounts?: { total_count?: number };
        };
        const connected = Boolean(acct.charges_enabled && acct.payouts_enabled);
        const checklist = {
          bank: (acct.external_accounts?.total_count ?? 0) > 0,
          id: Boolean(acct.details_submitted),
          email: Boolean(acct.email),
        };
        await admin
          .from('stripe_connect')
          .update({ connected, checklist })
          .eq('account_id', acct.id);
        break;
      }
      default:
        // Acknowledge unhandled events so Stripe stops retrying.
        break;
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err);
    return new Response('Handler error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

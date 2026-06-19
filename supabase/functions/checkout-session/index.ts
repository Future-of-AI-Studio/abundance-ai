// checkout-session — create the $25 Payment Intent (public; no JWT). Also serves
// /checkout-session/verify to confirm payment for the /welcome gate. Never trusts
// the client for payment status: the source of truth is Stripe + the webhook.
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, checkoutSessionRequestSchema, verifyPaymentRequestSchema } from '../_shared/contract.ts';
import { adminClient } from '../_shared/supabase.ts';
import { stripeClient, stripeConfigured, publishableKey, SIGNUP_AMOUNT_CENTS } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const url = new URL(req.url);
    const isVerify = url.pathname.endsWith('/verify');
    const admin = adminClient();

    if (isVerify) {
      const { payment_intent_id } = await parseBody(req, verifyPaymentRequestSchema);
      // Prefer Stripe as source of truth; fall back to the webhook-updated order.
      let paid = false;
      let email: string | null = null;
      if (stripeConfigured()) {
        const pi = await stripeClient().paymentIntents.retrieve(payment_intent_id);
        paid = pi.status === 'succeeded';
        email = (pi.metadata?.email as string) ?? null;
      }
      const { data: order } = await admin
        .from('orders')
        .select('id, email, status')
        .eq('stripe_payment_intent', payment_intent_id)
        .maybeSingle();
      if (order?.status === 'paid') paid = true;
      return json({ paid, email: email ?? order?.email ?? null, order_id: order?.id ?? null });
    }

    // Create the Payment Intent + a pending order row.
    const { email, is_related_party } = await parseBody(req, checkoutSessionRequestSchema);

    if (!stripeConfigured()) {
      return errorResponse('stripe_unconfigured', 'Payments are not configured yet.', 503);
    }

    const stripe = stripeClient();
    const pi = await stripe.paymentIntents.create({
      amount: SIGNUP_AMOUNT_CENTS,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      receipt_email: email,
      metadata: { email, product: 'abundanceai_signup' },
    });

    await admin.from('orders').insert({
      email,
      stripe_payment_intent: pi.id,
      amount_cents: SIGNUP_AMOUNT_CENTS,
      status: 'created',
      is_related_party: is_related_party ?? false,
    });

    const { data: order } = await admin
      .from('orders')
      .select('id')
      .eq('stripe_payment_intent', pi.id)
      .single();

    return json({
      client_secret: pi.client_secret,
      order_id: order?.id,
      payment_intent_id: pi.id,
      amount_cents: SIGNUP_AMOUNT_CENTS,
      publishable_key: publishableKey(),
    });
  } catch (err) {
    return handleThrown(err);
  }
});

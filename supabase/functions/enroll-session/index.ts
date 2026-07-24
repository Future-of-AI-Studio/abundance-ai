// enroll-session — create the Stripe PaymentIntent a buyer pays to enroll in a
// program (public; no JWT). The amount is the program's own price, never trusted
// from the client. When Stripe isn't configured, returns stripe:false so the
// client falls back to the demo pay form. The charge is a Stripe Connect DIRECT
// charge on the creator's connected account, so the money lands straight in the
// creator's Stripe account — AbundanceAI never holds it. The creator must have
// finished Stripe onboarding (stripe_connect.connected) before they can sell.
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, enrollSessionRequestSchema } from '../_shared/contract.ts';
import { adminClient } from '../_shared/supabase.ts';
import { stripeClient, stripeConfigured, publishableKey, platformFeeCents } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const { program_id, name, email, contact } = await parseBody(req, enrollSessionRequestSchema);
    const admin = adminClient();

    const { data: program } = await admin
      .from('programs')
      .select('id, user_id, title, price_cents, status')
      .eq('id', program_id)
      .maybeSingle();
    if (!program || program.status !== 'ready') {
      return errorResponse('not_found', "This program isn't available.", 404);
    }

    if (!stripeConfigured()) {
      return json({ client_secret: null, payment_intent_id: '', amount_cents: program.price_cents, publishable_key: '', stripe_account: null, stripe: false });
    }

    // The buyer pays the creator directly: the charge lives on the creator's own
    // connected Stripe account. They must have completed onboarding first, or
    // there's nowhere for the money to go.
    const { data: connect } = await admin
      .from('stripe_connect')
      .select('account_id, connected')
      .eq('user_id', program.user_id)
      .maybeSingle();
    if (!connect?.account_id || !connect.connected) {
      return errorResponse(
        'creator_payouts_unavailable',
        "This host isn't set up to accept payments yet. Please check back soon.",
        409,
      );
    }

    const stripe = stripeClient();
    const feeCents = platformFeeCents(program.price_cents);
    const pi = await stripe.paymentIntents.create(
      {
        amount: program.price_cents,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        receipt_email: email,
        // An application fee (if configured) is skimmed to the platform; with the
        // default 0 fee it's omitted entirely and the creator receives the full amount.
        ...(feeCents > 0 ? { application_fee_amount: feeCents } : {}),
        metadata: {
          program_id: program.id,
          creator_id: program.user_id,
          name,
          email,
          contact,
          product: 'abundanceai_enrollment',
        },
      },
      // Direct charge on the connected account — funds settle to the creator.
      { stripeAccount: connect.account_id },
    );

    return json({
      client_secret: pi.client_secret,
      payment_intent_id: pi.id,
      amount_cents: program.price_cents,
      publishable_key: publishableKey(),
      // The client must initialise Stripe.js with this account to confirm a
      // direct-charge PaymentIntent (the client_secret belongs to it).
      stripe_account: connect.account_id,
      stripe: true,
    });
  } catch (err) {
    return handleThrown(err);
  }
});

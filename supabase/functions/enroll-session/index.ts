// enroll-session — create the Stripe PaymentIntent a buyer pays to enroll in a
// program (public; no JWT). The amount is the program's own price, never trusted
// from the client. When Stripe isn't configured, returns stripe:false so the
// client falls back to the demo pay form. Payout to the creator (Stripe Connect)
// is not wired yet — the charge lands on the platform account for now.
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, enrollSessionRequestSchema } from '../_shared/contract.ts';
import { adminClient } from '../_shared/supabase.ts';
import { stripeClient, stripeConfigured, publishableKey } from '../_shared/stripe.ts';

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
      return json({ client_secret: null, payment_intent_id: '', amount_cents: program.price_cents, publishable_key: '', stripe: false });
    }

    const stripe = stripeClient();
    const pi = await stripe.paymentIntents.create({
      amount: program.price_cents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      receipt_email: email,
      metadata: {
        program_id: program.id,
        creator_id: program.user_id,
        name,
        email,
        contact,
        product: 'abundanceai_enrollment',
      },
    });

    return json({
      client_secret: pi.client_secret,
      payment_intent_id: pi.id,
      amount_cents: program.price_cents,
      publishable_key: publishableKey(),
      stripe: true,
    });
  } catch (err) {
    return handleThrown(err);
  }
});

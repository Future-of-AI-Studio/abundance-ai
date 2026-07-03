// enroll — record a buyer's enrollment AFTER payment succeeds (public; no JWT).
// Runs as service role: it records the enrollment against the program's owner
// (creator_id) so the creator sees them in their Students list. When Stripe is
// configured, the PaymentIntent is verified as succeeded before recording, so a
// row can't be created without a real payment. The amount is taken from the
// program's own price, never trusted from the client.
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, enrollRequestSchema } from '../_shared/contract.ts';
import { adminClient } from '../_shared/supabase.ts';
import { stripeClient, stripeConfigured } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const { program_id, name, email, contact, payment_intent_id } = await parseBody(req, enrollRequestSchema);
    const admin = adminClient();

    const { data: program } = await admin
      .from('programs')
      .select('id, user_id, title, price_cents, status')
      .eq('id', program_id)
      .maybeSingle();
    if (!program || program.status !== 'ready') {
      return errorResponse('not_found', "This program isn't available.", 404);
    }

    // With real Stripe, confirm the charge succeeded before recording anything.
    // Mock/demo payment ids (pi_mock_*) skip this — there's no PaymentIntent.
    const isMockPayment = !payment_intent_id || payment_intent_id.startsWith('pi_mock');
    if (stripeConfigured() && !isMockPayment) {
      const pi = await stripeClient().paymentIntents.retrieve(payment_intent_id!);
      if (pi.status !== 'succeeded') {
        return errorResponse('payment_incomplete', "Your payment didn't complete. Please try again.", 402);
      }
    }

    const { data: creator } = await admin
      .from('profiles')
      .select('first_name')
      .eq('id', program.user_id)
      .maybeSingle();

    const { error: insErr } = await admin.from('enrollments').insert({
      program_id: program.id,
      creator_id: program.user_id,
      name,
      email,
      contact,
      amount_cents: program.price_cents,
      status: 'enrolled',
      stripe_payment_intent: payment_intent_id ?? null,
    });
    if (insErr) {
      return errorResponse('enroll_failed', 'We could not complete your enrollment. Please try again.', 502);
    }

    return json({
      ok: true,
      program_title: program.title,
      creator_first_name: creator?.first_name ?? 'your host',
      amount_cents: program.price_cents,
    });
  } catch (err) {
    return handleThrown(err);
  }
});

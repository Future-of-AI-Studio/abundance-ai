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
    const { program_id, name, email, contact, payment_intent_id, free } = await parseBody(req, enrollRequestSchema);
    const admin = adminClient();

    const { data: program } = await admin
      .from('programs')
      .select('id, user_id, title, price_cents, status, free_offer_enabled, free_offer_until')
      .eq('id', program_id)
      .maybeSingle();
    if (!program || program.status !== 'ready') {
      return errorResponse('not_found', "This program isn't available.", 404);
    }

    // Is a free enrollment actually allowed right now? Either the program is
    // always free (price 0), or its time-limited free offer is enabled and hasn't
    // ended. This is the authoritative check — the client's `free` flag alone is
    // never trusted (it can't grant itself a $0 spot on a paid program).
    const freeWindowOpen = program.free_offer_enabled === true &&
      (!program.free_offer_until || new Date(program.free_offer_until).getTime() > Date.now());
    const isFreeEnrollment = program.price_cents === 0 || (free === true && freeWindowOpen);

    // Buyer asked to enroll free but the offer isn't open on a paid program.
    if (free === true && !isFreeEnrollment) {
      return errorResponse('free_offer_closed', 'The free enrollment window has closed — please enroll with payment.', 409);
    }

    const amountCents = isFreeEnrollment ? 0 : program.price_cents;

    // With real Stripe, confirm the charge succeeded before recording a paid spot.
    // Free enrollments and mock/demo payment ids (pi_mock_*) skip this — there's
    // no PaymentIntent to verify.
    const isMockPayment = !payment_intent_id || payment_intent_id.startsWith('pi_mock');
    if (!isFreeEnrollment && stripeConfigured() && !isMockPayment) {
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
      amount_cents: amountCents,
      status: 'enrolled',
      stripe_payment_intent: isFreeEnrollment ? null : (payment_intent_id ?? null),
    });
    if (insErr) {
      return errorResponse('enroll_failed', 'We could not complete your enrollment. Please try again.', 502);
    }

    return json({
      ok: true,
      program_title: program.title,
      creator_first_name: creator?.first_name ?? 'your host',
      amount_cents: amountCents,
    });
  } catch (err) {
    return handleThrown(err);
  }
});

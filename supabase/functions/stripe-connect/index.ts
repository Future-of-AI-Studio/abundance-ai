// stripe-connect — create a Stripe Connect (Express) onboarding link so the user
// can receive THEIR client payments. AbundanceAI never holds these funds. On
// return (reconcile=true), refresh connected status + the readiness checklist.
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, stripeConnectRequestSchema } from '../_shared/contract.ts';
import { requireUser, userClient } from '../_shared/supabase.ts';
import { stripeClient, stripeConfigured } from '../_shared/stripe.ts';

const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const user = await requireUser(req);
    const db = userClient(req);
    const body = await parseBody(req, stripeConnectRequestSchema);

    const { data: existing } = await db
      .from('stripe_connect').select('*').eq('user_id', user.id).maybeSingle();

    if (!stripeConfigured()) {
      return errorResponse('stripe_unconfigured', 'Payouts setup is not available yet.', 503);
    }
    const stripe = stripeClient();

    // Express dashboard login link — lets a connected creator manage their own
    // account (payouts, bank details, transactions) on Stripe. Only works once
    // onboarding is complete, which is the only time the UI offers this.
    if (body.dashboard) {
      if (!existing?.account_id) {
        return errorResponse('not_connected', 'Connect your Stripe account first.', 409);
      }
      const login = await stripe.accounts.createLoginLink(existing.account_id);
      return json({
        onboarding_url: null,
        dashboard_url: login.url,
        connected: existing.connected ?? false,
        checklist: existing.checklist ?? { bank: false, id: false, email: Boolean(user.email) },
      });
    }

    // Reconcile on return from Stripe-hosted onboarding.
    if (body.reconcile && existing?.account_id) {
      const acct = await stripe.accounts.retrieve(existing.account_id);
      const checklist = {
        bank: (acct.external_accounts?.total_count ?? 0) > 0,
        id: Boolean(acct.details_submitted),
        email: Boolean(acct.email),
      };
      const connected = Boolean(acct.charges_enabled && acct.payouts_enabled);
      const { data: updated } = await db
        .from('stripe_connect')
        .update({ connected, checklist })
        .eq('user_id', user.id).select('*').single();
      return json({ onboarding_url: null, connected: updated?.connected ?? connected, checklist: updated?.checklist ?? checklist });
    }

    // Create the Express account on first run.
    let accountId = existing?.account_id ?? null;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email || undefined,
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
      });
      accountId = account.id;
      await db.from('stripe_connect').update({ account_id: accountId }).eq('user_id', user.id);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${APP_URL}/app/onboarding/payments?stripe=refresh`,
      return_url: body.return_url ?? `${APP_URL}/app/onboarding/payments?stripe=return`,
      type: 'account_onboarding',
    });

    return json({
      onboarding_url: link.url,
      connected: existing?.connected ?? false,
      checklist: existing?.checklist ?? { bank: false, id: false, email: Boolean(user.email) },
    });
  } catch (err) {
    return handleThrown(err);
  }
});

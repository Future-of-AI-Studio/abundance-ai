// refund-request — compute the 90-day window from the paid order; create the
// request; return a calm result whether in or out of window (never a dead end).
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { requireUser, userClient, adminClient } from '../_shared/supabase.ts';

const WINDOW_DAYS = 90;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const user = await requireUser(req);
    const db = userClient(req);
    const admin = adminClient();

    const { data: order } = await db
      .from('orders').select('created_at').eq('user_id', user.id).eq('status', 'paid')
      .order('created_at', { ascending: true }).limit(1).maybeSingle();

    if (!order) {
      return errorResponse('no_order', "We couldn't find your purchase. Reach out and we'll sort it out.", 404);
    }

    const purchased = new Date(order.created_at).getTime();
    const daysSince = Math.floor((Date.now() - purchased) / (1000 * 60 * 60 * 24));
    const withinWindow = daysSince <= WINDOW_DAYS;
    const daysRemaining = withinWindow ? WINDOW_DAYS - daysSince : null;

    await admin.from('refund_requests').insert({
      user_id: user.id,
      status: withinWindow ? 'requested' : 'out_of_window',
    });

    return json({
      within_window: withinWindow,
      status: withinWindow ? 'requested' : 'out_of_window',
      days_remaining: daysRemaining,
      message: withinWindow
        ? "Done — your refund is on its way. No hard feelings, and you're always welcome back."
        : "You're just past the 90-day window, but we still want to help. We've logged your request and someone will reach out.",
    });
  } catch (err) {
    return handleThrown(err);
  }
});

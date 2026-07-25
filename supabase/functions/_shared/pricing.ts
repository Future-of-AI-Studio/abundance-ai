// Enrollment pricing, shared by enroll-session (which charges the buyer) and
// enroll (which records the amount). Mirrors apps/web/src/lib/freeOffer.ts —
// keep the two in lockstep so the client shows exactly what the server charges.

type FreeOfferState = { free_offer_enabled: boolean; free_offer_until: string | null };

// While a program's free-offer window is open, a buyer who enrolls (instead of
// taking the free first session) gets this percentage off the program fee.
export const FREE_OFFER_DISCOUNT_PCT = 10;

// The offer is "open" while it's enabled and its end date, if any, is still ahead.
export function freeWindowOpen(program: FreeOfferState): boolean {
  if (!program.free_offer_enabled) return false;
  if (!program.free_offer_until) return true; // no end date
  return new Date(program.free_offer_until).getTime() > Date.now();
}

// What a buyer actually owes right now, in whole cents: $0 for a free enrollment,
// the discounted fee while the offer window is open, otherwise the full price.
export function enrollAmountCents(
  priceCents: number,
  opts: { isFree: boolean; windowOpen: boolean },
): number {
  if (opts.isFree) return 0;
  if (opts.windowOpen) return priceCents - Math.round((priceCents * FREE_OFFER_DISCOUNT_PCT) / 100);
  return priceCents;
}

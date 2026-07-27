// Enrollment pricing, shared by enroll-session (which charges the buyer) and
// enroll (which records the amount). Mirrors apps/web/src/lib/freeOffer.ts —
// keep the two in lockstep so the client shows exactly what the server charges.

type FreeOfferState = { free_offer_enabled: boolean; free_offer_until: string | null };

// The offer is "open" while it's enabled and its end date, if any, is still ahead.
// While open, buyers get a $0 "try the first session free" option; enrolling with
// payment always pays the full program fee (no discount).
export function freeWindowOpen(program: FreeOfferState): boolean {
  if (!program.free_offer_enabled) return false;
  if (!program.free_offer_until) return true; // no end date
  return new Date(program.free_offer_until).getTime() > Date.now();
}

// What a buyer actually owes right now, in whole cents: $0 for a free enrollment,
// otherwise the full program price.
export function enrollAmountCents(priceCents: number, opts: { isFree: boolean }): number {
  return opts.isFree ? 0 : priceCents;
}

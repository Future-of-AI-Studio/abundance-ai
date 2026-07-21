// Free-enrollment offer helpers. A creator can let buyers join a paid program
// for free until a set date (or with no end date). The window is "open" while
// the offer is enabled and its end date, if any, is still in the future.
//
// This is a display/UX convenience only — the `enroll` Edge Function re-checks
// the window server-side before ever recording a $0 spot, so a stale client
// clock can't grant a free enrollment on its own.

type FreeOfferState = { free_offer_enabled: boolean; free_offer_until: string | null };

export function freeOfferOpen(program: FreeOfferState): boolean {
  if (!program.free_offer_enabled) return false;
  if (!program.free_offer_until) return true; // no end date
  return new Date(program.free_offer_until).getTime() > Date.now();
}

// The badge shown on the landing page while the offer is open, e.g.
// "Try for free until Jul 28" (or plain "Try for free" when there's no end date).
export function tryFreeLabel(until: string | null): string {
  if (!until) return 'Try for free';
  const date = new Date(until).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `Try for free until ${date}`;
}

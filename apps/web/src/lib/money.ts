// Money formatting for the sell-side (program price, enrollment amounts).
// Amounts are stored as integer cents.

export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  const whole = dollars % 1 === 0;
  return `$${dollars.toLocaleString(undefined, {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

// A program's asking price: "Free" instead of "$0". Use for price displays only —
// revenue/amount figures (totals, enrollment rows) should stay numeric.
export function priceLabel(cents: number): string {
  return cents === 0 ? 'Free' : formatPrice(cents);
}

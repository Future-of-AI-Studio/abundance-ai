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

import { corsHeaders } from './cors.ts';

// Typed JSON + error helpers so every function returns the shared ApiError
// envelope the frontend renders inline.

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export interface ApiErrorBody {
  error: { code: string; message: string; field?: string };
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  field?: string,
): Response {
  const body: ApiErrorBody = { error: { code, message, ...(field ? { field } : {}) } };
  return json(body, status);
}

// A structural view of a Stripe SDK error (StripeError). We duck-type it rather
// than import Stripe here, so this stays dependency-free and any function's Stripe
// failure gets a clear message instead of the bare "internal".
interface StripeLikeError {
  type?: string;
  code?: string;
  statusCode?: number;
  message?: string;
  raw?: { message?: string; code?: string };
}

function asStripeError(err: unknown): StripeLikeError | null {
  if (typeof err !== 'object' || err === null) return null;
  const e = err as StripeLikeError;
  return typeof e.type === 'string' && e.type.startsWith('Stripe') ? e : null;
}

// Turn a Stripe error into calm, user-facing copy. Config/auth failures (bad key,
// Connect not enabled, missing account) become a "setup incomplete" nudge rather
// than leaking Stripe's internal wording; genuine card declines pass Stripe's own
// reason through, since that's actionable for the buyer.
function mapStripeError(err: StripeLikeError): { code: string; message: string; status: number } {
  switch (err.type) {
    case 'StripeCardError':
      return {
        code: 'card_declined',
        message: err.raw?.message ?? err.message ?? "That card didn't go through. Please try another.",
        status: 402,
      };
    case 'StripeInvalidRequestError':
      // Almost always a setup/config issue (e.g. Connect not enabled, no such
      // account, missing capability). Don't expose the raw detail to the buyer.
      return {
        code: 'payment_setup_incomplete',
        message: "Payments aren't fully set up yet. Please try again shortly, or contact support if it continues.",
        status: 409,
      };
    case 'StripeAuthenticationError':
    case 'StripePermissionError':
      return {
        code: 'payment_unavailable',
        message: 'Payments are temporarily unavailable. Please try again soon.',
        status: 503,
      };
    case 'StripeRateLimitError':
      return {
        code: 'rate_limited',
        message: 'Too many attempts right now — please try again in a moment.',
        status: 429,
      };
    case 'StripeConnectionError':
    case 'StripeAPIError':
      return {
        code: 'payment_service_error',
        message: "We couldn't reach the payment service. Please try again.",
        status: 502,
      };
    default:
      return {
        code: 'payment_error',
        message: 'We hit a snag processing that payment. Please try again.',
        status: 502,
      };
  }
}

// Maps a thrown error to a calm, user-facing response. Never leaks internals.
export function handleThrown(err: unknown): Response {
  if (err instanceof ApiHttpError) {
    return errorResponse(err.code, err.message, err.status, err.field);
  }
  const stripeErr = asStripeError(err);
  if (stripeErr) {
    // Log the real Stripe detail (type + message + request id) for debugging;
    // the client only ever sees the mapped, non-leaky copy.
    console.error('Stripe error:', stripeErr.type, stripeErr.code ?? '', stripeErr.raw?.message ?? stripeErr.message ?? '');
    const mapped = mapStripeError(stripeErr);
    return errorResponse(mapped.code, mapped.message, mapped.status);
  }
  console.error('Unhandled function error:', err);
  return errorResponse('internal', 'Something went wrong on our end. Please try again.', 500);
}

export class ApiHttpError extends Error {
  code: string;
  status: number;
  field?: string;
  constructor(code: string, message: string, status = 400, field?: string) {
    super(message);
    this.code = code;
    this.status = status;
    this.field = field;
  }
}

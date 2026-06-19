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

// Maps a thrown error to a calm, user-facing response. Never leaks internals.
export function handleThrown(err: unknown): Response {
  if (err instanceof ApiHttpError) {
    return errorResponse(err.code, err.message, err.status, err.field);
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

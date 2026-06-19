import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ApiHttpError } from './response.ts';

// Two clients per the security model:
//  • userClient  — carries the caller's JWT, so every query is RLS-scoped.
//  • adminClient — service-role, bypasses RLS for privileged writes
//                  (webhook → orders, AI logging, manual matching, signed URLs).

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function userClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get('Authorization') ?? '';
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Resolves the authenticated user from the request JWT, or throws 401.
export async function requireUser(req: Request): Promise<{ id: string; email: string }> {
  const supabase = userClient(req);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new ApiHttpError('unauthorized', 'Please sign in to continue.', 401);
  }
  return { id: data.user.id, email: data.user.email ?? '' };
}

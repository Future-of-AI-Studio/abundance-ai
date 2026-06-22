// Shared 3/week saved-reflection cap (spec A4). Used by both mindset-checkin
// (wall-picker reflections) and mindset-reflect (chat-derived reflections) so a
// user's weekly total is enforced consistently across both entry points.
import type { SupabaseClient } from '@supabase/supabase-js';

/** Monday (UTC) of the current ISO week, as YYYY-MM-DD. */
export function weekStart(): string {
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

export interface QuotaState {
  week: string;
  count: number;
  cap: number;
}

/** Ensure this week's quota row exists and return the current count + cap. */
export async function loadQuota(db: SupabaseClient, userId: string): Promise<QuotaState> {
  const week = weekStart();
  const { data: upserted } = await db
    .from('mindset_quota')
    .upsert({ user_id: userId, week_start: week }, { onConflict: 'user_id,week_start', ignoreDuplicates: true })
    .select('*')
    .maybeSingle();

  const { data: current } = await db
    .from('mindset_quota')
    .select('count, cap')
    .eq('user_id', userId)
    .eq('week_start', week)
    .maybeSingle();

  return {
    week,
    count: current?.count ?? upserted?.count ?? 0,
    cap: current?.cap ?? upserted?.cap ?? 3,
  };
}

/** Persist count + 1 for the given week. */
export async function incrementQuota(
  db: SupabaseClient,
  userId: string,
  week: string,
  count: number,
): Promise<void> {
  await db
    .from('mindset_quota')
    .update({ count: count + 1 })
    .eq('user_id', userId)
    .eq('week_start', week);
}

export const WEEKLY_LIMIT_MESSAGE =
  "You've used your 3 check-ins this week. Your circle is here in the meantime →";

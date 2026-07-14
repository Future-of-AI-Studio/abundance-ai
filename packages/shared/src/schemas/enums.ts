import { z } from 'zod';

/**
 * Enums — the structured vocabulary of the data model.
 *
 * Phase-portability (spec A3): `category`, `memberLevel`, and `fearPattern` are
 * STRUCTURED enums, never free text, so a future automated matching engine can
 * ingest them with no rebuild. Do not loosen these to z.string().
 */

// journey_state.path / profiles path — null until the user chooses.
export const pathSchema = z.enum(['A', 'B']);
export type Path = z.infer<typeof pathSchema>;

// programs.status
export const programStatusSchema = z.enum(['building', 'ready', 'failed']);
export type ProgramStatus = z.infer<typeof programStatusSchema>;

// profiles.category / circle_members.category
export const categorySchema = z.enum(['healer', 'hobbyist', 'professional', 'other']);
export type Category = z.infer<typeof categorySchema>;

/** The category values as a tuple — handy for building selects / custom enums. */
export const CATEGORY_VALUES = categorySchema.options;

/** Display labels for each category (shared by signup, account, roster). */
export const CATEGORY_LABELS: Record<Category, string> = {
  healer: 'Healer',
  hobbyist: 'Hobbyist',
  professional: 'Professional',
  other: 'Other',
};

/** Ready-made {value,label} options for category selects. */
export const CATEGORY_OPTIONS: Array<{ value: Category; label: string }> =
  CATEGORY_VALUES.map((value) => ({ value, label: CATEGORY_LABELS[value] }));

/**
 * How a category should read to a human. For 'other' with a custom label the
 * user's own words win; otherwise fall back to the enum label ('Other', etc.).
 */
export function categoryLabel(category: Category, categoryOther?: string | null): string {
  if (category === 'other') {
    const custom = categoryOther?.trim();
    if (custom) return custom;
  }
  return CATEGORY_LABELS[category];
}

// circle_members.level — the member's stage. Structured for the future matcher.
export const memberLevelSchema = z.enum(['starting', 'stalled', 'growing', 'scaling']);
export type MemberLevel = z.infer<typeof memberLevelSchema>;

// circle_members.fear_pattern — the dominant "wall". Structured, NOT prose.
export const fearPatternSchema = z.enum([
  'impostor', // "who am I to teach?"
  'visibility', // fear of being seen / putting yourself out there
  'pricing', // discomfort charging money
  'tech', // tech / setup overwhelm
  'consistency', // fear of not keeping it up
  'comparison', // everyone else is ahead
]);
export type FearPattern = z.infer<typeof fearPatternSchema>;

// marketing_posts.channel
export const channelSchema = z.enum(['social', 'email']);
export type Channel = z.infer<typeof channelSchema>;

// marketing_posts.platform — the social network a social post is tailored for.
// null for email. Structured so posts can be filtered/shared per platform.
export const platformSchema = z.enum(['facebook', 'instagram', 'x', 'linkedin']);
export type Platform = z.infer<typeof platformSchema>;

/** Display labels for each social platform. */
export const PLATFORM_LABELS: Record<Platform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X',
  linkedin: 'LinkedIn',
};

// marketing_posts.phase — which stage of the launch the content is for. Lets the
// user build a library over weeks: announce first, then sustain, then evergreen.
export const marketingPhaseSchema = z.enum(['launch', 'ongoing', 'evergreen']);
export type MarketingPhase = z.infer<typeof marketingPhaseSchema>;

export const PHASE_LABELS: Record<MarketingPhase, string> = {
  launch: 'Just starting',
  ongoing: 'Ongoing',
  evergreen: 'After launch',
};

/**
 * How many posts to write per selected target, scaled inversely to how many
 * targets are chosen — fewer targets get more depth, so the total stays a
 * useful batch (1→5, 2→3, 3→3, 4→2, 5→2).
 */
export function postsPerTarget(targetCount: number): number {
  const table: Record<number, number> = { 1: 5, 2: 3, 3: 3, 4: 2, 5: 2 };
  return table[targetCount] ?? 2;
}

// Marketing generation is append-only and capped: at most this many rounds per
// user per calendar month (UTC), counted across all phases.
export const MARKETING_ROUNDS_PER_MONTH = 8;

/**
 * How many generation rounds this month's posts represent — distinct
 * (phase, round) pairs among posts created in the current UTC month. The
 * client-side mirror of the check marketing-generate enforces server-side.
 */
export function marketingRoundsUsedThisMonth(
  posts: Array<{ phase: string; round?: number; created_at: string }>,
  now: Date = new Date(),
): number {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const rounds = new Set<string>();
  for (const p of posts) {
    const d = new Date(p.created_at);
    if (d.getUTCFullYear() === y && d.getUTCMonth() === m) rounds.add(`${p.phase}:${p.round ?? 1}`);
  }
  return rounds.size;
}

// sessions.platform — the video-conferencing tool the live group meets on.
// 'other' accepts any https link (Webex, Whereby, a personal room, etc.).
export const meetingPlatformSchema = z.enum(['google_meet', 'zoom', 'teams', 'other']);
export type MeetingPlatform = z.infer<typeof meetingPlatformSchema>;

// circles.match_status
export const matchStatusSchema = z.enum(['pending', 'matched']);
export type MatchStatus = z.infer<typeof matchStatusSchema>;

// orders.status
export const orderStatusSchema = z.enum(['created', 'paid', 'refunded', 'failed']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// content_sources.kind
export const contentKindSchema = z.enum(['file', 'voice']);
export type ContentKind = z.infer<typeof contentKindSchema>;

// refund_requests.status
export const refundStatusSchema = z.enum(['requested', 'approved', 'denied', 'out_of_window']);
export type RefundStatus = z.infer<typeof refundStatusSchema>;

// AI features logged to ai_usage_logs.feature
export const aiFeatureSchema = z.enum(['program-build', 'marketing-generate', 'mindset-checkin', 'mindset-chat']);
export type AiFeature = z.infer<typeof aiFeatureSchema>;

/**
 * Curated mindset "walls" — the known set of wall_keys behind §3 [12] check-ins.
 * Used to seed cached responses and drive category-aware courage prompts (A4).
 */
export const WALL_KEYS = [
  'who-am-i-to-teach',
  'fear-of-being-seen',
  'charging-money',
  'tech-overwhelm',
  'staying-consistent',
  'comparing-myself',
] as const;
export const wallKeySchema = z.enum(WALL_KEYS);
export type WallKey = z.infer<typeof wallKeySchema>;

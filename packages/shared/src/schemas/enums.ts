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

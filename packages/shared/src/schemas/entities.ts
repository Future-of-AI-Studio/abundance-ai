import { z } from 'zod';
import {
  pathSchema,
  programStatusSchema,
  categorySchema,
  memberLevelSchema,
  fearPatternSchema,
  channelSchema,
  platformSchema,
  marketingPhaseSchema,
  meetingPlatformSchema,
  matchStatusSchema,
  orderStatusSchema,
  contentKindSchema,
  refundStatusSchema,
  aiFeatureSchema,
  wallKeySchema,
} from './enums.js';

/**
 * Entity (table-row) schemas — snake_case to match Postgres columns exactly.
 * Direct Supabase table reads and Edge Function row writes use these shapes,
 * so the frontend and backend cannot drift from the database.
 */

const uuid = z.string().uuid();
const timestamp = z.string(); // ISO 8601 from Postgres

// Onboarding step identifiers (also journey_state.current_step values).
export const journeyStepSchema = z.enum([
  'path',
  'content',
  'building',
  'program',
  'marketing',
  'sessions',
  'payments',
]);
export type JourneyStep = z.infer<typeof journeyStepSchema>;

// ── profiles ────────────────────────────────────────────────────────────────
export const profileSchema = z.object({
  id: uuid, // = auth.uid()
  first_name: z.string().min(1),
  email: z.string().email(),
  avatar_url: z.string().url().nullable(),
  category: categorySchema,
  paid_at: timestamp.nullable(), // null = has not paid; set when a Stripe order is paid
  created_at: timestamp,
});
export type Profile = z.infer<typeof profileSchema>;

// ── orders ──────────────────────────────────────────────────────────────────
export const orderSchema = z.object({
  id: uuid,
  user_id: uuid.nullable(), // null until account created post-payment
  stripe_payment_intent: z.string().nullable(),
  amount_cents: z.number().int().default(2500),
  status: orderStatusSchema,
  is_related_party: z.boolean().default(false),
  email: z.string().email(), // captured at checkout, gates account creation
  created_at: timestamp,
});
export type Order = z.infer<typeof orderSchema>;

// ── journey_state ─────────────────────────────────────────────────────────────
export const journeyStateSchema = z.object({
  user_id: uuid,
  path: pathSchema.nullable(),
  current_step: journeyStepSchema.nullable(),
  completed_steps: z.array(journeyStepSchema).default([]),
  updated_at: timestamp,
});
export type JourneyState = z.infer<typeof journeyStateSchema>;

// ── programs ──────────────────────────────────────────────────────────────────
export const programSchema = z.object({
  id: uuid,
  user_id: uuid,
  title: z.string().min(1),
  status: programStatusSchema,
  price_cents: z.number().int().nonnegative().default(14900), // what buyers pay on the landing page
  created_at: timestamp,
});
export type Program = z.infer<typeof programSchema>;

// ── modules ───────────────────────────────────────────────────────────────────
export const moduleSchema = z.object({
  id: uuid,
  program_id: uuid,
  idx: z.number().int().nonnegative(),
  title: z.string().min(1),
  outcome: z.string(),
  detail: z.string().default(''),
  session_flow: z.string(),
  notes: z.string().default(''),
});
export type Module = z.infer<typeof moduleSchema>;

// ── enrollments ───────────────────────────────────────────────────────────────
// A buyer who signed up through a program's public landing page. `creator_id` is
// the program owner (denormalized so the creator's Students list is a plain read).
export const enrollmentSchema = z.object({
  id: uuid,
  program_id: uuid,
  creator_id: uuid,
  name: z.string(),
  email: z.string().email(),
  contact: z.string().default(''),
  amount_cents: z.number().int().nonnegative().default(0),
  status: z.string().default('enrolled'),
  stripe_payment_intent: z.string().nullable().default(null),
  created_at: timestamp,
});
export type Enrollment = z.infer<typeof enrollmentSchema>;

// ── content_sources ───────────────────────────────────────────────────────────
export const contentSourceSchema = z.object({
  id: uuid,
  user_id: uuid,
  kind: contentKindSchema,
  storage_path: z.string(),
  filename: z.string(),
  duration_sec: z.number().int().nullable(),
  created_at: timestamp,
});
export type ContentSource = z.infer<typeof contentSourceSchema>;

// ── marketing_posts ───────────────────────────────────────────────────────────
export const marketingPostSchema = z.object({
  id: uuid,
  user_id: uuid,
  channel: channelSchema,
  platform: platformSchema.nullable(), // which social network this is tailored for; null for email
  phase: marketingPhaseSchema, // launch stage this content is for
  caption: z.string(),
  hashtags: z.array(z.string()).default([]),
  posted: z.boolean().default(false),
  created_at: timestamp,
});
export type MarketingPost = z.infer<typeof marketingPostSchema>;

// ── sessions ──────────────────────────────────────────────────────────────────
export const sessionSchema = z.object({
  user_id: uuid,
  // `meet_link` holds the URL for whichever `platform` is chosen (kept this
  // column name for back-compat; it is no longer Google-Meet-specific).
  platform: meetingPlatformSchema.default('google_meet'),
  meet_link: z.string().url().nullable(),
  updated_at: timestamp,
});
export type Session = z.infer<typeof sessionSchema>;

// ── stripe_connect ────────────────────────────────────────────────────────────
export const stripeChecklistSchema = z.object({
  bank: z.boolean().default(false),
  id: z.boolean().default(false),
  email: z.boolean().default(false),
});
export type StripeChecklist = z.infer<typeof stripeChecklistSchema>;

export const stripeConnectSchema = z.object({
  user_id: uuid,
  connected: z.boolean().default(false),
  account_id: z.string().nullable(),
  checklist: stripeChecklistSchema,
  updated_at: timestamp,
});
export type StripeConnect = z.infer<typeof stripeConnectSchema>;

// ── mindset_checkins ──────────────────────────────────────────────────────────
export const mindsetCheckinSchema = z.object({
  id: uuid,
  user_id: uuid,
  wall_key: wallKeySchema,
  prompt: z.string(),
  reflection: z.string(),
  user_note: z.string().nullable(),
  cache_hit: z.boolean().default(false),
  created_at: timestamp,
});
export type MindsetCheckin = z.infer<typeof mindsetCheckinSchema>;

// ── mindset_quota ─────────────────────────────────────────────────────────────
export const mindsetQuotaSchema = z.object({
  user_id: uuid,
  week_start: z.string(), // date (YYYY-MM-DD, Monday of the ISO week)
  count: z.number().int().nonnegative().default(0),
  cap: z.number().int().positive().default(3),
});
export type MindsetQuota = z.infer<typeof mindsetQuotaSchema>;

// ── mindset_conversations ─────────────────────────────────────────────────────
// A persisted free-form chat thread. wall_key is set when a reflection is
// derived on wrap-up (null while the conversation is still open).
export const mindsetConversationSchema = z.object({
  id: uuid,
  title: z.string().nullable(),
  wall_key: wallKeySchema.nullable(),
  last_message_at: timestamp,
  created_at: timestamp,
});
export type MindsetConversation = z.infer<typeof mindsetConversationSchema>;

// ── mindset_messages ──────────────────────────────────────────────────────────
export const mindsetMessageSchema = z.object({
  id: uuid,
  conversation_id: uuid,
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  created_at: timestamp,
});
export type MindsetMessage = z.infer<typeof mindsetMessageSchema>;

// ── circles ───────────────────────────────────────────────────────────────────
export const circleSchema = z.object({
  id: uuid,
  match_status: matchStatusSchema,
  created_at: timestamp,
});
export type Circle = z.infer<typeof circleSchema>;

// ── circle_members ────────────────────────────────────────────────────────────
export const circleMemberSchema = z.object({
  circle_id: uuid,
  user_id: uuid,
  name: z.string(), // display name for chips
  category: categorySchema,
  level: memberLevelSchema,
  fear_pattern: fearPatternSchema,
  whatsapp_url: z.string().url().nullable(),
  meet_url: z.string().url().nullable(),
});
export type CircleMember = z.infer<typeof circleMemberSchema>;

// The trimmed member shape the circle *page* actually renders — a warm roster of
// name + avatar (spec A3: no labels/categories someone didn't choose to wear).
// Used for both a confirmed circle and an automatically recommended one, so the
// UI is identical whether the roster comes from circle_members or the matcher.
export const circleRosterMemberSchema = z.object({
  user_id: uuid,
  name: z.string(),
  category: categorySchema, // kept for the matcher/analytics, not shown as a label
  is_you: z.boolean().optional(), // marks the current user in the roster
});
export type CircleRosterMember = z.infer<typeof circleRosterMemberSchema>;

// ── expert_talks ──────────────────────────────────────────────────────────────
export const expertTalkSchema = z.object({
  id: uuid,
  title: z.string(),
  starts_at: timestamp,
  join_url: z.string().url().nullable(),
  recording_url: z.string().url().nullable(),
});
export type ExpertTalk = z.infer<typeof expertTalkSchema>;

// ── circle_meetups ────────────────────────────────────────────────────────────
// Scheduled, drop-in "open rooms" anyone can join — no commitment, no assigned
// team. These answer the "what / when / who hosts" of a meetup that a bare Meet
// link can't. Community-wide and readable by all authenticated users.
export const circleMeetupSchema = z.object({
  id: uuid,
  title: z.string(),
  starts_at: timestamp,
  host_name: z.string(),
  join_url: z.string().url().nullable(),
});
export type CircleMeetup = z.infer<typeof circleMeetupSchema>;

// ── testimonials ──────────────────────────────────────────────────────────────
export const testimonialSchema = z.object({
  id: uuid,
  user_id: uuid,
  text: z.string(),
  permission_granted: z.boolean().default(false),
  created_at: timestamp,
});
export type Testimonial = z.infer<typeof testimonialSchema>;

// ── refund_requests ───────────────────────────────────────────────────────────
export const refundRequestSchema = z.object({
  id: uuid,
  user_id: uuid,
  status: refundStatusSchema,
  created_at: timestamp,
});
export type RefundRequest = z.infer<typeof refundRequestSchema>;

// ── ai_usage_logs ─────────────────────────────────────────────────────────────
export const aiUsageLogSchema = z.object({
  id: uuid,
  user_id: uuid.nullable(),
  feature: aiFeatureSchema,
  model: z.string(),
  prompt_tokens: z.number().int().nonnegative(),
  completion_tokens: z.number().int().nonnegative(),
  latency_ms: z.number().int().nonnegative(),
  cache_hit: z.boolean().default(false),
  created_at: timestamp,
});
export type AiUsageLog = z.infer<typeof aiUsageLogSchema>;

// ── response_cache ────────────────────────────────────────────────────────────
export const responseCacheSchema = z.object({
  feature: z.string(),
  cache_key: z.string(),
  value: z.unknown(),
  created_at: timestamp,
});
export type ResponseCache = z.infer<typeof responseCacheSchema>;

import { z } from 'zod';
import {
  programSchema,
  moduleSchema,
  marketingPostSchema,
  sessionSchema,
  stripeChecklistSchema,
  mindsetCheckinSchema,
  mindsetMessageSchema,
  circleRosterMemberSchema,
  expertTalkSchema,
  circleMeetupSchema,
  testimonialSchema,
  journeyStepSchema,
  landingPageSettingsSchema,
} from './entities.js';
import {
  channelSchema,
  platformSchema,
  marketingPhaseSchema,
  matchStatusSchema,
  wallKeySchema,
  contentKindSchema,
  categorySchema,
  pathSchema,
  meetingPlatformSchema,
  type MeetingPlatform,
} from './enums.js';

/**
 * API request/response contracts for every Supabase Edge Function.
 * Every function input-validates with these; the frontend renders typed errors.
 */

// ── Shared error envelope ─────────────────────────────────────────────────────
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(), // machine code, e.g. 'invalid_input', 'payment_required'
    message: z.string(), // warm, user-facing copy
    field: z.string().optional(), // for inline field errors
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

// ── checkout-session ──────────────────────────────────────────────────────────
export const checkoutSessionRequestSchema = z.object({
  email: z.string().email(),
  is_related_party: z.boolean().optional().default(false),
});
export type CheckoutSessionRequest = z.infer<typeof checkoutSessionRequestSchema>;

export const checkoutSessionResponseSchema = z.object({
  client_secret: z.string(),
  order_id: z.string().uuid(),
  payment_intent_id: z.string(),
  amount_cents: z.number().int(),
  publishable_key: z.string(),
});
export type CheckoutSessionResponse = z.infer<typeof checkoutSessionResponseSchema>;

// ── post-payment token verification (gates /welcome + account creation) ───────
export const verifyPaymentRequestSchema = z.object({
  payment_intent_id: z.string(),
});
export type VerifyPaymentRequest = z.infer<typeof verifyPaymentRequestSchema>;

export const verifyPaymentResponseSchema = z.object({
  paid: z.boolean(),
  email: z.string().email().nullable(),
  order_id: z.string().uuid().nullable(),
});
export type VerifyPaymentResponse = z.infer<typeof verifyPaymentResponseSchema>;

// ── content: signed upload URL ────────────────────────────────────────────────
export const contentUploadRequestSchema = z.object({
  kind: contentKindSchema,
  filename: z.string().min(1),
  content_type: z.string(),
  size_bytes: z.number().int().positive().max(50 * 1024 * 1024, 'File must be 50 MB or under.'),
  duration_sec: z.number().int().nonnegative().nullable().optional(),
});
export type ContentUploadRequest = z.infer<typeof contentUploadRequestSchema>;

export const contentUploadResponseSchema = z.object({
  content_source_id: z.string().uuid(),
  storage_path: z.string(),
  signed_url: z.string().url(),
  token: z.string(),
});
export type ContentUploadResponse = z.infer<typeof contentUploadResponseSchema>;

// ── program-build ─────────────────────────────────────────────────────────────
// `module_count` is optional: when the expert picks a number in the UI it's honored
// exactly (constrained to the 1–6 the program design supports); omitted = AI decides.
export const programBuildRequestSchema = z.object({
  path: pathSchema.optional(),
  module_count: z.number().int().min(1).max(6).optional(),
});
export type ProgramBuildRequest = z.infer<typeof programBuildRequestSchema>;

export const programBuildResponseSchema = z.object({
  program: programSchema,
  modules: z.array(moduleSchema),
});
export type ProgramBuildResponse = z.infer<typeof programBuildResponseSchema>;

// Strict shape Gemini must return for program structuring (validated server-side).
export const aiModuleSchema = z.object({
  title: z.string().min(1),
  outcome: z.string().min(1),
  detail: z.string().min(1),
  session_flow: z.string().min(1),
  notes: z.string().default(''),
  participant_notes: z.string().default(''),
});
export const aiProgramSchema = z.object({
  title: z.string().min(1),
  modules: z.array(aiModuleSchema).min(3).max(6),
});
export type AiProgram = z.infer<typeof aiProgramSchema>;

// ── program-update ────────────────────────────────────────────────────────────
export const moduleUpsertSchema = z.object({
  id: z.string().uuid().optional(), // omitted = new module
  idx: z.number().int().nonnegative(),
  title: z.string().min(1, 'Give this module a title.'),
  description: z.string().max(160, 'Keep the description under 160 characters.').default(''),
  outcome: z.string(),
  detail: z.string().default(''),
  session_flow: z.string(),
  notes: z.string().default(''),
  participant_notes: z.string().default(''),
});
export const programUpdateRequestSchema = z.object({
  program_id: z.string().uuid(),
  title: z.string().min(1, 'Your program needs a title.').optional(),
  price_cents: z.number().int().nonnegative().optional(),
  modules: z.array(moduleUpsertSchema).min(1, 'Keep at least one module.').max(6, 'A program can have at most 6 modules.').optional(),
  remove_module_ids: z.array(z.string().uuid()).optional(),
});
export type ProgramUpdateRequest = z.infer<typeof programUpdateRequestSchema>;

export const programUpdateResponseSchema = programBuildResponseSchema;
export type ProgramUpdateResponse = z.infer<typeof programUpdateResponseSchema>;

// ── program-activate ──────────────────────────────────────────────────────────
// Make one of the user's retained builds the active one (the build the app reads
// as "your program"). Rebuilds keep every prior build; this is how the user picks
// which to use. Returns the now-active build so the client refreshes from it.
export const programActivateRequestSchema = z.object({ program_id: z.string().uuid() });
export type ProgramActivateRequest = z.infer<typeof programActivateRequestSchema>;

export const programActivateResponseSchema = programBuildResponseSchema;
export type ProgramActivateResponse = z.infer<typeof programActivateResponseSchema>;

// ── program-delete ────────────────────────────────────────────────────────────
// Delete one of the user's retained builds (modules cascade). The active build
// can't be deleted — the user switches to another first.
export const programDeleteRequestSchema = z.object({ program_id: z.string().uuid() });
export type ProgramDeleteRequest = z.infer<typeof programDeleteRequestSchema>;

export const programDeleteResponseSchema = z.object({ ok: z.literal(true) });
export type ProgramDeleteResponse = z.infer<typeof programDeleteResponseSchema>;

// ── marketing-generate ────────────────────────────────────────────────────────
export const marketingGenerateRequestSchema = z.object({
  // Which social networks to write for. Omitted = all four; [] = email only.
  platforms: z.array(platformSchema).optional(),
  include_email: z.boolean().optional().default(false),
  // Which launch stage this batch is for (defaults to the first, "launch").
  phase: marketingPhaseSchema.optional().default('launch'),
});
export type MarketingGenerateRequest = z.infer<typeof marketingGenerateRequestSchema>;

export const marketingGenerateResponseSchema = z.object({
  posts: z.array(marketingPostSchema),
});
export type MarketingGenerateResponse = z.infer<typeof marketingGenerateResponseSchema>;

export const aiPostSchema = z.object({
  channel: channelSchema,
  platform: platformSchema.nullable(),
  caption: z.string().min(1),
  hashtags: z.array(z.string()),
});
export const aiMarketingSchema = z.object({
  posts: z.array(aiPostSchema).min(1),
});
export type AiMarketing = z.infer<typeof aiMarketingSchema>;

// ── marketing-update ──────────────────────────────────────────────────────────
export const marketingUpdateRequestSchema = z.object({
  id: z.string().uuid(),
  caption: z.string().min(1, "A post can't be empty.").optional(),
  hashtags: z.array(z.string()).optional(),
  posted: z.boolean().optional(),
  favorited: z.boolean().optional(),
});
export type MarketingUpdateRequest = z.infer<typeof marketingUpdateRequestSchema>;

export const marketingUpdateResponseSchema = z.object({ post: marketingPostSchema });
export type MarketingUpdateResponse = z.infer<typeof marketingUpdateResponseSchema>;

// ── sessions-set-link ─────────────────────────────────────────────────────────
// Per-platform link validation. `other` accepts any https URL; the rest must
// point at the platform's own domain so a mistyped link is caught early.
export const MEETING_LINK_PATTERNS: Record<MeetingPlatform, RegExp | null> = {
  google_meet: /^https:\/\/meet\.google\.com\//i,
  zoom: /^https:\/\/([a-z0-9-]+\.)?zoom\.us\//i,
  teams: /^https:\/\/teams\.(microsoft|live)\.com\//i,
  other: null,
};
export const MEETING_PLATFORM_LABEL: Record<MeetingPlatform, string> = {
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  teams: 'Microsoft Teams',
  other: 'meeting',
};
/** Shared check used by both the client and the Edge Function contract. */
export function isValidMeetingLink(platform: MeetingPlatform, url: string): boolean {
  const pattern = MEETING_LINK_PATTERNS[platform];
  return pattern === null ? /^https:\/\//i.test(url) : pattern.test(url);
}

export const sessionsSetLinkRequestSchema = z
  .object({
    platform: meetingPlatformSchema.default('google_meet'),
    meet_link: z.string().url('Paste a full https://… link.'),
  })
  .superRefine((data, ctx) => {
    if (!isValidMeetingLink(data.platform, data.meet_link)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['meet_link'],
        message: `That doesn't look like a ${MEETING_PLATFORM_LABEL[data.platform]} link.`,
      });
    }
  });
export type SessionsSetLinkRequest = z.infer<typeof sessionsSetLinkRequestSchema>;

export const sessionsSetLinkResponseSchema = z.object({ session: sessionSchema });
export type SessionsSetLinkResponse = z.infer<typeof sessionsSetLinkResponseSchema>;

// ── stripe-connect ────────────────────────────────────────────────────────────
export const stripeConnectRequestSchema = z.object({
  return_url: z.string().url().optional(),
  reconcile: z.boolean().optional(), // true on return to refresh status
});
export type StripeConnectRequest = z.infer<typeof stripeConnectRequestSchema>;

export const stripeConnectResponseSchema = z.object({
  onboarding_url: z.string().url().nullable(),
  connected: z.boolean(),
  checklist: stripeChecklistSchema,
});
export type StripeConnectResponse = z.infer<typeof stripeConnectResponseSchema>;

// ── mindset-checkin ───────────────────────────────────────────────────────────
export const mindsetCheckinRequestSchema = z.object({
  wall_key: wallKeySchema,
  user_note: z.string().max(1000).optional(),
});
export type MindsetCheckinRequest = z.infer<typeof mindsetCheckinRequestSchema>;

// Discriminated union: a normal reflection OR a warm "limit reached" payload (200, never a hard error).
export const mindsetCheckinResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    checkin: mindsetCheckinSchema,
    cache_hit: z.boolean(),
    remaining: z.number().int().nonnegative(),
  }),
  z.object({
    status: z.literal('limit'),
    message: z.string(),
    remaining: z.literal(0),
  }),
]);
export type MindsetCheckinResponse = z.infer<typeof mindsetCheckinResponseSchema>;

// ── mindset-chat (free-form, multi-turn conversation) ─────────────────────────
export const mindsetChatRequestSchema = z.object({
  conversation_id: z.string().uuid().optional(), // omitted = start a new thread
  message: z.string().min(1).max(2000),
});
export type MindsetChatRequest = z.infer<typeof mindsetChatRequestSchema>;

// 'ok' = the assistant replied; 'limit' = daily message cap reached (200, warm copy).
export const mindsetChatResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    conversation_id: z.string().uuid(),
    message: mindsetMessageSchema,
    daily_remaining: z.number().int().nonnegative(),
  }),
  z.object({
    status: z.literal('limit'),
    message: z.string(),
  }),
]);
export type MindsetChatResponse = z.infer<typeof mindsetChatResponseSchema>;

// ── mindset-reflect (wrap-up: distill a conversation into a saved reflection) ──
export const mindsetReflectRequestSchema = z.object({
  conversation_id: z.string().uuid(),
});
export type MindsetReflectRequest = z.infer<typeof mindsetReflectRequestSchema>;

// Reuses the check-in response shape: 'ok' returns the saved reflection (and
// counts toward the 3/week cap); 'limit' returns the warm weekly-cap message.
export const mindsetReflectResponseSchema = mindsetCheckinResponseSchema;
export type MindsetReflectResponse = z.infer<typeof mindsetReflectResponseSchema>;

// Strict shape Gemini must return when distilling a conversation (validated server-side).
export const aiReflectSchema = z.object({
  wall_key: wallKeySchema,
  prompt: z.string().min(1),
  reflection: z.string().min(1),
});
export type AiReflect = z.infer<typeof aiReflectSchema>;

// ── circle-get ────────────────────────────────────────────────────────────────
// `members` are the people on the page: once `match_status` is 'matched' they are
// the user's confirmed circle; while 'pending' they are the circle the rule-based
// matcher *recommends* (same category, 3–5 people) so the page is never empty and
// matching is automatic. `meetups` are scheduled, drop-in open rooms shown to all.
export const circleGetResponseSchema = z.object({
  match_status: matchStatusSchema,
  members: z.array(circleRosterMemberSchema),
  whatsapp_url: z.string().url().nullable(),
  meet_url: z.string().url().nullable(),
  meetups: z.array(circleMeetupSchema),
  next_talk: expertTalkSchema.nullable(),
});
export type CircleGetResponse = z.infer<typeof circleGetResponseSchema>;

// ── testimonial-create ────────────────────────────────────────────────────────
export const testimonialCreateRequestSchema = z.object({
  text: z.string().min(1, 'Share a few words first.'),
  permission_granted: z.boolean().default(false),
});
export type TestimonialCreateRequest = z.infer<typeof testimonialCreateRequestSchema>;

export const testimonialCreateResponseSchema = z.object({ testimonial: testimonialSchema });
export type TestimonialCreateResponse = z.infer<typeof testimonialCreateResponseSchema>;

// ── refund-request ────────────────────────────────────────────────────────────
export const refundRequestRequestSchema = z.object({}).optional();
export type RefundRequestRequest = z.infer<typeof refundRequestRequestSchema>;

export const refundRequestResponseSchema = z.object({
  within_window: z.boolean(),
  status: z.string(),
  message: z.string(),
  days_remaining: z.number().int().nullable(),
});
export type RefundRequestResponse = z.infer<typeof refundRequestResponseSchema>;

// ── program-public (buyer-facing landing page) ────────────────────────────────
// Served by a service-role Edge Function so a program can be viewed and sold
// without exposing the owner's private rows via RLS. Only learner-safe fields are
// returned — session_flow/notes (creator delivery guidance) are deliberately omitted.
export const programPublicRequestSchema = z.object({ program_id: z.string().uuid() });
export type ProgramPublicRequest = z.infer<typeof programPublicRequestSchema>;

export const publicModuleSchema = z.object({
  idx: z.number().int().nonnegative(),
  title: z.string(),
  // Creator-written blurb (Landing Studio); shown in place of outcome when set.
  description: z.string().default(''),
  outcome: z.string(),
  detail: z.string().default(''),
});
export type PublicModule = z.infer<typeof publicModuleSchema>;

export const programPublicResponseSchema = z.object({
  program: z.object({
    id: z.string().uuid(),
    title: z.string(),
    price_cents: z.number().int().nonnegative(),
  }),
  modules: z.array(publicModuleSchema),
  creator: z.object({
    first_name: z.string(),
    category: categorySchema,
    avatar_url: z.string().url().nullable(),
    email: z.string().email(),
    // Creator's self-written intro for "Meet your guide"; null → generated blurb.
    bio: z.string().nullable(),
    // Landing page appearance/copy customization; null = default look.
    landing_page: landingPageSettingsSchema.nullable(),
  }),
});
export type ProgramPublicResponse = z.infer<typeof programPublicResponseSchema>;

// ── program-view-track (record a public landing-page view) ────────────────────
// Fired from the buyer-facing /p/:id page on load. Public + service-role (like
// enroll) so anonymous visitors are counted without opening RLS on the owner.
export const programViewTrackRequestSchema = z.object({ program_id: z.string().uuid() });
export type ProgramViewTrackRequest = z.infer<typeof programViewTrackRequestSchema>;

export const programViewTrackResponseSchema = z.object({ ok: z.literal(true) });
export type ProgramViewTrackResponse = z.infer<typeof programViewTrackResponseSchema>;

// ── program stats (Home dashboard metrics) ────────────────────────────────────
// Aggregated landing-page view counts for the signed-in creator. Students +
// revenue are derived client-side from the already-loaded enrollments list, so
// this read only carries what the client can't cheaply compute itself.
export const programStatsSchema = z.object({
  views: z.number().int().nonnegative(),
  views_this_week: z.number().int().nonnegative(),
});
export type ProgramStats = z.infer<typeof programStatsSchema>;

// ── enroll-session (create the PaymentIntent for a program enrollment) ─────────
export const enrollSessionRequestSchema = z.object({
  program_id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  contact: z.string().min(1),
});
export type EnrollSessionRequest = z.infer<typeof enrollSessionRequestSchema>;

export const enrollSessionResponseSchema = z.object({
  // Null when Stripe isn't configured — the client falls back to the demo form.
  client_secret: z.string().nullable(),
  payment_intent_id: z.string(),
  amount_cents: z.number().int().nonnegative(),
  publishable_key: z.string(),
  stripe: z.boolean(),
});
export type EnrollSessionResponse = z.infer<typeof enrollSessionResponseSchema>;

// ── enroll (record the enrollment after payment succeeds) ──────────────────────
export const enrollRequestSchema = z.object({
  program_id: z.string().uuid(),
  name: z.string().min(1, 'Your name, please.'),
  email: z.string().email('Enter a valid email.'),
  contact: z.string().min(1, 'A contact number lets your host reach you.'),
  // The PaymentIntent the buyer just paid; verified server-side before recording.
  payment_intent_id: z.string().optional(),
});
export type EnrollRequest = z.infer<typeof enrollRequestSchema>;

export const enrollResponseSchema = z.object({
  ok: z.literal(true),
  program_title: z.string(),
  creator_first_name: z.string(),
  amount_cents: z.number().int().nonnegative(),
});
export type EnrollResponse = z.infer<typeof enrollResponseSchema>;

// ── journey-update (persist step progress) ────────────────────────────────────
export const journeyUpdateRequestSchema = z.object({
  path: pathSchema.nullable().optional(),
  current_step: journeyStepSchema.nullable().optional(),
  complete_step: journeyStepSchema.optional(), // mark one step complete
});
export type JourneyUpdateRequest = z.infer<typeof journeyUpdateRequestSchema>;

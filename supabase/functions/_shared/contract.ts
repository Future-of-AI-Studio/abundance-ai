import { z } from 'zod';

/**
 * Deno-side mirror of the request + AI-output schemas in `packages/shared`.
 * Kept in lockstep with packages/shared/src/schemas — that package is the
 * source of truth; this vendors the subset Edge Functions validate against,
 * because Node-ESM `.js` import specifiers in the shared source don't resolve
 * under Deno. Any change to a shared request shape must be mirrored here.
 */

// ── enums ─────────────────────────────────────────────────────────────────────
export const pathSchema = z.enum(['A', 'B']);
export const categorySchema = z.enum(['healer', 'hobbyist', 'professional', 'other']);
export const channelSchema = z.enum(['social', 'email']);
export const contentKindSchema = z.enum(['file', 'voice']);
export const journeyStepSchema = z.enum([
  'path', 'content', 'building', 'program', 'marketing', 'sessions', 'payments',
]);
export const WALL_KEYS = [
  'who-am-i-to-teach',
  'fear-of-being-seen',
  'charging-money',
  'tech-overwhelm',
  'staying-consistent',
  'comparing-myself',
] as const;
export const wallKeySchema = z.enum(WALL_KEYS);

// ── checkout ──────────────────────────────────────────────────────────────────
export const checkoutSessionRequestSchema = z.object({
  email: z.string().email(),
  is_related_party: z.boolean().optional().default(false),
});
export const verifyPaymentRequestSchema = z.object({ payment_intent_id: z.string() });

// ── content upload ────────────────────────────────────────────────────────────
export const contentUploadRequestSchema = z.object({
  kind: contentKindSchema,
  filename: z.string().min(1),
  content_type: z.string(),
  size_bytes: z.number().int().positive().max(50 * 1024 * 1024, 'File must be 50 MB or under.'),
  duration_sec: z.number().int().nonnegative().nullable().optional(),
});

// ── program ───────────────────────────────────────────────────────────────────
export const programBuildRequestSchema = z.object({ path: pathSchema.optional() });

export const aiModuleSchema = z.object({
  title: z.string().min(1),
  outcome: z.string().min(1),
  session_flow: z.string().min(1),
});
export const aiProgramSchema = z.object({
  title: z.string().min(1),
  modules: z.array(aiModuleSchema).min(3).max(6),
});

export const moduleUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  idx: z.number().int().nonnegative(),
  title: z.string().min(1, 'Give this module a title.'),
  outcome: z.string(),
  session_flow: z.string(),
});
export const programUpdateRequestSchema = z.object({
  program_id: z.string().uuid(),
  title: z.string().min(1, 'Your program needs a title.').optional(),
  modules: z.array(moduleUpsertSchema).min(1, 'Keep at least one module.').optional(),
  remove_module_ids: z.array(z.string().uuid()).optional(),
});

// ── marketing ─────────────────────────────────────────────────────────────────
export const marketingGenerateRequestSchema = z.object({
  include_email: z.boolean().optional().default(false),
});
export const aiPostSchema = z.object({
  channel: channelSchema,
  caption: z.string().min(1),
  hashtags: z.array(z.string()),
});
export const aiMarketingSchema = z.object({ posts: z.array(aiPostSchema).min(1) });
export const marketingUpdateRequestSchema = z.object({
  id: z.string().uuid(),
  caption: z.string().min(1, "A post can't be empty.").optional(),
  hashtags: z.array(z.string()).optional(),
  posted: z.boolean().optional(),
});

// ── sessions ──────────────────────────────────────────────────────────────────
export const sessionsSetLinkRequestSchema = z.object({
  meet_link: z
    .string()
    .url('Paste the full https://meet.google.com/… URL.')
    .refine((u) => /^https:\/\/meet\.google\.com\//.test(u), {
      message: "That doesn't look like a Meet link — paste the full https://meet.google.com/… URL.",
    }),
});

// ── stripe connect ────────────────────────────────────────────────────────────
export const stripeConnectRequestSchema = z.object({
  return_url: z.string().url().optional(),
  reconcile: z.boolean().optional(),
});

// ── mindset ───────────────────────────────────────────────────────────────────
export const mindsetCheckinRequestSchema = z.object({
  wall_key: wallKeySchema,
  user_note: z.string().max(1000).optional(),
});

// ── testimonial ───────────────────────────────────────────────────────────────
export const testimonialCreateRequestSchema = z.object({
  text: z.string().min(1, 'Share a few words first.'),
  permission_granted: z.boolean().default(false),
});

// ── journey ───────────────────────────────────────────────────────────────────
export const journeyUpdateRequestSchema = z.object({
  path: pathSchema.nullable().optional(),
  current_step: journeyStepSchema.nullable().optional(),
  complete_step: journeyStepSchema.optional(),
});

// ── validation helper ─────────────────────────────────────────────────────────
import { ApiHttpError } from './response.ts';

export async function parseBody<T>(req: Request, schema: z.ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    raw = {};
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new ApiHttpError(
      'invalid_input',
      first?.message ?? 'Please check your input.',
      400,
      first?.path?.join('.'),
    );
  }
  return result.data;
}

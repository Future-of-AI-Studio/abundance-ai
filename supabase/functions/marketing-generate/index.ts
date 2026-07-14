// marketing-generate — Gemini writes social posts (+ optional email) from the
// user's program. Validated to schema, persisted to marketing_posts, returned.
// Generation is append-only: each call adds a new numbered round within its
// phase and never replaces earlier content, capped at 8 rounds per UTC month.
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, marketingGenerateRequestSchema, aiMarketingSchema } from '../_shared/contract.ts';
import { requireUser, userClient, adminClient } from '../_shared/supabase.ts';
import { callGemini } from '../_shared/gemini.ts';
import { marketingPrompt } from '../_shared/prompts.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const user = await requireUser(req);
    const db = userClient(req);
    const admin = adminClient();
    const { platforms, include_email, phase } = await parseBody(req, marketingGenerateRequestSchema);
    // Omitted platforms = all four; an explicit [] = email only.
    const targetPlatforms = platforms ?? ['facebook', 'instagram', 'x', 'linkedin'];
    if (targetPlatforms.length === 0 && !include_email) {
      return errorResponse('nothing_selected', 'Pick at least one platform or email.', 400);
    }
    // Scale posts-per-target inversely to how many targets are chosen.
    const targetCount = targetPlatforms.length + (include_email ? 1 : 0);
    const perTarget = ({ 1: 5, 2: 3, 3: 3, 4: 2, 5: 2 } as Record<number, number>)[targetCount] ?? 2;

    // Monthly cap: at most 8 generation rounds per UTC month, counted across all
    // phases as distinct (phase, round) pairs among this month's posts.
    const MONTHLY_ROUND_LIMIT = 8;
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const { data: monthRows } = await db
      .from('marketing_posts').select('phase, round')
      .eq('user_id', user.id).gte('created_at', monthStart);
    const roundsUsed = new Set((monthRows ?? []).map((r) => `${r.phase}:${r.round}`)).size;
    if (roundsUsed >= MONTHLY_ROUND_LIMIT) {
      return errorResponse(
        'marketing_limit',
        "You've used all 8 marketing rounds for this month. New rounds unlock at the start of next month — your saved content is still yours to edit and share.",
        400,
      );
    }

    // Ground the copy in the ACTIVE build — the version the user has chosen as
    // "their program" — not simply the newest one (they may have switched back).
    const { data: program } = await db
      .from('programs').select('id, title').eq('user_id', user.id)
      .eq('is_active', true).eq('status', 'ready').maybeSingle();
    if (!program) {
      return errorResponse('no_program', 'Your marketing kit unlocks once your program is ready.', 400);
    }
    const { data: modules } = await db
      .from('modules').select('title, outcome, session_flow').eq('program_id', program.id).order('idx');

    const { system, user: userPrompt, mockText } = marketingPrompt(
      program.title, modules ?? [], targetPlatforms, include_email, phase, perTarget,
    );
    const { data: ai } = await callGemini({
      admin, userId: user.id, feature: 'marketing-generate',
      systemPrompt: system, userPrompt, schema: aiMarketingSchema,
      temperature: 0.8, mockText,
    });

    // Append-only: earlier rounds (and the user's edits/favorites) are never
    // replaced. This batch becomes the next round number within its phase.
    const { data: latest } = await db
      .from('marketing_posts').select('round').eq('user_id', user.id).eq('phase', phase)
      .order('round', { ascending: false }).limit(1).maybeSingle();
    const round = (latest?.round ?? 0) + 1;
    const rows = ai.posts.map((p) => ({
      user_id: user.id, channel: p.channel, platform: p.platform ?? null, phase, round,
      caption: p.caption, hashtags: p.hashtags, posted: false,
    }));
    await db.from('marketing_posts').insert(rows);

    const { data: posts } = await db
      .from('marketing_posts').select('*').eq('user_id', user.id).order('created_at');

    return json({ posts: posts ?? [] });
  } catch (err) {
    return handleThrown(err);
  }
});

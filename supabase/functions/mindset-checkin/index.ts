// mindset-checkin — enforce the 3/week cap; serve cached reflections instantly;
// else call Gemini with a short, category-aware courage prompt. At the cap it
// returns a warm 200 "limit" payload (never a hard error) so the UI can redirect
// to the circle. Every AI call is logged via callGemini.
import { handleOptions } from '../_shared/cors.ts';
import { json, handleThrown } from '../_shared/response.ts';
import { parseBody, mindsetCheckinRequestSchema } from '../_shared/contract.ts';
import { requireUser, userClient, adminClient } from '../_shared/supabase.ts';
import { callGemini } from '../_shared/gemini.ts';
import { mindsetPrompt } from '../_shared/prompts.ts';
import { loadQuota, incrementQuota, WEEKLY_LIMIT_MESSAGE } from '../_shared/mindsetQuota.ts';
import { z } from 'zod';

const reflectionSchema = z.object({ prompt: z.string().min(1), reflection: z.string().min(1) });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const user = await requireUser(req);
    const db = userClient(req);
    const admin = adminClient();
    const { wall_key, user_note } = await parseBody(req, mindsetCheckinRequestSchema);

    const { week, count, cap } = await loadQuota(db, user.id);

    if (count >= cap) {
      return json({ status: 'limit', message: WEEKLY_LIMIT_MESSAGE, remaining: 0 });
    }

    // Category-aware prompt; cache key keeps cost low for common walls.
    const { data: profile } = await db
      .from('profiles').select('category').eq('id', user.id).maybeSingle();
    const category = profile?.category ?? 'other';
    const cacheKey = `${wall_key}:${category}`;

    const { system, user: userPrompt, mockText } = mindsetPrompt(wall_key, category, user_note);
    // Only cache when there's no personal note (notes make responses unique).
    const { data: ai, cacheHit } = await callGemini({
      admin, userId: user.id, feature: 'mindset-checkin',
      systemPrompt: system, userPrompt, schema: reflectionSchema,
      temperature: 0.7, mockText,
      cacheKey: user_note ? undefined : cacheKey,
    });

    const { data: checkin } = await db
      .from('mindset_checkins')
      .insert({
        user_id: user.id, wall_key, prompt: ai.prompt, reflection: ai.reflection,
        user_note: user_note ?? null, cache_hit: cacheHit,
      })
      .select('*').single();

    await incrementQuota(db, user.id, week, count);

    return json({ status: 'ok', checkin, cache_hit: cacheHit, remaining: Math.max(0, cap - (count + 1)) });
  } catch (err) {
    return handleThrown(err);
  }
});

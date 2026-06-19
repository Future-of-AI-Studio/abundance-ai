// marketing-generate — Gemini writes social posts (+ optional email) from the
// user's program. Validated to schema, persisted to marketing_posts, returned.
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
    const { include_email } = await parseBody(req, marketingGenerateRequestSchema);

    const { data: program } = await db
      .from('programs').select('id, title').eq('user_id', user.id)
      .eq('status', 'ready').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!program) {
      return errorResponse('no_program', 'Your marketing kit unlocks once your program is ready.', 400);
    }
    const { data: modules } = await db
      .from('modules').select('title').eq('program_id', program.id).order('idx');

    const { system, user: userPrompt, mockText } = marketingPrompt(
      program.title, (modules ?? []).map((m) => m.title), include_email,
    );
    const { data: ai } = await callGemini({
      admin, userId: user.id, feature: 'marketing-generate',
      systemPrompt: system, userPrompt, schema: aiMarketingSchema,
      temperature: 0.8, mockText,
    });

    // Replace any previous generated posts (keep it simple + idempotent-ish).
    await db.from('marketing_posts').delete().eq('user_id', user.id);
    const rows = ai.posts.map((p) => ({
      user_id: user.id, channel: p.channel, caption: p.caption, hashtags: p.hashtags, posted: false,
    }));
    await db.from('marketing_posts').insert(rows);

    const { data: posts } = await db
      .from('marketing_posts').select('*').eq('user_id', user.id).order('created_at');

    return json({ posts: posts ?? [] });
  } catch (err) {
    return handleThrown(err);
  }
});

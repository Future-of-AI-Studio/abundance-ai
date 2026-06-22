// mindset-reflect — wrap-up step: distill a chat thread into one saved reflection.
// Gemini classifies which of the six known "walls" the conversation surfaced and
// writes a regular mindset_checkins row, so the conversation shows up in the
// existing dashboard history. This SAVE counts toward the shared 3/week cap; at
// the cap it returns the warm 200 "limit" payload (the chat itself stays usable).
import { handleOptions } from '../_shared/cors.ts';
import { json, errorResponse, handleThrown } from '../_shared/response.ts';
import { parseBody, mindsetReflectRequestSchema, aiReflectSchema } from '../_shared/contract.ts';
import { requireUser, userClient, adminClient } from '../_shared/supabase.ts';
import { callGemini } from '../_shared/gemini.ts';
import { mindsetReflectPrompt } from '../_shared/prompts.ts';
import { loadQuota, incrementQuota, WEEKLY_LIMIT_MESSAGE } from '../_shared/mindsetQuota.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const user = await requireUser(req);
    const db = userClient(req);
    const admin = adminClient();
    const { conversation_id } = await parseBody(req, mindsetReflectRequestSchema);

    // Ownership: RLS scopes to the caller, so a foreign id simply isn't found.
    const { data: conv } = await db
      .from('mindset_conversations')
      .select('id')
      .eq('id', conversation_id)
      .maybeSingle();
    if (!conv) return errorResponse('not_found', "We couldn't find that conversation.", 404);

    // Saving a reflection counts toward the 3/week cap.
    const { week, count, cap } = await loadQuota(db, user.id);
    if (count >= cap) {
      return json({ status: 'limit', message: WEEKLY_LIMIT_MESSAGE, remaining: 0 });
    }

    const { data: msgs } = await db
      .from('mindset_messages')
      .select('role, content')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true });
    if (!msgs || msgs.length === 0) {
      return errorResponse('empty', 'There’s nothing to reflect on yet — say a little first.', 400);
    }
    const transcript = msgs
      .map((m) => `${m.role === 'assistant' ? 'Coach' : 'You'}: ${m.content}`)
      .join('\n');

    const { data: profile } = await db.from('profiles').select('category').eq('id', user.id).maybeSingle();
    const category = profile?.category ?? 'other';

    const { system, user: userPrompt, mockText } = mindsetReflectPrompt(transcript, category);
    const { data: ai } = await callGemini({
      admin,
      userId: user.id,
      feature: 'mindset-chat',
      systemPrompt: system,
      userPrompt,
      schema: aiReflectSchema,
      temperature: 0.6,
      mockText,
    });

    const { data: checkin } = await db
      .from('mindset_checkins')
      .insert({
        user_id: user.id,
        wall_key: ai.wall_key,
        prompt: ai.prompt,
        reflection: ai.reflection,
        user_note: null,
        cache_hit: false,
        conversation_id,
      })
      .select('*')
      .single();

    await db.from('mindset_conversations').update({ wall_key: ai.wall_key }).eq('id', conversation_id);
    await incrementQuota(db, user.id, week, count);

    return json({ status: 'ok', checkin, cache_hit: false, remaining: Math.max(0, cap - (count + 1)) });
  } catch (err) {
    return handleThrown(err);
  }
});

// mindset-chat — open, multi-turn courage conversation. Persists each thread
// (mindset_conversations + mindset_messages) so the user can resume, and feeds
// the full history back to Gemini for context. Bounded by a per-user DAILY cap
// (cost control) — at the cap it returns a warm 200 "limit" payload, never a
// hard error. The 3/week cap lives on SAVED reflections (see mindset-reflect),
// not on chat. Every AI call is logged via callGeminiText.
import { handleOptions } from '../_shared/cors.ts';
import { json, handleThrown } from '../_shared/response.ts';
import { parseBody, mindsetChatRequestSchema } from '../_shared/contract.ts';
import { requireUser, userClient, adminClient } from '../_shared/supabase.ts';
import { callGeminiText } from '../_shared/gemini.ts';
import { mindsetChatSystemPrompt } from '../_shared/prompts.ts';

const DAILY_CAP = 20;
const DAILY_LIMIT_MESSAGE =
  "Let's pick this up tomorrow — you've done a lot of reflecting today. Your circle is here in the meantime →";
const FALLBACK_REPLY = "I'm right here with you. Tell me a little more about what's on your mind.";

// Midnight UTC today, as an ISO string — start of the daily cap window.
function startOfTodayUtc(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const user = await requireUser(req);
    const db = userClient(req);
    const admin = adminClient();
    const { conversation_id, message } = await parseBody(req, mindsetChatRequestSchema);

    // Daily message cap (cost control) — count today's user messages.
    const { count: usedToday } = await db
      .from('mindset_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', startOfTodayUtc());
    if ((usedToday ?? 0) >= DAILY_CAP) {
      return json({ status: 'limit', message: DAILY_LIMIT_MESSAGE });
    }

    // Resolve or create the conversation (title = first message, truncated).
    let convId = conversation_id;
    if (!convId) {
      const { data: conv } = await db
        .from('mindset_conversations')
        .insert({ user_id: user.id, title: message.slice(0, 80) })
        .select('id')
        .single();
      convId = conv!.id;
    }

    // Prior turns for context (oldest → newest), then persist the new user turn.
    const { data: prior } = await db
      .from('mindset_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    await db
      .from('mindset_messages')
      .insert({ conversation_id: convId, user_id: user.id, role: 'user', content: message });

    // Category drives the coach's tone.
    const { data: profile } = await db.from('profiles').select('category').eq('id', user.id).maybeSingle();
    const category = profile?.category ?? 'other';

    const history = [
      ...(prior ?? []).map((m) => ({
        role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
        text: m.content as string,
      })),
      { role: 'user' as const, text: message },
    ];

    const { text } = await callGeminiText({
      admin,
      userId: user.id,
      feature: 'mindset-chat',
      systemPrompt: mindsetChatSystemPrompt(category),
      messages: history,
      temperature: 0.7,
      mockText: FALLBACK_REPLY,
    });
    const reply = text || FALLBACK_REPLY;

    const { data: assistantMsg } = await db
      .from('mindset_messages')
      .insert({ conversation_id: convId, user_id: user.id, role: 'assistant', content: reply })
      .select('*')
      .single();

    await db
      .from('mindset_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', convId);

    return json({
      status: 'ok',
      conversation_id: convId,
      message: assistantMsg,
      daily_remaining: Math.max(0, DAILY_CAP - ((usedToday ?? 0) + 1)),
    });
  } catch (err) {
    return handleThrown(err);
  }
});

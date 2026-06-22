import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { callVertex, VERTEX_MODEL, type VertexMessage } from './vertex.ts';
import { ApiHttpError } from './response.ts';

/**
 * The one place every Gemini call flows through. It:
 *  (a) checks response_cache when a cacheKey is given;
 *  (b) calls Vertex (Gemini);
 *  (c) writes ai_usage_logs (tokens + latency + cache_hit) — required submission
 *      evidence: every AI call is logged;
 *  (d) validates output against the shared zod schema and returns it.
 */

export type AiFeature = 'program-build' | 'marketing-generate' | 'mindset-checkin' | 'mindset-chat';

export interface CallGeminiArgs<T> {
  admin: SupabaseClient;
  userId: string | null;
  feature: AiFeature;
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodSchema<T>;
  temperature?: number;
  /** When set, serve a cached parsed value if present, and store on miss. */
  cacheKey?: string;
  /** Deterministic JSON used by the local mock when GCP creds are absent. */
  mockText?: string;
}

export interface CallGeminiResult<T> {
  data: T;
  cacheHit: boolean;
}

export async function callGemini<T>(args: CallGeminiArgs<T>): Promise<CallGeminiResult<T>> {
  const { admin, userId, feature, schema, cacheKey } = args;
  const started = Date.now();

  // (a) cache lookup
  if (cacheKey) {
    const { data: cached } = await admin
      .from('response_cache')
      .select('value')
      .eq('feature', feature)
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (cached?.value) {
      const parsed = schema.safeParse(cached.value);
      if (parsed.success) {
        await logUsage(admin, {
          userId, feature, promptTokens: 0, completionTokens: 0,
          latencyMs: Date.now() - started, cacheHit: true,
        });
        return { data: parsed.data, cacheHit: true };
      }
    }
  }

  // (b) live Gemini call via Vertex
  const result = await callVertex({
    systemPrompt: args.systemPrompt,
    userPrompt: args.userPrompt,
    temperature: args.temperature,
    json: true,
    mockText: args.mockText,
  });

  let value: unknown;
  try {
    value = JSON.parse(result.text);
  } catch {
    // Tolerate code-fenced JSON.
    const cleaned = result.text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    try {
      value = JSON.parse(cleaned);
    } catch {
      throw new ApiHttpError('ai_bad_output', 'The AI returned something unexpected. Please try again.', 502);
    }
  }

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new ApiHttpError('ai_bad_output', 'The AI returned something unexpected. Please try again.', 502);
  }

  // (c) usage log
  await logUsage(admin, {
    userId, feature,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    latencyMs: Date.now() - started,
    cacheHit: false,
  });

  // store in cache for next time
  if (cacheKey) {
    await admin.from('response_cache').upsert({
      feature, cache_key: cacheKey, value: parsed.data as unknown,
    });
  }

  return { data: parsed.data, cacheHit: false };
}

export interface CallGeminiTextArgs {
  admin: SupabaseClient;
  userId: string | null;
  feature: AiFeature;
  systemPrompt: string;
  /** Multi-turn history, oldest → newest. */
  messages: VertexMessage[];
  temperature?: number;
  /** Deterministic reply used by the local mock when GCP creds are absent. */
  mockText?: string;
}

/**
 * Free-text sibling of callGemini for conversational replies: no JSON mode, no
 * schema, no caching (each turn is unique). Still writes ai_usage_logs so every
 * AI call remains logged (submission evidence).
 */
export async function callGeminiText(args: CallGeminiTextArgs): Promise<{ text: string }> {
  const started = Date.now();
  const result = await callVertex({
    systemPrompt: args.systemPrompt,
    messages: args.messages,
    temperature: args.temperature,
    mockText: args.mockText,
  });

  await logUsage(args.admin, {
    userId: args.userId,
    feature: args.feature,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    latencyMs: Date.now() - started,
    cacheHit: false,
  });

  return { text: result.text.trim() };
}

async function logUsage(
  admin: SupabaseClient,
  row: {
    userId: string | null;
    feature: AiFeature;
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
    cacheHit: boolean;
  },
): Promise<void> {
  const { error } = await admin.from('ai_usage_logs').insert({
    user_id: row.userId,
    feature: row.feature,
    model: VERTEX_MODEL,
    prompt_tokens: row.promptTokens,
    completion_tokens: row.completionTokens,
    latency_ms: row.latencyMs,
    cache_hit: row.cacheHit,
  });
  if (error) console.error('[ai_usage_logs] insert failed:', error.message);
}

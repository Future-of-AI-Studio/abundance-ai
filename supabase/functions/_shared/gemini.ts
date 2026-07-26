import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { callVertex, VERTEX_MODEL, type VertexMessage, type VertexMediaPart, type VertexResult } from './vertex.ts';
import { ApiHttpError } from './response.ts';

type AiFailureKind = 'empty' | 'incomplete' | 'unparseable' | 'schema';

const PARSE_FAILED = Symbol('parse_failed');

// Gemini in JSON mode occasionally emits RAW control characters (a literal newline
// or tab) INSIDE a string value instead of the escaped \n / \t that JSON requires.
// The structure is otherwise valid, but JSON.parse rejects it (unexpected control
// char in string) — the real, intermittent cause of program-build's ai_bad_output.
// Walk the text and escape any control char that appears inside a string literal.
function escapeControlCharsInStrings(text: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { out += ch; escaped = false; continue; } // char after a backslash, verbatim
    if (inString) {
      if (ch === '\\') { out += ch; escaped = true; continue; }
      if (ch === '"') { out += ch; inString = false; continue; }
      const code = text.charCodeAt(i);
      if (code < 0x20) {
        out += ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : ch === '\t' ? '\\t'
          : '\\u' + code.toString(16).padStart(4, '0');
        continue;
      }
      out += ch;
      continue;
    }
    if (ch === '"') { inString = true; }
    out += ch;
  }
  return out;
}

// Parse Gemini's text into JSON, tolerating the two ways it drifts from strict JSON:
// wrapping the object in a ```json code fence, and raw control chars inside strings.
function parseLenient(text: string): unknown | typeof PARSE_FAILED {
  const bases = [text, text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()];
  for (const base of bases) {
    for (const attempt of [base, escapeControlCharsInStrings(base)]) {
      try { return JSON.parse(attempt); } catch { /* try the next repair */ }
    }
  }
  return PARSE_FAILED;
}

// Finish reasons that mean Gemini blocked the content rather than answered.
const BLOCKED_REASONS = ['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION'];

// Build a specific ai_* error from a failed Gemini call. The friendly `message`
// names the failure mode so it's actionable; `detail` carries the diagnostics
// (finish reason, token counts, a snippet) for the logs and the Network tab.
function aiError(feature: AiFeature, result: VertexResult, kind: AiFailureKind, extra = ''): ApiHttpError {
  const fr = result.finishReason ?? 'none';
  const snippet = result.text ? ` snippet="${result.text.slice(0, 160).replace(/\s+/g, ' ')}"` : '';
  const detail =
    `feature=${feature}; cause=${kind}; finishReason=${fr}; ` +
    `promptTokens=${result.promptTokens}; completionTokens=${result.completionTokens}` +
    `${extra ? `; ${extra}` : ''}${snippet}`;

  let code = 'ai_bad_output';
  let message: string;
  if (BLOCKED_REASONS.includes(fr)) {
    code = 'ai_blocked';
    message = `The AI stopped because the content was flagged (${fr.toLowerCase().replace(/_/g, ' ')}). Try rephrasing or removing whatever might have tripped the filter, then build again.`;
  } else if (fr === 'MAX_TOKENS' || kind === 'incomplete') {
    code = 'ai_truncated';
    message = 'The AI ran out of room and its response was cut off before it finished. Please try again — if it keeps happening, shorten your content or ask for fewer modules.';
  } else if (kind === 'empty') {
    code = 'ai_empty';
    message = 'The AI returned an empty response. Please try again.';
  } else if (kind === 'unparseable') {
    message = 'The AI returned output that could not be read. Please try again.';
  } else {
    message = `The AI response was missing or malformed fields (${extra || 'unknown field'}). Please try again.`;
  }
  return new ApiHttpError(code, message, 502, undefined, detail);
}

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
  /** Output cap override for long-form responses (default 8192). */
  maxOutputTokens?: number;
  /** Inline media (audio/PDF/image) to analyze alongside the prompt. */
  mediaParts?: VertexMediaPart[];
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

  // (b) live Gemini call via Vertex. Disable "thinking" for these structured JSON
  // calls: on 2.5 models thinking tokens are billed against maxOutputTokens, so an
  // uncapped thinking pass can truncate a long JSON answer into unparseable output
  // (the root cause of spurious ai_bad_output on program-build). The whole budget
  // now goes to the answer.
  const result = await callVertex({
    systemPrompt: args.systemPrompt,
    userPrompt: args.userPrompt,
    mediaParts: args.mediaParts,
    temperature: args.temperature,
    json: true,
    maxOutputTokens: args.maxOutputTokens,
    thinkingBudget: 0,
    mockText: args.mockText,
  });

  // The model finished for a reason other than a clean stop (or returned nothing) —
  // that's the actual cause, so name it. MAX_TOKENS truncates the JSON; SAFETY et al.
  // block it; either way the parse/schema step below would otherwise report a vague
  // "unexpected output" that hides why.
  if (!result.text.trim() || (result.finishReason && result.finishReason !== 'STOP')) {
    throw aiError(feature, result, result.text.trim() ? 'incomplete' : 'empty');
  }

  const value = parseLenient(result.text);
  if (value === PARSE_FAILED) {
    console.error(`[callGemini:${feature}] unparseable output (len=${result.text.length}):`, result.text.slice(0, 500));
    throw aiError(feature, result, 'unparseable');
  }

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue ? `${issue.path.join('.') || '(root)'}: ${issue.message}` : 'unknown field';
    console.error(`[callGemini:${feature}] schema mismatch:`, JSON.stringify(parsed.error.issues.slice(0, 5)));
    throw aiError(feature, result, 'schema', where);
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

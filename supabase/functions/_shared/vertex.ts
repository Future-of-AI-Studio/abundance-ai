import { GoogleAuth } from 'google-auth-library';

/**
 * Gemini via Vertex AI on Google Cloud — the competition's Google Cloud product
 * of record. We authenticate with a Google Cloud service account (key stored in
 * Supabase secrets) and POST to the Vertex generateContent REST endpoint. The
 * AI Studio key path is deliberately NOT used, so the Google Cloud requirement
 * and the Gemini requirement are satisfied by the same component.
 */

const PROJECT = Deno.env.get('GOOGLE_VERTEX_PROJECT_ID') ?? '';
const LOCATION = Deno.env.get('GOOGLE_VERTEX_LOCATION') ?? 'us-central1';
export const VERTEX_MODEL = Deno.env.get('GOOGLE_VERTEX_MODEL') ?? 'gemini-2.5-flash';
const SA_KEY_RAW = Deno.env.get('GOOGLE_VERTEX_SA_KEY') ?? '';

export interface VertexResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  mocked: boolean;
}

/** One turn of a multi-turn conversation. 'model' is Gemini's role for replies. */
export interface VertexMessage {
  role: 'user' | 'model';
  text: string;
}

/** Inline binary attachment (audio, PDF, image) sent alongside the text prompt. */
export interface VertexMediaPart {
  mimeType: string;
  /** base64-encoded bytes. */
  dataBase64: string;
}

export interface VertexCallArgs {
  systemPrompt: string;
  /** Single-turn prompt. Ignored when `messages` is provided. */
  userPrompt?: string;
  /** Multi-turn history (oldest → newest). When set, overrides `userPrompt`. */
  messages?: VertexMessage[];
  /** Inline media attached to the single-turn user message (audio/PDF/image). */
  mediaParts?: VertexMediaPart[];
  temperature?: number;
  /** When true, force JSON output (responseMimeType application/json). */
  json?: boolean;
  /** Deterministic stub used when credentials are absent (local dev only). */
  mockText?: string;
}

let cachedAuth: GoogleAuth | null = null;
function auth(): GoogleAuth {
  if (cachedAuth) return cachedAuth;
  const credentials = JSON.parse(SA_KEY_RAW);
  cachedAuth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  return cachedAuth;
}

function credsConfigured(): boolean {
  return SA_KEY_RAW.trim().length > 0 && PROJECT.trim().length > 0;
}

export async function callVertex(args: VertexCallArgs): Promise<VertexResult> {
  // Local-dev fallback: without GCP creds, return a deterministic stub so the
  // full flow is testable offline. The DEPLOYED app always has creds → real
  // Gemini calls (a live-call compliance requirement).
  if (!credsConfigured()) {
    console.warn('[vertex] No GOOGLE_VERTEX_SA_KEY/PROJECT — using local mock. Do NOT deploy without creds.');
    const text = args.mockText ?? '{}';
    return { text, promptTokens: 0, completionTokens: 0, mocked: true };
  }

  const client = await auth().getClient();
  const tokenResponse = await client.getAccessToken();
  const accessToken = tokenResponse.token;

  const url =
    `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}` +
    `/locations/${LOCATION}/publishers/google/models/${VERTEX_MODEL}:generateContent`;

  // Single-turn user message = the text prompt plus any inline media (audio/PDF/image).
  const userParts: Array<Record<string, unknown>> = [];
  if (args.userPrompt) userParts.push({ text: args.userPrompt });
  for (const m of args.mediaParts ?? []) {
    userParts.push({ inlineData: { mimeType: m.mimeType, data: m.dataBase64 } });
  }
  const contents = args.messages
    ? args.messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] }))
    : [{ role: 'user', parts: userParts.length ? userParts : [{ text: args.userPrompt ?? '' }] }];

  const body = {
    systemInstruction: { parts: [{ text: args.systemPrompt }] },
    contents,
    generationConfig: {
      temperature: args.temperature ?? 0.7,
      // Room for the JSON output plus any 2.5 "thinking" tokens so structured
      // responses aren't truncated mid-object (marketing can be a batch of posts).
      maxOutputTokens: 8192,
      ...(args.json ? { responseMimeType: 'application/json' } : {}),
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Vertex error ${res.status}: ${detail.slice(0, 500)}`);
  }

  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
  const usage = data?.usageMetadata ?? {};
  return {
    text,
    promptTokens: usage.promptTokenCount ?? 0,
    completionTokens: usage.candidatesTokenCount ?? 0,
    mocked: false,
  };
}

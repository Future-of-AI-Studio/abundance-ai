import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { encodeBase64 } from '@std/encoding/base64';
import { callGemini } from './gemini.ts';

/**
 * Voice transcription — the shared path used by BOTH the content-transcribe
 * function (transcribe-on-upload) and program-build's on-demand fallback.
 *
 * Recordings are transcribed once and the text stored on content_sources.transcript,
 * so program-build feeds the model plain text instead of base64-inlining large audio
 * on every build. That keeps the build hot path off the Edge Runtime CPU limit.
 */

const transcriptSchema = z.object({ transcript: z.string() });

// Audio MIME by extension. Mirrors the formats Gemini reads inline. Legacy .webm
// recordings are deliberately absent — Gemini has no reliable reader for them, so
// they're left un-transcribed (noted by filename in the build) rather than mislabeled.
const AUDIO_MIME: Record<string, string> = {
  wav: 'audio/wav', mp3: 'audio/mpeg', m4a: 'audio/mp4',
  aac: 'audio/aac', ogg: 'audio/ogg', flac: 'audio/flac',
};

export interface TranscribableSource {
  id: string;
  kind: string;
  filename: string;
  storage_path: string;
  duration_sec: number | null;
  transcript?: string | null;
}

/** The Gemini-supported audio MIME for a source, or null if it can't be transcribed. */
export function audioMime(source: { kind: string; filename: string }): string | null {
  const ext = (source.filename.split('.').pop() ?? '').toLowerCase();
  if (AUDIO_MIME[ext]) return AUDIO_MIME[ext];
  // A recording with no extension is our client-normalized WAV.
  if (source.kind === 'voice' && !source.filename.includes('.')) return 'audio/wav';
  return null;
}

/**
 * Transcribe one audio source and persist the text on content_sources.transcript.
 * Idempotent: returns the stored transcript untouched if one already exists.
 * Returns null when the source isn't transcribable audio or the object is missing.
 */
export async function transcribeSource(
  admin: SupabaseClient,
  userId: string,
  source: TranscribableSource,
): Promise<{ transcript: string; cached: boolean } | null> {
  if (source.transcript && source.transcript.trim().length > 0) {
    return { transcript: source.transcript, cached: true };
  }
  const mimeType = audioMime(source);
  if (!mimeType) return null;

  const { data: blob } = await admin.storage.from('content').download(source.storage_path);
  if (!blob) return null;

  const dataBase64 = encodeBase64(await blob.arrayBuffer());
  const label = `${source.kind}: ${source.filename}${source.duration_sec ? ` (${source.duration_sec}s)` : ''}`;
  const { data } = await callGemini({
    admin, userId, feature: 'program-build',
    systemPrompt:
      'You transcribe voice recordings. Return JSON of the shape {"transcript": string} — the complete, faithful transcript of the recording. No commentary, no summarization.',
    userPrompt: `Transcribe this recording (${label}).`,
    schema: transcriptSchema,
    temperature: 0,
    mediaParts: [{ mimeType, dataBase64 }],
    mockText: JSON.stringify({ transcript: `(mock transcript of ${label})` }),
  });

  const transcript = data.transcript ?? '';
  await admin.from('content_sources').update({ transcript }).eq('id', source.id);
  return { transcript, cached: false };
}

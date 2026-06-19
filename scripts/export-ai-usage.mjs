// scripts/export-ai-usage.mjs
// Exports ai_usage_logs to CSV — the submission's "API usage records / agent
// execution logs" evidence. Every Gemini call (live or cached) is one row.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/export-ai-usage.mjs > ai_usage_logs.csv

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY (from `supabase status`).');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const COLS = ['id', 'user_id', 'feature', 'model', 'prompt_tokens', 'completion_tokens', 'latency_ms', 'cache_hit', 'created_at'];

function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const { data, error } = await admin
  .from('ai_usage_logs')
  .select(COLS.join(','))
  .order('created_at', { ascending: true });

if (error) { console.error(error); process.exit(1); }

const lines = [COLS.join(',')];
for (const row of data ?? []) lines.push(COLS.map((c) => csvCell(row[c])).join(','));
process.stdout.write(lines.join('\n') + '\n');
console.error(`Exported ${data?.length ?? 0} ai_usage_logs rows.`);

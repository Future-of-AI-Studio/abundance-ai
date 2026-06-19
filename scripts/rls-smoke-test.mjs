// RLS cross-user isolation smoke test. Signs in as two real users with the ANON
// key (so every query is RLS-scoped) and asserts one cannot read the other's rows.
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const PW = 'AbundanceDemo!2025';

function client() { return createClient(URL, ANON, { auth: { persistSession: false } }); }
async function signIn(email) {
  const c = client();
  const { error } = await c.auth.signInWithPassword({ email, password: PW });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return c;
}

let pass = 0, fail = 0;
const check = (name, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}`); ok ? pass++ : fail++; };

const judge = await signIn('judge@demo.abundance.ai');
const maya = await signIn('maya@demo.abundance.ai');

// Judge sees their own program.
const judgePrograms = await judge.from('programs').select('id,title');
check('judge reads own program', (judgePrograms.data?.length ?? 0) >= 1);

// Maya cannot see judge's programs (she has none of her own).
const mayaPrograms = await maya.from('programs').select('id,title');
check('maya cannot see judge programs (RLS)', (mayaPrograms.data?.length ?? 0) === 0);

// Maya cannot read judge's marketing posts.
const mayaPosts = await maya.from('marketing_posts').select('id');
check('maya cannot see judge marketing_posts (RLS)', (mayaPosts.data?.length ?? 0) === 0);

// Both can read expert_talks (readable by all authenticated).
const talks = await maya.from('expert_talks').select('id');
check('authenticated user reads expert_talks', (talks.data?.length ?? 0) >= 1);

// Nobody (non-service) can read ai_usage_logs.
const logs = await judge.from('ai_usage_logs').select('id');
check('ai_usage_logs blocked for normal user', (logs.data?.length ?? 0) === 0);

// Circle peers ARE visible within the shared circle.
const circle = await judge.from('circle_members').select('user_id,name');
check('judge sees circle peers (3 members)', (circle.data?.length ?? 0) === 3);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

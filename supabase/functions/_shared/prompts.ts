// Structured, short prompts (cost control — A4). Each builder returns the system
// + user prompt and a deterministic mockText (valid JSON) for the local mock path.

const VOICE =
  'Voice: warm, plain-spoken, second person, short sentences. Encouraging, never blaming, never cute.';

// ── program-build ─────────────────────────────────────────────────────────────
export function programBuildPrompt(content: string, path: 'A' | 'B' | undefined) {
  const format =
    path === 'B'
      ? 'self-paced, pre-recorded modules'
      : 'live group coaching sessions';
  const system = [
    'You are a curriculum architect for everyday experts turning their knowledge into a sellable program.',
    `Design a ${format} program from the raw, messy material the expert provides.`,
    'Return STRICT JSON only, no prose, matching exactly:',
    '{"title": string, "modules": [{"title": string, "outcome": string, "session_flow": string}]}',
    'Rules: 3 to 6 modules. Each "outcome" is one sentence on what the learner can DO after.',
    '"session_flow" is 2-3 short sentences describing how that session/module runs.',
    VOICE,
  ].join('\n');
  const user = `Raw expertise material:\n"""\n${content.slice(0, 12000)}\n"""\n\nStructure it into a program now.`;
  const mockText = JSON.stringify({
    title: 'Your Signature Program',
    modules: [
      { title: 'Find Your Footing', outcome: 'You can name the exact transformation you offer.', session_flow: 'Open with your story. Map where clients start and where they end up. Close with their first win.' },
      { title: 'Build the Core Method', outcome: 'You can walk a client through your method step by step.', session_flow: 'Teach the framework. Practice live on a real example. Assign a small action.' },
      { title: 'Make It Stick', outcome: 'You can keep clients moving without burning out.', session_flow: 'Review wins and walls. Coach through one sticking point. Set the next commitment.' },
    ],
  });
  return { system, user, mockText };
}

// ── marketing-generate ────────────────────────────────────────────────────────
export function marketingPrompt(
  programTitle: string,
  moduleTitles: string[],
  includeEmail: boolean,
) {
  const system = [
    'You write authentic, non-salesy marketing for everyday experts launching a program.',
    'Return STRICT JSON only matching exactly:',
    '{"posts": [{"channel": "social" | "email", "caption": string, "hashtags": [string]}]}',
    'Write 3 social posts. ' + (includeEmail ? 'Then 1 email (channel "email", hashtags []).' : 'No email posts.'),
    'Captions are short, real, and in the expert\'s warm voice. 2-4 relevant hashtags per social post.',
    VOICE,
  ].join('\n');
  const user = `Program: "${programTitle}"\nModules: ${moduleTitles.join('; ')}\n\nWrite the posts now.`;
  const posts = [
    { channel: 'social', caption: `I built something I'm proud of: "${programTitle}". It's the thing I wish I'd had when I started. Doors are open.`, hashtags: ['#yourtime', '#coaching', '#startnow'] },
    { channel: 'social', caption: `You don't need to have it all figured out to begin. "${programTitle}" walks you through it, step by step.`, hashtags: ['#growth', '#mindset'] },
    { channel: 'social', caption: `Three things this program gives you: clarity, a real method, and people in your corner. That's it. That's the work.`, hashtags: ['#community', '#learn', '#share'] },
  ];
  if (includeEmail) {
    posts.push({ channel: 'email', caption: `Subject: It's finally here\n\nI've been quietly building "${programTitle}" for you. Here's what's inside, and how to start. Reply if you have questions — I read every one.`, hashtags: [] });
  }
  return { system, user, mockText: JSON.stringify({ posts }) };
}

// ── mindset-checkin ───────────────────────────────────────────────────────────
const WALL_TEXT: Record<string, string> = {
  'who-am-i-to-teach': 'wondering "who am I to teach this?"',
  'fear-of-being-seen': 'afraid of being seen and putting themselves out there',
  'charging-money': 'uncomfortable charging money for their help',
  'tech-overwhelm': 'overwhelmed by the tech and setup',
  'staying-consistent': 'worried they won\'t keep it up',
  'comparing-myself': 'comparing themselves to people who seem further ahead',
};

export function mindsetPrompt(wallKey: string, category: string, note?: string) {
  const wall = WALL_TEXT[wallKey] ?? 'facing a moment of doubt';
  const system = [
    'You are a steady, warm mindset coach for everyday experts. This is NOT open chat — give one short, grounded reflection.',
    'Return STRICT JSON only matching exactly: {"prompt": string, "reflection": string}',
    '"prompt" names the wall back to them in one gentle line. "reflection" is 3-5 short sentences of real encouragement, specific to their situation. No platitudes.',
    VOICE,
  ].join('\n');
  const user = `The expert is a ${category}. Right now they are ${wall}.${note ? ` They added: "${note.slice(0, 400)}"` : ''}\n\nOffer the reflection now.`;
  const mockText = JSON.stringify({
    prompt: `You're ${wall}.`,
    reflection:
      'That feeling is a sign you take this seriously — not a sign you should stop. You already know things that would change someone\'s week. You don\'t need to be the world\'s expert, just one step ahead of the person you\'re helping. Start there. You\'ve earned this.',
  });
  return { system, user, mockText };
}

// ── mindset-chat (open, multi-turn conversation) ──────────────────────────────
// The conversational counterpart to mindsetPrompt: this IS open chat. Free prose
// (no JSON), warm and curious, gentle follow-ups.
export function mindsetChatSystemPrompt(category: string): string {
  return [
    `You are a steady, warm mindset coach talking with an everyday expert (a ${category}) turning their knowledge into a sellable program.`,
    'This is an open, back-and-forth conversation — like they texted a trusted mentor. Reply in plain prose, no JSON, no lists.',
    'Keep replies short (2-4 sentences). Listen first; ask one gentle, specific follow-up when it helps. Reflect what you hear before advising.',
    'Stay on courage, confidence, and the inner blocks of building their program. If they drift far off-topic, kindly steer back. Never diagnose, never give medical or crisis advice — if they sound in real distress, gently encourage them to reach out to someone they trust or a professional.',
    VOICE,
  ].join('\n');
}

// Distill a finished conversation into a saved reflection. Strict JSON; wall_key
// is constrained to the six known walls so it slots into the existing dashboard.
export function mindsetReflectPrompt(transcript: string, category: string) {
  const wallList = Object.keys(WALL_TEXT).join(', ');
  const system = [
    'You distill a coaching conversation into one saved reflection for the expert to keep.',
    'Return STRICT JSON only matching exactly: {"wall_key": string, "prompt": string, "reflection": string}',
    `"wall_key" MUST be exactly one of: ${wallList} — pick the one the conversation most reflects.`,
    '"prompt" names that wall back to them in one gentle line. "reflection" is 3-5 short sentences of grounded encouragement that speaks to what they actually shared. No platitudes.',
    VOICE,
  ].join('\n');
  const user = `The expert is a ${category}. Here is the conversation (newest last):\n"""\n${transcript.slice(0, 8000)}\n"""\n\nDistill the reflection now.`;
  const mockText = JSON.stringify({
    wall_key: 'who-am-i-to-teach',
    prompt: 'You wondered who you are to teach this.',
    reflection:
      'You showed up and named the doubt out loud — that already takes courage. You know more than the person one step behind you, and that is exactly who you are here to help. You do not need to have it all figured out to begin. Take the next small step. You\'ve earned this.',
  });
  return { system, user, mockText };
}

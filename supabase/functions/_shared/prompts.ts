// Structured, short prompts (cost control — A4). Each builder returns the system
// + user prompt and a deterministic mockText (valid JSON) for the local mock path.

const VOICE =
  'Voice: warm, plain-spoken, second person, short sentences. Encouraging, never blaming, never cute. ' +
  'Write in PLAIN TEXT ONLY — no markdown, no asterisks, no bullet characters, no bold/italic markers, no headings.';

// ── program-build ─────────────────────────────────────────────────────────────
export function programBuildPrompt(
  content: string,
  path: 'A' | 'B' | undefined,
  mediaCount = 0,
  moduleCount?: number,
) {
  const format =
    path === 'B'
      ? 'self-paced, pre-recorded modules'
      : 'live group coaching sessions';
  // When the expert picked a specific number in the UI, that overrides the default
  // and becomes a hard, non-negotiable rule. When they left it on Auto, the count is
  // NOT pre-chosen — let the material decide how many modules the transformation
  // genuinely needs, within a 1–6 bound. Never pad to hit a number or trim below what
  // the content calls for.
  const moduleRule = moduleCount
    ? `Rules: Produce EXACTLY ${moduleCount} module(s) — never more, never fewer. The expert explicitly requested this. The ${moduleCount} modules together form one coherent transformation, each building on the last.`
    : 'Rules: Use as many modules as the material genuinely needs to form one coherent transformation — never a fixed or arbitrary number. Let the content decide the count, with a minimum of 1 and a maximum of 6. Do not pad with filler modules to reach a number, and do not compress distinct stages to shrink it. Each module builds on the last.';
  const system = [
    'You are a curriculum architect for everyday experts turning their knowledge into a sellable, premium program.',
    `Design a ${format} program from the raw, messy material the expert provides.`,
    'The material may include attached audio recordings and documents — listen to and read them as the PRIMARY source. Ground the program in what the expert actually says and shares — their stories, examples, terms and methods; do not invent a generic curriculum.',
    'Return STRICT JSON only, no prose, matching exactly:',
    '{"title": string, "modules": [{"title": string, "outcome": string, "detail": string, "session_flow": string, "notes": string, "participant_notes": string}]}',
    moduleRule,
    '"outcome" is one sentence on what the learner can DO after that module.',
    '"detail" is the heart of the module — 2 to 4 short paragraphs (150-250 words total, separated by blank lines) that fully teach what the module is: what it covers, the specific concepts, steps or framework taught (drawn from the expert\'s own material), why this module matters at this point in the journey, and one concrete exercise or practice the learner completes. Be specific and substantive — a paying client should read it and feel the depth. Never a one-line summary, never vague filler.',
    '"session_flow" is 3-5 short sentences walking through how that session/module actually runs from beginning to end: how it opens, what gets taught, what gets practiced, and how it closes.',
    '"notes" is helpful guidance for the expert delivering the module when there is something worth flagging: what to prepare, common sticking points learners hit and how to handle them, or pacing/delivery tips. 1-3 sentences; use "" only if nothing is genuinely needed.',
    '"participant_notes" is a short list of notes written FOR the participant/student — what to prepare, bring, or keep in mind for this module, and how to get the most from it. Return 3-5 bullets as ONE string with each bullet on its own line (newline-separated), each bullet a short phrase or sentence. Do NOT add bullet characters, dashes or numbers — just the text of each note on its own line. Address the learner directly ("you"/"your").',
    VOICE,
  ].join('\n');
  const attachNote = mediaCount
    ? `\n\n${mediaCount} recording(s)/document(s) are attached below — analyze them as the main input.`
    : '';
  // Repeat the count as the final instruction — models weight the last line heavily.
  const countReminder = moduleCount
    ? ` Return EXACTLY ${moduleCount} module(s) — this is a hard requirement, not a target.`
    : '';
  const user = `Raw expertise material:\n"""\n${content.slice(0, 12000)}\n"""${attachNote}\n\nStructure it into a premium, fully-explained program now.${countReminder}`;
  const baseModules = [
      {
        title: 'Find Your Footing',
        outcome: 'You can name the exact transformation you offer.',
        detail:
          'This opening module turns your years of experience into one clear promise. You start by telling your own story — not the polished version, the real one — and we pull out the moments where you actually changed something for someone. Those moments hold the transformation you sell.\n\nFrom there you map the client journey: where people are when they find you, what they struggle with in their own words, and where they end up after working with you. You write this in plain language, no jargon, until a stranger could repeat it back.\n\nYou finish the module with a one-sentence transformation statement and test it on one real person. That sentence becomes the spine of every module, sales page and post that follows.',
        session_flow: 'Open with your origin story and why this work matters to you. Map where clients start and where they end up, in their words. Draft the one-sentence transformation statement together. Close by having each person say it out loud and commit to testing it on one real person this week.',
        notes: 'Have two or three of your own client stories ready — people freeze when asked for their transformation cold, and a concrete example thaws the room. Expect some to undersell themselves at first; reflect back the bigger change you heard.',
        participant_notes: 'Come with one real client story you can tell out loud.\nJot down where your clients start and where they end up.\nDon\'t polish it — the honest version is the useful one.\nBe ready to test your transformation statement on one real person this week.',
      },
      {
        title: 'Build the Core Method',
        outcome: 'You can walk a client through your method step by step.',
        detail:
          'Here you turn what you do instinctively into a method someone else can follow. You list every step you take a client through, in the order you actually do it — including the small judgment calls you make without thinking. That hidden knowledge is the value.\n\nThen you group the steps into 3 to 5 named stages. Naming matters: a named method feels ownable and repeatable, and it gives clients a map of where they are and what comes next.\n\nThe module ends with a live walkthrough. You take one real example — your own or a volunteer\'s — through the full method, narrating each stage. The learner leaves with your method written down, named, and tested once end to end.',
        session_flow: 'Open by revisiting the transformation statement from module one. Brain-dump every step of your process, then group and name the stages. Run the full method live on one real example, narrating as you go. Close by assigning one small action: use stage one with a real person before next session.',
        notes: 'The hardest part is that experts skip steps that feel obvious to them. Slow them down and ask "what do you check before you do that?" until the invisible steps surface.',
        participant_notes: 'Bring the transformation statement you wrote in module one.\nList every step you take a client through, even the obvious ones.\nHave a real example ready to run your method against.\nExpect to catch steps you do without thinking — write those down.',
      },
      {
        title: 'Make It Stick',
        outcome: 'You can keep clients moving without burning out.',
        detail:
          'The last module is about momentum — theirs and yours. You learn a simple review rhythm: wins first, then walls. Starting with wins is not fluff; it shows clients their own progress, which is what keeps them paying and referring.\n\nThen you practice coaching through a sticking point without taking it over. You ask, you reflect, you let them find the next step — that keeps you from carrying every client on your back, which is how helpers burn out.\n\nYou close by building your own sustainability plan: how many clients you take, when you review, and what you say no to. You leave with a program you can run next month and still enjoy next year.',
        session_flow: 'Open with a wins-and-walls review of the whole journey. Teach the review rhythm and why wins come first. Coach one real sticking point live, hands off. Close with each person writing their sustainability plan and their next commitment, said out loud.',
        notes: 'Keep the live coaching demo short and genuinely hands-off — the temptation is to solve it yourself, and the room learns more from watching you hold back.',
        participant_notes: 'Think about a recent win and a current wall before the session.\nBe ready to be coached on one real sticking point.\nDecide how many clients you can realistically hold at once.\nWrite down your next commitment and say it out loud.',
      },
  ];
  // Keep the local mock consistent with the requested count (repeat the samples
  // when more are asked for than we have canned) so the no-creds path also obeys it.
  const modules = moduleCount
    ? Array.from({ length: moduleCount }, (_, i) => baseModules[i % baseModules.length])
    : baseModules;
  const mockText = JSON.stringify({ title: 'Your Signature Program', modules });
  return { system, user, mockText };
}

// ── marketing-generate ────────────────────────────────────────────────────────
type SocialPlatform = 'facebook' | 'instagram' | 'x' | 'linkedin';

// Per-network voice + format guidance, so each post reads native to its platform.
const PLATFORM_GUIDE: Record<SocialPlatform, string> = {
  facebook: 'Facebook: warm, story-driven, community feel. 1-3 short paragraphs. 0-2 hashtags.',
  instagram: 'Instagram: personal and vivid, first line is a strong hook, tasteful emojis, line breaks. 3-5 hashtags.',
  x: 'X (Twitter): one punchy idea, under 280 characters, conversational. 1-2 hashtags.',
  linkedin: 'LinkedIn: professional and credible, lead with the value/insight, no hype. 3-4 hashtags.',
};

// Deterministic mock captions per platform (used when GCP creds are absent).
const MOCK_CAPTION: Record<SocialPlatform, (t: string) => string> = {
  facebook: (t) => `I finally built the thing I wish I'd had when I started: "${t}". It's for anyone who's been "meaning to" for too long. Doors are open — come build with me.`,
  instagram: (t) => `This took me years to figure out. You get it in weeks. ✨\n\n"${t}" is open now — clarity, a real method, and people in your corner.`,
  x: (t) => `You don't need it all figured out to begin. "${t}" walks you through it, step by step. It's open now.`,
  linkedin: (t) => `After years of doing this work, I've packaged what actually moves people forward into "${t}". If you've been sitting on your expertise, this is the structured path to sharing it.`,
};
const MOCK_TAGS: Record<SocialPlatform, string[]> = {
  facebook: ['#startnow'],
  instagram: ['#coaching', '#mindset', '#startnow'],
  x: ['#growth', '#startnow'],
  linkedin: ['#coaching', '#professionaldevelopment', '#expertise'],
};

interface ModuleBrief {
  title: string;
  outcome: string;
  session_flow?: string;
}

type MarketingPhase = 'launch' | 'ongoing' | 'evergreen';

// What each launch stage's content should emphasize.
const PHASE_GUIDE: Record<MarketingPhase, string> = {
  launch: 'Stage — JUST STARTING (announcement): doors are opening. Build anticipation, introduce the program and exactly who it\'s for, invite people in.',
  ongoing: 'Stage — ONGOING (the program is live): sustain momentum. Share a useful tip or insight from the program, social-proof angles, and gentle reminders it\'s still open.',
  evergreen: 'Stage — AFTER LAUNCH (evergreen): timeless promotion. Lead with the transformation and results, invite the next cohort or a waitlist, keep it compelling long after launch.',
};

export function marketingPrompt(
  programTitle: string,
  modules: ModuleBrief[],
  platforms: SocialPlatform[],
  includeEmail: boolean,
  phase: MarketingPhase,
  count: number,
) {
  const guides = platforms.map((p) => `- ${PLATFORM_GUIDE[p]}`).join('\n');
  const system = [
    'You write authentic, non-salesy marketing for everyday experts launching a program.',
    'Base every post on the SPECIFIC program below — its title and the concrete outcomes each module delivers. Reference the real transformation this program gives; never write generic, interchangeable copy.',
    PHASE_GUIDE[phase],
    'Return STRICT JSON only matching exactly:',
    '{"posts": [{"channel": "social" | "email", "platform": "facebook" | "instagram" | "x" | "linkedin" | null, "caption": string, "hashtags": [string]}]}',
    platforms.length
      ? `Write exactly ${count} DISTINCT posts for EACH of these platforms — vary the hook and angle across the ${count}, each tailored to the platform's style (set "platform" accordingly):\n${guides}`
      : 'Do not write any social posts.',
    includeEmail
      ? `Then write ${count} distinct emails (channel "email", platform null, hashtags []).`
      : 'Do not write any email post.',
    'Every social post has channel "social" and its "platform" set. Hashtags include the leading #. Captions are real and in the expert\'s warm voice — never salesy.',
    VOICE,
  ].join('\n');
  const moduleLines = modules.length
    ? modules.map((m) => `- ${m.title} → ${m.outcome}`).join('\n')
    : '- (no modules provided)';
  const user =
    `Program title: "${programTitle}"\n` +
    `What this program actually delivers (module → the outcome the learner gets):\n${moduleLines}\n\n` +
    `Ground each post in these specific outcomes. Write ${count} per platform now.`;

  // Deterministic mock (no-creds path): `count` variations per target.
  const posts: Array<{ channel: string; platform: string | null; caption: string; hashtags: string[] }> = [];
  for (const p of platforms) {
    for (let i = 0; i < count; i++) {
      const prefix = count > 1 ? `(${i + 1}/${count}) ` : '';
      posts.push({ channel: 'social', platform: p, caption: prefix + MOCK_CAPTION[p](programTitle), hashtags: MOCK_TAGS[p] });
    }
  }
  if (includeEmail) {
    for (let i = 0; i < count; i++) {
      const prefix = count > 1 ? `(${i + 1}/${count}) ` : '';
      posts.push({ channel: 'email', platform: null, caption: `Subject: ${prefix}It's finally here\n\nI've been quietly building "${programTitle}" for you. Here's what's inside, and how to start. Reply if you have questions — I read every one.`, hashtags: [] });
    }
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

// Mock content for the in-memory backend. Warm, on-voice sample data so the demo
// looks populated and real.
import type { CircleGetResponse, Channel, Platform } from '@abundance/shared';

export const MOCK = {
  buildProgram(path: 'A' | 'B' | undefined) {
    const liveFlow = (a: string) => a;
    return {
      title: 'The Confident Consultant: from expert to in-demand',
      modules: [
        {
          title: 'Own Your Expertise',
          outcome: 'You can state, in one sentence, the transformation you create.',
          detail:
            'This opening module turns years of experience into one clear promise. You start by telling your origin story — the real one, not the polished version — and pull out the moments where you actually changed something for a client. Those moments hold the transformation you sell.\n\nFrom there you map the full client journey: where people are when they find you, what they struggle with in their own words, and where they end up after working with you. You write it in plain language until a stranger could repeat it back.\n\nYou finish with a one-sentence transformation statement and test it on one real person. That sentence becomes the spine of every module, sales page and post that follows.',
          session_flow: liveFlow('Share your origin story. Map the client journey start to finish. Draft the one-sentence transformation statement together. Name their first win before closing.'),
          notes: 'Keep two or three client stories ready — people freeze when asked for their transformation cold, and a concrete example thaws the room.',
          participant_notes: 'Come with one real client story you can tell out loud.\nJot down where your clients start and where they end up.\nDon\'t polish it — the honest version is the useful one.\nBe ready to test your transformation statement on one real person this week.',
        },
        {
          title: 'Package the Method',
          outcome: 'You can walk any client through your signature method.',
          detail:
            'Here you turn what you do instinctively into a method someone else can follow. You list every step you take a client through, in the order you actually do it — including the small judgment calls you make without thinking. That hidden knowledge is the value.\n\nThen you group the steps into three to five named stages. A named method feels ownable and repeatable, and it gives clients a map of where they are and what comes next.\n\nThe module ends with a live walkthrough: one real case taken through the full method, narrated stage by stage. You leave with your method written down, named, and tested once end to end.',
          session_flow: 'Teach the framework. Run it live on a real case. Group and name the stages together. Assign a small, doable action for the week.',
          notes: 'Experts skip steps that feel obvious to them. Slow down and ask "what do you check before you do that?" until the invisible steps surface.',
          participant_notes: 'Bring the transformation statement from module one.\nList every step you take a client through, even the obvious ones.\nHave a real case ready to run your method against.\nNote the judgment calls you make without thinking — those are the gold.',
        },
        {
          title: 'Show Up & Be Seen',
          outcome: 'You can talk about your work without shrinking.',
          detail:
            'Being good in private is not enough — this module gets you comfortable being visible. You take the transformation statement from module one and turn it into a short, natural way of talking about your work that does not feel like a pitch.\n\nYou practice out loud, because confidence lives in reps, not in wordsmithing. You rehearse the awkward questions too — "what do you charge?", "why you?" — until they stop being scary.\n\nThe module closes with one real act of visibility: a post, a short lesson, a message to your list. Done together, so the first time is never alone.',
          session_flow: path === 'B'
            ? 'Record a short lesson on your method. Practice your message until it sounds like you. Rehearse the awkward questions. Publish one piece before moving on.'
            : 'Practice your message out loud with the group. Handle the awkward questions in pairs. Post once, together, before the session ends.',
          notes: 'The first public post is the biggest wall for most learners — make it small, make it live in the room, and celebrate it out loud.',
          participant_notes: 'Draft a short, natural way to describe your work that isn\'t a pitch.\nPractice saying it out loud before the session — reps build confidence.\nThink through the awkward questions ("what do you charge?", "why you?").\nBe ready to publish one small piece by the end of the module.',
        },
        {
          title: 'Keep Them Moving',
          outcome: 'You can sustain client momentum without burning out.',
          detail:
            'The final module is about momentum — your clients\' and your own. You learn a simple review rhythm: wins first, then walls. Starting with wins shows clients their own progress, which is what keeps them engaged and referring.\n\nThen you practice coaching through a sticking point without taking it over: ask, reflect, and let them find the next step. That keeps you from carrying every client on your back, which is how helpers burn out.\n\nYou close by writing your own sustainability plan — how many clients you take, when you review, what you say no to — so the program you built this month is one you still enjoy running next year.',
          session_flow: 'Review wins and walls. Teach the review rhythm and why wins come first. Coach one sticking point live, hands off. Set the next commitment out loud.',
          notes: 'Keep the live coaching demo genuinely hands-off — the room learns more from watching you hold back than from watching you solve it.',
          participant_notes: 'Think of a recent win and a current wall before you arrive.\nBe ready to be coached on one real sticking point.\nDecide how many clients you can realistically hold at once.\nWrite down your next commitment and say it out loud.',
        },
      ],
    };
  },

  posts(
    programTitle: string,
    platforms: Platform[],
    includeEmail: boolean,
    count: number,
  ): Array<{ channel: Channel; platform: Platform | null; caption: string; hashtags: string[] }> {
    const perPlatform: Record<Platform, { caption: string; hashtags: string[] }> = {
      facebook: { caption: `I finally built the thing I wish I'd had when I started: "${programTitle}". It's for anyone who's been "meaning to" for too long. Doors are open.`, hashtags: ['#startnow'] },
      instagram: { caption: `This took me years to figure out. You get it in weeks. ✨\n\n"${programTitle}" is open now.`, hashtags: ['#coaching', '#mindset', '#startnow'] },
      x: { caption: `You don't need it all figured out to begin. "${programTitle}" walks you through it, step by step. It's open now.`, hashtags: ['#growth', '#startnow'] },
      linkedin: { caption: `After years doing this work, I've packaged what actually moves people forward into "${programTitle}". If you've been sitting on your expertise, this is the structured path to sharing it.`, hashtags: ['#coaching', '#professionaldevelopment', '#expertise'] },
    };
    const label = (i: number) => (count > 1 ? `(${i + 1}/${count}) ` : '');
    const posts: Array<{ channel: Channel; platform: Platform | null; caption: string; hashtags: string[] }> = [];
    for (const p of platforms) {
      const c = perPlatform[p]!;
      for (let i = 0; i < count; i++) posts.push({ channel: 'social', platform: p, caption: label(i) + c.caption, hashtags: c.hashtags });
    }
    if (includeEmail) {
      for (let i = 0; i < count; i++) posts.push({ channel: 'email', platform: null, caption: `Subject: ${label(i)}It's finally here\n\nI've been quietly building "${programTitle}" for you. Here's what's inside, and how to start. Reply if you have questions — I read every one.`, hashtags: [] });
    }
    return posts;
  },

  reflection(wallKey: string, _category: string) {
    const map: Record<string, { prompt: string; reflection: string }> = {
      'who-am-i-to-teach': {
        prompt: 'Wondering "who am I to teach?"',
        reflection: 'That feeling is a sign you take this seriously — not a sign you should stop. You already know things that would change someone\'s week. You don\'t need to be the world\'s expert, just one step ahead of the person you\'re helping. Start there. You\'ve earned this.',
      },
      'charging-money': {
        prompt: "You're uncomfortable charging money for your help.",
        reflection: 'Charging is not taking — it makes your work sustainable so you can keep showing up. People who pay value the work more, not less. Pick a number that feels almost too easy, and raise it as your confidence grows. You\'ve earned this.',
      },
      'fear-of-being-seen': {
        prompt: "You're afraid of being seen.",
        reflection: 'Being seen feels risky because it matters to you. You don\'t have to be loud — just honest, to the few people who need what you know. Say one true thing today. The right people lean in. You\'ve earned this.',
      },
    };
    return map[wallKey] ?? {
      prompt: 'You\'re facing a moment of doubt.',
      reflection: 'Doubt shows up right before growth, not instead of it. You\'ve done harder things than this. Take the next small step and let momentum do the rest. You\'ve earned this.',
    };
  },

  // Deterministic, warm chat reply for the in-memory backend. Varies a little by
  // turn so a conversation doesn't feel like a stuck record.
  chatReply(userMessage: string, turnIndex: number): string {
    const replies = [
      "Thank you for trusting me with that. What feels heaviest about it right now?",
      "That makes complete sense — a lot of people feel exactly this at your stage. What would 'a good day' with this look like instead?",
      "You're being honest, and that's the brave part. What's one small thing you could try this week?",
      "I hear you. None of this means you're not ready — it means you care. What first drew you to this work?",
      "That's worth sitting with. Remember: you only need to be a step ahead of the person you're helping. Who is that person for you?",
    ];
    const base = replies[turnIndex % replies.length] ?? "I'm right here with you.";
    const snippet = userMessage.trim().slice(0, 60);
    return turnIndex === 0 && snippet
      ? `"${snippet}${userMessage.length > 60 ? '…' : ''}" — I'm really glad you said that out loud. ${base}`
      : base;
  },

  // Classify a transcript into one of the six walls (keyword heuristic) for the
  // mock reflect step.
  classifyWall(transcript: string): string {
    const t = transcript.toLowerCase();
    if (/charg|money|price|pay|worth|expensive/.test(t)) return 'charging-money';
    if (/seen|visible|post|put myself|judge|audience/.test(t)) return 'fear-of-being-seen';
    if (/tech|setup|tool|software|website|overwhelm/.test(t)) return 'tech-overwhelm';
    if (/consist|keep it up|habit|routine|burn out|tired/.test(t)) return 'staying-consistent';
    if (/ahead|behind|everyone|compare|comparison/.test(t)) return 'comparing-myself';
    return 'who-am-i-to-teach';
  },

  circle(): CircleGetResponse {
    const wa = 'https://chat.whatsapp.com/DemoCircleInvite';
    const meet = 'https://meet.google.com/circle-demo-xyz';
    return {
      match_status: 'matched',
      members: [
        { user_id: 'u0', name: 'You', category: 'professional', is_you: true },
        { user_id: 'u1', name: 'Maya', category: 'professional' },
        { user_id: 'u2', name: 'Tom', category: 'professional' },
      ],
      whatsapp_url: wa,
      meet_url: meet,
      meetups: [
        {
          id: 'm1',
          title: 'Peer Support Circle — drop in & share where you are',
          starts_at: new Date(Date.now() + 2 * 86400000).toISOString(),
          host_name: 'Laquelle',
          join_url: 'https://meet.google.com/circle-meetup-001',
        },
        {
          id: 'm2',
          title: 'Show & Tell — bring one thing you made this week',
          starts_at: new Date(Date.now() + 6 * 86400000).toISOString(),
          host_name: 'Laquelle',
          join_url: 'https://meet.google.com/circle-meetup-002',
        },
      ],
      next_talk: {
        id: 't1',
        title: 'Finding Your Voice: teaching when you feel unready',
        starts_at: new Date(Date.now() + 4 * 86400000).toISOString(),
        join_url: 'https://meet.google.com/abc-defg-hij',
        recording_url: null,
      },
    };
  },
};

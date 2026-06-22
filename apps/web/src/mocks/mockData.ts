// Mock content for the in-memory backend. Warm, on-voice sample data so the demo
// looks populated and real.
import type { CircleGetResponse, Channel } from '@abundance/shared';

export const MOCK = {
  buildProgram(path: 'A' | 'B' | undefined) {
    const liveFlow = (a: string) => a;
    return {
      title: 'The Confident Consultant: from expert to in-demand',
      modules: [
        { title: 'Own Your Expertise', outcome: 'You can state, in one sentence, the transformation you create.', session_flow: liveFlow('Share your origin story. Map the client journey start to finish. Name their first win together.') },
        { title: 'Package the Method', outcome: 'You can walk any client through your signature method.', session_flow: 'Teach the framework. Run it live on a real case. Assign a small, doable action.' },
        { title: 'Show Up & Be Seen', outcome: 'You can talk about your work without shrinking.', session_flow: path === 'B' ? 'Record a short lesson. Practice your message. Publish one piece.' : 'Practice your message out loud. Handle the awkward questions. Post once, together.' },
        { title: 'Keep Them Moving', outcome: 'You can sustain client momentum without burning out.', session_flow: 'Review wins and walls. Coach one sticking point. Set the next commitment.' },
      ],
    };
  },

  posts(programTitle: string, includeEmail: boolean): Array<{ channel: Channel; caption: string; hashtags: string[] }> {
    const posts: Array<{ channel: Channel; caption: string; hashtags: string[] }> = [
      { channel: 'social', caption: `I built the program I wish I'd had when I started: "${programTitle}". It's open now.`, hashtags: ['#yourtime', '#coaching', '#startnow'] },
      { channel: 'social', caption: `You don't need it all figured out to begin. I'll walk you through it, step by step.`, hashtags: ['#growth', '#mindset'] },
      { channel: 'social', caption: `Clarity, a real method, and people in your corner. That's the whole offer. That's the work.`, hashtags: ['#community', '#learn'] },
    ];
    if (includeEmail) {
      posts.push({ channel: 'email', caption: `Subject: It's finally here\n\nI've been quietly building "${programTitle}" for you. Here's what's inside, and how to start. Reply if you have questions — I read every one.`, hashtags: [] });
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
        { circle_id: 'c1', user_id: 'u0', name: 'You', category: 'professional', level: 'growing', fear_pattern: 'pricing', whatsapp_url: wa, meet_url: meet },
        { circle_id: 'c1', user_id: 'u1', name: 'Maya', category: 'healer', level: 'starting', fear_pattern: 'visibility', whatsapp_url: wa, meet_url: meet },
        { circle_id: 'c1', user_id: 'u2', name: 'Tom', category: 'professional', level: 'stalled', fear_pattern: 'consistency', whatsapp_url: wa, meet_url: meet },
      ],
      whatsapp_url: wa,
      meet_url: meet,
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

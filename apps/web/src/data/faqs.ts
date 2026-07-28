// Shared source of truth for the Frequently Asked Questions. Rendered both in
// the in-app Guidance page (HelpPage) and on the public /faq page (FaqPage).

export type Faq = { q: string; a: string };

export const FAQS: Faq[] = [
  {
    q: 'How many mentoring sessions should I create?',
    a: 'You can create anywhere from one to six sessions. If you are not sure, let AbundanceAI recommend the right number based on the ideas and materials you share. You can always adjust the number afterward.',
  },
  {
    q: 'How long should each session be?',
    a: 'Most online group mentoring sessions work well at 75–90 minutes. You might spend 20–40 minutes sharing your knowledge, approach, or framework, then use the remaining time for discussion, exercises, individual guidance, and Q&A.',
  },
  {
    q: 'What can I share as source material?',
    a: 'You can speak your ideas aloud, type or paste text directly into AbundanceAI, or upload your notes and materials as PDF, text (.txt), or image files. If something is in Word or PowerPoint, save it as a PDF first and upload that. You can also include useful content you have created with another AI. You do not need to organize everything first. AbundanceAI will help structure it for you.',
  },
  {
    q: 'Can I edit what AbundanceAI builds?',
    a: 'Yes. You can review and edit every part of your program or create a new version. Your previous builds remain available, so you can compare versions and combine the sections and wording you like best.',
  },
  {
    q: 'What is a build?',
    a: 'A build is a new AI-generated version of your mentoring program. Each time you create a build, AbundanceAI uses your latest ideas, materials, and edits to generate the content for your sessions.',
  },
  {
    q: 'How many builds can I create?',
    a: 'You can create up to eight builds. Your previous versions stay available, allowing you to compare them and combine your favorite ideas, sections, and wording.',
  },
  {
    q: 'How much can I share by voice?',
    a: 'Each voice recording can be up to 10 minutes, with up to 60 minutes of voice input altogether. You can also combine voice recordings with typed text and uploaded materials.',
  },
  {
    q: 'What marketing content will AbundanceAI create for me?',
    a: 'After each program build, AbundanceAI creates email copy and several examples tailored to each social platform where you have a presence, including Facebook, LinkedIn, Instagram, and X.\n\nYou can create up to eight rounds of marketing content each month, and every round stays saved, giving you a rich library of posts and messages to personalize, combine, and post through your own social media accounts over time to promote your program.',
  },
  {
    q: 'What is my Program Page?',
    a: 'Your Program Page is the customizable page people visit to learn about your program, review the sessions, learn about you, and enroll. You can personalize the wording, colors, pricing, and other details before sharing it.',
  },
  {
    q: 'How do I get paid by participants?',
    a: 'Connect your own Stripe account or follow the steps we provide to create one. Participant payments go directly through Stripe to your connected bank account or debit card. AbundanceAI never holds your money or takes a percentage of your program sales.',
  },
  {
    q: 'What is mindset coaching?',
    a: 'Mindset coaching helps you move through the doubts, fears, and uncertainty that can arise while creating and launching your program. It is available 24/7 whenever you need encouragement, clarity, a fresh perspective, or help deciding what to do next.',
  },
  {
    q: 'What are peer support teams?',
    a: 'Peer support teams are small groups of AbundanceAI members who encourage one another as they create and launch their programs. Members can share ideas, ask for feedback, stay accountable, celebrate progress, and learn from one another. Joining a peer support team is not required.',
  },
];

import type { JourneyStep } from './schemas/entities.js';
import type { Path, JourneyState } from './schemas/index.js';

/**
 * The next-best-step engine (spec §7.4). A pure function driving the Home hero
 * card and the progress trail — the single source of truth for journey position.
 * Path branching (§7.4): path 'A' includes Live Sessions; 'B' swaps it for
 * recording guidance, so step order is COMPUTED, never hard-coded per screen.
 */

export interface StepMeta {
  step: JourneyStep;
  label: string; // Home hero CTA copy
  route: string;
  trailLabel: string; // compact label for the progress trail
}

const ROUTE: Record<JourneyStep, string> = {
  path: '/app/onboarding/path',
  content: '/app/onboarding/content',
  building: '/app/onboarding/building',
  program: '/app/program',
  marketing: '/app/onboarding/marketing',
  sessions: '/app/onboarding/sessions',
  payments: '/app/onboarding/payments',
};

const META: Record<JourneyStep, Omit<StepMeta, 'step' | 'route'>> = {
  path: { label: "Let's turn your expertise into a program", trailLabel: 'Path' },
  content: { label: 'Enter the Experience Lab', trailLabel: 'Content' },
  building: { label: 'Building your program', trailLabel: 'Build' },
  program: { label: 'See your program', trailLabel: 'Program' },
  marketing: { label: 'Get your marketing kit', trailLabel: 'Marketing' },
  sessions: { label: 'Set up your live sessions', trailLabel: 'Sessions' },
  payments: { label: 'Get ready to get paid', trailLabel: 'Get paid' },
};

/** Ordered, actionable milestones for a path. 'building' is transient (auto-advances), excluded from the trail. */
export function stepOrder(path: Path | null): JourneyStep[] {
  const base: JourneyStep[] = ['path', 'content', 'program', 'marketing'];
  // Type A adds Live Sessions before Get Paid; Type B skips it (recording guidance instead).
  const tail: JourneyStep[] = path === 'A' ? ['sessions', 'payments'] : ['payments'];
  return [...base, ...tail];
}

export function trail(path: Path | null): StepMeta[] {
  return stepOrder(path).map((step) => ({ step, route: ROUTE[step], ...META[step] }));
}

export function stepMeta(step: JourneyStep): StepMeta {
  return { step, route: ROUTE[step], ...META[step] };
}

export interface NextStep extends StepMeta {
  done: boolean; // true when the whole journey is complete
}

/**
 * getNextStep(journeyState) → the single next milestone to surface on Home.
 * Returns the first incomplete step in the (path-aware) order. When everything
 * is complete, returns the Program step flagged done:true for a "you're all set" card.
 */
export function getNextStep(state: Pick<JourneyState, 'path' | 'completed_steps'>): NextStep {
  const order = stepOrder(state.path);
  const completed = new Set(state.completed_steps ?? []);

  // No path chosen yet → the very first warm CTA (mirrors empty-state copy on Home/Program).
  if (!state.path) {
    return { ...stepMeta('path'), done: false };
  }

  for (const step of order) {
    if (!completed.has(step)) {
      return { ...stepMeta(step), done: false };
    }
  }
  return { ...stepMeta('program'), done: true };
}

/** Whether a given step has been completed. */
export function isStepComplete(state: Pick<JourneyState, 'completed_steps'>, step: JourneyStep): boolean {
  return (state.completed_steps ?? []).includes(step);
}

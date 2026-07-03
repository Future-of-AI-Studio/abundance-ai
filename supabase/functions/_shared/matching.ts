// Circle matching — the swappable rule engine (spec A3), Deno mirror.
//
// This is the server-side twin of packages/shared/src/matching.ts (Edge Functions
// run on Deno and keep their own copy of shared contracts, as _shared/contract.ts
// already does). The *interface* is the point: the MVP CategoryRuleMatcher groups
// creators of the SAME category into circles of 3–5, deterministically. A Phase
// 2/3 ML matcher is a different MatchingService implementation that drops in
// behind this same interface — the circle-get handler never changes; it only ever
// touches `defaultMatcher`.

// `category` is treated as an opaque grouping key here (validated as a category
// enum at the DB/schema boundary), so this module needs no enum dependency.
export interface Creator {
  user_id: string;
  name: string;
  category: string;
}

export interface RecommendedCircle {
  category: string;
  members: Creator[];
}

export interface MatchingService {
  proposeCircles(unmatched: readonly Creator[]): RecommendedCircle[];
}

export interface CategoryRuleOptions {
  min: number;
  max: number;
}

export const DEFAULT_RULE_OPTIONS: CategoryRuleOptions = { min: 3, max: 5 };

export class CategoryRuleMatcher implements MatchingService {
  constructor(private readonly opts: CategoryRuleOptions = DEFAULT_RULE_OPTIONS) {}

  proposeCircles(unmatched: readonly Creator[]): RecommendedCircle[] {
    const { min, max } = this.opts;

    const byCategory = new Map<string, Creator[]>();
    for (const creator of unmatched) {
      const bucket = byCategory.get(creator.category) ?? [];
      bucket.push(creator);
      byCategory.set(creator.category, bucket);
    }

    const circles: RecommendedCircle[] = [];
    for (const category of [...byCategory.keys()].sort()) {
      const members = byCategory
        .get(category)!
        .slice()
        .sort((a, b) => (a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : 0));
      if (members.length < min) continue;

      const groupCount = Math.ceil(members.length / max);
      const base = Math.floor(members.length / groupCount);
      let remainder = members.length % groupCount;
      let cursor = 0;
      for (let g = 0; g < groupCount; g++) {
        const size = base + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
        const group = members.slice(cursor, cursor + size);
        cursor += size;
        if (group.length >= min) circles.push({ category, members: group });
      }
    }
    return circles;
  }
}

// The single swap point — reassign to port matching to a new implementation.
export const defaultMatcher: MatchingService = new CategoryRuleMatcher();

export function circleFor(
  userId: string,
  unmatched: readonly Creator[],
  matcher: MatchingService = defaultMatcher,
): RecommendedCircle | null {
  for (const circle of matcher.proposeCircles(unmatched)) {
    if (circle.members.some((m) => m.user_id === userId)) return circle;
  }
  return null;
}

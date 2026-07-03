import type { Category } from './schemas/enums.js';

/**
 * Circle matching — the swappable rule engine (spec A3).
 *
 * The MVP matcher is deterministic and rule-based: it groups creators of the
 * SAME category into circles of 3–5. That is ALL it does. The Phase 2/3 "smart"
 * matcher (fear-pattern fit, complementary-client potential, geography/language
 * scoring) is a DIFFERENT `MatchingService` implementation that drops in behind
 * this same interface — callers, the data model, and the UI never change.
 *
 * To port to the ML engine: implement `MatchingService`, then swap the single
 * `defaultMatcher` binding at the bottom of this file. Nothing else moves. This
 * is what lets matching "port cleanly … without a rebuild".
 */

/**
 * The minimal creator shape the matcher reasons about. New signals (level,
 * fear_pattern, geography, language) are added here as OPTIONAL fields so a
 * smarter matcher can read them without breaking the rule-based one — and so
 * callers that only know a creator's category keep compiling.
 */
export interface Creator {
  user_id: string;
  name: string;
  category: Category;
}

/** A proposed (not-yet-confirmed) circle — a category-homogeneous group of 3–5. */
export interface RecommendedCircle {
  category: Category;
  members: Creator[];
}

/** The seam. Every matcher — rule-based today, ML tomorrow — implements this. */
export interface MatchingService {
  /**
   * Partition a pool of unmatched creators into proposed circles. Creators who
   * cannot be placed (too few peers) are simply left out of the result.
   */
  proposeCircles(unmatched: readonly Creator[]): RecommendedCircle[];
}

export interface CategoryRuleOptions {
  /** Minimum members for a viable circle (fewer → no circle proposed). */
  min: number;
  /** Maximum members per circle (larger cohorts are split into balanced groups). */
  max: number;
}

export const DEFAULT_RULE_OPTIONS: CategoryRuleOptions = { min: 3, max: 5 };

/**
 * MVP matcher: same category, 3–5 members per circle. Deterministic — the same
 * pool always yields the same circles (stable ordering by user_id), so a given
 * user sees a consistent recommendation across requests.
 */
export class CategoryRuleMatcher implements MatchingService {
  constructor(private readonly opts: CategoryRuleOptions = DEFAULT_RULE_OPTIONS) {}

  proposeCircles(unmatched: readonly Creator[]): RecommendedCircle[] {
    const { min, max } = this.opts;

    // Bucket by category.
    const byCategory = new Map<Category, Creator[]>();
    for (const creator of unmatched) {
      const bucket = byCategory.get(creator.category) ?? [];
      bucket.push(creator);
      byCategory.set(creator.category, bucket);
    }

    const circles: RecommendedCircle[] = [];
    // Deterministic category + member ordering so the output is stable.
    for (const category of [...byCategory.keys()].sort()) {
      const members = byCategory
        .get(category)!
        .slice()
        .sort((a, b) => (a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : 0));
      if (members.length < min) continue; // too few peers → propose nothing

      // Split into the fewest possible groups, sized as evenly as we can so
      // every group lands within [min, max] (e.g. 7 → 4+3, never 5+2).
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

/**
 * The single swap point. Callers depend on the `MatchingService` type, never on
 * the concrete class — reassign this to a new implementation to port matching.
 */
export const defaultMatcher: MatchingService = new CategoryRuleMatcher();

/**
 * Convenience for the per-user view: the proposed circle that contains `userId`,
 * or null when the matcher can't place them (too few same-category peers).
 */
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

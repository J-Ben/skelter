import type { Adaptive, AdaptiveRule, SkeletonAnimation, SkeletonConditions } from './types';

/**
 * Returns true when every key in a rule's `when` holds against the given
 * conditions (AND semantics within a rule).
 *
 * Operators:
 * - `batteryBelow` / `batteryAbove` : numeric thresholds on `conditions.battery`
 *   (only match when battery is a known number).
 * - any other key: array → membership, otherwise → strict equality against the
 *   matching condition field (covers network, saveData, deviceTier, custom…).
 */
function ruleMatches(when: AdaptiveRule['when'], conditions: SkeletonConditions): boolean {
  for (const key of Object.keys(when)) {
    const expected = when[key];
    if (expected === undefined) continue;

    if (key === 'batteryBelow') {
      if (!(typeof conditions.battery === 'number' && conditions.battery < (expected as number))) return false;
      continue;
    }
    if (key === 'batteryAbove') {
      if (!(typeof conditions.battery === 'number' && conditions.battery > (expected as number))) return false;
      continue;
    }

    const actual = conditions[key];
    if (Array.isArray(expected)) {
      if (!(expected as unknown[]).includes(actual)) return false;
    } else if (actual !== expected) {
      return false;
    }
  }
  return true;
}

/**
 * Resolves the effective animation from an adaptive policy.
 *
 * Skelter detects nothing itself: the consumer feeds `conditions` (from their
 * own NetInfo / navigator.connection / battery source) and an `adaptive` policy.
 *
 * - `adaptive` is a function → called with conditions; its result (if any) wins,
 *   otherwise the base animation.
 * - `adaptive` is a rule matrix → the first rule whose `when` matches wins;
 *   if none match, the base animation.
 *
 * Pure, dependency-free. Reduced-motion accessibility is handled separately at
 * render time and always takes precedence over the result of this function.
 *
 * @param base       - The configured (non-adaptive) animation
 * @param conditions - Consumer-provided live signals
 * @param adaptive   - Consumer-provided policy (matrix or function)
 * @returns The animation to use
 */
export function resolveAnimation(
  base: SkeletonAnimation,
  conditions: SkeletonConditions | undefined,
  adaptive: Adaptive | undefined,
): SkeletonAnimation {
  if (!adaptive) return base;

  if (typeof adaptive === 'function') {
    return adaptive(conditions ?? {}) ?? base;
  }

  if (!conditions) return base;
  for (const rule of adaptive) {
    if (rule && ruleMatches(rule.when, conditions)) return rule.use;
  }
  return base;
}

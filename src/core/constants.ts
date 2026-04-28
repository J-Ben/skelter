import type { AnimationSpeed, SkeletonConfig } from './types';

/**
 * Default configuration applied when no SkeletonTheme provider
 * is present and no skeletonConfig prop is passed.
 *
 * Acts as the lowest priority in the config resolution chain:
 * skeletonConfig prop > SkeletonTheme > DEFAULT_SKELETON_CONFIG
 */
export const DEFAULT_SKELETON_CONFIG: Required<SkeletonConfig> = {
  animation: 'pulse',
  color: '#E0E0E0',
  highlightColor: '#F5F5F5',
  speed: 'normal',
  borderRadius: 4,
  direction: 'ltr',
  minDuration: 0,
  disabled: false,
  shatterConfig: {
    gridSize: 6,
    stagger: 80,
    fadeStyle: 'random',
  },
  imageConfig: {
    aspectRatio: 1,
  },
  /** 0 = unlimited */
  maxBonesInList: 0,
};

/**
 * Resolves an AnimationSpeed value to a numeric multiplier.
 *
 *   'slow'   → 0.5  (half speed)
 *   'normal' → 1.0  (default)
 *   'rapid'  → 2.0  (twice as fast)
 *   number   → used as-is (1.0 = normal, 2.0 = rapid, 0.5 = slow)
 *
 * The multiplier divides the base duration of each animation:
 *   effectiveDuration = baseDuration / resolveSpeed(speed)
 */
export function resolveSpeed(speed: AnimationSpeed): number {
  if (speed === 'slow') return 0.5;
  if (speed === 'normal') return 1.0;
  if (speed === 'rapid') return 2.0;
  return speed;
}

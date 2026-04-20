import type { SkeletonConfig } from './types';

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
  speed: 1.0,
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
import { createContext } from 'react';
import type { SkeletonConfig } from '../core/types';
import { DEFAULT_SKELETON_CONFIG } from '../core/constants';

/**
 * Value stored in the SkeletonContext.
 */
export interface SkeletonContextValue {
  /** Merged skeleton configuration from SkeletonTheme props */
  config: SkeletonConfig;
  /** Whether auto mode is enabled — injects hasSkeleton on all children */
  auto: boolean;
  /** List of component displayNames excluded from auto mode */
  exclude: string[];
}

/**
 * Context that provides skeleton theme configuration to all descendants.
 * Usable without a Provider — defaults are applied automatically.
 */
export const SkeletonContext = createContext<SkeletonContextValue>({
  config: DEFAULT_SKELETON_CONFIG,
  auto: false,
  exclude: [],
});
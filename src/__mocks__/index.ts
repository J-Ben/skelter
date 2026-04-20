/**
 * Skelter Jest mock.
 *
 * Disables all skeleton behavior in tests so components
 * render normally without layout capture or animation overhead.
 *
 * Usage in jest.config.ts :
 * moduleNameMapper: {
 *   '^skelter$': '<rootDir>/src/__mocks__/index.ts'
 * }
 *
 * Or in setupTests.ts :
 * jest.mock('skelter');
 */

import React, { ComponentType } from 'react';
import { DEFAULT_SKELETON_CONFIG } from '../core/constants';
import type { SkeletonConfig } from '../core/types';

/**
 * Mock withSkeleton — returns the component unchanged.
 * No layout capture, no animation, no overhead in tests.
 */
export function withSkeleton<P extends object>(
  Component: ComponentType<P>
): ComponentType<P & {
  hasSkeleton?: boolean;
  isLoading?: boolean;
  isLoadingSkeleton?: boolean;
  skeletonConfig?: SkeletonConfig;
}> {
  return Component as ComponentType<P & {
    hasSkeleton?: boolean;
    isLoading?: boolean;
    isLoadingSkeleton?: boolean;
    skeletonConfig?: SkeletonConfig;
  }>;
}

/**
 * Mock SkeletonTheme — renders children directly.
 * No context, no injection, no side effects in tests.
 */
export function SkeletonTheme({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return React.createElement(React.Fragment, null, children);
}

/**
 * Mock useSkeleton — returns stable, predictable values.
 * isSkeletonVisible is always false — components render normally in tests.
 * bones is always empty — no skeleton rendered.
 */
export function useSkeleton() {
  return {
    mergedConfig: DEFAULT_SKELETON_CONFIG,
    isSkeletonVisible: false,
    bones: [],
  };
}
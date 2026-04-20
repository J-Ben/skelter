/**
 * React Native entry point for Skelter.
 *
 * This file is resolved automatically by React Native bundlers
 * via the "react-native" field in package.json exports.
 *
 * Exports the React Native bindings and native adapters
 * instead of the web bindings.
 *
 * The dev always imports from 'skelter' — never from this file directly.
 * @example
 * import { withSkeleton, SkeletonTheme } from 'skelter'
 */

export { withSkeleton } from '../bindings/reactNative/withSkeleton';
export { useSkeleton } from '../bindings/reactNative/useSkeleton';
export { SkeletonTheme } from '../context/SkeletonTheme';
export { SkeletonContext } from '../context/SkeletonContext';

export type { SkeletonProps } from '../bindings/reactNative/withSkeleton';
export type { UseSkeletonArgs, UseSkeletonResult } from '../bindings/reactNative/useSkeleton';
export type { SkeletonThemeProps } from '../context/SkeletonTheme';
export type { SkeletonContextValue } from '../context/SkeletonContext';
export type {
  SkeletonConfig,
  SkeletonAnimation,
  ShatterConfig,
  ShatterFadeStyle,
  Bone,
  BoneTree,
  ElementType,
  MeasuredLayout,
} from '../core/types';
export { DEFAULT_SKELETON_CONFIG } from '../core/constants';
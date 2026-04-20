import { useState, useEffect, useRef, useContext } from 'react';
import { generateBones } from '../../core/generateBones';
import { DEFAULT_SKELETON_CONFIG } from '../../core/constants';
import type { Bone, SkeletonConfig, BoneTree } from '../../core/types';
import { SkeletonContext } from '../../context/SkeletonContext';

/**
 * Arguments passed to useSkeleton.
 */
export interface UseSkeletonArgs {
  /** Whether the skeleton feature is active on this component */
  hasSkeleton: boolean;
  /** Whether the component is currently loading */
  isLoading: boolean;
  /** Local config — highest priority in the merge chain */
  config?: SkeletonConfig;
  /** The measured component tree */
  boneTree: BoneTree | null;
}

/**
 * Result returned by useSkeleton.
 */
export interface UseSkeletonResult {
  /** Merged configuration — local > theme > defaults */
  mergedConfig: Required<SkeletonConfig>;
  /** Whether the skeleton should be visible right now */
  isSkeletonVisible: boolean;
  /** Flat array of bones ready for rendering */
  bones: Bone[];
}

/**
 * Core hook for skeleton state management.
 *
 * Handles:
 * - Config merging: local config > SkeletonTheme > DEFAULT_SKELETON_CONFIG
 * - minDuration: keeps skeleton visible for at least N ms
 * - disabled: never show skeleton if true
 * - Cache awareness: if isLoading is false on first render,
 *   data was already present (React Query cache, Redux, MMKV, etc.)
 *   — skeleton is never shown to avoid a flash
 *
 * @param args - Skeleton state arguments
 * @returns Merged config, visibility state, and bones array
 */
export function useSkeleton({
  hasSkeleton,
  isLoading,
  config,
  boneTree,
}: UseSkeletonArgs): UseSkeletonResult {
  const themeConfig = useContext(SkeletonContext);

  // Merge: local > theme > defaults
  const mergedConfig: Required<SkeletonConfig> = {
    ...DEFAULT_SKELETON_CONFIG,
    ...themeConfig.config,
    ...config,
    shatterConfig: {
      ...DEFAULT_SKELETON_CONFIG.shatterConfig,
      ...themeConfig.config?.shatterConfig,
      ...config?.shatterConfig,
    },
    imageConfig: {
      ...DEFAULT_SKELETON_CONFIG.imageConfig,
      ...themeConfig.config?.imageConfig,
      ...config?.imageConfig,
    },
  };

  /**
   * Cache awareness — tracks whether isLoading was true on first render.
   *
   * If isLoading is false on mount, data was already available
   * (e.g. from React Query cache, Redux, MMKV, etc.).
   * In that case we never show the skeleton — no flash, no layout shift.
   *
   * If isLoading is true on mount, we show the skeleton normally
   * and hide it when isLoading transitions to false.
   */
  const wasLoadingOnMountRef = useRef<boolean | null>(null);
  if (wasLoadingOnMountRef.current === null) {
    wasLoadingOnMountRef.current = isLoading;
  }

  const [isSkeletonVisible, setIsSkeletonVisible] = useState<boolean>(() => {
    if (!hasSkeleton) return false;
    if (mergedConfig.disabled) return false;
    // Cache aware — data was already present on mount, never flash skeleton
    if (!wasLoadingOnMountRef.current) return false;
    return isLoading;
  });

  const minDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hasSkeleton || mergedConfig.disabled) {
      setIsSkeletonVisible(false);
      return;
    }

    // Cache aware — if data was present on mount, never show skeleton
    if (!wasLoadingOnMountRef.current) {
      setIsSkeletonVisible(false);
      return;
    }

    if (isLoading) {
      loadingStartTimeRef.current = Date.now();
      setIsSkeletonVisible(true);
    } else {
      const elapsed = loadingStartTimeRef.current
        ? Date.now() - loadingStartTimeRef.current
        : 0;
      const remaining = mergedConfig.minDuration - elapsed;

      if (remaining > 0) {
        // Keep skeleton visible for remaining minDuration ms
        // Prevents jarring flash when loading is very fast
        minDurationTimerRef.current = setTimeout(() => {
          setIsSkeletonVisible(false);
        }, remaining);
      } else {
        setIsSkeletonVisible(false);
      }
    }

    return () => {
      if (minDurationTimerRef.current) {
        clearTimeout(minDurationTimerRef.current);
      }
    };
  }, [isLoading, hasSkeleton, mergedConfig.disabled, mergedConfig.minDuration]);

  const bones: Bone[] = boneTree && isSkeletonVisible
    ? generateBones(boneTree)
    : [];

  return { mergedConfig, isSkeletonVisible, bones };
}
import { useState, useEffect, useRef, useContext } from 'react';
import { generateBones } from '../../core/generateBones';
import { DEFAULT_SKELETON_CONFIG } from '../../core/constants';
import type { Bone, SkeletonConfig, BoneTree } from '../../core/types';
import { SkeletonContext } from '../../context/SkeletonContext';

/**
 * Arguments passed to useSkeleton (web).
 */
export interface UseSkeletonArgs {
  /** Whether the skeleton feature is active */
  hasSkeleton: boolean;
  /** Whether the component is currently loading */
  isLoading: boolean;
  /** Local config — highest priority */
  config?: SkeletonConfig;
  /** The measured component tree */
  boneTree: BoneTree | null;
}

/**
 * Result returned by useSkeleton (web).
 */
export interface UseSkeletonResult {
  /** Merged configuration */
  mergedConfig: Required<SkeletonConfig>;
  /** Whether the skeleton should be visible */
  isSkeletonVisible: boolean;
  /** Flat array of bones ready for rendering */
  bones: Bone[];
}

/**
 * Core hook for web skeleton state management.
 *
 * Identical behavior to the React Native version:
 * - Config merging: local > SkeletonTheme > defaults
 * - minDuration support
 * - Cache awareness — no flash when data already present
 * - disabled support
 *
 * Zero React Native dependencies.
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
   * Cache awareness — if isLoading is false on mount,
   * data was already available. Never flash the skeleton.
   */
  const wasLoadingOnMountRef = useRef<boolean | null>(null);
  if (wasLoadingOnMountRef.current === null) {
    wasLoadingOnMountRef.current = isLoading;
  }

  const [isSkeletonVisible, setIsSkeletonVisible] = useState<boolean>(() => {
    if (!hasSkeleton) return false;
    if (mergedConfig.disabled) return false;
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
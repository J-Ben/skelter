import { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { generateBones } from '../../core/generateBones';
import { DEFAULT_SKELETON_CONFIG } from '../../core/constants';
import { resolveAnimation } from '../../core/adaptive';
import type { Bone, SkeletonConfig, BoneTree } from '../../core/types';
import { SkeletonContext } from '../../context/SkeletonContext';

export interface UseSkeletonArgs {
  hasSkeleton: boolean;
  isLoading: boolean;
  config?: SkeletonConfig;
  boneTree: BoneTree | null;
}

export interface UseSkeletonResult {
  mergedConfig: Required<SkeletonConfig>;
  isSkeletonVisible: boolean;
  bones: Bone[];
}

/**
 * Core hook for skeleton state management.
 *
 * Config merging: local config > SkeletonTheme > DEFAULT_SKELETON_CONFIG
 * minDuration: keeps skeleton visible for at least N ms
 * disabled: never show skeleton if true
 *
 * Cache awareness (fixed in 0.2.1):
 * If isLoading is false on mount AND never transitions to true, the component
 * had data in cache : no skeleton flash. But if isLoading later becomes true
 * (user triggers a reload), the skeleton DOES show. This fixes the one-shot
 * bug where a key-remount with isLoading=false permanently suppressed the skeleton.
 */
export function useSkeleton({
  hasSkeleton,
  isLoading,
  config,
  boneTree,
}: UseSkeletonArgs): UseSkeletonResult {
  const themeConfig = useContext(SkeletonContext);

  const mergedConfig = useMemo((): Required<SkeletonConfig> => {
    const merged: Required<SkeletonConfig> = {
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
      // conditions deep-merge across levels; adaptive policy = most specific wins
      conditions: {
        ...DEFAULT_SKELETON_CONFIG.conditions,
        ...themeConfig.config?.conditions,
        ...config?.conditions,
      },
      adaptive: config?.adaptive ?? themeConfig.config?.adaptive ?? DEFAULT_SKELETON_CONFIG.adaptive,
    };
    // Resolve the adaptive policy into the effective animation.
    merged.animation = resolveAnimation(merged.animation, merged.conditions, merged.adaptive);
    return merged;
  }, [themeConfig.config, config]);

  /**
   * everSeenLoading : true once isLoading has been true at least once.
   *
   * Cache awareness logic:
   * - Mount with isLoading=false → everSeenLoading stays false →
   *   skeleton suppressed (data was in cache, avoid flash). ✓
   * - Mount with isLoading=true  → everSeenLoading becomes true →
   *   skeleton shows normally. ✓
   * - Mount with isLoading=false, then isLoading=true later (user reload) →
   *   everSeenLoading becomes true → skeleton shows. ✓ (bug fixed vs 0.2.0)
   */
  const everSeenLoadingRef = useRef(false);

  // Show skeleton immediately if loading on first render
  const [isSkeletonVisible, setIsSkeletonVisible] = useState<boolean>(() => {
    if (!hasSkeleton || mergedConfig.disabled) return false;
    if (isLoading) {
      everSeenLoadingRef.current = true;
      return true;
    }
    return false;
  });

  // Track previous isLoading so we can detect transitions during render.
  // When isLoading becomes true, update isSkeletonVisible in the same render
  // pass (before paint) to avoid a one-frame flash of placeholder content.
  // This uses the React-recommended "setState during render" pattern.
  const [prevIsLoading, setPrevIsLoading] = useState(isLoading);
  if (prevIsLoading !== isLoading) {
    setPrevIsLoading(isLoading);
    if (isLoading && hasSkeleton && !mergedConfig.disabled && !isSkeletonVisible) {
      everSeenLoadingRef.current = true;
      setIsSkeletonVisible(true);
    }
  }

  const minDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hasSkeleton || mergedConfig.disabled) {
      setIsSkeletonVisible(false);
      return;
    }

    if (isLoading) {
      everSeenLoadingRef.current = true;
      loadingStartTimeRef.current = Date.now();
      setIsSkeletonVisible(true);
    } else {
      if (!everSeenLoadingRef.current) {
        // isLoading has never been true : data was in cache, skip skeleton
        setIsSkeletonVisible(false);
        return;
      }

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

import React, { useEffect, useState, useMemo } from 'react';
import { Animated, AccessibilityInfo } from 'react-native';
import type { Bone, SkeletonConfig } from '../../core/types';
import { GradientShimmer } from './GradientShimmer';

export interface SkeletonBoneProps {
  bone: Bone;
  config: Required<SkeletonConfig>;
  /**
   * Shared Animated.Value driven by SkeletonRenderer (withSkeleton).
   * A single loop runs there — SkeletonBone only reads/interpolates this value.
   * ShatterBone manages its own values internally and does not use this prop.
   */
  animatedValue: Animated.Value;
}

/**
 * Renders a single skeleton placeholder bone. Pure renderer — no animation
 * lifecycle managed here. The shared animatedValue is driven by SkeletonRenderer.
 *
 * pulse  → outer Animated.View opacity tracks animatedValue (0.3↔1.0)
 * wave   → inner GradientShimmer translates from -width to +width
 * shiver → same as wave with 1.5× amplitude
 * none   → static view, ignores animatedValue
 * shatter → handled upstream by ShatterBone, never passed here
 */
export const SkeletonBone = React.memo(function SkeletonBone({
  bone,
  config,
  animatedValue,
}: SkeletonBoneProps) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  // reduceMotion → fall through to 'none' (static bone, no shimmer)
  const effectiveAnimation = reduceMotion ? 'none' : config.animation;

  /**
   * Shimmer interpolation for wave / shiver.
   * Computed synchronously (useMemo) so it is available on the first render —
   * no ref-hack, no one-frame flicker.
   *
   * wave:   translateX [-width,  +width]  (1× amplitude)
   * shiver: translateX [-1.5w, +1.5w]    (1.5× amplitude, faster)
   *
   * animatedValue loops 0→1 (driven by SkeletonRenderer),
   * this interpolation maps it to pixel translation.
   */
  const shimmerTranslateX = useMemo(() => {
    if (effectiveAnimation !== 'wave' && effectiveAnimation !== 'shiver') return null;
    const isRtl = config.direction === 'rtl';
    const amplitude = effectiveAnimation === 'shiver' ? bone.width * 1.5 : bone.width;
    return animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: isRtl ? [amplitude, -amplitude] : [-amplitude, amplitude],
    });
  }, [effectiveAnimation, config.direction, bone.width, animatedValue]);

  const isPulse = effectiveAnimation === 'pulse';
  const isShimmer = shimmerTranslateX !== null;

  // pulse: outer opacity is animated. shimmer/none: outer is static.
  const outerAnimatedStyle = isPulse ? { opacity: animatedValue as unknown as number } : {};

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          position: 'absolute',
          left: bone.x,
          top: bone.y,
          width: bone.width,
          height: bone.height,
          borderRadius: bone.borderRadius || config.borderRadius,
          backgroundColor: config.color,
          overflow: 'hidden',
        },
        outerAnimatedStyle,
      ]}
    >
      {isShimmer && (
        <GradientShimmer
          color={config.color}
          highlightColor={config.highlightColor}
          translateX={shimmerTranslateX}
          boneWidth={bone.width}
        />
      )}
    </Animated.View>
  );
});

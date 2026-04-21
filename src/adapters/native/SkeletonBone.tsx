import React, { useEffect, useRef, useState } from 'react';
import { Animated, AccessibilityInfo } from 'react-native';
import type { Bone, SkeletonConfig } from '../../core/types';
import { createPulseAnimation } from './animations/pulse';
import { createWaveAnimation } from './animations/wave';
import { createShiverAnimation } from './animations/shiver';

/**
 * Props for SkeletonBone.
 */
export interface SkeletonBoneProps {
  /** The bone to render */
  bone: Bone;
  /** Merged skeleton configuration */
  config: Required<SkeletonConfig>;
  /**
   * Shared Animated.Value from withSkeleton.
   * All bones in the same component receive the same value
   * to ensure perfectly synchronized animations.
   */
  animatedValue: Animated.Value;
}

/**
 * Renders a single skeleton placeholder bone with the appropriate animation.
 *
 * - Delegates animation to the correct module based on config.animation
 * - Shares the Animated.Value from withSkeleton for perfect sync
 * - Respects AccessibilityInfo.isReduceMotionEnabled — falls back to none
 * - Hidden from screen readers via accessibilityElementsHidden
 * - Cleans up animation on unmount — zero memory leaks
 *
 * @param props - SkeletonBoneProps
 */
export const SkeletonBone = React.memo(function SkeletonBone({
  bone,
  config,
  animatedValue,
}: SkeletonBoneProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const translateXRef = useRef<Animated.AnimatedInterpolation<number> | null>(null);

  // Detect reduceMotion on mount and listen for changes
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );

    return () => subscription.remove();
  }, []);

  // Start animation based on config.animation
  useEffect(() => {
    const effectiveAnimation = reduceMotion ? 'none' : config.animation;

    // Stop any previous animation
    stopRef.current?.();
    stopRef.current = null;
    translateXRef.current = null;

    if (effectiveAnimation === 'none') return;

    if (effectiveAnimation === 'pulse' || effectiveAnimation === 'shatter') {
      // shatter falls back to pulse until Prompt 4
      const anim = createPulseAnimation(config, animatedValue);
      anim.start();
      stopRef.current = anim.stop;
    } else if (effectiveAnimation === 'wave') {
      const anim = createWaveAnimation(config, bone.width, animatedValue);
      anim.start();
      stopRef.current = anim.stop;
      translateXRef.current =
        (animatedValue as Animated.Value & {
          translateX?: Animated.AnimatedInterpolation<number>;
        }).translateX ?? null;
    } else if (effectiveAnimation === 'shiver') {
      const anim = createShiverAnimation(config, bone.width, animatedValue);
      anim.start();
      stopRef.current = anim.stop;
      translateXRef.current =
        (animatedValue as Animated.Value & {
          translateX?: Animated.AnimatedInterpolation<number>;
        }).translateX ?? null;
    }

    return () => {
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [
    reduceMotion,
    config.animation,
    config.speed,
    config.direction,
    bone.width,
    animatedValue,
  ]);

  const effectiveAnimation = reduceMotion ? 'none' : config.animation;
  const isPulse =
    effectiveAnimation === 'pulse' ||
    effectiveAnimation === 'shatter' ||
    effectiveAnimation === 'none';

  const animatedStyle = isPulse
    ? { opacity: effectiveAnimation === 'none' ? 1 : animatedValue }
    : { transform: [{ translateX: translateXRef.current ?? 0 }] };

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
        animatedStyle,
      ]}
    />
  );
});
import React, { useEffect, useState, useMemo } from 'react';
import { Animated, AccessibilityInfo } from 'react-native';
import type { Bone, SkeletonConfig } from '../../core/types';
import { createPulseAnimation } from './animations/pulse';
import { createWaveAnimation } from './animations/wave';
import { createShiverAnimation } from './animations/shiver';
import { GradientShimmer } from './GradientShimmer';

export interface SkeletonBoneProps {
  bone: Bone;
  config: Required<SkeletonConfig>;
  /**
   * Shared Animated.Value from withSkeleton.
   * All bones in the same component share this value for perfect sync.
   * ShatterBone manages its own values — this prop is not used there.
   */
  animatedValue: Animated.Value;
}

/**
 * Renders a single skeleton placeholder bone.
 *
 * Handles pulse, wave, shiver, and none.
 * shatter is routed to ShatterBone upstream (in withSkeleton).
 *
 * For wave/shiver: the bone is static; a LinearGradient overlay translates
 * across it inside overflow:hidden, creating the shimmer effect.
 * Requires expo-linear-gradient or react-native-linear-gradient (optional peer).
 * If absent, the bone shows solid color (same as 0.1.x behaviour).
 *
 * For pulse: opacity oscillates on the shared animatedValue.
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

  const effectiveAnimation = reduceMotion ? 'none' : config.animation;

  // --- Shimmer interpolation (wave / shiver) ---
  // Computed synchronously so it is available on the very first render.
  // The animation loop that drives animatedValue is started in the effect below.
  const shimmerTranslateX = useMemo(() => {
    if (effectiveAnimation !== 'wave' && effectiveAnimation !== 'shiver') return null;
    const isRtl = config.direction === 'rtl';
    // wave: amplitude = boneWidth (sweeps exactly one bone-width left to right)
    // shiver: amplitude = 1.5× (more intense, faster)
    const amplitude = effectiveAnimation === 'shiver' ? bone.width * 1.5 : bone.width;
    return animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: isRtl ? [amplitude, -amplitude] : [-amplitude, amplitude],
    });
  }, [effectiveAnimation, config.direction, bone.width, animatedValue]);

  // --- Animation lifecycle ---
  useEffect(() => {
    if (effectiveAnimation === 'none') return;

    let stop: (() => void) | null = null;

    if (effectiveAnimation === 'pulse') {
      const anim = createPulseAnimation(config, animatedValue);
      anim.start();
      stop = anim.stop;
    } else if (effectiveAnimation === 'wave') {
      const anim = createWaveAnimation(config, bone.width, animatedValue);
      anim.start();
      stop = anim.stop;
    } else if (effectiveAnimation === 'shiver') {
      const anim = createShiverAnimation(config, bone.width, animatedValue);
      anim.start();
      stop = anim.stop;
    }
    // shatter is never handled here — withSkeleton routes it to ShatterBone

    return () => stop?.();
  }, [effectiveAnimation, config.speed, config.direction, bone.width, animatedValue]);

  const isShimmer = shimmerTranslateX !== null;
  const isPulse = effectiveAnimation === 'pulse';

  // Pulse: animate outer opacity. Shimmer: outer is static, gradient translates inside.
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

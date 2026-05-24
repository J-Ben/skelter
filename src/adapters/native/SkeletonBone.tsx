import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Animated, AccessibilityInfo, Easing } from 'react-native';
import type { Bone, SkeletonConfig } from '../../core/types';
import { GradientShimmer } from './GradientShimmer';
import { resolveSpeed } from '../../core/constants';

export interface SkeletonBoneProps {
  bone: Bone;
  config: Required<SkeletonConfig>;
  /**
   * Shared Animated.Value driven by SkeletonRenderer (withSkeleton).
   * A single loop runs there : SkeletonBone only reads/interpolates this value.
   * ShatterBone manages its own values internally and does not use this prop.
   */
  animatedValue: Animated.Value;
}

/**
 * Renders a single skeleton placeholder bone. Pure renderer : no animation
 * lifecycle managed here. The shared animatedValue is driven by SkeletonRenderer.
 *
 * pulse   → outer Animated.View opacity tracks animatedValue (0.3↔1.0)
 * wave    → inner GradientShimmer translates from -width to +width
 * shiver  → same as wave with 1.5× amplitude
 * drip    → per-bone Animated.Value, phase-shifted by bone.y for cascade effect
 * none    → static view, ignores animatedValue
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
   * Shimmer interpolation for wave / shiver (horizontal).
   *
   * wave:   translateX [-width,  +width]
   * shiver: translateX [-1.5w, +1.5w]
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

  /**
   * Per-bone Animated.Value for drip. Driven independently from the shared
   * animatedValue so each bone can have a phase offset based on bone.y,
   * replicating the top→bottom cascade the web adapter achieves with animationDelay.
   *
   * Phase formula mirrors the web: phase = (0.5 - bone.y*3/duration) mod 1
   *   bone.y=0   → phase=0.5 → highlight visible immediately at t=0
   *   bone.y=H/2 → phase=0   → highlight visible after half a cycle
   */
  const dripAnim = useRef(new Animated.Value(0)).current;

  const dripTranslateY = useMemo(() => {
    if (effectiveAnimation !== 'drip') return null;
    return dripAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-bone.height, bone.height],
    });
  }, [effectiveAnimation, bone.height, dripAnim]);

  useEffect(() => {
    if (effectiveAnimation !== 'drip') return;
    const duration = 1800 / resolveSpeed(config.speed);
    const phase = ((0.5 - (bone.y * 3) / duration) % 1 + 1) % 1;
    dripAnim.setValue(phase);

    // First partial cycle advances from `phase` to 1, then loop full cycles.
    // Bones with phase=0.5 (y=0) start at center (highlight visible at t=0).
    // Bones with phase=0 (y≈duration/6) start hidden above, reach center at t=duration/2.
    const anim = Animated.sequence([
      Animated.timing(dripAnim, {
        toValue: 1,
        duration: (1 - phase) * duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(dripAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(dripAnim, {
            toValue: 1,
            duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      ),
    ]);

    anim.start();
    return () => anim.stop();
  }, [effectiveAnimation, config.speed, bone.y, dripAnim]);

  const isPulse = effectiveAnimation === 'pulse';
  const isWaveShimmer = shimmerTranslateX !== null;
  const isDrip = effectiveAnimation === 'drip';
  const isSlide = effectiveAnimation === 'slide';
  const isBeat = effectiveAnimation === 'beat';

  const slideOpacity = useMemo(
    () => isSlide ? animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.0] }) : null,
    [isSlide, animatedValue]
  );
  const slideTranslateY = useMemo(
    () => isSlide ? animatedValue.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) : null,
    [isSlide, animatedValue]
  );

  const beatScale = useMemo(
    () => isBeat ? animatedValue.interpolate({
      inputRange: [0, 0.04, 0.08, 0.12, 0.16, 1],
      outputRange: [1, 1.04, 1, 1.02, 1, 1],
      extrapolate: 'clamp',
    }) : null,
    [isBeat, animatedValue]
  );
  const beatOpacity = useMemo(
    () => isBeat ? animatedValue.interpolate({
      inputRange: [0, 0.04, 0.08, 0.12, 0.16, 1],
      outputRange: [1, 0.7, 1, 0.8, 1, 1],
      extrapolate: 'clamp',
    }) : null,
    [isBeat, animatedValue]
  );

  const outerAnimatedStyle = isPulse
    ? { opacity: animatedValue as unknown as number }
    : isSlide && slideOpacity && slideTranslateY
    ? { opacity: slideOpacity as unknown as number, transform: [{ translateY: slideTranslateY as unknown as number }] }
    : isBeat && beatScale && beatOpacity
    ? { opacity: beatOpacity as unknown as number, transform: [{ scale: beatScale as unknown as number }] }
    : {};

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
      {isWaveShimmer && (
        <GradientShimmer
          color={config.color}
          highlightColor={config.highlightColor}
          translateX={shimmerTranslateX ?? undefined}
          boneWidth={bone.width}
          boneHeight={bone.height}
        />
      )}
      {isDrip && dripTranslateY && (
        <GradientShimmer
          color={config.color}
          highlightColor={config.highlightColor}
          translateY={dripTranslateY}
          boneWidth={bone.width}
          boneHeight={bone.height}
        />
      )}
    </Animated.View>
  );
});

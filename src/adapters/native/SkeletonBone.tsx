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

  // Cascade for wave/shiver: drive a per-bone 0→1 loop with delay.
  useEffect(() => {
    const isWaveShiver = effectiveAnimation === 'wave' || effectiveAnimation === 'shiver';
    if (!config.cascade || config.cascade === 0 || !isWaveShiver) return;

    const speed = resolveSpeed(config.speed);
    const dur = (effectiveAnimation === 'shiver' ? 800 : 1500) / speed;
    const delay = bone.y * config.cascade;
    cascadeWaveAnim.setValue(0);

    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.timing(cascadeWaveAnim, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: true })
      ),
    ]);
    anim.start();
    return () => anim.stop();
  }, [effectiveAnimation, config.speed, config.cascade, bone.y, cascadeWaveAnim]);

  /**
   * Shimmer interpolation for wave / shiver (horizontal).
   *
   * wave:   translateX [-width,  +width]
   * shiver: translateX [-1.5w, +1.5w]
   *
   * When cascade > 0, uses cascadeWaveAnim (per-bone, delayed) instead of shared animatedValue.
   */
  const shimmerTranslateX = useMemo(() => {
    if (effectiveAnimation !== 'wave' && effectiveAnimation !== 'shiver') return null;
    const isRtl = config.direction === 'rtl';
    const amplitude = effectiveAnimation === 'shiver' ? bone.width * 1.5 : bone.width;
    const sourceValue = config.cascade > 0 ? cascadeWaveAnim : animatedValue;
    return sourceValue.interpolate({
      inputRange: [0, 1],
      outputRange: isRtl ? [amplitude, -amplitude] : [-amplitude, amplitude],
    });
  }, [effectiveAnimation, config.direction, config.cascade, bone.width, animatedValue, cascadeWaveAnim]);

  /**
   * Per-bone Animated.Value for drip. Driven independently from the shared
   * animatedValue so each bone can have a phase offset based on bone.y,
   * replicating the top→bottom cascade the web adapter achieves with animationDelay.
   *
   * Phase formula mirrors the web: phase = (0.5 - bone.y*msPerPx/duration) mod 1
   *   bone.y=0   → phase=0.5 → highlight visible immediately at t=0
   *   bone.y=H/2 → phase=0   → highlight visible after half a cycle
   */
  const dripAnim = useRef(new Animated.Value(0)).current;

  /**
   * Per-bone Animated.Value for cascade mode (pulse / slide / beat).
   * Mirrors the shared animatedValue behavior but delayed by bone.y × cascade ms.
   * Idle when config.cascade === 0 (shared animatedValue used instead).
   */
  const cascadeAnim = useRef(new Animated.Value(0)).current;

  /**
   * Per-bone Animated.Value for cascade mode (wave / shiver).
   * Same 0→1 linear loop as the shared animatedValue but delayed by bone.y × cascade ms.
   */
  const cascadeWaveAnim = useRef(new Animated.Value(0)).current;

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
    const msPerPx = config.cascade > 0 ? config.cascade : 3;
    const phase = ((0.5 - (bone.y * msPerPx) / duration) % 1 + 1) % 1;
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
  }, [effectiveAnimation, config.speed, config.cascade, bone.y, dripAnim]);

  // Cascade: per-bone animation for pulse / slide / beat when cascade > 0.
  // Mirrors the shared animatedValue but starts after bone.y × cascade ms.
  useEffect(() => {
    const useCascade = config.cascade > 0 && (
      effectiveAnimation === 'pulse' ||
      effectiveAnimation === 'slide' ||
      effectiveAnimation === 'beat'
    );
    if (!useCascade) return;

    const speed = resolveSpeed(config.speed);
    const delay = bone.y * config.cascade;
    let anim: Animated.CompositeAnimation;

    if (effectiveAnimation === 'pulse') {
      const dur = 1000 / speed;
      cascadeAnim.setValue(0.3);
      anim = Animated.sequence([
        Animated.delay(delay),
        Animated.loop(Animated.sequence([
          Animated.timing(cascadeAnim, { toValue: 1.0, duration: dur / 2, useNativeDriver: true }),
          Animated.timing(cascadeAnim, { toValue: 0.3, duration: dur / 2, useNativeDriver: true }),
        ])),
      ]);
    } else if (effectiveAnimation === 'slide') {
      const dur = 1200 / speed;
      cascadeAnim.setValue(0);
      anim = Animated.sequence([
        Animated.delay(delay),
        Animated.loop(Animated.sequence([
          Animated.timing(cascadeAnim, { toValue: 1, duration: dur / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(cascadeAnim, { toValue: 0, duration: dur / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])),
      ]);
    } else {
      // beat
      const dur = 2000 / speed;
      cascadeAnim.setValue(0);
      anim = Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.timing(cascadeAnim, { toValue: 1, duration: dur, useNativeDriver: true })
        ),
      ]);
    }

    anim.start();
    return () => anim.stop();
  }, [effectiveAnimation, config.speed, config.cascade, bone.y, cascadeAnim]);

  const isPulse = effectiveAnimation === 'pulse';
  const isWaveShimmer = shimmerTranslateX !== null;
  const isDrip = effectiveAnimation === 'drip';
  const isSlide = effectiveAnimation === 'slide';
  const isBeat = effectiveAnimation === 'beat';

  // When cascade > 0, use per-bone cascadeAnim instead of shared animatedValue.
  const useCascadeAnim = config.cascade > 0 && (isPulse || isSlide || isBeat);
  const activeValue = useCascadeAnim ? cascadeAnim : animatedValue;

  const slideOpacity = useMemo(
    () => isSlide ? activeValue.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.0] }) : null,
    [isSlide, activeValue]
  );
  const slideTranslateY = useMemo(
    () => isSlide ? activeValue.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) : null,
    [isSlide, activeValue]
  );

  const beatScale = useMemo(
    () => isBeat ? activeValue.interpolate({
      inputRange: [0, 0.04, 0.08, 0.12, 0.16, 1],
      outputRange: [1, 1.04, 1, 1.02, 1, 1],
      extrapolate: 'clamp',
    }) : null,
    [isBeat, activeValue]
  );
  const beatOpacity = useMemo(
    () => isBeat ? activeValue.interpolate({
      inputRange: [0, 0.04, 0.08, 0.12, 0.16, 1],
      outputRange: [1, 0.7, 1, 0.8, 1, 1],
      extrapolate: 'clamp',
    }) : null,
    [isBeat, activeValue]
  );

  const outerAnimatedStyle = isPulse
    ? { opacity: activeValue as unknown as number }
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

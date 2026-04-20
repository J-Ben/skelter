import React, { useEffect, useRef, useState } from 'react';
import { Animated, AccessibilityInfo, View } from 'react-native';
import type { Bone, SkeletonConfig } from '../../core/types';
import { createShatterAnimation } from './animations/shatter';
import type { ShatterResult } from './animations/shatter';

/**
 * Props for ShatterBone.
 */
export interface ShatterBoneProps {
  /** The bone to fragment */
  bone: Bone;
  /** Merged skeleton configuration */
  config: Required<SkeletonConfig>;
}

/**
 * Renders the shatter animation for a single bone.
 *
 * Unlike other bone types, ShatterBone does NOT use a shared Animated.Value.
 * Each square has its own Animated.Value — the staggered delay between squares
 * is intentional and is what creates the fragmentation effect.
 *
 * - Respects AccessibilityInfo.isReduceMotionEnabled
 * - If reduceMotion is active, renders static squares with no animation
 * - Cleans up all animations on unmount — zero memory leaks
 *
 * @param props - ShatterBoneProps
 */
export const ShatterBone = React.memo(function ShatterBone({
  bone,
  config,
}: ShatterBoneProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const shatterRef = useRef<ShatterResult | null>(null);

  // Detect and track reduceMotion
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    return () => subscription.remove();
  }, []);

  // Build and start shatter animation
  useEffect(() => {
    // Stop previous if any
    shatterRef.current?.stop();

    const shatter = createShatterAnimation(config, bone);
    shatterRef.current = shatter;

    if (!reduceMotion) {
      shatter.start();
    }

    return () => {
      shatter.stop();
      shatterRef.current = null;
    };
  }, [bone, config, reduceMotion]);

  const shatter = shatterRef.current;
  if (!shatter) return null;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        left: bone.x,
        top: bone.y,
        width: bone.width,
        height: bone.height,
        overflow: 'hidden',
      }}
    >
      {shatter.squares.map((square, index) => (
        <Animated.View
          key={`shatter-${index}`}
          style={{
            position: 'absolute',
            left: square.x - bone.x,
            top: square.y - bone.y,
            width: square.width,
            height: square.height,
            backgroundColor: config.color,
            opacity: reduceMotion ? 1 : square.animatedValue,
          }}
        />
      ))}
    </View>
  );
});
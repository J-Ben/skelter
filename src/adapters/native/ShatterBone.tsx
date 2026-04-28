import React, { useEffect, useMemo, useState } from 'react';
import { Animated, AccessibilityInfo, View } from 'react-native';
import type { Bone, SkeletonConfig } from '../../core/types';
import { createShatterAnimation } from './animations/shatter';
import type { ShatterSquare } from './animations/shatter';

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

  // Detect and track reduceMotion
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    return () => subscription.remove();
  }, []);

  // Création synchrone — le composant peut render immédiatement sans attendre useEffect
  const shatter = useMemo(
    () => createShatterAnimation(config, bone),
    [bone, config]
  );

  // Start/stop uniquement selon reduceMotion
  useEffect(() => {
    if (!reduceMotion) {
      shatter.start();
    }
    return () => {
      shatter.stop();
    };
  }, [shatter, reduceMotion]);

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
        borderRadius: bone.borderRadius || config.borderRadius,
        overflow: 'hidden',
      }}
    >
      {shatter.squares.map((square: ShatterSquare, index: number) => (
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

import { Animated } from 'react-native';
import type { SkeletonConfig } from '../../../core/types';

/**
 * Result returned by createPulseAnimation.
 */
export interface PulseAnimation {
  /** The Animated.Value driving the opacity */
  animatedValue: Animated.Value;
  /** Starts the pulse loop */
  start: () => void;
  /** Stops the animation and cleans up */
  stop: () => void;
}

/**
 * Creates a pulse animation that fades a bone's opacity in and out.
 *
 * - Opacity oscillates between 0.3 and 1.0
 * - Speed is controlled by config.speed as a multiplier
 * - Accepts an optional shared Animated.Value so all bones
 *   in the same component stay perfectly synchronized
 * - useNativeDriver: true — runs on the UI thread
 *
 * @param config - Merged skeleton configuration
 * @param sharedValue - Optional shared Animated.Value from withSkeleton
 * @returns PulseAnimation with animatedValue, start and stop
 */
export function createPulseAnimation(
  config: Required<SkeletonConfig>,
  sharedValue?: Animated.Value
): PulseAnimation {
  const animatedValue = sharedValue ?? new Animated.Value(0.3);
  let animation: Animated.CompositeAnimation | null = null;

  const baseDuration = 1000 / config.speed;

  const start = () => {
    animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1.0,
          duration: baseDuration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: baseDuration / 2,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
  };

  const stop = () => {
    animation?.stop();
    animation = null;
    animatedValue.setValue(0.3);
  };

  return { animatedValue, start, stop };
}
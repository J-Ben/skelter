import { resolveSpeed } from '../../../core/constants';
import { Animated } from 'react-native';
import type { SkeletonConfig } from '../../../core/types';

/**
 * Result returned by createShiverAnimation.
 */
export interface ShiverAnimation {
  /** The Animated.Value driving the translateX */
  animatedValue: Animated.Value;
  /** Starts the shiver loop */
  start: () => void;
  /** Stops the animation and cleans up */
  stop: () => void;
}

/**
 * Creates a shiver animation — an intense, rapid wave effect.
 *
 * - Wider amplitude than wave: -boneWidth*1.5 to +boneWidth*1.5
 * - Two passes run in parallel for a more intense shimmer
 * - Speed is controlled by config.speed as a multiplier
 * - Accepts an optional shared Animated.Value for synchronization
 * - useNativeDriver: true — runs on the UI thread
 *
 * @param config - Merged skeleton configuration
 * @param boneWidth - Width of the bone in pixels
 * @param sharedValue - Optional shared Animated.Value from withSkeleton
 * @returns ShiverAnimation with animatedValue, start and stop
 */
export function createShiverAnimation(
  config: Required<SkeletonConfig>,
  boneWidth: number,
  sharedValue?: Animated.Value
): ShiverAnimation {
  const animatedValue = sharedValue ?? new Animated.Value(0);
  let animation: Animated.CompositeAnimation | null = null;

  const baseDuration = 800 / resolveSpeed(config.speed);
  const isRtl = config.direction === 'rtl';
  const amplitude = boneWidth * 1.5;

  const start = () => {
    animatedValue.setValue(0);
    animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: baseDuration,
        useNativeDriver: true,
      })
    );
    animation.start();
  };

  const stop = () => {
    animation?.stop();
    animation = null;
    animatedValue.setValue(0);
  };

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: isRtl ? [amplitude, -amplitude] : [-amplitude, amplitude],
  });

  (animatedValue as Animated.Value & { translateX?: Animated.AnimatedInterpolation<number> }).translateX = translateX;

  return { animatedValue, start, stop };
}
import { resolveSpeed } from '../../../core/constants';
import { Animated } from 'react-native';
import type { SkeletonConfig } from '../../../core/types';

/**
 * Result returned by createWaveAnimation.
 */
export interface WaveAnimation {
  /** The Animated.Value driving the translateX */
  animatedValue: Animated.Value;
  /** Starts the wave loop */
  start: () => void;
  /** Stops the animation and cleans up */
  stop: () => void;
}

/**
 * Creates a wave (shimmer) animation that slides across a bone.
 *
 * - Translates from -boneWidth to +boneWidth (ltr) or reversed (rtl)
 * - Speed is controlled by config.speed as a multiplier
 * - Accepts an optional shared Animated.Value for synchronization
 * - useNativeDriver: true — runs on the UI thread
 *
 * @param config - Merged skeleton configuration
 * @param boneWidth - Width of the bone in pixels
 * @param sharedValue - Optional shared Animated.Value from withSkeleton
 * @returns WaveAnimation with animatedValue, start and stop
 */
export function createWaveAnimation(
  config: Required<SkeletonConfig>,
  boneWidth: number,
  sharedValue?: Animated.Value
): WaveAnimation {
  const animatedValue = sharedValue ?? new Animated.Value(0);
  let animation: Animated.CompositeAnimation | null = null;

  const baseDuration = 1500 / resolveSpeed(config.speed);
  const isRtl = config.direction === 'rtl';

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

  /**
   * Interpolated translateX value for use in Animated.View style.
   * Consumers should use animatedValue.interpolate() with this range.
   */
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: isRtl ? [boneWidth, -boneWidth] : [-boneWidth, boneWidth],
  });

  // Attach interpolation to animatedValue for consumer access
  (animatedValue as Animated.Value & { translateX?: Animated.AnimatedInterpolation<number> }).translateX = translateX;

  return { animatedValue, start, stop };
}
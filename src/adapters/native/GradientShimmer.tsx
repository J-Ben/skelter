import React from 'react';
import { Animated } from 'react-native';

interface GradientProps {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: object;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let LinearGradient: React.ComponentType<GradientProps> | null = null;
let warned = false;

try {
  // expo-linear-gradient (preferred in Expo projects)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('expo-linear-gradient');
  LinearGradient = mod.LinearGradient ?? null;
} catch {
  try {
    // react-native-linear-gradient (bare RN projects)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-linear-gradient');
    LinearGradient = mod.default ?? mod.LinearGradient ?? null;
  } catch {
    // No gradient lib : shimmer falls back to solid bone with no highlight
  }
}

export interface GradientShimmerProps {
  color: string;
  highlightColor: string;
  /** Interpolated translateX driven by the shared animatedValue (horizontal shimmer) */
  translateX?: Animated.AnimatedInterpolation<number>;
  /** Interpolated translateY driven by the shared animatedValue (vertical shimmer) */
  translateY?: Animated.AnimatedInterpolation<number>;
  boneWidth: number;
  boneHeight?: number;
}

/**
 * Renders a gradient highlight that sweeps across a skeleton bone.
 *
 * Requires expo-linear-gradient or react-native-linear-gradient as a peer.
 * If neither is available, warns once and renders nothing.
 *
 * Horizontal (wave/shiver): translateX sweeps left→right, skewX(-15deg).
 * Vertical (drip): translateY sweeps top→bottom, skewY(-5deg).
 */
export function GradientShimmer({
  color,
  highlightColor,
  translateX,
  translateY,
  boneWidth,
  boneHeight,
}: GradientShimmerProps) {
  if (!LinearGradient) {
    if (!warned) {
      warned = true;
      console.warn(
        '[skelter] wave/shiver/drip shimmer requires expo-linear-gradient or ' +
          'react-native-linear-gradient. Install one as a peer dependency to ' +
          'enable the gradient highlight. Falling back to solid bone.'
      );
    }
    return null;
  }

  const Gradient = LinearGradient;

  if (translateY != null) {
    return (
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: boneHeight ?? boneWidth,
          transform: [{ translateY }, { skewY: '-5deg' }],
        }}
      >
        <Gradient
          colors={[color, highlightColor, color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: boneWidth,
        transform: [{ translateX: translateX! }, { skewX: '-15deg' }],
      }}
    >
      <Gradient
        colors={[color, highlightColor, color]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
}

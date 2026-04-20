import React, { useEffect, useState, CSSProperties } from 'react';
import type { Bone, SkeletonConfig } from '../../core/types';
import { createPulseAnimation } from './animations/pulse';
import { createWaveAnimation } from './animations/wave';
import { createShiverAnimation } from './animations/shiver';
import { createShatterStyles } from './animations/shatter';

/**
 * Props for web SkeletonBone.
 */
export interface SkeletonBoneProps {
  bone: Bone;
  config: Required<SkeletonConfig>;
}

/**
 * Detects if the user has requested reduced motion.
 * SSR safe — returns false when window is unavailable.
 */
function getReduceMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Renders a single skeleton placeholder bone for web.
 *
 * - Uses CSS animations via inline styles — zero external CSS files
 * - Delegates animation to the correct module based on config.animation
 * - Respects prefers-reduced-motion — falls back to none if active
 * - Listens for changes to prefers-reduced-motion
 * - aria-hidden to hide from screen readers
 * - SSR safe
 *
 * @param props - SkeletonBoneProps
 */
export const SkeletonBone = React.memo(function SkeletonBone({
  bone,
  config,
}: SkeletonBoneProps) {
  const [reduceMotion, setReduceMotion] = useState(getReduceMotion);

  // Listen for prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const effectiveAnimation = reduceMotion ? 'none' : config.animation;

  const baseStyle: CSSProperties = {
    position: 'absolute',
    left: bone.x,
    top: bone.y,
    width: bone.width,
    height: bone.height,
    borderRadius: bone.borderRadius || config.borderRadius,
    backgroundColor: config.color,
    overflow: 'hidden',
  };

  // Shatter — renders a grid of squares
  if (effectiveAnimation === 'shatter') {
    const squares = createShatterStyles(config, bone);
    return (
      <div
        aria-hidden="true"
        style={baseStyle}
      >
        {squares.map((square, index) => (
          <div
            key={`shatter-${index}`}
            style={{
              position: 'absolute',
              left: square.x,
              top: square.y,
              width: square.width,
              height: square.height,
              backgroundColor: config.color,
              ...square.style,
            }}
          />
        ))}
      </div>
    );
  }

  // Wave — shimmer overlay
  if (effectiveAnimation === 'wave') {
    const { style } = createWaveAnimation(config);
    return (
      <div aria-hidden="true" style={baseStyle}>
        <div style={style} />
      </div>
    );
  }

  // Shiver — intense shimmer overlay
  if (effectiveAnimation === 'shiver') {
    const { style } = createShiverAnimation(config);
    return (
      <div aria-hidden="true" style={baseStyle}>
        <div style={style} />
      </div>
    );
  }

  // Pulse — opacity animation on the bone itself
  if (effectiveAnimation === 'pulse') {
    const { style } = createPulseAnimation(config);
    return (
      <div
        aria-hidden="true"
        style={{ ...baseStyle, ...style }}
      />
    );
  }

  // None — static bone, no animation
  return <div aria-hidden="true" style={baseStyle} />;
});
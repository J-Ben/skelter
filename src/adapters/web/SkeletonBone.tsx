import React, { useEffect, useMemo, useState, CSSProperties } from 'react';
import type { Bone, SkeletonConfig } from '../../core/types';
import { createPulseAnimation } from './animations/pulse';
import { createWaveAnimation } from './animations/wave';
import { createShiverAnimation } from './animations/shiver';
import { createShatterStyles } from './animations/shatter';
import { createSlideAnimation } from './animations/slide';
import { createBeatAnimation } from './animations/beat';
import { createDripAnimation } from './animations/drip';

/**
 * Props for web SkeletonBone.
 */
export interface SkeletonBoneProps {
  bone: Bone;
  config: Required<SkeletonConfig>;
}

/**
 * Detects if the user has requested reduced motion.
 * SSR safe : returns false when window is unavailable.
 */
function getReduceMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Renders a single skeleton placeholder bone for web.
 *
 * - Uses CSS animations via inline styles : zero external CSS files
 * - Delegates animation to the correct module based on config.animation
 * - Respects prefers-reduced-motion : falls back to none if active
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

  const shatterSquares = useMemo(
    () => effectiveAnimation === 'shatter' ? createShatterStyles(config, bone) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveAnimation, bone, config]
  );

  // Shatter : grid of squares animate opacity independently.
  // Parent must be transparent: squares fade against page background,
  // not against another bone-colored div (which would make the animation invisible).
  if (effectiveAnimation === 'shatter' && shatterSquares) {
    const cascadeOffset = config.cascade > 0 ? Math.round(bone.y * config.cascade) : 0;
    return (
      <div
        aria-hidden="true"
        style={{ ...baseStyle, backgroundColor: 'transparent' }}
      >
        {shatterSquares.map((square, index) => {
          const baseDelay = parseInt(square.style.animationDelay as string ?? '0') || 0;
          const squareStyle = cascadeOffset > 0
            ? { ...square.style, animationDelay: `${baseDelay + cascadeOffset}ms` }
            : square.style;
          return (
            <div
              key={`shatter-${index}`}
              style={{
                position: 'absolute',
                left: square.x,
                top: square.y,
                width: square.width,
                height: square.height,
                borderRadius: bone.borderRadius || config.borderRadius,
                backgroundColor: config.color,
                ...squareStyle,
              }}
            />
          );
        })}
      </div>
    );
  }

  // Wave : shimmer overlay — cascade delay applied to the inner animated div
  if (effectiveAnimation === 'wave') {
    const { style } = createWaveAnimation(config);
    const innerStyle = config.cascade > 0
      ? { ...style, animationDelay: `${Math.round(bone.y * config.cascade)}ms` }
      : style;
    return (
      <div aria-hidden="true" style={baseStyle}>
        <div style={innerStyle} />
      </div>
    );
  }

  // Shiver : intense shimmer overlay — cascade delay applied to the inner animated div
  if (effectiveAnimation === 'shiver') {
    const { style } = createShiverAnimation(config);
    const innerStyle = config.cascade > 0
      ? { ...style, animationDelay: `${Math.round(bone.y * config.cascade)}ms` }
      : style;
    return (
      <div aria-hidden="true" style={baseStyle}>
        <div style={innerStyle} />
      </div>
    );
  }

  // Drip : background-position sweep, staggered per bone.y so the highlight
  // flows top→bottom through the component rather than all bones pulsing together.
  // When cascade > 0, use config.cascade as the ms/px rate instead of the hardcoded 3.
  if (effectiveAnimation === 'drip') {
    const { style, duration } = createDripAnimation(config);
    const msPerPx = config.cascade > 0 ? config.cascade : 3;
    const animationDelay = `${Math.round(bone.y * msPerPx - duration / 2)}ms`;
    return (
      <div
        aria-hidden="true"
        style={{ ...baseStyle, ...style, animationDelay }}
      />
    );
  }

  // Cascade stagger delay applied to pulse / slide / beat.
  const cascadeDelay = config.cascade > 0 ? `${Math.round(bone.y * config.cascade)}ms` : undefined;

  // Pulse : opacity animation on the bone itself
  if (effectiveAnimation === 'pulse') {
    const { style } = createPulseAnimation(config);
    return (
      <div
        aria-hidden="true"
        style={{ ...baseStyle, ...style, ...(cascadeDelay && { animationDelay: cascadeDelay }) }}
      />
    );
  }

  // Slide : bones float up 6px while fading in, sink back while fading out
  if (effectiveAnimation === 'slide') {
    const { style } = createSlideAnimation(config);
    return (
      <div
        aria-hidden="true"
        style={{ ...baseStyle, ...style, ...(cascadeDelay && { animationDelay: cascadeDelay }) }}
      />
    );
  }

  // Beat : double heartbeat — scale + opacity pulse
  if (effectiveAnimation === 'beat') {
    const { style } = createBeatAnimation(config);
    return (
      <div
        aria-hidden="true"
        style={{ ...baseStyle, ...style, ...(cascadeDelay && { animationDelay: cascadeDelay }) }}
      />
    );
  }

  // None : static bone, no animation
  return <div aria-hidden="true" style={baseStyle} />;
});
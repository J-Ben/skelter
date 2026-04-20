import type { CSSProperties } from 'react';
import type { SkeletonConfig } from '../../../core/types';

/**
 * Result returned by createShiverAnimation.
 */
export interface ShiverAnimationResult {
  animationName: string;
  keyframes: string;
  style: CSSProperties;
}

const injectedKeyframes = new Set<string>();

function injectKeyframes(animationName: string, keyframes: string): void {
  if (typeof document === 'undefined') return;
  if (injectedKeyframes.has(animationName)) return;
  const style = document.createElement('style');
  style.setAttribute('data-skelter', animationName);
  style.textContent = keyframes;
  document.head.appendChild(style);
  injectedKeyframes.add(animationName);
}

/**
 * Creates a shiver animation for web skeleton bones.
 *
 * - More intense than wave — wider amplitude, faster speed
 * - Two keyframe stops create a double-pass shimmer effect
 * - Direction controlled by config.direction (ltr/rtl)
 * - SSR safe
 *
 * @param config - Merged skeleton configuration
 * @returns ShiverAnimationResult with animationName, keyframes and style
 */
export function createShiverAnimation(
  config: Required<SkeletonConfig>
): ShiverAnimationResult {
  const duration = 800 / config.speed;
  const isRtl = config.direction === 'rtl';
  const directionKey = isRtl ? 'rtl' : 'ltr';
  const animationName = `skelter-shiver-${directionKey}-${Math.round(duration)}`;

  const from = isRtl ? '150%' : '-150%';
  const mid = isRtl ? '-50%' : '50%';
  const to = isRtl ? '-150%' : '150%';

  const keyframes = `
    @keyframes ${animationName} {
      0%   { transform: translateX(${from}); }
      50%  { transform: translateX(${mid}); }
      100% { transform: translateX(${to}); }
    }
  `;

  injectKeyframes(animationName, keyframes);

  const style: CSSProperties = {
    animation: `${animationName} ${duration}ms linear infinite`,
    background: `linear-gradient(
      90deg,
      transparent 0%,
      ${config.highlightColor} 40%,
      ${config.highlightColor} 60%,
      transparent 100%
    )`,
    position: 'absolute',
    inset: 0,
  };

  return { animationName, keyframes, style };
}
import type { CSSProperties } from 'react';
import type { SkeletonConfig } from '../../../core/types';

/**
 * Result returned by createWaveAnimation.
 */
export interface WaveAnimationResult {
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
 * Creates a wave (shimmer) animation for web skeleton bones.
 *
 * - Translates horizontally across the bone via CSS keyframes
 * - Direction controlled by config.direction (ltr/rtl)
 * - Speed controlled by config.speed
 * - SSR safe
 *
 * @param config - Merged skeleton configuration
 * @returns WaveAnimationResult with animationName, keyframes and style
 */
export function createWaveAnimation(
  config: Required<SkeletonConfig>
): WaveAnimationResult {
  const duration = 1500 / config.speed;
  const isRtl = config.direction === 'rtl';
  const directionKey = isRtl ? 'rtl' : 'ltr';
  const animationName = `skelter-wave-${directionKey}-${Math.round(duration)}`;

  const from = isRtl ? '100%' : '-100%';
  const to = isRtl ? '-100%' : '100%';

  const keyframes = `
    @keyframes ${animationName} {
      0%   { transform: translateX(${from}); }
      100% { transform: translateX(${to}); }
    }
  `;

  injectKeyframes(animationName, keyframes);

  const style: CSSProperties = {
    animation: `${animationName} ${duration}ms linear infinite`,
    background: `linear-gradient(
      90deg,
      transparent 0%,
      ${config.highlightColor} 50%,
      transparent 100%
    )`,
    position: 'absolute',
    inset: 0,
  };

  return { animationName, keyframes, style };
}
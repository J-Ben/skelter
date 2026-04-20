import type { CSSProperties } from 'react';
import type { SkeletonConfig } from '../../../core/types';

/**
 * Result returned by createPulseAnimation.
 */
export interface PulseAnimationResult {
  /** The generated CSS animation name */
  animationName: string;
  /** The keyframes CSS string */
  keyframes: string;
  /** CSS style object to apply to the bone element */
  style: CSSProperties;
}

/**
 * Tracks injected keyframe names to avoid duplicate style tags.
 */
const injectedKeyframes = new Set<string>();

/**
 * Injects a CSS keyframes rule into document.head.
 * Safe to call multiple times — injects only once per animationName.
 * SSR safe — no-op when document is unavailable.
 *
 * @param animationName - Unique name for the keyframes rule
 * @param keyframes - The full @keyframes CSS string
 */
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
 * Creates a pulse animation for web skeleton bones.
 *
 * - Opacity oscillates between 0.3 and 1.0 via CSS keyframes
 * - Speed controlled by config.speed as a multiplier
 * - Keyframes injected once into document.head — no duplicates
 * - SSR safe — returns style object without injecting on server
 *
 * @param config - Merged skeleton configuration
 * @returns PulseAnimationResult with animationName, keyframes and style
 */
export function createPulseAnimation(
  config: Required<SkeletonConfig>
): PulseAnimationResult {
  const duration = 1000 / config.speed;
  const animationName = `skelter-pulse-${Math.round(duration)}`;

  const keyframes = `
    @keyframes ${animationName} {
      0%   { opacity: 0.3; }
      50%  { opacity: 1.0; }
      100% { opacity: 0.3; }
    }
  `;

  injectKeyframes(animationName, keyframes);

  const style: CSSProperties = {
    animation: `${animationName} ${duration}ms ease-in-out infinite`,
  };

  return { animationName, keyframes, style };
}
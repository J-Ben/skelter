import { resolveSpeed } from '../../../core/constants';
import type { CSSProperties } from 'react';
import type { SkeletonConfig } from '../../../core/types';

export interface SlideAnimationResult {
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
 * Creates a slide animation for web skeleton bones.
 * Bones float upward 6px while fading in, then sink back while fading out.
 * Combines translateY and opacity for a distinct breathing + lift effect.
 */
export function createSlideAnimation(
  config: Required<SkeletonConfig>
): SlideAnimationResult {
  const duration = 1200 / resolveSpeed(config.speed);
  const animationName = `skelter-slide-${Math.round(duration)}`;

  const keyframes = `
    @keyframes ${animationName} {
      0%   { opacity: 0.4; transform: translateY(6px); }
      50%  { opacity: 1.0; transform: translateY(0px); }
      100% { opacity: 0.4; transform: translateY(6px); }
    }
  `;

  injectKeyframes(animationName, keyframes);

  const style: CSSProperties = {
    animation: `${animationName} ${duration}ms ease-in-out infinite`,
  };

  return { animationName, keyframes, style };
}

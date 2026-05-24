import { resolveSpeed } from '../../../core/constants';
import type { CSSProperties } from 'react';
import type { SkeletonConfig } from '../../../core/types';

export interface DripAnimationResult {
  animationName: string;
  keyframes: string;
  style: CSSProperties;
  duration: number;
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

export function createDripAnimation(
  config: Required<SkeletonConfig>
): DripAnimationResult {
  const duration = 1800 / resolveSpeed(config.speed);
  const animationName = `skelter-drip-${Math.round(duration)}`;

  // background-position sweeps the gradient (3× bone height) from top to bottom.
  // At 100% the highlight is above the bone (hidden), at 0% it is below (hidden).
  // The highlight band sweeps top→bottom and spans the full bone width.
  const keyframes = `
    @keyframes ${animationName} {
      0%   { background-position: 50% 100%; }
      100% { background-position: 50% 0%; }
    }
  `;

  injectKeyframes(animationName, keyframes);

  const style: CSSProperties = {
    animation: `${animationName} ${duration}ms linear infinite`,
    backgroundImage: `linear-gradient(
      180deg,
      ${config.color} 0%,
      ${config.color} 30%,
      ${config.highlightColor} 50%,
      ${config.color} 70%,
      ${config.color} 100%
    )`,
    backgroundSize: '100% 300%',
    backgroundRepeat: 'no-repeat',
  };

  return { animationName, keyframes, style, duration };
}

import { resolveSpeed } from '../../../core/constants';
import type { CSSProperties } from 'react';
import type { SkeletonConfig } from '../../../core/types';

export interface DripAnimationResult {
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

export function createDripAnimation(
  config: Required<SkeletonConfig>
): DripAnimationResult {
  const duration = 1800 / resolveSpeed(config.speed);
  const animationName = `skelter-drip-${Math.round(duration)}`;

  const keyframes = `
    @keyframes ${animationName} {
      0%   { transform: translateY(-100%) skewY(-5deg); }
      100% { transform: translateY(100%) skewY(-5deg); }
    }
  `;

  injectKeyframes(animationName, keyframes);

  const style: CSSProperties = {
    animation: `${animationName} ${duration}ms linear infinite`,
    background: `linear-gradient(
      180deg,
      transparent 0%,
      ${config.highlightColor} 50%,
      transparent 100%
    )`,
    position: 'absolute',
    inset: 0,
  };

  return { animationName, keyframes, style };
}

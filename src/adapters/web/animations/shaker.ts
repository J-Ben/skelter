import { resolveSpeed } from '../../../core/constants';
import type { CSSProperties } from 'react';
import type { SkeletonConfig } from '../../../core/types';

export interface ShakerAnimationResult {
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
 * Creates a shaker animation for web skeleton bones.
 *
 * A rapid burst of horizontal vibration followed by a long rest,
 * repeating in a loop. The shake occupies the first ~20% of each cycle;
 * the remaining ~80% is a stationary hold — giving the impression of
 * an occasional nervous tremor rather than continuous jitter.
 *
 * Duration: 1800ms base (adjustable via speed).
 */
export function createShakerAnimation(
  config: Required<SkeletonConfig>
): ShakerAnimationResult {
  const duration = 1800 / resolveSpeed(config.speed);
  const animationName = `skelter-shaker-${Math.round(duration)}`;

  // Shake burst occupies 0–20% of the cycle, rest is stationary.
  const keyframes = `
    @keyframes ${animationName} {
      0%   { transform: translateX(0);   }
      3%   { transform: translateX(-6px); }
      6%   { transform: translateX(6px);  }
      9%   { transform: translateX(-5px); }
      12%  { transform: translateX(5px);  }
      15%  { transform: translateX(-3px); }
      18%  { transform: translateX(3px);  }
      21%  { transform: translateX(-1px); }
      24%  { transform: translateX(0);   }
      100% { transform: translateX(0);   }
    }
  `;

  injectKeyframes(animationName, keyframes);

  const style: CSSProperties = {
    animation: `${animationName} ${duration}ms ease-in-out infinite`,
  };

  return { animationName, keyframes, style };
}

import { resolveSpeed } from '../../../core/constants';
import type { CSSProperties } from 'react';
import type { SkeletonConfig } from '../../../core/types';

export interface BeatAnimationResult {
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
 * Creates a heartbeat animation for web skeleton bones.
 * Two quick beats (scale + opacity) followed by a long rest.
 * Beat 1 is stronger than beat 2, matching a real cardiac rhythm.
 */
export function createBeatAnimation(
  config: Required<SkeletonConfig>
): BeatAnimationResult {
  const duration = 2000 / resolveSpeed(config.speed);
  const animationName = `skelter-beat-${Math.round(duration)}`;

  const keyframes = `
    @keyframes ${animationName} {
      0%   { opacity: 1.0; transform: scale(1);    }
      4%   { opacity: 0.7; transform: scale(1.04); }
      8%   { opacity: 1.0; transform: scale(1);    }
      12%  { opacity: 0.8; transform: scale(1.02); }
      16%  { opacity: 1.0; transform: scale(1);    }
      100% { opacity: 1.0; transform: scale(1);    }
    }
  `;

  injectKeyframes(animationName, keyframes);

  const style: CSSProperties = {
    animation: `${animationName} ${duration}ms ease-in-out infinite`,
    transformOrigin: 'center',
  };

  return { animationName, keyframes, style };
}

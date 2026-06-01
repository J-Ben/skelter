import { resolveSpeed } from '../../../core/constants';
import type { CSSProperties } from 'react';
import type { SkeletonConfig } from '../../../core/types';

const injectedKeyframes = new Set<string>();

function injectKeyframes(name: string, css: string): void {
  if (typeof document === 'undefined') return;
  if (injectedKeyframes.has(name)) return;
  const el = document.createElement('style');
  el.setAttribute('data-skelter', name);
  el.textContent = css;
  document.head.appendChild(el);
  injectedKeyframes.add(name);
}

/**
 * Returns the style for a bone in unified mode.
 *
 * The goal: all bones display the highlight at the SAME absolute container
 * x-position simultaneously — as if all bones were windows into one surface.
 *
 * Approach: each bone uses a background gradient in CONTAINER coordinates,
 * achieved by:
 *   1. background-size = 3W (three times the container width)
 *   2. A shared @keyframes that animates background-position by the same pixel
 *      distance for every bone
 *   3. A per-bone animation-delay that offsets each bone's phase so that the
 *      highlight appears at the same absolute x for all bones at the same time
 *
 * Math (ltr):
 *   highlight is at 50% of gradient = 1.5W into the gradient
 *   container_pos(bone) = bone.x + bg_pos + 1.5W
 *
 *   We want container_pos to equal P_start = -0.1W at real t=0 for all bones.
 *   With maxBoneX ≈ W used to anchor the keyframe range:
 *     bg_pos_at_0% = P_start - W - 1.5W  = -2.6W  (rightmost bone starts here)
 *     bg_pos_at_100% = P_end  - 1.5W     = -0.4W  (P_end = 1.1W)
 *     range = 2.2W
 *
 *   Delay for bone at boneX:
 *     delay = -(W - boneX) / (2.2W) * duration   [ms, negative = pre-advance]
 *
 * @param config        - Merged skeleton configuration
 * @param boneX         - Bone's x offset in container coordinates (bone.x)
 * @param containerWidth - Total width of the skeleton overlay container
 */
export function createUnifiedBoneStyle(
  config: Required<SkeletonConfig>,
  boneX: number,
  containerWidth: number
): CSSProperties {
  const W = containerWidth > 0 ? containerWidth : 300;
  const duration = 1500 / resolveSpeed(config.speed);
  const name = `sk-unified-${Math.round(W)}-${Math.round(duration)}`;

  const bgStart = Math.round(-2.6 * W);
  const bgEnd   = Math.round(-0.4 * W);

  injectKeyframes(
    name,
    `@keyframes ${name} {
      0%   { background-position: ${bgStart}px center; }
      100% { background-position: ${bgEnd}px center; }
    }`
  );

  const delay = -((W - boneX) / (2.2 * W)) * duration;

  return {
    background: `linear-gradient(
      90deg,
      ${config.color} 40%,
      ${config.highlightColor} 50%,
      ${config.color} 60%
    )`,
    backgroundSize: `${Math.round(3 * W)}px 100%`,
    animation: `${name} ${duration}ms linear infinite`,
    animationDelay: `${Math.round(delay)}ms`,
  };
}

import type { CSSProperties } from 'react';
import type { Bone, SkeletonConfig } from '../../../core/types';

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
 * Deterministic hash — same x,y always returns same value between 0 and 1.
 */
function stableHash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

/**
 * Fisher-Yates shuffle with deterministic seed.
 */
function stableRandomOrder(count: number, seed: number): number[] {
  const indices = Array.from({ length: count }, (_, i) => i);
  let s = Math.floor(seed * 0xffffffff);
  for (let i = indices.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

/**
 * A single square in the shatter grid with its CSS style.
 */
export interface ShatterSquareStyle {
  /** Position and size of the square relative to the bone */
  x: number;
  y: number;
  width: number;
  height: number;
  /** CSS style including animation-delay for stagger */
  style: CSSProperties;
}

/**
 * Creates the shatter animation styles for web skeleton bones.
 *
 * - Subdivides the bone into a grid of small squares
 * - Each square gets a CSS animation-delay for the stagger effect
 * - Fade order: random (stable seed), cascade, or radial
 * - Keyframes injected once into document.head
 * - SSR safe
 *
 * @param config - Merged skeleton configuration
 * @param bone - The bone to fragment
 * @returns Array of ShatterSquareStyle — one per grid square
 */
export function createShatterStyles(
  config: Required<SkeletonConfig>,
  bone: Bone
): ShatterSquareStyle[] {
  const { gridSize, stagger, fadeStyle } = config.shatterConfig;
  const cols = gridSize;
  const squareWidth = bone.width / cols;
  const rows = Math.max(1, Math.round(bone.height / squareWidth));
  const squareHeight = bone.height / rows;
  const baseDuration = 600 / config.speed;
  const animationName = `skelter-shatter-${Math.round(baseDuration)}`;

  const keyframes = `
    @keyframes ${animationName} {
      0%   { opacity: 1; }
      50%  { opacity: 0; }
      100% { opacity: 1; }
    }
  `;

  injectKeyframes(animationName, keyframes);

  // Build squares
  const squares: ShatterSquareStyle[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      squares.push({
        x: col * squareWidth,
        y: row * squareHeight,
        width: squareWidth,
        height: squareHeight,
        style: {},
      });
    }
  }

  const count = squares.length;
  const seed = stableHash(bone.x, bone.y);

  // Compute trigger order
  let triggerOrder: number[];

  if (fadeStyle === 'cascade') {
    triggerOrder = Array.from({ length: count }, (_, i) => i);
  } else if (fadeStyle === 'radial') {
    const centerX = bone.width / 2;
    const centerY = bone.height / 2;
    triggerOrder = Array.from({ length: count }, (_, i) => i).sort((a, b) => {
      const sa = squares[a];
      const sb = squares[b];
      const da = Math.sqrt(
        Math.pow(sa.x + sa.width / 2 - centerX, 2) +
          Math.pow(sa.y + sa.height / 2 - centerY, 2)
      );
      const db = Math.sqrt(
        Math.pow(sb.x + sb.width / 2 - centerX, 2) +
          Math.pow(sb.y + sb.height / 2 - centerY, 2)
      );
      return da - db;
    });
  } else {
    triggerOrder = stableRandomOrder(count, seed);
  }

  // Apply animation delay based on trigger order
  triggerOrder.forEach((squareIndex, orderIndex) => {
    const delay = orderIndex * stagger;
    const totalCycle = count * stagger;

    squares[squareIndex].style = {
      animation: `${animationName} ${baseDuration + totalCycle}ms ease-in-out infinite`,
      animationDelay: `${delay}ms`,
    };
  });

  return squares;
}
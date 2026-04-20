import { Animated } from 'react-native';
import type { Bone, SkeletonConfig } from '../../../core/types';

/**
 * A single square in the shatter grid.
 */
export interface ShatterSquare {
  x: number;
  y: number;
  width: number;
  height: number;
  animatedValue: Animated.Value;
}

/**
 * Result returned by createShatterAnimation.
 */
export interface ShatterResult {
  squares: ShatterSquare[];
  start: () => void;
  stop: () => void;
}

/**
 * Deterministic hash function — same x,y always returns same value.
 * Used to generate a stable random order for shatter squares.
 *
 * @param x - Bone x position
 * @param y - Bone y position
 * @returns A number between 0 and 1
 */
function stableHash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

/**
 * Generates a stable pseudo-random order for square indices.
 *
 * @param count - Total number of squares
 * @param seed - Seed derived from bone position
 * @returns Array of indices in stable random order
 */
function stableRandomOrder(count: number, seed: number): number[] {
  const indices = Array.from({ length: count }, (_, i) => i);
  // Fisher-Yates shuffle with deterministic seed
  let s = seed;
  for (let i = indices.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

/**
 * Computes the trigger order for squares based on fadeStyle.
 *
 * @param squares - The shatter squares
 * @param bone - The bone being shattered
 * @param fadeStyle - The fade style
 * @param seed - Deterministic seed
 * @returns Array of square indices in trigger order
 */
function computeTriggerOrder(
  squares: ShatterSquare[],
  bone: Bone,
  fadeStyle: 'random' | 'cascade' | 'radial',
  seed: number
): number[] {
  const count = squares.length;

  if (fadeStyle === 'cascade') {
    // Left to right, row by row — natural index order
    return Array.from({ length: count }, (_, i) => i);
  }

  if (fadeStyle === 'radial') {
    const centerX = bone.x + bone.width / 2;
    const centerY = bone.y + bone.height / 2;

    // Sort by distance from bone center — closest first
    return Array.from({ length: count }, (_, i) => i).sort((a, b) => {
      const squareA = squares[a];
      const squareB = squares[b];
      const distA = Math.sqrt(
        Math.pow(squareA.x + squareA.width / 2 - centerX, 2) +
          Math.pow(squareA.y + squareA.height / 2 - centerY, 2)
      );
      const distB = Math.sqrt(
        Math.pow(squareB.x + squareB.width / 2 - centerX, 2) +
          Math.pow(squareB.y + squareB.height / 2 - centerY, 2)
      );
      return distA - distB;
    });
  }

  // random — stable order using deterministic seed
  return stableRandomOrder(count, Math.floor(seed * 0xffffffff));
}

/**
 * Creates the shatter animation — Skelter's signature effect.
 *
 * Subdivides a bone into a grid of small squares.
 * Each square fades out and back in with a staggered delay,
 * creating a fragmentation effect unique to Skelter.
 *
 * - Grid size controlled by config.shatterConfig.gridSize
 * - Stagger delay between squares via config.shatterConfig.stagger
 * - Fade order: random (stable seed), cascade, or radial
 * - useNativeDriver: true on all animations
 * - Cleanup stops all animations on unmount
 *
 * @param config - Merged skeleton configuration
 * @param bone - The bone to fragment
 * @returns ShatterResult with squares, start and stop
 */
export function createShatterAnimation(
  config: Required<SkeletonConfig>,
  bone: Bone
): ShatterResult {
  const { gridSize, stagger, fadeStyle } = config.shatterConfig;
  const cols = gridSize;
  const squareWidth = bone.width / cols;
  const rows = Math.max(1, Math.round(bone.height / squareWidth));
  const squareHeight = bone.height / rows;
  const baseDuration = 600 / config.speed;

  // Build the grid of squares
  const squares: ShatterSquare[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      squares.push({
        x: bone.x + col * squareWidth,
        y: bone.y + row * squareHeight,
        width: squareWidth,
        height: squareHeight,
        animatedValue: new Animated.Value(1),
      });
    }
  }

  const seed = stableHash(bone.x, bone.y);
  const triggerOrder = computeTriggerOrder(squares, bone, fadeStyle, seed);
  const animations: Animated.CompositeAnimation[] = [];

  const start = () => {
    // Reset all to visible
    squares.forEach((sq) => sq.animatedValue.setValue(1));

    triggerOrder.forEach((squareIndex, orderIndex) => {
      const square = squares[squareIndex];
      const delay = orderIndex * stagger;

      const anim = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(square.animatedValue, {
            toValue: 0,
            duration: baseDuration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(square.animatedValue, {
            toValue: 1,
            duration: baseDuration / 2,
            useNativeDriver: true,
          }),
          // Pause before next loop so not all squares cycle at same time
          Animated.delay(triggerOrder.length * stagger - delay),
        ])
      );

      animations.push(anim);
      anim.start();
    });
  };

  const stop = () => {
    animations.forEach((anim) => anim.stop());
    animations.length = 0;
    squares.forEach((sq) => sq.animatedValue.setValue(1));
  };

  return { squares, start, stop };
}
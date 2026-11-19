import type { Bone } from './types';

/** Default gap (px) kept between two bones that would otherwise touch. */
export const ACCURATE_BONES_GAP = 2;

/** A bone may lose at most this share of its size to make room for a gap. */
const MAX_SHRINK_RATIO = 0.3;

/** `accurateBones` option: `true`/omitted = default gap, `false` = off, `{ gap }` = custom. */
export type AccurateBonesOption = boolean | { gap?: number };

/** Resolves the option to a gap in px (0 = disabled). */
export function resolveBoneGap(option: AccurateBonesOption | undefined): number {
  if (option === false) return 0;
  if (option === undefined || option === true) return ACCURATE_BONES_GAP;
  return Math.max(0, option.gap ?? ACCURATE_BONES_GAP);
}

const isGapCandidate = (b: Bone) => !b.isBox && !b.isParagraph;

/**
 * Opens a gap between bones that touch (or nearly touch), so stacked or
 * side-by-side elements never merge into one block when the real layout has no
 * spacing between them. Each of the two bones gives up half of the missing
 * space, never more than MAX_SHRINK_RATIO of its own size. Intentional
 * overlaps (SkeletonBox backgrounds, paragraph lines) are left alone.
 * Pure: returns new bone objects, the input is not mutated.
 */
export function applyBoneGap(bones: Bone[], gap: number): Bone[] {
  if (gap <= 0 || bones.length < 2) return bones;
  const out = bones.map(b => ({ ...b }));

  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      const a = out[i];
      const b = out[j];
      if (!isGapCandidate(a) || !isGapCandidate(b)) continue;

      const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

      // Stacked: horizontal overlap, vertical distance below the gap.
      if (overlapX > 0 && overlapY <= 0 && -overlapY < gap) {
        const [top, bottom] = a.y <= b.y ? [a, b] : [b, a];
        const missing = gap + overlapY;
        const give = Math.min(missing / 2, top.height * MAX_SHRINK_RATIO, bottom.height * MAX_SHRINK_RATIO);
        top.height -= give;
        bottom.y += give;
        bottom.height -= give;
      } else if (overlapY > 0 && overlapX <= 0 && -overlapX < gap) {
        // Side by side: vertical overlap, horizontal distance below the gap.
        const [left, right] = a.x <= b.x ? [a, b] : [b, a];
        const missing = gap + overlapX;
        const give = Math.min(missing / 2, left.width * MAX_SHRINK_RATIO, right.width * MAX_SHRINK_RATIO);
        left.width -= give;
        right.x += give;
        right.width -= give;
      }
    }
  }
  return out;
}

/**
 * Dev hint only (never used to draw a bone): true when a short Text fills most
 * of the component width, which usually means it stretches in a column and the
 * developer forgot `alignSelf: 'flex-start'`.
 */
export function isStretchedText(
  layout: { type: string; width: number; textContentWidth?: number; paragraphLines?: number },
  rootWidth: number
): boolean {
  if (layout.type !== 'text' || layout.paragraphLines !== undefined) return false;
  if (!layout.textContentWidth || layout.textContentWidth <= 0) return false;
  return layout.width >= rootWidth * 0.8 && layout.textContentWidth < layout.width * 0.6;
}

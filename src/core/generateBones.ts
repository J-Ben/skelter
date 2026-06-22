import type { Bone, BoneTree } from './types';
import {
  PARAGRAPH_LAST_LINE_RATIO,
  PARAGRAPH_LINE_GAP_RATIO,
  PARAGRAPH_LINE_WIDTH_MIN,
  PARAGRAPH_WORD_GAP_RATIO,
  PARAGRAPH_WORD_WIDTH_RATIO,
} from './constants';

/**
 * Deterministic pseudo-random value in [0, 1), stable for a given seed.
 * Used so paragraph line/word widths never flicker between renders.
 */
function hash(seed: number): number {
  const s = Math.sin(seed * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Deterministic width ratio for a body paragraph line, between
 * PARAGRAPH_LINE_WIDTH_MIN and 1.0, so the right edge looks naturally ragged.
 */
function bodyLineRatio(i: number): number {
  return PARAGRAPH_LINE_WIDTH_MIN + hash(i + 1) * (1 - PARAGRAPH_LINE_WIDTH_MIN);
}

/**
 * Word mode : fills a single line with word-sized bones separated by gaps.
 * The words exactly span [lineX, lineX + lineWidth] with deterministic widths.
 *
 * @param bones      - Accumulator
 * @param lineX      - Left edge of the line (already aligned)
 * @param lineY      - Top of the line
 * @param lineWidth  - Total width available for the line
 * @param lineHeight - Height of each word bone
 * @param borderRadius - Corner radius to apply
 * @param lineIndex  - Line index, seeds the per-word variation
 */
function pushWordBones(
  bones: Bone[],
  lineX: number,
  lineY: number,
  lineWidth: number,
  lineHeight: number,
  borderRadius: number,
  lineIndex: number
): void {
  const gap = lineHeight * PARAGRAPH_WORD_GAP_RATIO;
  const avgWord = lineHeight * PARAGRAPH_WORD_WIDTH_RATIO;
  const count = Math.max(2, Math.round(lineWidth / (avgWord + gap)));
  const contentWidth = Math.max(0, lineWidth - gap * (count - 1));

  // Deterministic weights → normalised so the words fill contentWidth exactly.
  const weights: number[] = [];
  let total = 0;
  for (let w = 0; w < count; w++) {
    const r = 0.6 + hash(lineIndex * 31.7 + w * 7.13) * 0.8; // 0.6..1.4
    weights.push(r);
    total += r;
  }

  let cursor = lineX;
  for (let w = 0; w < count; w++) {
    const wordWidth = contentWidth * (weights[w] / total);
    bones.push({ x: cursor, y: lineY, width: wordWidth, height: lineHeight, borderRadius, type: 'text' });
    cursor += wordWidth + gap;
  }
}

/**
 * Splits a measured paragraph block into evenly spaced line bones.
 *
 * The original block height is divided across `lines` lines plus the gaps
 * between them, so the skeleton stays within the space the real text occupies.
 * Body lines get a slightly varied width (ragged right edge) and the last line
 * is shortened to PARAGRAPH_LAST_LINE_RATIO, mimicking the end of a paragraph.
 * Per-line slack is positioned according to paragraphAlign.
 *
 * @param node  - The paragraph BoneTree node (layout.paragraphLines is set)
 * @param bones - Accumulator array for collected bones
 */
function pushParagraphBones(node: BoneTree, bones: Bone[]): void {
  const { x, y, width, height, borderRadius, type } = node.layout;
  const lines = Math.max(1, Math.floor(node.layout.paragraphLines ?? 1));

  // height = lines·lineHeight + (lines-1)·gap, with gap = ratio·lineHeight
  const lineHeight = height / (lines + (lines - 1) * PARAGRAPH_LINE_GAP_RATIO);
  const gap = lineHeight * PARAGRAPH_LINE_GAP_RATIO;

  const align = node.layout.paragraphAlign ?? 'left';
  const words = node.layout.paragraphWords === true;
  const radius = borderRadius ?? 0;

  for (let i = 0; i < lines; i++) {
    const isLast = i === lines - 1;
    const ratio = isLast && lines > 1 ? PARAGRAPH_LAST_LINE_RATIO : bodyLineRatio(i);
    const lineWidth = width * ratio;
    const lineY = y + i * (lineHeight + gap);
    // Position each line's slack per alignment: left = ragged right (x stays),
    // right = flush right, center = centred.
    const slack = width - lineWidth;
    const lineX = align === 'right' ? x + slack : align === 'center' ? x + slack / 2 : x;

    if (words) {
      pushWordBones(bones, lineX, lineY, lineWidth, lineHeight, radius, i);
    } else {
      bones.push({ x: lineX, y: lineY, width: lineWidth, height: lineHeight, borderRadius: radius, type, isParagraph: true });
    }
  }
}

/**
 * Checks whether a BoneTree node has valid dimensions.
 * Nodes with zero width or height are invisible and should be excluded.
 *
 * @param node - The BoneTree node to validate
 * @returns true if the node has non-zero dimensions
 */
function hasValidDimensions(node: BoneTree): boolean {
  return node.layout.width > 0 && node.layout.height > 0;
}

/**
 * Recursively traverses a BoneTree and collects all valid Bone instances.
 * Nodes with zero dimensions are filtered out.
 * The tree hierarchy is flattened into a single array of bones
 * ready to be rendered as skeleton placeholders.
 *
 * @param node - The current BoneTree node to process
 * @param bones - Accumulator array for collected bones
 */
function collectBones(node: BoneTree, bones: Bone[]): void {
  if (!hasValidDimensions(node)) {
    return;
  }

  const isLeaf = node.children.length === 0;
  const isContent = node.layout.type === 'text' || node.layout.type === 'image';
  // Explicitly marked SkeletonBox: emit the box at reduced opacity first
  // (background layer), then recurse so children appear on top at full opacity.
  const isSkeletonBox = node.layout.isSkeletonBox === true;
  // SkeletonIgnore nodes — skip entirely (no bone, no recursion)
  if (node.layout.isSkeletonIgnore) return;

  // SkeletonParagraph — replace the single block with stacked line bones,
  // then stop : its inner text child must not also produce a bone.
  if (node.layout.paragraphLines && node.layout.paragraphLines > 0) {
    pushParagraphBones(node, bones);
    return;
  }

  if (isLeaf || isContent) {
    bones.push({
      x: node.layout.x,
      y: node.layout.y,
      width: node.layout.width,
      height: node.layout.height,
      borderRadius: node.layout.borderRadius ?? 0,
      type: node.layout.type,
    });
  } else if (isSkeletonBox) {
    bones.push({
      x: node.layout.x,
      y: node.layout.y,
      width: node.layout.width,
      height: node.layout.height,
      borderRadius: node.layout.borderRadius ?? 0,
      type: node.layout.type,
      opacity: 0.25,
      isStatic: true,
    });
    for (const child of node.children) {
      collectBones(child, bones);
    }
  } else {
    // Container view with children : skip generating a bone for the container
    // itself (avoids a large gray block covering all children) and recurse.
    for (const child of node.children) {
      collectBones(child, bones);
    }
  }
}

/**
 * Generates a flat array of Bone instances from a measured component tree.
 *
 * This is the core transformation function of Skelter.
 * It takes the BoneTree captured at runtime via layout measurement
 * and converts it into a flat list of positioned placeholder blocks.
 *
 * - Filters out elements with zero width or height
 * - Preserves element type (view / image / text)
 * - Flattens the hierarchy while respecting parent/child order
 * - Pure function : no side effects, no external dependencies
 *
 * @param boneTree - The root of the measured component tree
 * @returns A flat array of Bone instances ready for rendering
 *
 * @example
 * const bones = generateBones(measuredTree);
 * // bones → [{ x, y, width, height, borderRadius, type }, ...]
 */
export function generateBones(boneTree: BoneTree): Bone[] {
  const bones: Bone[] = [];
  collectBones(boneTree, bones);
  return bones;
}
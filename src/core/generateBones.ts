import type { Bone, BoneTree } from './types';

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

  bones.push({
    x: node.layout.x,
    y: node.layout.y,
    width: node.layout.width,
    height: node.layout.height,
    borderRadius: 0,
    type: node.layout.type,
  });

  for (const child of node.children) {
    collectBones(child, bones);
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
 * - Pure function — no side effects, no external dependencies
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
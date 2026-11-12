import { generateBones } from '../generateBones';
import { PARAGRAPH_LAST_LINE_RATIO, PARAGRAPH_LINE_WIDTH_MIN } from '../constants';
import type { BoneTree } from '../types';

function paragraphTree(lines: number): BoneTree {
  return {
    layout: { x: 10, y: 20, width: 200, height: 90, type: 'text', paragraphLines: lines },
    children: [],
  };
}

describe('generateBones — paragraph splitting', () => {
  it('splits a paragraph block into the requested number of line bones', () => {
    const bones = generateBones(paragraphTree(3));
    expect(bones).toHaveLength(3);
  });

  it('keeps all lines at the block x and within the block height', () => {
    const bones = generateBones(paragraphTree(3));
    const block = paragraphTree(3).layout;
    for (const bone of bones) {
      expect(bone.x).toBe(block.x);
      expect(bone.y).toBeGreaterThanOrEqual(block.y);
      expect(bone.y + bone.height).toBeLessThanOrEqual(block.y + block.height + 0.001);
      expect(bone.type).toBe('text');
    }
  });

  it('varies body line widths and shortens the last line the most', () => {
    const bones = generateBones(paragraphTree(3));
    const block = paragraphTree(3).layout;
    // Body lines: ragged but within [MIN, 1.0] of block width
    for (const i of [0, 1]) {
      expect(bones[i].width).toBeGreaterThanOrEqual(block.width * PARAGRAPH_LINE_WIDTH_MIN);
      expect(bones[i].width).toBeLessThanOrEqual(block.width);
      expect(bones[i].width).toBeGreaterThan(bones[2].width);
    }
    // Last line: the shortest
    expect(bones[2].width).toBeCloseTo(block.width * PARAGRAPH_LAST_LINE_RATIO);
  });

  it('produces stable widths across calls (deterministic, no flicker)', () => {
    const a = generateBones(paragraphTree(4)).map(b => b.width);
    const b = generateBones(paragraphTree(4)).map(b => b.width);
    expect(a).toEqual(b);
  });

  it('does not shorten a single line to the last-line ratio', () => {
    const bones = generateBones(paragraphTree(1));
    expect(bones).toHaveLength(1);
    expect(bones[0].width).toBeGreaterThan(200 * PARAGRAPH_LAST_LINE_RATIO);
    expect(bones[0].width).toBeLessThanOrEqual(200);
  });

  it('aligns the shortened last line left by default', () => {
    const bones = generateBones(paragraphTree(3));
    expect(bones[2].x).toBe(10); // block x
  });

  it('right-aligns the last line to the block right edge', () => {
    const tree = paragraphTree(3);
    tree.layout.paragraphAlign = 'right';
    const bones = generateBones(tree);
    const block = tree.layout;
    expect(bones[2].x + bones[2].width).toBeCloseTo(block.x + block.width);
  });

  it('centers the last line within the block', () => {
    const tree = paragraphTree(3);
    tree.layout.paragraphAlign = 'center';
    const bones = generateBones(tree);
    const block = tree.layout;
    const slack = block.width - bones[2].width;
    expect(bones[2].x).toBeCloseTo(block.x + slack / 2);
  });

  it('word mode splits each line into multiple word bones within the block', () => {
    const tree = paragraphTree(3);
    tree.layout.paragraphWords = true;
    const bones = generateBones(tree);
    const block = tree.layout;
    // Many more bones than lines (each line → several words)
    expect(bones.length).toBeGreaterThan(3 * 2);
    for (const bone of bones) {
      expect(bone.x).toBeGreaterThanOrEqual(block.x - 0.001);
      expect(bone.x + bone.width).toBeLessThanOrEqual(block.x + block.width + 0.001);
      expect(bone.width).toBeGreaterThan(0);
      expect(bone.type).toBe('text');
    }
  });

  it('word mode is deterministic across calls', () => {
    const make = () => {
      const t = paragraphTree(4);
      t.layout.paragraphWords = true;
      return generateBones(t).map(b => [b.x, b.width]);
    };
    expect(make()).toEqual(make());
  });

  it('falls back to normal bone emission when paragraphLines is absent', () => {
    const tree: BoneTree = {
      layout: { x: 0, y: 0, width: 100, height: 16, type: 'text' },
      children: [],
    };
    expect(generateBones(tree)).toHaveLength(1);
  });
});

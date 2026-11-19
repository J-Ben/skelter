import { applyBoneGap, resolveBoneGap, ACCURATE_BONES_GAP } from '../accurateBones';
import type { Bone } from '../types';

const bone = (x: number, y: number, width: number, height: number, extra: Partial<Bone> = {}): Bone => ({
  x, y, width, height, borderRadius: 0, type: 'text', ...extra,
});

describe('resolveBoneGap', () => {
  it('is on by default, off with false, custom with { gap }', () => {
    expect(resolveBoneGap(undefined)).toBe(ACCURATE_BONES_GAP);
    expect(resolveBoneGap(true)).toBe(ACCURATE_BONES_GAP);
    expect(resolveBoneGap(false)).toBe(0);
    expect(resolveBoneGap({ gap: 8 })).toBe(8);
    expect(resolveBoneGap({})).toBe(ACCURATE_BONES_GAP);
  });
});

describe('applyBoneGap', () => {
  it('opens a gap between two stacked bones that touch', () => {
    const [a, b] = applyBoneGap([bone(0, 0, 100, 20), bone(0, 20, 100, 20)], 4);
    expect(b.y - (a.y + a.height)).toBeCloseTo(4);
  });

  it('opens a gap between two bones side by side', () => {
    const [a, b] = applyBoneGap([bone(0, 0, 50, 20), bone(50, 0, 50, 20)], 4);
    expect(b.x - (a.x + a.width)).toBeCloseTo(4);
  });

  it('leaves bones that are already far enough untouched', () => {
    const input = [bone(0, 0, 100, 20), bone(0, 30, 100, 20)];
    expect(applyBoneGap(input, 4)).toEqual(input);
  });

  it('does not shrink a bone by more than 30%', () => {
    const [a, b] = applyBoneGap([bone(0, 0, 100, 4), bone(0, 4, 100, 4)], 20);
    expect(a.height).toBeGreaterThanOrEqual(4 * 0.7 - 0.001);
    expect(b.height).toBeGreaterThanOrEqual(4 * 0.7 - 0.001);
  });

  it('ignores SkeletonBox backgrounds and paragraph lines', () => {
    const input = [bone(0, 0, 100, 100, { isBox: true }), bone(0, 0, 100, 20), bone(0, 20, 100, 20, { isParagraph: true })];
    expect(applyBoneGap(input, 4)).toEqual(input);
  });

  it('does nothing with gap 0 and does not mutate its input', () => {
    const input = [bone(0, 0, 100, 20), bone(0, 20, 100, 20)];
    expect(applyBoneGap(input, 0)).toBe(input);
    applyBoneGap(input, 4);
    expect(input[1].y).toBe(20);
  });
});

describe('isStretchedText', () => {
  const { isStretchedText } = jest.requireActual('../accurateBones');
  it('flags a short text that fills the container', () => {
    expect(isStretchedText({ type: 'text', width: 300, textContentWidth: 80 }, 330)).toBe(true);
  });
  it('does not flag a text that really fills the line, a narrow bone, or a paragraph', () => {
    expect(isStretchedText({ type: 'text', width: 300, textContentWidth: 290 }, 330)).toBe(false);
    expect(isStretchedText({ type: 'text', width: 80, textContentWidth: 40 }, 330)).toBe(false);
    expect(isStretchedText({ type: 'text', width: 300, textContentWidth: 80, paragraphLines: 2 }, 330)).toBe(false);
    expect(isStretchedText({ type: 'view', width: 300, textContentWidth: 80 }, 330)).toBe(false);
  });
});

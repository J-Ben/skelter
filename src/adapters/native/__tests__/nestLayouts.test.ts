import { nestLayouts } from '../measureLayout';
import { generateBones } from '../../../core/generateBones';
import type { MeasuredLayout } from '../../../core/types';

const frame: MeasuredLayout = { x: 0, y: 0, width: 300, height: 100, type: 'view', isSkeletonBox: true };
const pastille: MeasuredLayout = { x: 12, y: 12, width: 40, height: 40, type: 'view', isSkeletonBox: true };
const icon: MeasuredLayout = { x: 22, y: 22, width: 20, height: 20, type: 'image' };
const title: MeasuredLayout = { x: 64, y: 12, width: 120, height: 20, type: 'text' };

describe('nestLayouts', () => {
  it('keeps leaves at root level when there is no box (v3 behaviour)', () => {
    expect(nestLayouts([icon, title]).map(n => n.layout)).toEqual([icon, title]);
  });

  it('gives each leaf to its innermost box and draws boxes largest first', () => {
    // Collected in DFS order : the outer box comes first, as in a real walk.
    const bones = generateBones({
      layout: { x: 0, y: 0, width: 300, height: 100, type: 'view' },
      children: nestLayouts([frame, pastille, icon, title]),
    });
    const order = bones.map(b => `${b.width}x${b.height}`);
    expect(order).toEqual(['300x100', '120x20', '40x40', '20x20']);
    // The icon is drawn after (= above) its pastille, never under it.
    expect(order.indexOf('20x20')).toBeGreaterThan(order.indexOf('40x40'));
  });
});

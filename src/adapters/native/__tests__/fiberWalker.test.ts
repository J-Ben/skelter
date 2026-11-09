import { measureFiberLeaves } from '../fiberWalker';
import { composite, host, instanceOf } from './fiberTree';

const OPTIONS = { maxDepth: 20, exclude: [] as string[] };

/**
 * A typical list card, as rendered inside the warmup wrapper :
 *
 *   warmup View
 *   └─ Card
 *      └─ View (card frame, rounded)
 *         ├─ View (row)
 *         │  ├─ Text (title)
 *         │  └─ Text (amount)
 *         ├─ Text (subtitle)
 *         └─ View (badge) ─ Text (badge label)
 */
function cardTree(badgeProps: Record<string, unknown> = {}) {
  return host('RCTView', { x: 0, y: 0, width: 300, height: 100 }, {}, [
    composite('Card', [
      host('RCTView', { x: 0, y: 0, width: 300, height: 100 }, { style: { borderRadius: 12 } }, [
        host('RCTView', { x: 12, y: 12, width: 276, height: 20 }, {}, [
          host('RCTText', { x: 12, y: 12, width: 120, height: 20 }, { children: 'Client 1' }),
          host('RCTText', { x: 228, y: 12, width: 60, height: 20 }, { children: '20.00 €' }),
        ]),
        host('RCTText', { x: 12, y: 40, width: 90, height: 16 }, { children: 'n°REF-1000' }),
        host('RCTView', { x: 12, y: 64, width: 70, height: 24 }, { style: { borderRadius: 12 }, ...badgeProps }, [
          host('RCTText', { x: 20, y: 68, width: 54, height: 16 }, { children: 'Payée' }),
        ]),
      ]),
    ]),
  ]);
}

function rects(layouts: { x: number; y: number; width: number; height: number }[] | null) {
  return (layouts ?? []).map(l => [l.x, l.y, l.width, l.height]);
}

describe('measureFiberLeaves — v3 behaviour (golden)', () => {
  it('collects only content leaves : layout containers are skipped', async () => {
    const layouts = await measureFiberLeaves(instanceOf(cardTree()), 0, 0, OPTIONS);
    expect(rects(layouts)).toEqual([
      [12, 12, 120, 20],
      [228, 12, 60, 20],
      [12, 40, 90, 16],
      [20, 68, 54, 16],
    ]);
    expect(layouts!.every(l => l.type === 'text')).toBe(true);
  });

  it('positions bones relative to the root page coordinates', async () => {
    const layouts = await measureFiberLeaves(instanceOf(cardTree()), 10, 5, OPTIONS);
    expect(rects(layouts)[0]).toEqual([2, 7, 120, 20]);
  });

  it('collects a bare View with no host children (avatar, colour block)', async () => {
    const tree = host('RCTView', { x: 0, y: 0, width: 100, height: 50 }, {}, [
      host('RCTView', { x: 4, y: 4, width: 40, height: 40 }, { style: { borderRadius: 20 } }),
    ]);
    const layouts = await measureFiberLeaves(instanceOf(tree), 0, 0, OPTIONS);
    expect(rects(layouts)).toEqual([[4, 4, 40, 40]]);
    expect(layouts![0].borderRadius).toBe(20);
    expect(layouts![0].type).toBe('view');
  });

  it('collects a SkeletonBox marker as a box, and still collects its children', async () => {
    const layouts = await measureFiberLeaves(instanceOf(cardTree({ testID: '__skl_box__' })), 0, 0, OPTIONS);
    const box = layouts!.find(l => l.isSkeletonBox);
    expect(box && [box.x, box.y, box.width, box.height]).toEqual([12, 64, 70, 24]);
    expect(rects(layouts)).toContainEqual([20, 68, 54, 16]);
  });

  it('skips a SkeletonIgnore subtree entirely', async () => {
    const layouts = await measureFiberLeaves(instanceOf(cardTree({ testID: '__skl_ignore__' })), 0, 0, OPTIONS);
    expect(rects(layouts)).not.toContainEqual([20, 68, 54, 16]);
    expect(layouts).toHaveLength(3);
  });

  it('collects a SkeletonParagraph as one block and skips its inner text', async () => {
    const tree = host('RCTView', { x: 0, y: 0, width: 300, height: 80 }, {}, [
      host('RCTView', { x: 0, y: 0, width: 300, height: 60 }, { testID: '__skl_para_3__' }, [
        host('RCTText', { x: 0, y: 0, width: 300, height: 60 }, { children: 'Lorem ipsum' }),
      ]),
    ]);
    const layouts = await measureFiberLeaves(instanceOf(tree), 0, 0, OPTIONS);
    expect(layouts).toHaveLength(1);
    expect(layouts![0].paragraphLines).toBe(3);
  });

  it('drops elements measured with a zero dimension (empty text)', async () => {
    const tree = host('RCTView', { x: 0, y: 0, width: 300, height: 40 }, {}, [
      host('RCTText', { x: 0, y: 0, width: 0, height: 20 }, { children: '' }),
      host('RCTText', { x: 0, y: 20, width: 80, height: 20 }, { children: 'ok' }),
    ]);
    const layouts = await measureFiberLeaves(instanceOf(tree), 0, 0, OPTIONS);
    expect(rects(layouts)).toEqual([[0, 20, 80, 20]]);
  });

  it('returns null when no fiber is reachable from the instance', async () => {
    await expect(measureFiberLeaves({}, 0, 0, OPTIONS)).resolves.toBeNull();
  });
});

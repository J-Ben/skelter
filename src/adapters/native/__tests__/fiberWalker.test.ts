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

describe('measureFiberLeaves — walk stays inside the measured root', () => {
  /**
   * The warmup View is rendered next to the hidden real-content View inside
   * the HOC. Walking from the warmup fiber must not leak into that sibling,
   * or every leaf of the real content is measured a second time.
   */
  it('does not collect leaves from the siblings of the root fiber', async () => {
    const warmup = cardTree({ testID: '__skl_box__' });
    const realContent = cardTree({ testID: '__skl_box__' });
    warmup.sibling = realContent;
    const layouts = await measureFiberLeaves(instanceOf(warmup), 0, 0, OPTIONS);
    expect(layouts!.filter(l => l.isSkeletonBox)).toHaveLength(1);
    expect(layouts).toHaveLength(5);
  });
});

describe('measureFiberLeaves — skipIds (v4)', () => {
  it('collects a skipped container as one solid bone and ignores its children', async () => {
    const layouts = await measureFiberLeaves(instanceOf(cardTree({ nativeID: 'badge' })), 0, 0, {
      ...OPTIONS,
      skipIds: ['badge'],
    });
    expect(rects(layouts)).toContainEqual([12, 64, 70, 24]);
    expect(rects(layouts)).not.toContainEqual([20, 68, 54, 16]);
    expect(layouts).toHaveLength(4);
    const badge = layouts!.find(l => l.width === 70)!;
    expect(badge.isSkeletonBox).toBeUndefined();
    expect(badge.borderRadius).toBe(12);
  });

  it('changes nothing when no element carries the id', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const layouts = await measureFiberLeaves(instanceOf(cardTree()), 0, 0, { ...OPTIONS, skipIds: ['missing'] });
    expect(layouts).toHaveLength(4);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"missing"'));
    warn.mockRestore();
  });
});

describe('measureFiberLeaves — skeletonRoot (v4)', () => {
  it('turns the first host element of the component into a box, children still measured', async () => {
    const layouts = await measureFiberLeaves(instanceOf(cardTree()), 0, 0, { ...OPTIONS, skeletonRoot: true });
    const boxes = layouts!.filter(l => l.isSkeletonBox);
    expect(boxes.map(b => [b.x, b.y, b.width, b.height])).toEqual([[0, 0, 300, 100]]);
    expect(boxes[0].borderRadius).toBe(12);
    expect(layouts).toHaveLength(5);
  });

  it('does not change anything when the root is already a SkeletonBox', async () => {
    const tree = host('RCTView', { x: 0, y: 0, width: 300, height: 60 }, {}, [
      host('RCTView', { x: 0, y: 0, width: 300, height: 60 }, { testID: '__skl_box__' }, [
        host('RCTText', { x: 10, y: 10, width: 100, height: 20 }, { children: 'a' }),
      ]),
    ]);
    const plain = await measureFiberLeaves(instanceOf(tree), 0, 0, OPTIONS);
    const withRoot = await measureFiberLeaves(instanceOf(tree), 0, 0, { ...OPTIONS, skeletonRoot: true });
    expect(withRoot).toEqual(plain);
  });

  it('marks the host View under a Pressable-like composite', async () => {
    const tree = host('RCTView', { x: 0, y: 0, width: 300, height: 60 }, {}, [
      composite('Pressable', [
        host('RCTView', { x: 0, y: 0, width: 300, height: 60 }, { style: { borderRadius: 8 } }, [
          host('RCTText', { x: 10, y: 10, width: 100, height: 20 }, { children: 'a' }),
        ]),
      ]),
    ]);
    const layouts = await measureFiberLeaves(instanceOf(tree), 0, 0, { ...OPTIONS, skeletonRoot: true });
    expect(layouts!.filter(l => l.isSkeletonBox)).toHaveLength(1);
  });
});

describe('measureFiberLeaves — rootId (v4)', () => {
  /** Section wrapper (spacing + title) around the actual card. */
  function sectionTree() {
    return host('RCTView', { x: 0, y: 0, width: 320, height: 140 }, {}, [
      host('RCTView', { x: 0, y: 0, width: 320, height: 140 }, { style: { padding: 8 } }, [
        host('RCTText', { x: 8, y: 8, width: 150, height: 14 }, { children: 'Section' }),
        host('RCTView', { x: 8, y: 30, width: 304, height: 100 }, { nativeID: 'card-body', style: { borderRadius: 12 } }, [
          host('RCTText', { x: 20, y: 42, width: 120, height: 20 }, { children: 'Client 1' }),
        ]),
      ]),
    ]);
  }

  it('with skeletonRoot, boxes the rootId element instead of the outer wrapper', async () => {
    const layouts = await measureFiberLeaves(instanceOf(sectionTree()), 0, 0, {
      ...OPTIONS, skeletonRoot: true, rootId: 'card-body',
    });
    const boxes = layouts!.filter(l => l.isSkeletonBox);
    expect(boxes.map(b => [b.x, b.y, b.width, b.height])).toEqual([[8, 30, 304, 100]]);
  });

  it('only walks the rootId subtree, positions stay relative to the whole component', async () => {
    const layouts = await measureFiberLeaves(instanceOf(sectionTree()), 0, 0, { ...OPTIONS, rootId: 'card-body' });
    expect(rects(layouts)).toEqual([[20, 42, 120, 20]]);
  });

  it('falls back to the whole component when the id is unknown', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const layouts = await measureFiberLeaves(instanceOf(sectionTree()), 0, 0, { ...OPTIONS, rootId: 'nope' });
    expect(layouts).toHaveLength(2);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"nope"'));
    warn.mockRestore();
  });
});

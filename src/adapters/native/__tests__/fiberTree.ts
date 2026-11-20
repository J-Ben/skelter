/**
 * Helpers to build fake React Fiber trees for walker tests.
 *
 * A host node mimics a Fabric host fiber : tag 5, a string type, memoizedProps,
 * and a stateNode exposing measure(). A composite node mimics a function
 * component fiber (tag 0) : it has no stateNode and is only traversed.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FakeFiber {
  tag: number;
  type: unknown;
  memoizedProps: Record<string, unknown>;
  stateNode: unknown;
  child: FakeFiber | null;
  sibling: FakeFiber | null;
}

function link(parent: FakeFiber, children: FakeFiber[]): FakeFiber {
  parent.child = children[0] ?? null;
  children.forEach((c, i) => { c.sibling = children[i + 1] ?? null; });
  return parent;
}

/** Host component (View, Text, Image…) measured at `rect` in page coordinates. */
export function host(
  type: string,
  rect: Rect,
  props: Record<string, unknown> = {},
  children: FakeFiber[] = [],
): FakeFiber {
  const node: FakeFiber = {
    tag: 5,
    type,
    memoizedProps: props,
    stateNode: {
      measure: (cb: (...a: number[]) => void) => cb(0, 0, rect.width, rect.height, rect.x, rect.y),
    },
    child: null,
    sibling: null,
  };
  return link(node, children);
}

/** Function component wrapper : traversed, never collected. */
export function composite(name: string, children: FakeFiber[]): FakeFiber {
  const fn = () => null;
  Object.defineProperty(fn, 'name', { value: name });
  const node: FakeFiber = { tag: 0, type: fn, memoizedProps: {}, stateNode: null, child: null, sibling: null };
  return link(node, children);
}

/** Wraps a fiber the way a Fabric public instance exposes it. */
export function instanceOf(fiber: FakeFiber): object {
  return { __internalInstanceHandle: fiber };
}

/** Builds sibling links for top-level fibers (e.g. warmup View + real content View). */
export function siblings(...fibers: FakeFiber[]): FakeFiber {
  fibers.forEach((f, i) => { f.sibling = fibers[i + 1] ?? null; });
  return fibers[0];
}

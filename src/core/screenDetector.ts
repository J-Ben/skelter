/**
 * Screen detection via upward fiber walk.
 *
 * Walks UP the React fiber tree from any mounted node to find the topmost
 * ancestor with a non-null key. Navigation libraries (React Navigation,
 * Expo Router, React Router) always assign a stable key to their screen-level
 * fibers (e.g. "Profile-abc123"). Taking the TOPMOST key skips lower-level
 * keys that come from FlatList items, map() calls, etc.
 *
 * Returns null when no keyed ancestor is found (no navigation library in use).
 */

// Stop walking when we reach known app root boundaries
const ROOT_NAMES = new Set([
  'NavigationContainer',
  'Router', 'BrowserRouter', 'MemoryRouter', 'HashRouter', 'StaticRouter',
]);

type FiberNode = Record<string, unknown>;

function getFiberTypeName(fiber: FiberNode): string {
  const t = fiber.type;
  if (typeof t === 'string') return t;
  if (t && typeof t === 'object') {
    const vc = t as Record<string, unknown>;
    if (typeof vc.uiViewClassName === 'string') return vc.uiViewClassName;
  }
  const fn = t as { displayName?: string; name?: string } | null;
  return fn?.displayName ?? fn?.name ?? '';
}

/**
 * Walk UP from a fiber and return the topmost ancestor that has a non-null key.
 * The topmost keyed ancestor is the screen boundary because:
 * - Navigation library screen keys sit near the root
 * - FlatList / map() item keys are lower in the tree
 */
function walkUpForScreenKey(startFiber: FiberNode): ScreenAncestor | null {
  let node = startFiber.return as FiberNode | null;
  let result: ScreenAncestor | null = null;

  while (node) {
    const name = getFiberTypeName(node);
    if (ROOT_NAMES.has(name)) break;

    if (node.key != null) {
      // Keep overwriting so we end up with the highest (closest to root) key
      result = { key: String(node.key), name };
    }

    node = node.return as FiberNode | null;
  }

  return result;
}

// ── Fiber access helpers ──────────────────────────────────────────────────────

/** Property names that expose the internal fiber on React Native instances */
const NATIVE_FIBER_KEYS = [
  '_reactInternals',
  '_reactFiber',
  '__internalFiberInstanceHandleDEV',
  '__internalInstanceHandle',
] as const;

function getFiberFromNativeInstance(instance: object): FiberNode | null {
  for (const key of NATIVE_FIBER_KEYS) {
    if (key in instance) return (instance as Record<string, unknown>)[key] as FiberNode;
  }
  return null;
}

function getFiberFromDOMNode(el: Element): FiberNode | null {
  // React 16-18 attaches the fiber on `__reactFiber$<randomSuffix>` or
  // `__reactInternalInstance$<randomSuffix>` on DOM nodes in development.
  const node = el as unknown as Record<string, unknown>;
  const keys = Object.keys(node);
  for (const k of keys) {
    if (k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')) {
      return node[k] as FiberNode;
    }
  }
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface ScreenAncestor {
  /** Stable key assigned by the navigation library (e.g. "Profile-abc123"). */
  key: string;
  /** Display name of the component at the screen boundary. */
  name: string;
}

/**
 * Detects the screen ancestor for a React Native component.
 * Pass `ref.current` from any ref attached to a View inside the component.
 */
export function detectScreenFromNativeInstance(instance: object | null): ScreenAncestor | null {
  if (!instance) return null;
  const fiber = getFiberFromNativeInstance(instance);
  if (!fiber) return null;
  try {
    return walkUpForScreenKey(fiber);
  } catch {
    return null;
  }
}

/**
 * Detects the screen ancestor for a web component.
 * Pass `ref.current` from any ref attached to a DOM element inside the component.
 */
export function detectScreenFromDOMNode(el: Element | null): ScreenAncestor | null {
  if (!el) return null;
  const fiber = getFiberFromDOMNode(el);
  if (!fiber) return null;
  try {
    return walkUpForScreenKey(fiber);
  } catch {
    return null;
  }
}

/**
 * Fiber tree walker for per-element skeleton measurement.
 *
 * Accesses the React Fiber tree from a host component ref, finds all native
 * leaf nodes (View, Text, Image…), and measures each one with
 * `stateNode.measure()` which is compatible with both Old Architecture
 * (UIManager) and New Architecture (Fabric/JSI).
 *
 * Falls back to null if fibers are unavailable (hermetic envs, test runners).
 */

import { StyleSheet } from 'react-native';
import type { MeasuredLayout, ElementType } from '../../core/types';

// ─── Leaf registry ───────────────────────────────────────────────────────────

/**
 * Native component names that are treated as skeleton leaf elements.
 * Each one becomes its own Bone.
 */
const NATIVE_LEAVES = new Set([
  // Views
  'View', 'RCTView',
  'ScrollView', 'RCTScrollView',
  'Pressable',
  'TouchableOpacity', 'TouchableHighlight', 'TouchableNativeFeedback',
  // Text
  'Text', 'RCTText', 'RCTVirtualText',
  'TextInput', 'RCTSinglelineTextInputView', 'RCTMultilineTextInputView',
  // Image
  'Image', 'RCTImage', 'RCTImageView',
]);

/**
 * User-registered third-party components treated as leaves.
 * Example: registerSkeletonLeaf('FastImage', 'ExpoImage')
 */
const USER_LEAVES = new Set<string>();

export function registerSkeletonLeaf(...names: string[]): void {
  names.forEach(n => USER_LEAVES.add(n));
}

function isLeaf(typeName: string): boolean {
  return NATIVE_LEAVES.has(typeName) || USER_LEAVES.has(typeName);
}

function getElementType(typeName: string): ElementType {
  const lower = typeName.toLowerCase();
  if (lower.includes('image')) return 'image';
  if (lower.includes('text')) return 'text';
  return 'view';
}

// ─── Fiber access ────────────────────────────────────────────────────────────

/** Property names used by React versions to expose the internal Fiber. */
const FIBER_KEYS = [
  '_reactInternals',
  '_reactFiber',
  '__internalFiberInstanceHandleDEV',
] as const;

function getFiber(instance: object): unknown {
  for (const key of FIBER_KEYS) {
    if (key in instance) return (instance as Record<string, unknown>)[key];
  }
  return null;
}

// ─── Fiber walk ──────────────────────────────────────────────────────────────

interface CollectedNode {
  stateNode: unknown;      // Native instance — exposes .measure()
  nativeTag: number;       // Fallback for UIManager path
  type: ElementType;
  borderRadius?: number;
}

/**
 * Depth-first walk of the Fiber tree rooted at `fiber`.
 * Collects host component fibers (string type) that are leaf elements.
 * Recurses into siblings at the same depth level.
 */
function walkFiber(
  fiber: Record<string, unknown>,
  depth: number,
  maxDepth: number,
  excludeSet: Set<string>,
  out: CollectedNode[]
): void {
  if (!fiber || depth > maxDepth) return;

  const fiberType = fiber.type;
  const typeName: string =
    typeof fiberType === 'string'
      ? fiberType
      : (fiberType as { displayName?: string; name?: string })?.displayName ??
        (fiberType as { name?: string })?.name ??
        '';

  if (excludeSet.has(typeName)) {
    // Excluded — traverse siblings but not children
    if (fiber.sibling) {
      walkFiber(fiber.sibling as Record<string, unknown>, depth, maxDepth, excludeSet, out);
    }
    return;
  }

  if (typeof fiberType === 'string' && isLeaf(typeName)) {
    const stateNode = fiber.stateNode as Record<string, unknown> | number | null;
    let nativeTag = 0;

    if (typeof stateNode === 'number') {
      nativeTag = stateNode;
    } else if (stateNode && typeof stateNode === 'object' && 'nativeTag' in stateNode) {
      nativeTag = (stateNode as { nativeTag: number }).nativeTag;
    }

    const props = (fiber.memoizedProps ?? {}) as Record<string, unknown>;
    const flatStyle = props.style
      ? StyleSheet.flatten(props.style as Parameters<typeof StyleSheet.flatten>[0])
      : {};
    const borderRadius = (flatStyle as Record<string, unknown>).borderRadius as
      | number
      | undefined;

    if (stateNode || nativeTag > 0) {
      out.push({
        stateNode,
        nativeTag,
        type: getElementType(typeName),
        borderRadius,
      });
    }
  }

  // Recurse into children (depth + 1) then siblings (same depth)
  if (fiber.child) {
    walkFiber(fiber.child as Record<string, unknown>, depth + 1, maxDepth, excludeSet, out);
  }
  if (fiber.sibling) {
    walkFiber(fiber.sibling as Record<string, unknown>, depth, maxDepth, excludeSet, out);
  }
}

// ─── Measurement ─────────────────────────────────────────────────────────────

type MeasureCallback = (
  x: number, y: number,
  width: number, height: number,
  pageX: number, pageY: number
) => void;

/**
 * Measures a native node.
 * Prefers `stateNode.measure()` (works on both Old and New Arch).
 * Falls back to `UIManager.measure(nativeTag, cb)` for old RN versions.
 */
function measureNode(node: CollectedNode, callback: MeasureCallback): void {
  const sn = node.stateNode;
  if (sn && typeof (sn as Record<string, unknown>).measure === 'function') {
    (sn as { measure: (cb: MeasureCallback) => void }).measure(callback);
    return;
  }
  if (node.nativeTag > 0) {
    // Old arch UIManager path — dynamic require to avoid breaking SSR/web
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { UIManager } = require('react-native');
      UIManager.measure(node.nativeTag, callback);
    } catch {
      callback(0, 0, 0, 0, 0, 0);
    }
    return;
  }
  callback(0, 0, 0, 0, 0, 0);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface FiberWalkOptions {
  maxDepth: number;
  exclude: string[];
}

/**
 * Walks the Fiber tree rooted at `rootInstance`, measures every native leaf
 * element, and returns their positions relative to the root view.
 *
 * Returns `null` if:
 * - Fibers are not accessible (test env, hermetic bundle)
 * - No leaf elements are found
 * - All measurements return zero dimensions
 *
 * @param rootInstance - The native View instance from a React ref
 * @param rootPageX    - Screen X of the root view (from UIManager.measureInWindow)
 * @param rootPageY    - Screen Y of the root view
 * @param options      - Walk configuration
 */
export function measureFiberLeaves(
  rootInstance: object,
  rootPageX: number,
  rootPageY: number,
  options: FiberWalkOptions
): Promise<MeasuredLayout[] | null> {
  return new Promise(resolve => {
    const fiber = getFiber(rootInstance);
    if (!fiber) {
      resolve(null);
      return;
    }

    const collected: CollectedNode[] = [];
    const excludeSet = new Set(options.exclude);

    try {
      walkFiber(fiber as Record<string, unknown>, 0, options.maxDepth, excludeSet, collected);
    } catch {
      resolve(null);
      return;
    }

    if (collected.length === 0) {
      resolve(null);
      return;
    }

    let remaining = collected.length;
    const layouts: MeasuredLayout[] = [];

    collected.forEach(node => {
      measureNode(node, (_, __, width, height, pageX, pageY) => {
        if (width > 0 && height > 0) {
          layouts.push({
            x: pageX - rootPageX,
            y: pageY - rootPageY,
            width,
            height,
            type: node.type,
            borderRadius: node.borderRadius,
          });
        }
        remaining--;
        if (remaining === 0) {
          resolve(layouts.length > 0 ? layouts : null);
        }
      });
    });
  });
}

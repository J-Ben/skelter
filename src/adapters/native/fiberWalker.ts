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

import { StyleSheet, UIManager } from 'react-native';
import type { MeasuredLayout, ElementType } from '../../core/types';
import { parseParagraph, normalizeTextAlign } from '../../core/constants';
import { warnOnce } from '../../core/dev';
import type { ParagraphAlign } from '../../core/types';

// ─── Leaf registry ───────────────────────────────────────────────────────────

/**
 * Components that are always a bone : they are content or interactive elements
 * by nature, even when they have host-component children (e.g. Pressable
 * wrapping a Text). Mirrors the web rule where <a> and <button> are always
 * treated as leaf elements.
 */
const CONTENT_COMPONENTS = new Set([
  'Pressable',
  'TouchableOpacity', 'TouchableHighlight', 'TouchableNativeFeedback',
  'Text', 'RCTText', 'RCTVirtualText',
  'TextInput', 'RCTSinglelineTextInputView', 'RCTMultilineTextInputView',
  'Image', 'RCTImage', 'RCTImageView',
]);

/**
 * Layout/container components that become a bone ONLY when they have no
 * host-component descendants. A bare <View style={{width:44,height:44}} />
 * (avatar circle, colour block…) is a leaf. A <View> wrapping Text children
 * is a layout container and must be skipped so only the inner content gets
 * bones.
 */
const CONTAINER_VIEWS = new Set([
  'View', 'RCTView',
  'ScrollView', 'RCTScrollView',
]);

/**
 * User-registered third-party components treated as content leaves.
 * Example: registerSkeletonLeaf('FastImage', 'ExpoImage')
 */
const USER_LEAVES = new Set<string>();

export function registerSkeletonLeaf(...names: string[]): void {
  names.forEach(n => USER_LEAVES.add(n));
}

/** Returns true if typeName is any known host component. */
function isKnownHost(typeName: string): boolean {
  return CONTENT_COMPONENTS.has(typeName) || CONTAINER_VIEWS.has(typeName) || USER_LEAVES.has(typeName);
}

function getElementType(typeName: string): ElementType {
  const lower = typeName.toLowerCase();
  if (lower.includes('image')) return 'image';
  if (lower.includes('text')) return 'text';
  return 'view';
}

// ─── Fiber helpers ───────────────────────────────────────────────────────────

function getTypeName(fiber: Record<string, unknown>): string {
  const t = fiber.type;
  if (typeof t === 'string') return t;
  // Fabric RN 0.71+: fiber.type is a viewConfig object, not a string.
  // The component name lives at viewConfig.uiViewClassName ("RCTView", "RCTText", etc.)
  if (t && typeof t === 'object') {
    const vc = t as Record<string, unknown>;
    if (typeof vc.uiViewClassName === 'string') return vc.uiViewClassName;
  }
  return (t as { displayName?: string; name?: string })?.displayName ??
    (t as { name?: string })?.name ??
    '';
}

/**
 * Returns true when any fiber descendant (child or deeper) is a known host
 * component. Used to distinguish layout containers (View wrapping children)
 * from true leaf Views (avatar circle, colour block, etc.).
 */
function hasAnyHostDescendant(
  fiber: Record<string, unknown>,
  excludeSet: Set<string>
): boolean {
  let child = fiber.child as Record<string, unknown> | null;
  while (child) {
    const name = getTypeName(child);
    if (!excludeSet.has(name)) {
      if (((child.tag as number) === 5 || typeof child.type === 'string') && isKnownHost(name)) return true;
      if (hasAnyHostDescendant(child, excludeSet)) return true;
    }
    child = child.sibling as Record<string, unknown> | null;
  }
  return false;
}

// ─── Fiber access ────────────────────────────────────────────────────────────

/**
 * Property names used by React versions to expose the internal Fiber.
 *
 * Old Arch / React class components : _reactInternals
 * Old Arch / React host components  : _reactFiber
 * DEV inspector handle              : __internalFiberInstanceHandleDEV
 * Fabric (RN 0.71+) public instance : __internalInstanceHandle
 */
const FIBER_KEYS = [
  '_reactInternals',
  '_reactFiber',
  '__internalFiberInstanceHandleDEV',
  '__internalInstanceHandle',
] as const;

function getFiber(instance: object): unknown {
  for (const key of FIBER_KEYS) {
    if (key in instance) return (instance as Record<string, unknown>)[key];
  }
  return null;
}

// ─── Fiber walk ──────────────────────────────────────────────────────────────

interface CollectedNode {
  stateNode: unknown;      // Native instance : exposes .measure()
  nativeTag: number;       // Fallback for UIManager path
  type: ElementType;
  borderRadius?: number;
  isSkeletonBox?: boolean;
  isSkeletonBoxStatic?: boolean;
  paragraphLines?: number;
  paragraphAlign?: ParagraphAlign;
  paragraphWords?: boolean;
  /** Estimated rendered text width (chars × fontSize × 0.55). Only for 'text' nodes. */
  textContentWidth?: number;
}

function extractTextContent(children: unknown): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractTextContent).join('');
  if (children && typeof children === 'object') {
    const el = children as Record<string, unknown>;
    if (el.props) return extractTextContent((el.props as Record<string, unknown>).children);
  }
  return '';
}

/**
 * Depth-first walk of the Fiber tree rooted at `fiber`.
 * Collects host component fibers (string type) that are leaf elements.
 * Recurses into siblings at the same depth level, except for the root of the
 * walk (`withSiblings: false`) : the root's siblings live outside the measured
 * component (e.g. the hidden real-content View next to the warmup View).
 */
interface WalkContext {
  maxDepth: number;
  excludeSet: Set<string>;
  /** nativeIDs collected as one solid bone, without descending into them */
  skipIds: Set<string>;
  /** skipIds actually met during the walk (for dev warnings) */
  matchedSkipIds: Set<string>;
  /** Host fiber treated as an implicit SkeletonBox (skeletonRoot) */
  rootBoxFiber: unknown;
  out: CollectedNode[];
}

function walkFiber(
  fiber: Record<string, unknown>,
  depth: number,
  ctx: WalkContext,
  withSiblings = true
): void {
  if (!fiber || depth > ctx.maxDepth) return;
  const { excludeSet, out } = ctx;
  const sibling = withSiblings ? (fiber.sibling as Record<string, unknown> | null) : null;

  const fiberType = fiber.type;
  const typeName = getTypeName(fiber);


  if (excludeSet.has(typeName)) {
    // Excluded : traverse siblings but not children
    if (sibling) walkFiber(sibling, depth, ctx);
    return;
  }

  // fiber.tag === 5 is HostComponent in both Old and New Architecture.
  // Fabric RN 0.71+ uses a viewConfig object as fiber.type instead of a string.
  const isHostFiber = (fiber.tag as number) === 5 || typeof fiberType === 'string';
  // When this node is a SkeletonParagraph wrapper, we collect it as a single
  // text block and skip its children so the inner Text doesn't add a bone too.
  let skipChildren = false;
  if (isHostFiber && isKnownHost(typeName)) {
    // Decide whether to emit a bone for this node.
    // Content/interactive components are always bones.
    // Container Views are bones only when they have no host descendants
    // (i.e. they are bare visual blocks, not layout wrappers).
    const props = (fiber.memoizedProps ?? {}) as Record<string, unknown>;
    // SkeletonIgnore: skip this node and all its descendants
    if (props.testID === '__skl_ignore__') {
      if (sibling) walkFiber(sibling, depth, ctx);
      return;
    }
    const isSkeletonBox = props.testID === '__skl_box__' || props.testID === '__skl_box_static__' ||
      fiber === ctx.rootBoxFiber;
    const paragraph = parseParagraph(props.testID as string | undefined);
    const paragraphLines = paragraph?.lines;
    const isContent = CONTENT_COMPONENTS.has(typeName) || USER_LEAVES.has(typeName);
    // skipIds: the node itself becomes one solid bone (badge, chip…) and its
    // children are not walked, so a small inner Text no longer gets its own bone.
    const nativeID = props.nativeID as string | undefined;
    const isSkipped = nativeID !== undefined && ctx.skipIds.has(nativeID);
    if (isSkipped) ctx.matchedSkipIds.add(nativeID!);
    const shouldCollect = isContent || isSkeletonBox || isSkipped || paragraphLines !== undefined || !hasAnyHostDescendant(fiber, excludeSet);
    // Paragraph wrapper / skipped node: collected as one block, children skipped below.
    skipChildren = paragraphLines !== undefined || isSkipped;

    if (shouldCollect) {
      const stateNode = fiber.stateNode as Record<string, unknown> | number | null;
      let nativeTag = 0;

      if (typeof stateNode === 'number') {
        nativeTag = stateNode;
      } else if (stateNode && typeof stateNode === 'object') {
        if ('nativeTag' in stateNode) {
          nativeTag = (stateNode as { nativeTag: number }).nativeTag;
        } else if ('canonical' in stateNode) {
          // Fabric: stateNode.canonical.nativeTag
          const c = (stateNode as { canonical?: { nativeTag?: number } }).canonical;
          nativeTag = c?.nativeTag ?? 0;
        }
      }

      const flatStyle = props.style
        ? StyleSheet.flatten(props.style as Parameters<typeof StyleSheet.flatten>[0])
        : {};
      const borderRadius = (flatStyle as Record<string, unknown>).borderRadius as
        | number
        | undefined;

      // Explicit align wins; otherwise inherit textAlign from the wrapper style.
      const paragraphAlign = paragraphLines !== undefined
        ? paragraph?.align ?? normalizeTextAlign((flatStyle as Record<string, unknown>).textAlign as string | undefined)
        : undefined;

      const nodeType = paragraphLines !== undefined ? 'text' : getElementType(typeName);
      let textContentWidth: number | undefined;
      if (nodeType === 'text') {
        const raw = extractTextContent(props.children);
        const fontSize = ((flatStyle as Record<string, unknown>).fontSize as number | undefined) ?? 14;
        if (raw.length > 0) textContentWidth = raw.length * fontSize * 0.55;
      }

      if (stateNode || nativeTag > 0) {
        out.push({
          stateNode,
          nativeTag,
          type: nodeType,
          borderRadius,
          isSkeletonBox: isSkeletonBox || undefined,
          isSkeletonBoxStatic: props.testID === '__skl_box_static__' || undefined,
          paragraphLines,
          paragraphAlign,
          paragraphWords: paragraph?.words,
          textContentWidth,
        });
      }
    }
  }

  // Recurse into children (depth + 1) then siblings (same depth).
  // Paragraph wrappers and skipIds nodes skip children : already collected as one block.
  if (fiber.child && !skipChildren) {
    walkFiber(fiber.child as Record<string, unknown>, depth + 1, ctx);
  }
  if (sibling) {
    walkFiber(sibling, depth, ctx);
  }
}

/**
 * Depth-first search, inside the subtree of `fiber` (its own siblings are not
 * visited), for the first known host fiber matching `predicate`.
 */
function findHostFiber(
  fiber: Record<string, unknown>,
  predicate: (props: Record<string, unknown>) => boolean
): Record<string, unknown> | null {
  let child = fiber.child as Record<string, unknown> | null;
  while (child) {
    const isHost = (child.tag as number) === 5 || typeof child.type === 'string';
    if (isHost && isKnownHost(getTypeName(child)) && predicate((child.memoizedProps ?? {}) as Record<string, unknown>)) {
      return child;
    }
    const found = findHostFiber(child, predicate);
    if (found) return found;
    child = child.sibling as Record<string, unknown> | null;
  }
  return null;
}

// ─── Measurement ─────────────────────────────────────────────────────────────

type MeasureCallback = (
  x: number, y: number,
  width: number, height: number,
  pageX: number, pageY: number
) => void;

/**
 * Measures a native node.
 *
 * Priority order:
 * 1. stateNode.measure()          — Old Arch public instance or host component
 * 2. canonical.publicInstance     — Fabric: lazily-created public instance
 * 3. UIManager.measure(nativeTag) — fallback for both architectures
 */
function measureNode(node: CollectedNode, callback: MeasureCallback): void {
  const sn = node.stateNode;

  // Path 1 : stateNode is a public instance with .measure() (Old Arch)
  if (sn && typeof (sn as Record<string, unknown>).measure === 'function') {
    (sn as { measure: (cb: MeasureCallback) => void }).measure(callback);
    return;
  }

  // Path 2 : Fabric — stateNode.canonical.publicInstance.measure()
  if (sn && typeof sn === 'object') {
    const canonical = (sn as Record<string, unknown>).canonical as Record<string, unknown> | undefined;
    if (canonical) {
      const pub = canonical.publicInstance as { measure?: (cb: MeasureCallback) => void } | undefined;
      if (pub?.measure) {
        pub.measure(callback);
        return;
      }
    }
  }

  // Path 3 : UIManager bridge fallback (works on both Old and New Arch)
  if (node.nativeTag > 0) {
    try {
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
  /** nativeIDs collected as a single solid bone, children ignored (v4) */
  skipIds?: string[];
  /** Treat the component's root element as an implicit SkeletonBox (v4) */
  skeletonRoot?: boolean;
  /** nativeID of the element to use as the skeleton root instead of the first one (v4) */
  rootId?: string;
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
      warnOnce(
        'no-fiber',
        'cannot reach the React fiber tree from the measured View (none of ' +
        `${FIBER_KEYS.join(', ')} is set). React / React Native internals may have changed; ` +
        'skeletons fall back to a single block per component.'
      );
      resolve(null);
      return;
    }

    const collected: CollectedNode[] = [];
    const ctx: WalkContext = {
      maxDepth: options.maxDepth,
      excludeSet: new Set(options.exclude),
      skipIds: new Set(options.skipIds ?? []),
      matchedSkipIds: new Set(),
      rootBoxFiber: null,
      out: collected,
    };

    try {
      const rootFiber = fiber as Record<string, unknown>;
      // rootId: walk only the subtree of that element. Positions stay relative
      // to the measured root, so the wrapper around it keeps its space.
      let walkStart = rootFiber;
      if (options.rootId) {
        const target = findHostFiber(rootFiber, props => props.nativeID === options.rootId);
        if (target) {
          walkStart = target;
        } else {
          warnOnce(`rootId:${options.rootId}`, `rootId: no element with nativeID "${options.rootId}" was found; using the whole component.`);
        }
      }
      // skeletonRoot: the root element (rootId target, else the first host
      // element rendered by the component) becomes an implicit SkeletonBox.
      if (options.skeletonRoot) {
        ctx.rootBoxFiber = walkStart !== rootFiber ? walkStart : findHostFiber(rootFiber, () => true);
      }
      walkFiber(walkStart, 0, ctx, false);
    } catch {
      resolve(null);
      return;
    }

    for (const id of ctx.skipIds) {
      if (!ctx.matchedSkipIds.has(id)) {
        warnOnce(`skipIds:${id}`, `skipIds: no element with nativeID "${id}" was found in the measured component.`);
      }
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
            isSkeletonBox: node.isSkeletonBox,
            isSkeletonBoxStatic: node.isSkeletonBoxStatic,
            paragraphLines: node.paragraphLines,
            paragraphAlign: node.paragraphAlign,
            paragraphWords: node.paragraphWords,
            textContentWidth: node.textContentWidth,
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

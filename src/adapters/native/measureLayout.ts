import { useRef, useCallback, useReducer, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import type { BoneTree, MeasuredLayout, ElementType, MeasureStrategy, BoneStyleOverride } from '../../core/types';
import { measureFiberLeaves } from './fiberWalker';

/**
 * Detects the element type from a React Native component displayName.
 * Falls back to 'view' for unknown components.
 */
function detectElementType(displayName?: string): ElementType {
  if (!displayName) return 'view';
  const name = displayName.toLowerCase();
  if (name.includes('image')) return 'image';
  if (name.includes('text')) return 'text';
  return 'view';
}

// ─── Result shape (shared by both hooks) ────────────────────────────────────

export interface MeasureLayoutResult {
  /** The root BoneTree node, null until layout is captured */
  boneTree: BoneTree | null;
  /** onLayout handler to attach to the warmup root View */
  onRootLayout: (event: LayoutChangeEvent) => void;
  /** Factory to create onLayout handlers for child elements (root-only mode) */
  createChildLayoutHandler: (
    id: string,
    type?: ElementType
  ) => (event: LayoutChangeEvent) => void;
  /** Whether the layout has been captured at least once */
  isLayoutCaptured: boolean;
  /**
   * Ref to attach to the warmup root View (required for 'auto' strategy).
   * withSkeleton passes this to the invisible container View.
   */
  warmupRef: React.RefObject<unknown>;
}

// ─── root-only (v0.2 compat) ─────────────────────────────────────────────────

interface MeasureNode {
  id: string;
  layout: MeasuredLayout;
  children: MeasureNode[];
}

function buildRootOnlyHook(boneStyle?: BoneStyleOverride): MeasureLayoutResult {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const rootLayoutRef = useRef<MeasuredLayout | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const childNodesRef = useRef<Map<string, MeasureNode>>(new Map());
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const boneTreeRef = useRef<BoneTree | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const isLayoutCapturedRef = useRef(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const warmupRef = useRef(null);

  const rebuildTree = useCallback(() => {
    if (!rootLayoutRef.current) return;
    const rootLayout = rootLayoutRef.current;
    const children: BoneTree[] = [];

    childNodesRef.current.forEach(node => {
      if (node.layout.width > 0 && node.layout.height > 0) {
        children.push({
          layout: {
            ...node.layout,
            x: node.layout.x - rootLayout.x,
            y: node.layout.y - rootLayout.y,
          },
          children: node.children.map(child => ({
            layout: {
              ...child.layout,
              x: child.layout.x - rootLayout.x,
              y: child.layout.y - rootLayout.y,
            },
            children: [],
          })),
        });
      }
    });

    boneTreeRef.current = {
      layout: {
        x: 0,
        y: 0,
        width: boneStyle?.width ?? rootLayout.width,
        height: rootLayout.height,
        type: 'view',
        borderRadius: boneStyle?.borderRadius,
      },
      children,
    };
    isLayoutCapturedRef.current = true;
    forceUpdate();
  }, []);

  const onRootLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { x, y, width, height } = event.nativeEvent.layout;
      if (width === 0 || height === 0) return;
      rootLayoutRef.current = { x, y, width, height, type: 'view' };
      rebuildTree();
    },
    [rebuildTree]
  );

  const createChildLayoutHandler = useCallback(
    (id: string, type: ElementType = 'view') =>
      (event: LayoutChangeEvent) => {
        const { x, y, width, height } = event.nativeEvent.layout;
        if (width === 0 || height === 0) return;
        const existing = childNodesRef.current.get(id);
        childNodesRef.current.set(id, {
          id,
          layout: { x, y, width, height, type },
          children: existing?.children ?? [],
        });
        rebuildTree();
      },
    [rebuildTree]
  );

  return {
    boneTree: boneTreeRef.current,
    onRootLayout,
    createChildLayoutHandler,
    isLayoutCaptured: isLayoutCapturedRef.current,
    warmupRef,
  };
}

// ─── auto (v0.3 default) ──────────────────────────────────────────────────────

interface AutoMeasureOptions {
  maxDepth: number;
  exclude: string[];
}

function buildAutoHook(options: AutoMeasureOptions): MeasureLayoutResult {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const warmupRef = useRef<{ measure?: unknown; nativeTag?: number } | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const boneTreeRef = useRef<BoneTree | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isLayoutCaptured, setIsLayoutCaptured] = useState(false);

  const onRootLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      if (width === 0 || height === 0) return;

      const instance = warmupRef.current;
      if (!instance) return;

      // Get root's screen position so we can compute relative positions
      const measureRoot = (cb: (pageX: number, pageY: number) => void) => {
        if (typeof (instance as { measure?: unknown }).measure === 'function') {
          (instance as { measure: (cb: (x: number, y: number, w: number, h: number, px: number, py: number) => void) => void }).measure(
            (_x, _y, _w, _h, pageX, pageY) => cb(pageX, pageY)
          );
        } else {
          cb(0, 0);
        }
      };

      measureRoot((rootPageX, rootPageY) => {
        measureFiberLeaves(instance, rootPageX, rootPageY, options)
          .then(layouts => {
            if (!layouts || layouts.length === 0) {
              console.warn(
                '[skelter] auto strategy: 0 leaves found, falling back to root-only. ' +
                'Possible causes: React 19 / Hermes stripped fiber internals, ' +
                'hermetic bundle, or test environment. ' +
                'Pass measureStrategy: "root-only" to silence this warning.'
              );
              boneTreeRef.current = {
                layout: { x: 0, y: 0, width, height, type: 'view' },
                children: [],
              };
            } else {
              // One BoneTree child per leaf element, no nesting needed
              boneTreeRef.current = {
                layout: { x: 0, y: 0, width, height, type: 'view' },
                children: layouts.map(l => ({ layout: l, children: [] })),
              };
            }
            setIsLayoutCaptured(true);
          })
          .catch(() => {
            boneTreeRef.current = {
              layout: { x: 0, y: 0, width, height, type: 'view' },
              children: [],
            };
            setIsLayoutCaptured(true);
          });
      });
    },
    // options is stable (created once in withSkeleton options)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // No-op for auto mode (no manual child registration needed)
  const createChildLayoutHandler = useCallback(
    (_id: string, _type?: ElementType) => (_event: LayoutChangeEvent) => {},
    []
  );

  return {
    boneTree: boneTreeRef.current,
    onRootLayout,
    createChildLayoutHandler,
    isLayoutCaptured,
    warmupRef,
  };
}

// ─── Unified hook ─────────────────────────────────────────────────────────────

export interface UseMeasureLayoutOptions {
  strategy: MeasureStrategy;
  maxDepth: number;
  exclude: string[];
  boneStyle?: BoneStyleOverride;
}

/**
 * Captures the layout of a component tree for skeleton generation.
 *
 * 'root-only' strategy: uses onLayout on the warmup wrapper — v0.2 behaviour,
 *   produces a single bone the size of the component root.
 *
 * 'auto' strategy: after the warmup render's onLayout fires, walks the React
 *   Fiber tree and measures each native leaf element individually via
 *   stateNode.measure(). One bone per View / Image / Text in the tree.
 *   Falls back to single root bone if fibers are inaccessible.
 */
export function useMeasureLayout(opts: UseMeasureLayoutOptions): MeasureLayoutResult {
  // Hooks are called unconditionally inside the delegated functions.
  // The strategy must not change after mount (it's derived from static options).
  if (opts.strategy === 'auto') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return buildAutoHook({ maxDepth: opts.maxDepth, exclude: opts.exclude });
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return buildRootOnlyHook(opts.boneStyle);
}

export { detectElementType };

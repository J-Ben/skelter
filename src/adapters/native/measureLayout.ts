import { useRef, useCallback } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import type { BoneTree, MeasuredLayout, ElementType } from '../../core/types';

/**
 * Detects the element type from a React Native component displayName.
 * Falls back to 'view' for unknown components.
 *
 * @param displayName - The displayName of the React component
 * @returns The corresponding ElementType
 */
function detectElementType(displayName?: string): ElementType {
  if (!displayName) return 'view';
  const name = displayName.toLowerCase();
  if (name.includes('image')) return 'image';
  if (name.includes('text')) return 'text';
  return 'view';
}

/**
 * Result returned by useMeasureLayout.
 */
export interface MeasureLayoutResult {
  /** The root BoneTree node, null until first layout is captured */
  boneTree: BoneTree | null;
  /** onLayout handler to attach to the root element */
  onRootLayout: (event: LayoutChangeEvent) => void;
  /** Factory to create onLayout handlers for child elements */
  createChildLayoutHandler: (
    id: string,
    type?: ElementType
  ) => (event: LayoutChangeEvent) => void;
  /** Whether the layout has been captured at least once */
  isLayoutCaptured: boolean;
}

/**
 * Internal node structure used during measurement.
 */
interface MeasureNode {
  id: string;
  layout: MeasuredLayout;
  children: MeasureNode[];
}

/**
 * Hook that captures the layout of a component tree using onLayout events.
 * Builds a BoneTree that mirrors the measured component hierarchy.
 *
 * - Uses onLayout to capture dimensions of each element
 * - Handles zero dimensions on first render gracefully
 * - Detects element types automatically (view / image / text)
 * - Stable references via useRef and useCallback — zero unnecessary re-renders
 *
 * @returns MeasureLayoutResult with BoneTree and layout handlers
 */
export function useMeasureLayout(): MeasureLayoutResult {
  const rootLayoutRef = useRef<MeasuredLayout | null>(null);
  const childNodesRef = useRef<Map<string, MeasureNode>>(new Map());
  const boneTreeRef = useRef<BoneTree | null>(null);
  const isLayoutCapturedRef = useRef(false);
  const forceUpdateRef = useRef<(() => void) | null>(null);

  /**
   * Rebuilds the BoneTree from captured layout data.
   */
  const rebuildTree = useCallback(() => {
    if (!rootLayoutRef.current) return;

    const rootLayout = rootLayoutRef.current;
    const children: BoneTree[] = [];

    childNodesRef.current.forEach((node) => {
      if (node.layout.width > 0 && node.layout.height > 0) {
        children.push({
          layout: {
            ...node.layout,
            // Position relative to root
            x: node.layout.x - rootLayout.x,
            y: node.layout.y - rootLayout.y,
          },
          children: node.children.map((child) => ({
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
        width: rootLayout.width,
        height: rootLayout.height,
        type: 'view',
      },
      children,
    };

    isLayoutCapturedRef.current = true;
    forceUpdateRef.current?.();
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
  };
}

export { detectElementType };
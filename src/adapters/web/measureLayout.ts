import { useRef, useState, useEffect, useCallback } from 'react';
import type { RefObject } from 'react';
import { generateBones } from '../../core/generateBones';
import type { BoneTree, ElementType, Bone } from '../../core/types';

/**
 * Result returned by useMeasureLayout.
 */
export interface WebMeasureLayoutResult {
    /** The root BoneTree — null until first measurement */
    boneTree: BoneTree | null;
    /** Ref to attach to the root DOM element */
    rootRef: RefObject<HTMLElement | null>;
    /** Whether the layout has been captured at least once */
    isLayoutCaptured: boolean;
    /** Flat bones array for direct use */
    bones: Bone[];
}

/**
 * Detects the element type from a DOM element.
 *
 * @param element - The DOM element to inspect
 * @returns The corresponding ElementType
 */
function detectElementType(element: Element): ElementType {
    if (element instanceof HTMLImageElement) return 'image';
    const tag = element.tagName.toLowerCase();
    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'label'].includes(tag)) {
        return 'text';
    }
    return 'view';
}

/**
 * Recursively builds a BoneTree from a DOM element.
 *
 * @param element - The root DOM element
 * @param rootRect - Bounding rect of the root for relative positioning
 * @returns BoneTree node
 */
function buildBoneTree(element: Element, rootRect: DOMRect): BoneTree {
    const rect = element.getBoundingClientRect();

    const layout = {
        x: rect.left - rootRect.left,
        y: rect.top - rootRect.top,
        width: rect.width,
        height: rect.height,
        type: detectElementType(element),
    };

    const children: BoneTree[] = [];
    for (const child of Array.from(element.children)) {
        if (child instanceof HTMLElement) {
            children.push(buildBoneTree(child, rootRect));
        }
    }

    return { layout, children };
}

/**
 * Hook that captures the layout of a component tree for web.
 *
 * - Uses ResizeObserver to detect layout changes automatically
 * - Uses getBoundingClientRect for accurate positioning
 * - Detects element types (image / text / view) from DOM tags
 * - SSR safe — no-op when ResizeObserver is unavailable
 * - Cleans up observer on unmount
 *
 * @returns WebMeasureLayoutResult with boneTree, rootRef and isLayoutCaptured
 */
export function useMeasureLayout(): WebMeasureLayoutResult {
    const rootRef = useRef<HTMLElement>(null);
    const [boneTree, setBoneTree] = useState<BoneTree | null>(null);
    const [isLayoutCaptured, setIsLayoutCaptured] = useState(false);

    const measure = useCallback(() => {
        const element = rootRef.current;
        if (!element) return;

        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const tree = buildBoneTree(element, rect);
        setBoneTree(tree);
        setIsLayoutCaptured(true);
    }, []);

    useEffect(() => {
        // SSR safe — ResizeObserver is not available on the server
        if (typeof ResizeObserver === 'undefined') return;
        if (!rootRef.current) return;

        const observer = new ResizeObserver(() => {
            measure();
        });

        observer.observe(rootRef.current);
        // Initial measurement
        measure();

        return () => {
            observer.disconnect();
        };
    }, [measure]);

    const bones = boneTree ? generateBones(boneTree) : [];

    return { boneTree, rootRef, isLayoutCaptured, bones };
}
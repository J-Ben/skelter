import { useRef, useState, useEffect, useCallback } from 'react';
import type { RefObject } from 'react';
import { generateBones } from '../../core/generateBones';
import { parseParagraph, normalizeTextAlign } from '../../core/constants';
import { warnOnce } from '../../core/dev';
import type { BoneTree, ElementType, Bone } from '../../core/types';

/**
 * Result returned by useMeasureLayout.
 */
export interface WebMeasureLayoutResult {
    /** The root BoneTree : null until first measurement */
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
    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'label',
         'a', 'button', 'li', 'td', 'th'].includes(tag)) {
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
function readBorderRadius(element: Element): number {
    const computed = window.getComputedStyle(element).borderRadius;
    const parsed = parseFloat(computed);
    return isNaN(parsed) ? 0 : parsed;
}

/** v4 measurement options shared with the React Native adapter. */
export interface WebMeasureOptions {
    /** `id` attributes collected as one solid bone, children ignored */
    skipIds?: string[];
    /** Treat the root element as an implicit SkeletonBox */
    skeletonRoot?: boolean;
    /** `id` of the element used as the skeleton root */
    rootId?: string;
}

interface BuildContext {
    skipIds: Set<string>;
    /** Element treated as an implicit SkeletonBox (skeletonRoot) */
    rootBox: Element | null;
}

function buildBoneTree(element: Element, rootRect: DOMRect, ctx: BuildContext): BoneTree {
    const rect = element.getBoundingClientRect();
    const testid = element.getAttribute('data-testid');
    const paragraph = parseParagraph(testid);
    const paragraphLines = paragraph?.lines;
    // Explicit align wins; otherwise inherit the computed textAlign.
    const paragraphAlign = paragraphLines !== undefined
        ? paragraph?.align ?? normalizeTextAlign(window.getComputedStyle(element).textAlign)
        : undefined;

    const layout = {
        x: rect.left - rootRect.left,
        y: rect.top - rootRect.top,
        width: rect.width,
        height: rect.height,
        // Paragraph wrappers are split into text lines, so type them as text.
        type: paragraphLines !== undefined ? ('text' as ElementType) : detectElementType(element),
        borderRadius: readBorderRadius(element),
        isSkeletonBox: testid === '__skl_box__' || testid === '__skl_box_static__' || element === ctx.rootBox,
        isSkeletonBoxStatic: testid === '__skl_box_static__',
        isSkeletonIgnore: testid === '__skl_ignore__',
        paragraphLines,
        paragraphAlign,
        paragraphWords: paragraph?.words,
    };

    // Paragraph wrapper or skipIds element: collected as one block, children
    // ignored (no children → generateBones treats it as a leaf bone).
    const isSkipped = element.id !== '' && ctx.skipIds.has(element.id);
    const children: BoneTree[] = [];
    if (paragraphLines === undefined && !isSkipped) {
        for (const child of Array.from(element.children)) {
            if (child instanceof HTMLElement) {
                children.push(buildBoneTree(child, rootRect, ctx));
            }
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
 * - SSR safe : no-op when ResizeObserver is unavailable
 * - Cleans up observer on unmount
 *
 * @returns WebMeasureLayoutResult with boneTree, rootRef and isLayoutCaptured
 */
export function useMeasureLayout(options: WebMeasureOptions = {}): WebMeasureLayoutResult {
    // Options come from withSkeleton's static second argument : stable for the
    // lifetime of the component, so reading them through a ref is enough.
    const optionsRef = useRef(options);
    optionsRef.current = options;
    const rootRef = useRef<HTMLElement>(null);
    const [boneTree, setBoneTree] = useState<BoneTree | null>(null);
    const [isLayoutCaptured, setIsLayoutCaptured] = useState(false);

    const measure = useCallback(() => {
        const element = rootRef.current;
        if (!element) return;

        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const { skipIds = [], skeletonRoot = false, rootId } = optionsRef.current;
        // rootId: only that element's subtree gets bones; the root keeps the
        // full component size so the wrapper around it keeps its space.
        const target = rootId ? element.querySelector(`[id="${rootId}"]`) : null;
        if (rootId && !target) {
            warnOnce(`rootId:${rootId}`, `rootId: no element with id "${rootId}" was found; using the whole component.`);
        }
        const start = target ?? element.firstElementChild;
        const ctx: BuildContext = {
            skipIds: new Set(skipIds),
            rootBox: skeletonRoot ? start : null,
        };
        const full = buildBoneTree(element, rect, ctx);
        const tree = target ? { layout: full.layout, children: [buildBoneTree(target, rect, ctx)] } : full;
        setBoneTree(tree);
        setIsLayoutCaptured(true);
    }, []);

    useEffect(() => {
        if (typeof ResizeObserver === 'undefined') return;
        if (!rootRef.current) return;

        const observer = new ResizeObserver(() => {
            measure();
        });

        observer.observe(rootRef.current);

        // Retry on next frame: initial ResizeObserver callback may fire before
        // the scroll container has committed layout for off-screen items.
        const frameId = requestAnimationFrame(() => measure());

        return () => {
            observer.disconnect();
            cancelAnimationFrame(frameId);
        };
    }, [measure]);

    const bones = boneTree ? generateBones(boneTree) : [];

    return { boneTree, rootRef, isLayoutCaptured, bones };
}
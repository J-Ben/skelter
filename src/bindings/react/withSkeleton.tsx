import React, {
  memo,
  useEffect,
  useRef,
  useState,
  useId,
  ComponentType,
  CSSProperties,
} from 'react';
import { useDevTools } from '../../context/DevToolsContext';
import type { Bone, SkeletonConfig, SkeletonEnter, SkeletonExit, StaticBone, WithSkeletonOptions } from '../../core/types';
import { SKELETON_ENTER_MS, SKELETON_EXIT_MS } from '../../core/constants';
import { useSkeleton } from './useSkeleton';
import { useMeasureLayout } from '../../adapters/web/measureLayout';
import { SkeletonBone } from '../../adapters/web/SkeletonBone';
import { generateBones } from '../../core/generateBones';


type ExitPhase = 'visible' | 'exiting' | 'hidden';
type InspectDimension = 'coverage' | 'overflow' | 'density' | 'empty' | 'waste' | null;

const LEGEND_ITEMS: { dim: InspectDimension; label: string; bg: string }[] = [
  { dim: 'coverage', label: 'coverage', bg: 'rgba(34,197,94,0.85)' },
  { dim: 'overflow', label: 'overflow', bg: 'rgba(239,68,68,0.85)' },
  { dim: 'density',  label: 'density',  bg: 'rgba(249,115,22,0.85)' },
  { dim: 'waste',    label: 'waste',    bg: 'rgba(168,85,247,0.85)' },
  { dim: 'empty',    label: 'empty',    bg: 'rgba(234,179,8,0.85)' },
];

const DIM_HINTS: Record<NonNullable<InspectDimension>, string> = {
  coverage: 'Bones within bounds — well placed',
  overflow: 'Bones exceeding container limits',
  density:  'Bones partially overlapping each other',
  waste:    'Bone area not covered by real visual content — darker = more wasted space',
  empty:    'Areas with no bone coverage',
};

function InspectionOverlay({ bones, containerW, containerH, contentRects }: {
  bones: Bone[]; containerW: number; containerH: number;
  contentRects: Array<{ x: number; y: number; vw: number; vh: number }>;
}) {
  const [hovered, setHovered] = useState<InspectDimension>(null);

  // Per-bone waste ratio (0 = all wasted, 1 = fully efficient)
  const boneWasteRatio = bones.map(b => {
    if (b.isParagraph || b.isStatic) return 1; // exempt — intentional components
    const bArea = b.width * b.height;
    if (bArea === 0) return 1;
    const visualCovered = contentRects.reduce((sum, e) => {
      const ix = Math.max(0, Math.min(b.x + b.width, e.x + e.vw) - Math.max(b.x, e.x));
      const iy = Math.max(0, Math.min(b.y + b.height, e.y + e.vh) - Math.max(b.y, e.y));
      return sum + ix * iy;
    }, 0);
    return Math.min(1, visualCovered / bArea);
  });

  const containsFn = (a: Bone, b: Bone) =>
    b.x >= a.x && b.y >= a.y && b.x + b.width <= a.x + a.width && b.y + b.height <= a.y + a.height;
  const partialOverlapFn = (a: Bone, b: Bone) => {
    const intersects = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    return intersects && !containsFn(a, b) && !containsFn(b, a);
  };
  const overlapCount = bones.map((b, i) =>
    bones.filter((o, j) => j !== i && partialOverlapFn(b, o)).length
  );
  const totalBonesArea = bones.reduce((s, b) => s + b.width * b.height, 0);
  const containerArea = containerW * containerH;
  const coverageRatio = totalBonesArea / Math.max(containerArea, 1);

  const getBoneDim = (i: number): Exclude<InspectDimension, 'empty' | null> => {
    const bone = bones[i];
    const ox = Math.max(0, bone.x + bone.width - containerW) + Math.max(0, -bone.x);
    const oy = Math.max(0, bone.y + bone.height - containerH) + Math.max(0, -bone.y);
    if (ox > 0 || oy > 0) return 'overflow';
    if (overlapCount[i] > 0) return 'density';
    return 'coverage';
  };

  const boneDims = bones.map((_, i) => getBoneDim(i));
  const countByDim: Record<string, number> = {
    coverage: boneDims.filter(d => d === 'coverage').length,
    overflow: boneDims.filter(d => d === 'overflow').length,
    density:  boneDims.filter(d => d === 'density').length,
    waste:    bones.filter((_, i) => boneWasteRatio[i] < 0.5).length,
  };

  const dimColors: Record<string, { bg: string; border: string }> = {
    coverage: { bg: 'rgba(34,197,94,0.50)',  border: '#22c55e' },
    overflow: { bg: 'rgba(239,68,68,0.55)',  border: '#ef4444' },
    density:  { bg: 'rgba(249,115,22,0.55)', border: '#f97316' },
  };

  // Empty mode: bones become invisible so yellow gaps show through clearly
  const emptyMode = hovered === 'empty';

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 500 }}>
      {/* Yellow = uncovered areas. Full opacity in empty mode so gaps are clearly visible. */}
      <div style={{
        position: 'absolute', inset: 0,
        background: emptyMode ? 'rgba(234,179,8,0.45)' : 'rgba(234,179,8,0.08)',
        transition: 'background 0.15s',
      }} />

      {bones.map((bone, i) => {
        const boneDim = boneDims[i];
        const wasteRatio = boneWasteRatio[i]; // 0 = full waste, 1 = efficient
        const hiddenForEmpty = emptyMode;
        const dimmedOut = !emptyMode && hovered !== null && hovered !== boneDim && hovered !== 'waste';
        const colors = dimColors[boneDim];

        const wasteMode = hovered === 'waste';
        const isPara = bone.isParagraph;
        const paraBg = 'rgba(20,184,166,0.35)';
        const paraBorder = '#14b8a6';

        const isStaticBone = bone.isStatic;
        if (wasteMode && !hiddenForEmpty && !isPara && !isStaticBone) {
          // Split visualization: show covered (green) vs wasted (purple) within the bone
          const intersections = contentRects
            .map(e => ({
              left: Math.max(0, e.x - bone.x),
              top:  Math.max(0, e.y - bone.y),
              w: Math.max(0, Math.min(bone.x + bone.width,  e.x + e.vw) - Math.max(bone.x, e.x)),
              h: Math.max(0, Math.min(bone.y + bone.height, e.y + e.vh) - Math.max(bone.y, e.y)),
            }))
            .filter(r => r.w > 0 && r.h > 0);

          return (
            <div key={i} style={{
              position: 'absolute', left: bone.x, top: bone.y,
              width: bone.width, height: bone.height,
              background: 'rgba(168,85,247,0.35)', // purple = wasted
              border: '1.5px solid #a855f7',
              borderRadius: bone.borderRadius ?? 4, boxSizing: 'border-box',
              opacity: dimmedOut ? 0.07 : 1, overflow: 'hidden',
            }}>
              {/* Green islands = content actually covered */}
              {intersections.map((r, j) => (
                <div key={j} style={{
                  position: 'absolute', left: r.left, top: r.top, width: r.w, height: r.h,
                  background: 'rgba(34,197,94,0.6)',
                }} />
              ))}
              {/* Label */}
              {bone.width > 40 && bone.height > 12 && (
                <span style={{
                  position: 'absolute', bottom: 1, right: 3,
                  fontSize: 7, fontWeight: 700, fontFamily: 'monospace',
                  color: '#fff', pointerEvents: 'none', whiteSpace: 'nowrap',
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                }}>{Math.round((1 - wasteRatio) * 100)}% waste</span>
              )}
            </div>
          );
        }

        return (
          <div key={i} style={{
            position: 'absolute', left: bone.x, top: bone.y,
            width: bone.width, height: bone.height,
            background: hiddenForEmpty ? 'rgba(12,12,14,0.6)' : isPara ? paraBg : colors.bg,
            border: hiddenForEmpty ? 'none' : `1.5px solid ${isPara ? paraBorder : colors.border}`,
            borderRadius: bone.borderRadius ?? 4, boxSizing: 'border-box',
            opacity: dimmedOut ? 0.07 : 1,
            transition: 'opacity 0.15s, background 0.15s',
          }} />
        );
      })}

      {/* Coverage bar at top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(0,0,0,0.3)' }}>
        <div style={{
          width: `${Math.min(100, Math.round(coverageRatio * 100))}%`, height: '100%',
          background: coverageRatio >= 0.6 ? '#22c55e' : coverageRatio >= 0.3 ? '#f59e0b' : '#ef4444',
        }} />
      </div>

      {/* Tooltip hint when hovering */}
      {hovered && (
        <div style={{
          position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(9,9,11,0.92)', color: '#e4e4e7',
          fontFamily: 'monospace', fontSize: 9, padding: '3px 8px', borderRadius: 6,
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          {DIM_HINTS[hovered]}
          {hovered !== 'empty' && countByDim[hovered] === 0 && (
            <span style={{ color: '#22c55e', marginLeft: 6 }}>✓ aucun</span>
          )}
          {hovered !== 'empty' && countByDim[hovered] > 0 && (
            <span style={{ color: hovered === 'overflow' ? '#ef4444' : '#f97316', marginLeft: 6 }}>
              {countByDim[hovered]} bone{countByDim[hovered] > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 4, right: 4,
        display: 'flex', gap: 3, pointerEvents: 'all',
      }}>
        {LEGEND_ITEMS.map(({ dim, label, bg }) => {
          const count = dim !== 'empty' && dim !== null ? countByDim[dim as keyof typeof countByDim] : null;
          return (
            <span
              key={dim}
              onMouseEnter={() => setHovered(dim)}
              onMouseLeave={() => setHovered(null)}
              style={{
                fontFamily: 'monospace', fontSize: 8, fontWeight: 700,
                background: hovered === dim ? bg.replace('0.85', '1') : bg,
                color: '#fff', padding: '1px 5px', borderRadius: 4,
                cursor: 'default',
                outline: hovered === dim ? '1.5px solid rgba(255,255,255,0.6)' : 'none',
                transition: 'outline 0.1s',
                opacity: count === 0 ? 0.5 : 1,
              }}
            >
              {label}{count !== null && count > 0 ? ` ${count}` : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
}
type EnterPhase = 'entering' | 'visible';

function exitTransform(exit: SkeletonExit): string | undefined {
  if (exit === 'fadeUp')    return 'translateY(-10px)';
  if (exit === 'fadeDown')  return 'translateY(10px)';
  if (exit === 'fadeLeft')  return 'translateX(-10px)';
  if (exit === 'fadeRight') return 'translateX(10px)';
  return undefined;
}

function enterTransform(enter: SkeletonEnter): string | undefined {
  if (enter === 'fadeUp')    return 'translateY(8px)';
  if (enter === 'fadeDown')  return 'translateY(-8px)';
  if (enter === 'fadeLeft')  return 'translateX(8px)';
  if (enter === 'fadeRight') return 'translateX(-8px)';
  return undefined;
}

function useEnterPhase(showOverlay: boolean, enter: SkeletonEnter): EnterPhase {
  const [phase, setPhase] = useState<EnterPhase>('visible');
  const contentWasShown = useRef(false);
  const prev = useRef(showOverlay);

  useEffect(() => {
    if (!showOverlay && prev.current) contentWasShown.current = true;

    if (showOverlay && !prev.current) {
      if (enter !== 'none' && contentWasShown.current) {
        setPhase('entering');
        const t = setTimeout(() => setPhase('visible'), SKELETON_ENTER_MS);
        prev.current = showOverlay;
        return () => clearTimeout(t);
      }
      setPhase('visible');
    }
    prev.current = showOverlay;
  }, [showOverlay, enter]);

  return phase;
}

function useExitPhase(isSkeletonVisible: boolean, isLoading: boolean, exit: SkeletonExit): ExitPhase {
  const [phase, setPhase] = useState<ExitPhase>(() => isSkeletonVisible ? 'visible' : 'hidden');
  const prevVisible = useRef(isSkeletonVisible);

  useEffect(() => {
    if (isLoading) {
      setPhase('visible');
      prevVisible.current = true;
      return;
    }
    if (prevVisible.current && !isSkeletonVisible) {
      if (exit === 'none') {
        setPhase('hidden');
      } else {
        setPhase('exiting');
        const t = setTimeout(() => setPhase('hidden'), SKELETON_EXIT_MS);
        return () => clearTimeout(t);
      }
    }
    prevVisible.current = isSkeletonVisible;
  }, [isSkeletonVisible, isLoading, exit]);

  return phase;
}

const isSSR = typeof window === 'undefined';

export interface SkeletonProps {
  hasSkeleton?: boolean;
  isLoading?: boolean;
  isLoadingSkeleton?: boolean;
  skeletonConfig?: SkeletonConfig;
}

export function withSkeleton<P extends object>(
  Component: ComponentType<P>,
  options?: WithSkeletonOptions
): ComponentType<P & SkeletonProps> {
  const displayName =
    (Component as { displayName?: string }).displayName ||
    (Component as { name?: string }).name ||
    'Component';

  const WrappedComponent = memo((props: P & SkeletonProps) => {
    const {
      hasSkeleton,
      isLoading,
      isLoadingSkeleton,
      skeletonConfig,
      ...componentProps
    } = props;

    const resolvedHasSkeleton = hasSkeleton || isLoadingSkeleton || false;
    const resolvedIsLoading = isLoading || isLoadingSkeleton || false;

    if (!resolvedHasSkeleton) {
      return <Component {...(componentProps as P)} />;
    }

    if (options?.staticBones && options.staticBones.length > 0) {
      return (
        <StaticWebSkeletonRenderer
          componentProps={componentProps as P}
          Component={Component}
          isLoading={resolvedIsLoading}
          skeletonConfig={skeletonConfig}
          staticBones={options.staticBones}
          displayName={displayName}
        />
      );
    }

    return (
      <WebSkeletonRenderer
        componentProps={componentProps as P}
        mockProps={options?.mockProps as Partial<P>}
        Component={Component}
        isLoading={resolvedIsLoading}
        skeletonConfig={skeletonConfig}
        displayName={displayName}
      />
    );
  });

  WrappedComponent.displayName = `withSkeleton(${displayName})`;
  return WrappedComponent as unknown as ComponentType<P & SkeletonProps>;
}

// ─── Static renderer : no warmup, no measurement ─────────────────────────────

interface StaticWebSkeletonRendererProps<P extends object> {
  Component: ComponentType<P>;
  componentProps: P;
  isLoading: boolean;
  skeletonConfig?: SkeletonConfig;
  staticBones: StaticBone[];
}

const StaticWebSkeletonRenderer = memo(function StaticWebSkeletonRenderer<P extends object>({
  Component,
  componentProps,
  isLoading: isLoadingProp,
  skeletonConfig,
  staticBones,
  displayName = 'Component',
}: StaticWebSkeletonRendererProps<P> & { displayName?: string }) {
  const devTools = useDevTools();
  const id = useId();

  const isLoading = devTools.enabled && (devTools.forceLoading || devTools.forcedIds.has(id)) ? true : isLoadingProp;
  const xray = devTools.enabled && devTools.xray;
  const isInspected = devTools.enabled && devTools.inspectedId === id;
  const isHighlight = devTools.enabled && devTools.highlight;
  const isHovered = devTools.enabled && devTools.hoveredId === id;
  const isForced = devTools.enabled && devTools.forcedIds.has(id);
  const score = devTools.matchScores.get(id);

  const bones: Bone[] = staticBones.map(b => ({
    x: b.x, y: b.y, width: b.width, height: b.height,
    borderRadius: b.borderRadius ?? 0, type: b.type ?? 'view',
  }));

  const boneTree = {
    layout: {
      x: 0, y: 0,
      width: Math.max(...bones.map(b => b.x + b.width)),
      height: Math.max(...bones.map(b => b.y + b.height)),
      type: 'view' as const,
    },
    children: bones.map(b => ({ layout: { ...b }, children: [] })),
  };

  // Measure real rendered component size for accurate overflow scoring
  const measureRef = useRef<HTMLDivElement>(null);
  const [realSize, setRealSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    if (!measureRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setRealSize({ w: width, h: height });
    });
    ro.observe(measureRef.current);
    return () => ro.disconnect();
  }, []);

  const { isSkeletonVisible, mergedConfig } = useSkeleton({ hasSkeleton: true, isLoading, config: skeletonConfig, boneTree });

  const enter = mergedConfig.enter;
  const exit = mergedConfig.exit;
  const phase = useExitPhase(isSkeletonVisible, isLoading, exit);
  const isExiting = phase === 'exiting';
  const showOverlay = (phase !== 'hidden' && !isSSR) || xray;
  const enterPhase = useEnterPhase(phase !== 'hidden' && !isSSR, enter);
  const isEntering = enterPhase === 'entering';

  const overlayStyle: CSSProperties = {
    position: 'absolute', top: 0, left: 0,
    width: boneTree.layout.width, height: boneTree.layout.height,
    ...(isEntering && { opacity: 0, transform: enterTransform(enter), transition: `opacity ${SKELETON_ENTER_MS}ms ease, transform ${SKELETON_ENTER_MS}ms ease` }),
    ...(isExiting && { opacity: 0, transform: exitTransform(exit), transition: `opacity ${SKELETON_EXIT_MS}ms ease, transform ${SKELETON_EXIT_MS}ms ease` }),
  };

  const revealOnExit = mergedConfig.revealOnExit;
  const showContent = phase === 'hidden' || (revealOnExit && phase === 'exiting');

  // Register in devtools
  const { enabled: dtEnabled, registerComponent, unregisterComponent, setMatchScore } = devTools;
  useEffect(() => {
    if (!dtEnabled) return;
    registerComponent(id, { displayName, animation: mergedConfig.animation, bonesCount: bones.length, isLoading });
  }, [dtEnabled, registerComponent, id, displayName, mergedConfig.animation, bones.length, isLoading]);
  useEffect(() => {
    if (!dtEnabled) return;
    return () => unregisterComponent(id);
  }, [dtEnabled, unregisterComponent, id]);

  // Score
  useEffect(() => {
    if (!dtEnabled || bones.length === 0 || !measureRef.current) return;
    const refW = realSize?.w ?? boneTree.layout.width;
    const refH = realSize?.h ?? boneTree.layout.height;
    if (!refW || !refH) return;

    const container = measureRef.current.getBoundingClientRect();
    const LEAF_SELECTOR = 'img, p, h1, h2, h3, h4, h5, h6, li, button, a, input, textarea, svg';
    const rawElems = Array.from(measureRef.current.querySelectorAll(LEAF_SELECTOR));

    type ElemRect = { x: number; y: number; w: number; h: number; vw: number; vh: number };
    const elems: ElemRect[] = rawElems.map(el => {
      const box = el.getBoundingClientRect();
      let vw = box.width, vh = box.height;
      try {
        const range = document.createRange();
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        if (r.width > 2 && r.height > 2) { vw = r.width; vh = r.height; }
      } catch { /* ignore */ }
      return { x: box.left - container.left, y: box.top - container.top, w: box.width, h: box.height, vw, vh };
    }).filter(r => r.w > 6 && r.h > 6);

    if (elems.length === 0) return;

    const diagonal = Math.sqrt(refW * refW + refH * refH) || 1;

    // 1. FIDELITY (50%)
    const fidelityScores = elems.map(e => {
      const eCx = e.x + e.vw / 2, eCy = e.y + e.vh / 2;
      return bones.reduce((best, b) => {
        const bCx = b.x + b.width / 2, bCy = b.y + b.height / 2;
        const dist = Math.sqrt((eCx - bCx) ** 2 + (eCy - bCy) ** 2);
        const posScore = Math.max(0, 1 - (dist / diagonal) * 2);
        const shapeScore = Math.min(b.width * b.height, e.vw * e.vh) / Math.max(b.width * b.height, e.vw * e.vh, 1);
        return Math.max(best, posScore * 0.5 + shapeScore * 0.5);
      }, 0);
    });
    const fidelity = Math.round(fidelityScores.reduce((s, v) => s + v, 0) / fidelityScores.length * 100);

    // 2. WASTE (25%) — fraction of each bone covered by real visual content
    const wasteScores = bones.map(b => {
      const bArea = b.width * b.height;
      if (bArea === 0) return 0;
      const visualCovered = elems.reduce((sum, e) => {
        const ix = Math.max(0, Math.min(b.x + b.width, e.x + e.vw) - Math.max(b.x, e.x));
        const iy = Math.max(0, Math.min(b.y + b.height, e.y + e.vh) - Math.max(b.y, e.y));
        return sum + ix * iy;
      }, 0);
      return Math.min(1, visualCovered / bArea);
    });
    const waste = Math.round(wasteScores.reduce((s, v) => s + v, 0) / wasteScores.length * 100);

    // 3. COVERAGE (15%)
    const boneCovers = (b: Bone, e: ElemRect) => {
      const ix = Math.max(0, Math.min(b.x + b.width, e.x + e.w) - Math.max(b.x, e.x));
      const iy = Math.max(0, Math.min(b.y + b.height, e.y + e.h) - Math.max(b.y, e.y));
      return (ix * iy) / (e.w * e.h) > 0.25;
    };
    const missedElements = elems.filter(e => !bones.some(b => boneCovers(b, e))).length;
    const ghostBones = bones.filter(b => !elems.some(e => boneCovers(b, e))).length;
    const recall = (elems.length - missedElements) / elems.length;
    const coverage = Math.round(Math.max(0, recall - (ghostBones / Math.max(bones.length, 1)) * 0.3) * 100);

    // 4. STABILITY (10%)
    const skeletonH = bones.reduce((m, b) => Math.max(m, b.y + b.height), 0);
    const stability = Math.round(Math.max(0, 1 - Math.abs(skeletonH - refH) / Math.max(skeletonH, refH, 1)) * 100);

    const total = Math.round(fidelity * 0.5 + waste * 0.25 + coverage * 0.15 + stability * 0.1);
    setMatchScore(id, { total, fidelity, waste, coverage, stability, missedElements, ghostBones });
  }, [dtEnabled, bones, id, setMatchScore, realSize]);

  const scoreColor = score ? score.total >= 80 ? '#22c55e' : score.total >= 50 ? '#f59e0b' : '#ef4444' : '#71717a';
  const containerW = (realSize?.w ?? boneTree.layout.width) + 2;
  const containerH = (realSize?.h ?? boneTree.layout.height) + 2;

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={devTools.enabled ? () => devTools.setHoveredId(id) : undefined}
      onMouseLeave={devTools.enabled ? () => devTools.setHoveredId(null) : undefined}
      onClick={devTools.enabled && isHighlight ? () => devTools.setInspectedId(isInspected ? null : id) : undefined}
    >
      {/* Hidden measurement div — always present to capture real component size */}
      <div ref={measureRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', visibility: 'hidden' }}>
        <Component {...(componentProps as P)} />
      </div>
      {(showContent || xray) && <Component {...(componentProps as P)} />}

      {showOverlay && (
        <div style={{ ...overlayStyle, ...(xray ? { opacity: devTools.enabled && (devTools.forceLoading || isForced) ? 0.8 : 0.5 } : {}) }} aria-hidden="true" role="presentation">
          {bones.map((bone, index) => <SkeletonBone key={`bone-${index}`} bone={bone} config={mergedConfig} />)}
        </div>
      )}

      {isHighlight && isHovered && !xray && !isSSR && (
        <div style={{ ...overlayStyle, opacity: 0.35 }} aria-hidden="true" role="presentation">
          {bones.map((bone, index) => <SkeletonBone key={`bone-${index}`} bone={bone} config={mergedConfig} />)}
        </div>
      )}

      {isInspected && bones.length > 0 && (
        <InspectionOverlay bones={bones} containerW={containerW} containerH={containerH} contentRects={[]} />
      )}

      {isHighlight && (
        <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 400, display: 'flex', gap: 4, alignItems: 'center' }}>
          {score !== undefined && (
            <span onClick={e => { e.stopPropagation(); devTools.setInspectedId(isInspected ? null : id); }} style={{
              background: scoreColor, color: '#fff', fontSize: 9, lineHeight: 1, fontWeight: 700, fontFamily: 'monospace',
              display: 'inline-flex', alignItems: 'center',
              padding: '2px 6px', borderRadius: 20, cursor: 'pointer',
              boxShadow: isInspected ? `0 0 0 2px #fff, 0 0 0 4px ${scoreColor}` : '0 2px 6px rgba(0,0,0,0.4)',
            }}>{score.total}%</span>
          )}
          <span onClick={e => { e.stopPropagation(); devTools.setForcedId(id, !isForced); }} style={{
            background: isForced ? '#f97316' : 'rgba(39,39,42,0.9)', color: isForced ? '#fff' : '#a1a1aa',
            fontSize: 9, lineHeight: 1, fontWeight: 700, fontFamily: 'monospace',
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 6px', borderRadius: 20, cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
          }}>{isForced ? '⏹' : '▶'}</span>
        </div>
      )}
    </div>
  );
}) as <P extends object>(props: StaticWebSkeletonRendererProps<P> & { displayName?: string }) => React.ReactElement;

// ─── Auto renderer : ResizeObserver measurement ───────────────────────────────

interface WebSkeletonRendererProps<P extends object> {
  Component: ComponentType<P>;
  componentProps: P;
  mockProps?: Partial<P>;
  isLoading: boolean;
  skeletonConfig?: SkeletonConfig;
  displayName?: string;
}

const WebSkeletonRenderer = memo(function WebSkeletonRenderer<P extends object>({
  Component,
  componentProps,
  mockProps,
  isLoading: isLoadingProp,
  skeletonConfig,
  displayName = 'Component',
}: WebSkeletonRendererProps<P>) {
  const devTools = useDevTools();
  const id = useId();
  const isLoading = devTools.enabled && (devTools.forceLoading || devTools.forcedIds.has(id)) ? true : isLoadingProp;
  const xray = devTools.enabled && devTools.xray;

  const { boneTree, rootRef, isLayoutCaptured } = useMeasureLayout();

  const { isSkeletonVisible, bones, mergedConfig } = useSkeleton({
    hasSkeleton: true,
    isLoading,
    config: skeletonConfig,
    boneTree,
  });

  const enter = mergedConfig.enter;
  const exit = mergedConfig.exit;
  const phase = useExitPhase(isSkeletonVisible, isLoading, exit);
  const isExiting = phase === 'exiting';
  const showOverlay = phase !== 'hidden' && isLayoutCaptured && !isSSR;
  const enterPhase = useEnterPhase(showOverlay, enter);
  const isEntering = enterPhase === 'entering';

  // Keep the last non-empty bones so they remain visible during the exit phase.
  // useSkeleton clears bones as soon as isSkeletonVisible is false, but we need
  // them to be present while the exit animation plays out.
  const lastBonesRef = useRef<Bone[]>([]);
  if (bones.length > 0) lastBonesRef.current = bones;
  const isInspectedForOverlay = devTools.enabled && devTools.inspectedId === id;
  // Components that mount already-loaded (e.g. list item remounted with a new key
  // once real data arrives) never have visible bones to cache, so fall back to
  // generating them straight from the measured boneTree.
  const structuralBones = boneTree ? generateBones(boneTree) : [];
  const cachedBones = lastBonesRef.current.length > 0 ? lastBonesRef.current : structuralBones;
  const displayBones = (showOverlay || xray || isInspectedForOverlay) ? cachedBones : [];

  const revealOnExit = mergedConfig.revealOnExit;
  // isLoading hides on both server AND client so SSR HTML matches first client
  // render : no hydration mismatch, no content bleeding through shatter cells.
  // With revealOnExit, content is visible during the exiting phase so the
  // skeleton fades out over the real content.
  const hidden = isLoading ||
    (phase === 'visible' && isLayoutCaptured && !isSSR) ||
    (!revealOnExit && phase === 'exiting' && isLayoutCaptured && !isSSR);

  const overlayStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    ...(isEntering && {
      opacity: 0,
      transform: enterTransform(enter),
      transition: `opacity ${SKELETON_ENTER_MS}ms ease, transform ${SKELETON_ENTER_MS}ms ease`,
    }),
    ...(isExiting && {
      opacity: 0,
      transform: exitTransform(exit),
      transition: `opacity ${SKELETON_EXIT_MS}ms ease, transform ${SKELETON_EXIT_MS}ms ease`,
    }),
  };

  const { enabled: dtEnabled, registerComponent, unregisterComponent, setMatchScore } = devTools;
  const structuralBoneCount = structuralBones.length;
  useEffect(() => {
    if (!dtEnabled) return;
    registerComponent(id, {
      displayName,
      animation: mergedConfig.animation,
      bonesCount: structuralBoneCount,
      isLoading,
    });
  }, [dtEnabled, registerComponent, id, displayName, mergedConfig.animation, structuralBoneCount, isLoading]);

  useEffect(() => {
    if (!dtEnabled) return;
    return () => unregisterComponent(id);
  }, [dtEnabled, unregisterComponent, id]);

  const contentRef = rootRef as React.RefObject<HTMLDivElement>;

  // Get the visual bounding box of an element's actual content (text or image),
  // not its CSS box. This detects wasted space from missing width:fit-content or
  // oversized height containers.
  const getVisualRect = (el: Element, containerRect: DOMRect) => {
    const box = el.getBoundingClientRect();
    let vw = box.width, vh = box.height;
    // For text elements: use Range to measure actual ink bounds
    if (el.childNodes.length >= 1) {
      try {
        const range = document.createRange();
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        if (r.width > 2 && r.height > 2) { vw = r.width; vh = r.height; }
      } catch { /* ignore */ }
    }
    return {
      x: box.left - containerRect.left, y: box.top - containerRect.top,
      w: box.width, h: box.height,   // CSS box = what the bone covers
      vw, vh,                         // visual content = what's actually there
    };
  };

  const contentRectsRef = useRef<Array<{ x: number; y: number; w: number; h: number; vw: number; vh: number }>>([]);
  useEffect(() => {
    if (isLoading || !isLayoutCaptured || !contentRef.current) return;
    const container = contentRef.current.getBoundingClientRect();
    // React Native Web renders Text as div/span, not semantic tags — detect leaf nodes
    const SEMANTIC = new Set(['img', 'svg', 'input', 'textarea', 'button', 'a']);
    const allEls = Array.from(contentRef.current.querySelectorAll<Element>('*'));
    const leafEls = allEls.filter(el => {
      const tag = el.tagName.toLowerCase();
      if (SEMANTIC.has(tag)) return true;
      // leaf: has direct text content but no child element nodes
      const hasChildEl = Array.from(el.children).length > 0;
      if (hasChildEl) return false;
      return (el.textContent?.trim().length ?? 0) > 0;
    });
    contentRectsRef.current = leafEls
      .map(el => getVisualRect(el, container))
      .filter(r => r.w > 6 && r.h > 6);
  }, [isLoading, isLayoutCaptured]);

  useEffect(() => {
    if (!dtEnabled || !isLayoutCaptured || structuralBones.length === 0) return;
    const refW = boneTree?.layout.width ?? contentRef.current?.offsetWidth ?? 0;
    const refH = boneTree?.layout.height ?? contentRef.current?.offsetHeight ?? 0;
    if (!refW || !refH) return;
    const elems = contentRectsRef.current;
    if (elems.length === 0) return;

    const diagonal = Math.sqrt(refW * refW + refH * refH) || 1;
    const bones = structuralBones;

    // Paragraph bones are intentional approximations — exempt from fidelity/waste, treated as best-practice
    // Exempt intentional skeleton components from waste/fidelity scoring
    const isExempt = (b: Bone) => b.isParagraph || b.isStatic;
    const regularBones = bones.filter(b => !isExempt(b));
    const paragraphBones = bones.filter(b => b.isParagraph);
    const paragraphBonus = paragraphBones.length > 0 ? Math.min(10, paragraphBones.length * 2) : 0;

    // ── 1. FIDELITY: shape + position per element (50%) ───────────────────
    // Paragraph bones score 1.0 automatically — they represent text well by design.
    const fidelityScores = elems.map(e => {
      const eCx = e.x + e.vw / 2, eCy = e.y + e.vh / 2;
      // Check if a paragraph bone covers this element — auto full score
      const coveredByParagraph = paragraphBones.some(b => {
        const ix = Math.max(0, Math.min(b.x + b.width, e.x + e.vw) - Math.max(b.x, e.x));
        const iy = Math.max(0, Math.min(b.y + b.height, e.y + e.vh) - Math.max(b.y, e.y));
        return (ix * iy) / (e.vw * e.vh) > 0.2;
      });
      if (coveredByParagraph) return 1;
      return regularBones.reduce((best, b) => {
        const bCx = b.x + b.width / 2, bCy = b.y + b.height / 2;
        const dist = Math.sqrt((eCx - bCx) ** 2 + (eCy - bCy) ** 2);
        const posScore = Math.max(0, 1 - (dist / diagonal) * 2);
        const shapeScore = Math.min(b.width * b.height, e.vw * e.vh) / Math.max(b.width * b.height, e.vw * e.vh, 1);
        return Math.max(best, posScore * 0.5 + shapeScore * 0.5);
      }, 0);
    });
    const fidelity = Math.min(100, Math.round(fidelityScores.reduce((s, v) => s + v, 0) / fidelityScores.length * 100 + paragraphBonus));

    // ── 2. WASTE: only for regular bones — paragraph lines are intentionally approximate (25%) ──
    const bonesForWaste = regularBones.length > 0 ? regularBones : bones.filter(b => !b.isStatic);
    const wasteScores = bonesForWaste.map(b => {
      const bArea = b.width * b.height;
      if (bArea === 0) return 0;
      const visualCovered = elems.reduce((sum, e) => {
        const ix = Math.max(0, Math.min(b.x + b.width, e.x + e.vw) - Math.max(b.x, e.x));
        const iy = Math.max(0, Math.min(b.y + b.height, e.y + e.vh) - Math.max(b.y, e.y));
        return sum + ix * iy;
      }, 0);
      return Math.min(1, visualCovered / bArea);
    });
    // Paragraph-only component: waste is 100% by convention (best practice)
    const waste = regularBones.length === 0
      ? 100
      : Math.round(wasteScores.reduce((s, v) => s + v, 0) / wasteScores.length * 100);

    // ── 3. COVERAGE: every element has a bone covering it (15%) ──────────
    const boneCovers = (b: Bone, e: { x: number; y: number; w: number; h: number }) => {
      const ix = Math.max(0, Math.min(b.x + b.width, e.x + e.w) - Math.max(b.x, e.x));
      const iy = Math.max(0, Math.min(b.y + b.height, e.y + e.h) - Math.max(b.y, e.y));
      return (ix * iy) / (e.w * e.h) > 0.25;
    };
    const missedElements = elems.filter(e => !bones.some(b => boneCovers(b, e))).length;
    const ghostBones = bones.filter(b => !elems.some(e => boneCovers(b, e))).length;
    const recall = (elems.length - missedElements) / elems.length;
    const coverage = Math.round(Math.max(0, recall - (ghostBones / Math.max(bones.length, 1)) * 0.3) * 100);

    // ── 4. STABILITY: skeleton height ≈ content height, no CLS (10%) ─────
    const skeletonH = bones.reduce((m, b) => Math.max(m, b.y + b.height), 0);
    const realH = contentRef.current?.offsetHeight ?? refH;
    const stability = Math.round(Math.max(0, 1 - Math.abs(skeletonH - realH) / Math.max(skeletonH, realH, 1)) * 100);

    const total = Math.round(fidelity * 0.5 + waste * 0.25 + coverage * 0.15 + stability * 0.1);
    setMatchScore(id, { total, fidelity, waste, coverage, stability, missedElements, ghostBones });
  }, [dtEnabled, isLayoutCaptured, structuralBones, id, setMatchScore, contentRef]);

  const isInspected = devTools.enabled && devTools.inspectedId === id;
  const isHighlight = devTools.enabled && devTools.highlight;
  const isHovered = devTools.enabled && devTools.hoveredId === id;
  const isForced = devTools.enabled && devTools.forcedIds.has(id);
  const score = devTools.matchScores.get(id);
  const OVERFLOW_TOLERANCE = 2;
  const containerW = (boneTree?.layout.width ?? contentRef.current?.offsetWidth ?? 0) + OVERFLOW_TOLERANCE;
  const containerH = (boneTree?.layout.height ?? contentRef.current?.offsetHeight ?? 0) + OVERFLOW_TOLERANCE;

  const scoreColor = score
    ? score.total >= 80 ? '#22c55e' : score.total >= 50 ? '#f59e0b' : '#ef4444'
    : '#71717a';

  return (
    <div
      style={{ position: 'relative', width: '100%' }}
      onMouseEnter={devTools.enabled ? () => devTools.setHoveredId(id) : undefined}
      onMouseLeave={devTools.enabled ? () => devTools.setHoveredId(null) : undefined}
      onClick={devTools.enabled && isHighlight ? () => devTools.setInspectedId(isInspected ? null : id) : undefined}
    >
      <div
        ref={rootRef as React.RefObject<HTMLDivElement>}
        style={hidden && !xray && !isHovered ? { visibility: 'hidden', pointerEvents: 'none', position: 'relative', zIndex: 1 } : undefined}
        aria-hidden={hidden || undefined}
      >
        <Component {...(mockProps && isLoading ? { ...componentProps, ...mockProps } as P : componentProps as P)} />
      </div>

      {/* Skeleton overlay (xray, loading, or per-component inspect) */}
      {(showOverlay || xray || isInspectedForOverlay) && (
        <div style={{ ...overlayStyle, ...((xray || isInspectedForOverlay) ? { opacity: devTools.enabled && (devTools.forceLoading || isForced) ? 0.8 : 0.5 } : {}) }} aria-hidden="true" role="presentation">
          {displayBones.map((bone, index) => (
            <SkeletonBone key={`bone-${index}`} bone={bone} config={mergedConfig} />
          ))}
          {devTools.enabled && (
            <div style={{
              position: 'absolute', top: 4, left: 4, zIndex: 100,
              background: 'rgba(249,115,22,0.9)', color: '#fff',
              fontSize: 9, fontWeight: 700, fontFamily: 'monospace',
              padding: '2px 6px', borderRadius: 4, pointerEvents: 'none',
              letterSpacing: '0.04em',
            }}>
              {displayName}
            </div>
          )}
        </div>
      )}

      {/* Hover xray: light overlay when hovered in highlight mode */}
      {isHighlight && isHovered && !xray && isLayoutCaptured && cachedBones.length > 0 && (
        <div style={{ ...overlayStyle, opacity: 0.35 }} aria-hidden="true" role="presentation">
          {cachedBones.map((bone, index) => (
            <SkeletonBone key={`bone-${index}`} bone={bone} config={mergedConfig} />
          ))}
        </div>
      )}

      {/* Inspection overlay */}
      {isInspected && isLayoutCaptured && cachedBones.length > 0 && (
        <InspectionOverlay bones={cachedBones} containerW={containerW} containerH={containerH} contentRects={contentRectsRef.current} />
      )}

      {/* Floating controls: score badge + play/stop */}
      {isHighlight && isLayoutCaptured && (
        <div style={{
          position: 'absolute', top: 4, right: 4, zIndex: 400,
          display: 'flex', gap: 4, alignItems: 'center',
        }}>
          {score !== undefined && (
            <span
              onClick={e => { e.stopPropagation(); devTools.setInspectedId(isInspected ? null : id); }}
              style={{
                background: scoreColor, color: '#fff',
                fontSize: 9, lineHeight: 1, fontWeight: 700, fontFamily: 'monospace',
                display: 'inline-flex', alignItems: 'center',
                padding: '2px 6px', borderRadius: 20, cursor: 'pointer',
                boxShadow: isInspected ? `0 0 0 2px #fff, 0 0 0 4px ${scoreColor}` : '0 2px 6px rgba(0,0,0,0.4)',
                transition: 'box-shadow 0.15s',
              }}
            >{score.total}%</span>
          )}
          <span
            onClick={e => { e.stopPropagation(); devTools.setForcedId(id, !isForced); }}
            style={{
              background: isForced ? '#f97316' : 'rgba(39,39,42,0.9)',
              color: isForced ? '#fff' : '#a1a1aa',
              fontSize: 9, lineHeight: 1, fontWeight: 700, fontFamily: 'monospace',
              display: 'inline-flex', alignItems: 'center',
              padding: '2px 6px', borderRadius: 20, cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              transition: 'background 0.15s',
            }}
          >{isForced ? '⏹' : '▶'}</span>
        </div>
      )}
    </div>
  );
}) as <P extends object>(props: WebSkeletonRendererProps<P>) => React.ReactElement;

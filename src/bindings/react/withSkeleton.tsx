import React, {
  memo,
  useEffect,
  useRef,
  useState,
  ComponentType,
  CSSProperties,
} from 'react';
import type { Bone, SkeletonConfig, SkeletonExit, StaticBone, WithSkeletonOptions } from '../../core/types';
import { SKELETON_EXIT_MS } from '../../core/constants';
import { useSkeleton } from './useSkeleton';
import { useMeasureLayout } from '../../adapters/web/measureLayout';
import { SkeletonBone } from '../../adapters/web/SkeletonBone';

type ExitPhase = 'visible' | 'exiting' | 'hidden';

function exitTransform(exit: SkeletonExit): string | undefined {
  if (exit === 'fadeUp')    return 'translateY(-10px)';
  if (exit === 'fadeDown')  return 'translateY(10px)';
  if (exit === 'fadeLeft')  return 'translateX(-10px)';
  if (exit === 'fadeRight') return 'translateX(10px)';
  return undefined;
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
        />
      );
    }

    return (
      <WebSkeletonRenderer
        componentProps={componentProps as P}
        Component={Component}
        isLoading={resolvedIsLoading}
        skeletonConfig={skeletonConfig}
      />
    );
  });

  WrappedComponent.displayName = `withSkeleton(${displayName})`;
  return WrappedComponent as unknown as ComponentType<P & SkeletonProps>;
}

// ─── Static renderer — no warmup, no measurement ─────────────────────────────

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
  isLoading,
  skeletonConfig,
  staticBones,
}: StaticWebSkeletonRendererProps<P>) {
  const bones: Bone[] = staticBones.map(b => ({
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    borderRadius: b.borderRadius ?? 0,
    type: b.type ?? 'view',
  }));

  // Build a synthetic boneTree so useSkeleton can compute dimensions
  const boneTree = {
    layout: {
      x: 0,
      y: 0,
      width: Math.max(...bones.map(b => b.x + b.width)),
      height: Math.max(...bones.map(b => b.y + b.height)),
      type: 'view' as const,
    },
    children: bones.map(b => ({ layout: { ...b }, children: [] })),
  };

  const { isSkeletonVisible, mergedConfig } = useSkeleton({
    hasSkeleton: true,
    isLoading,
    config: skeletonConfig,
    boneTree,
  });

  const exit = mergedConfig.exit;
  const phase = useExitPhase(isSkeletonVisible, isLoading, exit);
  const isExiting = phase === 'exiting';
  const showOverlay = phase !== 'hidden' && !isSSR;

  const overlayStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: boneTree.layout.width,
    height: boneTree.layout.height,
    ...(isExiting && {
      opacity: 0,
      transform: exitTransform(exit),
      transition: `opacity ${SKELETON_EXIT_MS}ms ease, transform ${SKELETON_EXIT_MS}ms ease`,
    }),
  };

  return (
    <div style={{ position: 'relative' }}>
      {phase === 'hidden' && <Component {...(componentProps as P)} />}

      {showOverlay && (
        <div style={overlayStyle} aria-hidden="true" role="presentation">
          {bones.map((bone, index) => (
            <SkeletonBone
              key={`bone-${index}`}
              bone={bone}
              config={mergedConfig}
            />
          ))}
        </div>
      )}
    </div>
  );
}) as <P extends object>(props: StaticWebSkeletonRendererProps<P>) => React.ReactElement;

// ─── Auto renderer — ResizeObserver measurement ───────────────────────────────

interface WebSkeletonRendererProps<P extends object> {
  Component: ComponentType<P>;
  componentProps: P;
  isLoading: boolean;
  skeletonConfig?: SkeletonConfig;
}

const WebSkeletonRenderer = memo(function WebSkeletonRenderer<P extends object>({
  Component,
  componentProps,
  isLoading,
  skeletonConfig,
}: WebSkeletonRendererProps<P>) {
  const { boneTree, rootRef, isLayoutCaptured } = useMeasureLayout();

  const { isSkeletonVisible, bones, mergedConfig } = useSkeleton({
    hasSkeleton: true,
    isLoading,
    config: skeletonConfig,
    boneTree,
  });

  const exit = mergedConfig.exit;
  const phase = useExitPhase(isSkeletonVisible, isLoading, exit);
  const isExiting = phase === 'exiting';
  const showOverlay = phase !== 'hidden' && isLayoutCaptured && !isSSR;

  // Keep the last non-empty bones so they remain visible during the exit phase.
  // useSkeleton clears bones as soon as isSkeletonVisible is false, but we need
  // them to be present while the exit animation plays out.
  const lastBonesRef = useRef<Bone[]>([]);
  if (bones.length > 0) lastBonesRef.current = bones;
  const displayBones = showOverlay ? lastBonesRef.current : [];

  // isLoading hides on both server AND client so SSR HTML matches first client
  // render — no hydration mismatch, no content bleeding through shatter cells.
  // Keep content hidden during exit phase too so real content only appears after
  // the skeleton has fully animated out.
  const hidden = isLoading || (phase !== 'hidden' && isLayoutCaptured && !isSSR);

  const overlayStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    ...(isExiting && {
      opacity: 0,
      transform: exitTransform(exit),
      transition: `opacity ${SKELETON_EXIT_MS}ms ease, transform ${SKELETON_EXIT_MS}ms ease`,
    }),
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        ref={rootRef as React.RefObject<HTMLDivElement>}
        style={hidden ? { visibility: 'hidden', opacity: 0, pointerEvents: 'none' } : undefined}
        aria-hidden={hidden || undefined}
      >
        <Component {...(componentProps as P)} />
      </div>

      {showOverlay && (
        <div style={overlayStyle} aria-hidden="true" role="presentation">
          {displayBones.map((bone, index) => (
            <SkeletonBone
              key={`bone-${index}`}
              bone={bone}
              config={mergedConfig}
            />
          ))}
        </div>
      )}
    </div>
  );
}) as <P extends object>(props: WebSkeletonRendererProps<P>) => React.ReactElement;

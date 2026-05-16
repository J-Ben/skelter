import React, {
  memo,
  ComponentType,
  CSSProperties,
} from 'react';
import type { SkeletonConfig } from '../../core/types';
import { useSkeleton } from './useSkeleton';
import { useMeasureLayout } from '../../adapters/web/measureLayout';
import { SkeletonBone } from '../../adapters/web/SkeletonBone';

const isSSR = typeof window === 'undefined';

export interface SkeletonProps {
  hasSkeleton?: boolean;
  isLoading?: boolean;
  isLoadingSkeleton?: boolean;
  skeletonConfig?: SkeletonConfig;
}

/**
 * HOC that adds auto skeleton loading to any React component.
 *
 * Web-specific:
 * - ResizeObserver for layout capture
 * - In-flow visibility:hidden warmup (same principle as RN fix)
 * - CSS animations via inline styles — zero external CSS
 * - SSR safe
 *
 * Same API as React Native: hasSkeleton, isLoading, isLoadingSkeleton, skeletonConfig
 */
export function withSkeleton<P extends object>(
  Component: ComponentType<P>
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

  // The real component is always in the DOM so ResizeObserver observes it
  // continuously. When the skeleton is visible it becomes visibility:hidden
  // (not unmounted) so the element keeps its layout dimensions and the
  // observer keeps firing on viewport changes — bones stay responsive.
  const hidden =
    (isSkeletonVisible && isLayoutCaptured && !isSSR) ||
    (isLoading && !isLayoutCaptured && !isSSR);

  const skeletonOverlayStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Real component — ref'd for continuous ResizeObserver measurement.
          visibility:hidden (not unmounted) while skeleton shows so the
          container keeps its height and bones stay responsive on resize. */}
      <div
        ref={rootRef as React.RefObject<HTMLDivElement>}
        style={hidden ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
        aria-hidden={hidden || undefined}
      >
        <Component {...(componentProps as P)} />
      </div>

      {/* Skeleton overlay — absolutely positioned over the hidden component. */}
      {isSkeletonVisible && isLayoutCaptured && !isSSR && (
        <div
          style={skeletonOverlayStyle}
          aria-hidden="true"
          role="presentation"
        >
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
}) as <P extends object>(props: WebSkeletonRendererProps<P>) => React.ReactElement;

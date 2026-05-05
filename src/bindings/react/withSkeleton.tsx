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

  // In-flow warmup: visibility:hidden keeps the element in layout flow so that
  // children relying on parent width (width:100%, flex, etc.) measure correctly.
  // This mirrors the fix applied to the React Native binding.
  const warmupStyle: CSSProperties = {
    visibility: 'hidden',
    pointerEvents: 'none',
  };

  // Use measured dimensions from boneTree — avoids the containerSize race
  // where an absolutely-positioned warmup gives the outer container height=0.
  const skeletonOverlayStyle: CSSProperties = {
    position: 'relative',
    width: boneTree?.layout.width ?? '100%',
    height: boneTree?.layout.height ?? 'auto',
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Invisible in-flow warmup — ResizeObserver captures layout. */}
      {!isSSR && !isLayoutCaptured && (
        <div
          style={warmupStyle}
          ref={rootRef as React.RefObject<HTMLDivElement>}
          aria-hidden="true"
        >
          <Component {...componentProps} />
        </div>
      )}

      {/* Skeleton overlay — exact dimensions from measured layout. */}
      {isSkeletonVisible && isLayoutCaptured && (
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

      {/* Real component — also shown during warmup to avoid flash of empty while
          measurement is in progress (isLayoutCaptured becomes true after first
          ResizeObserver callback, typically within one frame). */}
      {(!isSkeletonVisible || isSSR || !isLayoutCaptured) && (
        <Component {...componentProps} />
      )}
    </div>
  );
}) as <P extends object>(props: WebSkeletonRendererProps<P>) => React.ReactElement;

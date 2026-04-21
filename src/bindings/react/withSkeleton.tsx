import React, {
  memo,
  useRef,
  useState,
  useCallback,
  ComponentType,
  CSSProperties,
} from 'react';
import type { SkeletonConfig } from '../../core/types';
import { useSkeleton } from './useSkeleton';
import { useMeasureLayout } from '../../adapters/web/measureLayout';
import { SkeletonBone } from '../../adapters/web/SkeletonBone';

/**
 * SSR detection.
 */
const isSSR = typeof window === 'undefined';

/**
 * Props injected by withSkeleton (web).
 */
export interface SkeletonProps {
  /** Activates skeleton feature */
  hasSkeleton?: boolean;
  /** Whether the component is loading */
  isLoading?: boolean;
  /**
   * Shorthand — activates hasSkeleton AND isLoading={true}.
   */
  isLoadingSkeleton?: boolean;
  /** Local config override */
  skeletonConfig?: SkeletonConfig;
}

/**
 * Higher-Order Component that adds automatic skeleton loading
 * to any React component.
 *
 * Web-specific features:
 * - Uses ResizeObserver for layout capture instead of onLayout
 * - Uses visibility: hidden for invisible first render (better web practice)
 * - CSS animations via inline styles — zero external CSS
 * - SSR safe — zero crashes without window
 *
 * Identical API to the React Native version:
 * hasSkeleton, isLoading, isLoadingSkeleton, skeletonConfig
 *
 * @param Component - The React component to wrap
 * @returns A new component with skeleton loading capability
 *
 * @example
 * export default withSkeleton(ArticleCard)
 * <ArticleCard hasSkeleton isLoading={isLoading} />
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

/**
 * Internal renderer for web skeleton display.
 */
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

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const onSizeChange = useCallback((width: number, height: number) => {
    if (width > 0 && height > 0) {
      setContainerSize({ width, height });
    }
  }, []);

  // Track container size via ref callback
  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      onSizeChange(rect.width, rect.height);
    },
    [onSizeChange]
  );

  const containerStyle: CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    width: '100%',
  };

  /**
   * Invisible first render style.
   * Uses visibility: hidden instead of opacity: 0 —
   * better web practice as it keeps the element in layout flow
   * while remaining completely invisible.
   * SSR safe — skipped on the server.
   */
  const invisibleStyle: CSSProperties = {
    visibility: 'hidden',
    pointerEvents: 'none',
    position: 'absolute',
    top: 0,
    left: 0,
  };

  const skeletonOverlayStyle: CSSProperties = {
    position: 'relative',
    width: containerSize.width || '100%',
    height: containerSize.height || 'auto',
  };

  return (
    <div style={containerStyle} ref={containerRef}>
      {/*
       * Invisible first render — captures real layout via ResizeObserver.
       * visibility: hidden keeps element in DOM flow for accurate measurement.
       * SSR safe — skipped on server.
       */}
      {!isSSR && !isLayoutCaptured && (
        <div
          style={invisibleStyle}
          ref={rootRef as React.RefObject<HTMLDivElement>}
          aria-hidden="true"
        >
          <Component {...componentProps} />
        </div>
      )}

      {/* Skeleton overlay */}
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

      {/* Real component */}
      {(!isSkeletonVisible || isSSR) && (
        <Component {...componentProps} />
      )}
    </div>
  );
}) as <P extends object>(props: WebSkeletonRendererProps<P>) => React.ReactElement;
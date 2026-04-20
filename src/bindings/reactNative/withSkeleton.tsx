import React, {
  memo,
  useRef,
  useState,
  useCallback,
  ComponentType,
} from 'react';
import { View, Animated } from 'react-native';
import type { SkeletonConfig } from '../../core/types';
import { useSkeleton } from './useSkeleton';
import { useMeasureLayout } from '../../adapters/native/measureLayout';

/**
 * Props injected by withSkeleton into the wrapped component.
 */
export interface SkeletonProps {
  /** Activates the skeleton feature on this component */
  hasSkeleton?: boolean;
  /** Controls whether the skeleton is currently visible */
  isLoading?: boolean;
  /**
   * Shorthand — activates hasSkeleton AND sets isLoading to true.
   * Use for simple cases where you always want the skeleton during load.
   */
  isLoadingSkeleton?: boolean;
  /** Local config — overrides SkeletonTheme and defaults */
  skeletonConfig?: SkeletonConfig;
}

/**
 * Strips skeleton-specific props before passing to the wrapped component.
 */
function omitSkeletonProps<P extends SkeletonProps>(
  props: P
): Omit<P, keyof SkeletonProps> {
  const {
    hasSkeleton: _hs,
    isLoading: _il,
    isLoadingSkeleton: _ils,
    skeletonConfig: _sc,
    ...rest
  } = props;
  return rest;
}

/**
 * Higher-Order Component that adds automatic skeleton loading behavior
 * to any React Native component.
 *
 * Features:
 * - Captures the real component layout via an invisible first render
 * - Generates skeleton bones automatically — zero manual configuration
 * - Shares a single Animated.Value across all bones for perfect sync
 * - isLoadingSkeleton shorthand combines hasSkeleton + isLoading
 * - Zero overhead when hasSkeleton is not set
 * - Preserves the wrapped component's displayName for debugging
 *
 * @param Component - The React Native component to wrap
 * @returns A new component with skeleton loading capability
 *
 * @example
 * export default withSkeleton(ArticleCard)
 *
 * // Usage
 * <ArticleCard hasSkeleton isLoading={isLoading} />
 * // or shorthand
 * <ArticleCard isLoadingSkeleton />
 */
export function withSkeleton<P extends object>(
  Component: ComponentType<P>
): ComponentType<P & SkeletonProps> {
  const displayName =
    (Component as { displayName?: string }).displayName ||
    (Component as { name?: string }).name ||
    'Component';

  const WrappedComponent = memo(
    (props: P & SkeletonProps) => {
      const {
        hasSkeleton,
        isLoading,
        isLoadingSkeleton,
        skeletonConfig,
        ...componentProps
      } = props;

      // Resolve shorthand
      const resolvedHasSkeleton = hasSkeleton || isLoadingSkeleton || false;
      const resolvedIsLoading = isLoading || isLoadingSkeleton || false;

      // If skeleton is not activated, render normally with zero overhead
      if (!resolvedHasSkeleton) {
        return <Component {...(componentProps as P)} />;
      }

      return (
        <SkeletonRenderer
          componentProps={componentProps as P}
          Component={Component}
          isLoading={resolvedIsLoading}
          skeletonConfig={skeletonConfig}
        />
      );
    }
  );

  WrappedComponent.displayName = `withSkeleton(${displayName})`;
  return WrappedComponent;
}

/**
 * Internal renderer that handles layout capture and skeleton display.
 * Separated from withSkeleton to keep hooks usage clean.
 */
interface SkeletonRendererProps<P extends object> {
  Component: ComponentType<P>;
  componentProps: P;
  isLoading: boolean;
  skeletonConfig?: SkeletonConfig;
}

const SkeletonRenderer = memo(function SkeletonRenderer<P extends object>({
  Component,
  componentProps,
  isLoading,
  skeletonConfig,
}: SkeletonRendererProps<P>) {
  const { boneTree, onRootLayout, isLayoutCaptured } = useMeasureLayout();

  const { isSkeletonVisible, bones, mergedConfig } = useSkeleton({
    hasSkeleton: true,
    isLoading,
    config: skeletonConfig,
    boneTree,
  });

  // Single Animated.Value shared across ALL bones of this component
  // Ensures perfect synchronization — all bones animate in lockstep
  const animatedValue = useRef(new Animated.Value(0)).current;

  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  const onContainerLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = event.nativeEvent.layout;
      if (width > 0 && height > 0) {
        setContainerDimensions({ width, height });
      }
    },
    []
  );

  return (
    <View onLayout={onContainerLayout}>
      {/* Invisible first render to capture the real layout */}
      {!isLayoutCaptured && (
        <View
          style={{
            position: 'absolute',
            opacity: 0,
          }}
          pointerEvents="none"
          onLayout={onRootLayout}
        >
          <Component {...componentProps} />
        </View>
      )}

      {/* Skeleton overlay */}
      {isSkeletonVisible && isLayoutCaptured && (
        <View
          style={{
            width: containerDimensions.width,
            height: containerDimensions.height,
          }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {bones.map((bone, index) => (
            <Animated.View
              key={`bone-${index}`}
              style={{
                position: 'absolute',
                left: bone.x,
                top: bone.y,
                width: bone.width,
                height: bone.height,
                borderRadius:
                  bone.borderRadius || mergedConfig.borderRadius,
                backgroundColor: mergedConfig.color,
                // animatedValue is passed here and will be used
                // by animation modules in Prompt 3
                opacity: animatedValue,
              }}
            />
          ))}
        </View>
      )}

      {/* Real component — hidden during loading */}
      {!isSkeletonVisible && isLayoutCaptured && (
        <Component {...componentProps} />
      )}
    </View>
  );
}) as <P extends object>(props: SkeletonRendererProps<P>) => React.ReactElement;
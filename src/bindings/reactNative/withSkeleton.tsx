import React, {
  memo,
  useRef,
  useState,
  useCallback,
  useContext,
  createContext,
  ComponentType,
} from 'react';
import { View, Animated } from 'react-native';
import type { SkeletonConfig } from '../../core/types';
import { useSkeleton } from './useSkeleton';
import { useMeasureLayout } from '../../adapters/native/measureLayout';
import { SkeletonBone } from '../../adapters/native/SkeletonBone';

/**
 * SSR detection — true when running on the server (Next.js, Expo SSR).
 * Layout measurement is disabled in SSR environments to prevent crashes.
 */
const isSSR = typeof window === 'undefined';

/**
 * Resolved once at module level — require is deterministic so the result
 * is stable for the lifetime of the app. A fallback context (always null)
 * is used when the internal RN module is unavailable, ensuring useContext
 * is always called unconditionally (Rules of Hooks compliant).
 */
const _FallbackContext = createContext<unknown>(null);
let _VirtualizedListContext: React.Context<unknown> = _FallbackContext;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-native/Libraries/Lists/VirtualizedListContext');
  if (mod?.VirtualizedListContext) {
    _VirtualizedListContext = mod.VirtualizedListContext;
  }
} catch {
  // Module unavailable — fallback context stays in use
}

/**
 * Detects if the component is rendered inside a FlatList / VirtualizedList.
 * Uses VirtualizedListContext set internally by React Native.
 * Always calls useContext unconditionally — Rules of Hooks compliant.
 */
function useIsInFlatList(): boolean {
  const context = useContext(_VirtualizedListContext);
  return context !== null && context !== undefined;
}

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
 * Higher-Order Component that adds automatic skeleton loading behavior
 * to any React Native component.
 *
 * Features:
 * - Auto-generates skeleton from real component layout via onLayout
 * - Single shared Animated.Value across all bones — perfect sync
 * - FlatList aware — disables shatter, limits bones in lists
 * - SSR safe — disables measurement on server, zero crashes
 * - Cache aware — no skeleton flash when data is already present
 * - isLoadingSkeleton shorthand combines hasSkeleton + isLoading={true}
 * - Zero overhead when hasSkeleton is not set
 * - Preserves component displayName for debugging
 *
 * @param Component - The React Native component to wrap
 * @returns A new component with skeleton loading capability
 *
 * @example
 * export default withSkeleton(ArticleCard)
 *
 * // Usage
 * <ArticleCard hasSkeleton isLoading={isLoading} />
 *
 * // Shorthand
 * <ArticleCard isLoadingSkeleton />
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

    // Resolve shorthand — isLoadingSkeleton activates both
    const resolvedHasSkeleton = hasSkeleton || isLoadingSkeleton || false;
    const resolvedIsLoading = isLoading || isLoadingSkeleton || false;

    // Zero overhead path — skeleton not activated
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
  });

  WrappedComponent.displayName = `withSkeleton(${displayName})`;
  return WrappedComponent as unknown as ComponentType<P & SkeletonProps>;
}
/**
 * Internal renderer that handles layout capture and skeleton display.
 * Separated from withSkeleton to keep hook usage clean and predictable.
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
  const isInFlatList = useIsInFlatList();
  const { boneTree, onRootLayout, isLayoutCaptured } = useMeasureLayout();

  /**
   * FlatList optimization — override animation when inside a VirtualizedList.
   * Shatter creates one Animated.Value per square per bone.
   * With 20+ items in a list this causes severe performance issues.
   * Fallback to pulse which uses a single shared Animated.Value.
   */
  // En FlatList, remplace shatter par pulse uniquement si l'utilisateur avait
  // explicitement choisi shatter — ne touche pas aux autres animations ni aux défauts.
  const effectiveConfig: SkeletonConfig | undefined =
    isInFlatList && skeletonConfig?.animation === 'shatter'
      ? { ...skeletonConfig, animation: 'pulse' as const }
      : skeletonConfig;

  const { isSkeletonVisible, bones, mergedConfig } = useSkeleton({
    hasSkeleton: true,
    isLoading,
    config: effectiveConfig,
    boneTree,
  });

  /**
   * Limit bones in FlatList if maxBonesInList is configured.
   * Prevents excessive simultaneous animations in long lists.
   * 0 = unlimited (default)
   */
  const visibleBones =
    isInFlatList && mergedConfig.maxBonesInList > 0
      ? bones.slice(0, mergedConfig.maxBonesInList)
      : bones;

  /**
   * Single Animated.Value shared across ALL bones of this component.
   * Ensures every bone animates in perfect lockstep —
   * pulse, wave and shiver all read from this same value.
   * Exception: ShatterBone manages its own values internally.
   */
  const animatedValue = useRef(new Animated.Value(0.3)).current;

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
      {/*
       * Invisible first render — captures the real component layout.
       *
       * Rendered with opacity: 0 and pointerEvents: none so it is
       * completely invisible and non-interactive.
       * Position absolute prevents it from affecting the layout flow.
       *
       * SSR safe — skipped entirely on the server.
       * Once layout is captured this render is removed from the tree.
       */}
      {!isSSR && !isLayoutCaptured && (
        <View
          style={{ position: 'absolute', opacity: 0 }}
          pointerEvents="none"
          onLayout={onRootLayout}
        >
          <Component {...componentProps} />
        </View>
      )}

      {/* Skeleton overlay — visible while isLoading is true */}
      {isSkeletonVisible && isLayoutCaptured && (
        <View
          style={{
            width: containerDimensions.width,
            height: containerDimensions.height,
          }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {visibleBones.map((bone, index) => (
            <SkeletonBone
              key={`bone-${index}`}
              bone={bone}
              config={mergedConfig}
              animatedValue={animatedValue}
            />
          ))}
        </View>
      )}

      {/* Real component — shown once loading is complete */}
      {(!isSkeletonVisible || isSSR) && (
        <Component {...componentProps} />
      )}
    </View>
  );
}) as <P extends object>(props: SkeletonRendererProps<P>) => React.ReactElement;
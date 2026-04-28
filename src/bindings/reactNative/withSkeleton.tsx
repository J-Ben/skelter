import React, {
  memo,
  useRef,
  useState,
  useEffect,
  useCallback,
  useContext,
  createContext,
  ComponentType,
} from 'react';
import { View, Animated, AccessibilityInfo } from 'react-native';
import type { SkeletonConfig } from '../../core/types';
import { resolveSpeed } from '../../core/constants';
import { useSkeleton } from './useSkeleton';
import { useMeasureLayout } from '../../adapters/native/measureLayout';
import { SkeletonBone } from '../../adapters/native/SkeletonBone';
import { ShatterBone } from '../../adapters/native/ShatterBone';

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
 * - Animation loop managed here, not per-bone — no Animated.Value conflicts
 * - FlatList aware — disables shatter, limits bones in lists
 * - SSR safe — disables measurement on server, zero crashes
 * - Cache aware — no skeleton flash when data is already present
 * - isLoadingSkeleton shorthand combines hasSkeleton + isLoading={true}
 * - Zero overhead when hasSkeleton is not set
 * - Preserves component displayName for debugging
 *
 * @param Component - The React Native component to wrap
 * @returns A new component with skeleton loading capability
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

  // FlatList: shatter → pulse (too expensive per-item)
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

  const visibleBones =
    isInFlatList && mergedConfig.maxBonesInList > 0
      ? bones.slice(0, mergedConfig.maxBonesInList)
      : bones;

  /**
   * Single Animated.Value shared across ALL non-shatter bones.
   * Initialized to 0 — the animation loop below sets the right
   * starting value for each animation type before it starts.
   *
   * ShatterBone manages its own Animated.Values per square internally.
   */
  const animatedValue = useRef(new Animated.Value(0)).current;

  // Reduce motion — stop all animations if enabled
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  /**
   * Single animation loop driving animatedValue for ALL bones.
   *
   * Previously each SkeletonBone started its own loop on the shared value,
   * causing N competing Animated.loop calls (one per bone) which made
   * wave/shiver freeze on the native side.
   *
   * Now: one loop here, bones just interpolate/read animatedValue.
   */
  useEffect(() => {
    const animation = mergedConfig.animation;

    // shatter and none don't need a shared loop
    if (!isSkeletonVisible || reduceMotion || animation === 'none' || animation === 'shatter') {
      animatedValue.stopAnimation();
      return;
    }

    const speed = resolveSpeed(mergedConfig.speed);
    let anim: Animated.CompositeAnimation;

    if (animation === 'pulse') {
      const dur = 1000 / speed;
      animatedValue.setValue(0.3);
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, { toValue: 1.0, duration: dur / 2, useNativeDriver: true }),
          Animated.timing(animatedValue, { toValue: 0.3, duration: dur / 2, useNativeDriver: true }),
        ])
      );
    } else {
      // wave or shiver — simple 0→1 loop; each bone interpolates its own translateX range
      const dur = (animation === 'shiver' ? 800 : 1500) / speed;
      animatedValue.setValue(0);
      anim = Animated.loop(
        Animated.timing(animatedValue, { toValue: 1, duration: dur, useNativeDriver: true })
      );
    }

    anim.start();
    return () => anim.stop();
  }, [isSkeletonVisible, reduceMotion, mergedConfig.animation, mergedConfig.speed, animatedValue]);

  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

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
       * Invisible warmup render — captures component dimensions.
       * left:0 right:0 ensures flex/percentage widths resolve correctly.
       * Removed from tree once layout is captured.
       */}
      {!isSSR && !isLayoutCaptured && (
        <View
          style={{ position: 'absolute', left: 0, right: 0, opacity: 0 }}
          pointerEvents="none"
          onLayout={onRootLayout}
        >
          <Component {...componentProps} />
        </View>
      )}

      {isSkeletonVisible && isLayoutCaptured && (
        <View
          style={{ width: containerDimensions.width, height: containerDimensions.height }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {visibleBones.map((bone, index) =>
            mergedConfig.animation === 'shatter' ? (
              <ShatterBone key={`bone-${index}`} bone={bone} config={mergedConfig} />
            ) : (
              <SkeletonBone
                key={`bone-${index}`}
                bone={bone}
                config={mergedConfig}
                animatedValue={animatedValue}
              />
            )
          )}
        </View>
      )}

      {(!isSkeletonVisible || isSSR) && (
        <Component {...componentProps} />
      )}
    </View>
  );
}) as <P extends object>(props: SkeletonRendererProps<P>) => React.ReactElement;

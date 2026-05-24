import React, {
  memo,
  useRef,
  useState,
  useEffect,
  useContext,
  createContext,
  ComponentType,
} from 'react';
import { View, Animated, Easing, AccessibilityInfo } from 'react-native';
import type { Bone, SkeletonConfig, StaticBone, WithSkeletonOptions, BoneStyleOverride } from '../../core/types';
import { resolveSpeed } from '../../core/constants';
import { useSkeleton } from './useSkeleton';
import { useMeasureLayout } from '../../adapters/native/measureLayout';
import { SkeletonBone } from '../../adapters/native/SkeletonBone';
import { ShatterBone } from '../../adapters/native/ShatterBone';

const isSSR = typeof window === 'undefined';

const _FallbackContext = createContext<unknown>(null);
let _VirtualizedListContext: React.Context<unknown> = _FallbackContext;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-native/Libraries/Lists/VirtualizedListContext');
  if (mod?.VirtualizedListContext) {
    _VirtualizedListContext = mod.VirtualizedListContext;
  }
} catch {
  // Module unavailable : fallback context stays in use
}

function useIsInFlatList(): boolean {
  const context = useContext(_VirtualizedListContext);
  return context !== null && context !== undefined;
}

export interface SkeletonProps {
  hasSkeleton?: boolean;
  isLoading?: boolean;
  isLoadingSkeleton?: boolean;
  skeletonConfig?: SkeletonConfig;
}

type ResolvedHocOptions = Required<Omit<WithSkeletonOptions, 'boneStyle'>> & { boneStyle?: BoneStyleOverride };

/** Default WithSkeletonOptions applied when no second argument is passed. */
const DEFAULT_HOC_OPTIONS: ResolvedHocOptions = {
  measureStrategy: 'auto',
  maxDepth: 20,
  exclude: [],
  mockProps: {},
  staticBones: [],
};

/**
 * Higher-Order Component that adds automatic skeleton loading to any component.
 *
 * @param Component - The component to wrap
 * @param options   - Optional measurement configuration
 *   measureStrategy: 'auto' (default) : one bone per leaf element via Fiber walk
 *   measureStrategy: 'root-only'      : single block, identical to v0.2
 *   maxDepth: max depth of Fiber traversal (default 8)
 *   exclude: component displayNames excluded from per-element measurement
 *
 * @example
 * // One bone per element in ProfileCard (avatar, name, bio…)
 * export default withSkeleton(ProfileCard)
 *
 * // v0.2 compat : single root block
 * export default withSkeleton(ProfileCard, { measureStrategy: 'root-only' })
 *
 * // Exclude a third-party map from per-element walk
 * export default withSkeleton(Screen, { exclude: ['MapView'] })
 */
export function withSkeleton<P extends object>(
  Component: ComponentType<P>,
  options?: WithSkeletonOptions
): ComponentType<P & SkeletonProps> {
  const displayName =
    (Component as { displayName?: string }).displayName ||
    (Component as { name?: string }).name ||
    'Component';

  const resolvedOptions: ResolvedHocOptions = {
    ...DEFAULT_HOC_OPTIONS,
    ...options,
    exclude: [...DEFAULT_HOC_OPTIONS.exclude, ...(options?.exclude ?? [])],
  };

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

    if (resolvedOptions.staticBones && resolvedOptions.staticBones.length > 0) {
      return (
        <StaticSkeletonRenderer
          componentProps={componentProps as P}
          Component={Component}
          isLoading={resolvedIsLoading}
          skeletonConfig={skeletonConfig}
          staticBones={resolvedOptions.staticBones}
        />
      );
    }

    return (
      <SkeletonRenderer
        componentProps={componentProps as P}
        Component={Component}
        isLoading={resolvedIsLoading}
        skeletonConfig={skeletonConfig}
        hocOptions={resolvedOptions}
      />
    );
  });

  WrappedComponent.displayName = `withSkeleton(${displayName})`;
  return WrappedComponent as unknown as ComponentType<P & SkeletonProps>;
}

interface SkeletonRendererProps<P extends object> {
  Component: ComponentType<P>;
  componentProps: P;
  isLoading: boolean;
  skeletonConfig?: SkeletonConfig;
  hocOptions: ResolvedHocOptions;
}

const SkeletonRenderer = memo(function SkeletonRenderer<P extends object>({
  Component,
  componentProps,
  isLoading,
  skeletonConfig,
  hocOptions,
}: SkeletonRendererProps<P>) {
  const isInFlatList = useIsInFlatList();

  // In FlatList, per-element walk is expensive (50 items × N fibers).
  // Force root-only inside VirtualizedList.
  const effectiveStrategy = isInFlatList ? 'root-only' : hocOptions.measureStrategy;

  const effectiveConfig: SkeletonConfig | undefined =
    isInFlatList && skeletonConfig?.animation === 'shatter'
      ? { ...skeletonConfig, animation: 'pulse' as const }
      : skeletonConfig;

  const { boneTree, onRootLayout, isLayoutCaptured, warmupRef } = useMeasureLayout({
    strategy: effectiveStrategy,
    maxDepth: hocOptions.maxDepth,
    exclude: hocOptions.exclude,
    boneStyle: hocOptions.boneStyle,
  });

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

  // Single Animated.Value shared across all non-shatter bones.
  const animatedValue = useRef(new Animated.Value(0)).current;

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  // Single animation loop : drives all bones from this component.
  useEffect(() => {
    const animation = mergedConfig.animation;
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
    } else if (animation === 'slide') {
      const dur = 1200 / speed;
      animatedValue.setValue(0);
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, { toValue: 1, duration: dur / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(animatedValue, { toValue: 0, duration: dur / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
    } else if (animation === 'beat') {
      const dur = 2000 / speed;
      animatedValue.setValue(0);
      anim = Animated.loop(
        Animated.timing(animatedValue, { toValue: 1, duration: dur, useNativeDriver: true })
      );
    } else {
      const dur = (animation === 'shiver' ? 800 : 1500) / speed;
      animatedValue.setValue(0);
      anim = Animated.loop(
        Animated.timing(animatedValue, { toValue: 1, duration: dur, useNativeDriver: true })
      );
    }

    anim.start();
    return () => anim.stop();
  }, [isSkeletonVisible, reduceMotion, mergedConfig.animation, mergedConfig.speed, animatedValue]);

  return (
    <View>
      {!isSSR && !isLayoutCaptured && (
        <View
          ref={warmupRef as React.RefObject<View>}
          style={{ opacity: 0 }}
          pointerEvents="none"
          onLayout={onRootLayout}
        >
          <Component {...({ ...componentProps, ...hocOptions.mockProps } as P)} />
        </View>
      )}

      {isSkeletonVisible && isLayoutCaptured && boneTree && (
        <View
          style={{ width: boneTree.layout.width, height: boneTree.layout.height }}
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

// ─── Static renderer : no warmup, no fiber walk ───────────────────────────────

interface StaticSkeletonRendererProps<P extends object> {
  Component: ComponentType<P>;
  componentProps: P;
  isLoading: boolean;
  skeletonConfig?: SkeletonConfig;
  staticBones: StaticBone[];
}

const StaticSkeletonRenderer = memo(function StaticSkeletonRenderer<P extends object>({
  Component,
  componentProps,
  isLoading,
  skeletonConfig,
  staticBones,
}: StaticSkeletonRendererProps<P>) {
  const bones: Bone[] = staticBones.map(b => ({
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    borderRadius: b.borderRadius ?? 0,
    type: b.type ?? 'view',
  }));

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

  const animatedValue = useRef(new Animated.Value(0)).current;

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const { isSkeletonVisible, mergedConfig } = useSkeleton({
    hasSkeleton: true,
    isLoading,
    config: skeletonConfig,
    boneTree,
  });

  useEffect(() => {
    const animation = mergedConfig.animation;
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
      const dur = (animation === 'shiver' ? 800 : 1500) / speed;
      animatedValue.setValue(0);
      anim = Animated.loop(
        Animated.timing(animatedValue, { toValue: 1, duration: dur, useNativeDriver: true })
      );
    }
    anim.start();
    return () => anim.stop();
  }, [isSkeletonVisible, reduceMotion, mergedConfig.animation, mergedConfig.speed, animatedValue]);

  return (
    <View>
      {isSkeletonVisible && (
        <View
          style={{ width: boneTree.layout.width, height: boneTree.layout.height }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {bones.map((bone, index) =>
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

      {!isSkeletonVisible && <Component {...componentProps} />}
    </View>
  );
}) as <P extends object>(props: StaticSkeletonRendererProps<P>) => React.ReactElement;

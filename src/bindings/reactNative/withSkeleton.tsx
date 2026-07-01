import React, {
  memo,
  useRef,
  useState,
  useEffect,
  useContext,
  useId,
  createContext,
  ComponentType,
} from 'react';
import { useDevTools } from '../../context/DevToolsContext';
import { View, Text, Pressable, Animated, Easing, AccessibilityInfo, UIManager } from 'react-native';
import type { Bone, SkeletonConfig, StaticBone, WithSkeletonOptions, BoneStyleOverride } from '../../core/types';
import { resolveSpeed } from '../../core/constants';
import { useSkeleton } from './useSkeleton';
import { useMeasureLayout } from '../../adapters/native/measureLayout';
import { generateBones } from '../../core/generateBones';
import type { ScoringRect } from '../../adapters/native/measureLayout';
import { measureFiberLeaves } from '../../adapters/native/fiberWalker';
import { SkeletonBone } from '../../adapters/native/SkeletonBone';
import { ShatterBone } from '../../adapters/native/ShatterBone';

const isSSR = typeof window === 'undefined';

// Wraps a bone in a fade-in Animated.View when cascade > 0.
function CascadeBone({ bone, delay, children }: {
  bone: Bone;
  delay: number;
  children: React.ReactNode;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [delay, fadeAnim]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: bone.x, top: bone.y,
        width: bone.width, height: bone.height,
        opacity: fadeAnim,
      }}
    >
      {children}
    </Animated.View>
  );
}

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
        displayName={displayName}
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
  displayName: string;
}

const SkeletonRenderer = memo(function SkeletonRenderer<P extends object>({
  Component,
  componentProps,
  isLoading,
  skeletonConfig,
  hocOptions,
  displayName,
}: SkeletonRendererProps<P> & { displayName: string }) {
  const isInFlatList = useIsInFlatList();
  const id = useId();
  const { enabled, registerComponent, unregisterComponent, setMatchScore, inspectedId, setInspectedId, matchScores, forcedIds, forceLoading, xray, showWaste, highlight } = useDevTools();

  // In FlatList, per-element walk is expensive (50 items × N fibers).
  // Force root-only inside VirtualizedList.
  const effectiveStrategy = isInFlatList ? 'root-only' : hocOptions.measureStrategy;

  const effectiveConfig: SkeletonConfig | undefined =
    isInFlatList && skeletonConfig?.animation === 'shatter'
      ? { ...skeletonConfig, animation: 'pulse' as const }
      : skeletonConfig;

  const { boneTree, onRootLayout, isLayoutCaptured, warmupRef, scoringLeaves } = useMeasureLayout({
    strategy: effectiveStrategy,
    maxDepth: hocOptions.maxDepth,
    exclude: hocOptions.exclude,
    boneStyle: hocOptions.boneStyle,
  });

  const resolvedIsLoading = isLoading || (enabled && (forceLoading || forcedIds.has(id)));

  const { isSkeletonVisible, bones, mergedConfig } = useSkeleton({
    hasSkeleton: true,
    isLoading: resolvedIsLoading,
    config: effectiveConfig,
    boneTree,
  });

  // Exit animation state (moved here so it's accessible for displayBones calculation).
  const [isExiting, setIsExiting] = useState(false);

  // Cache last non-empty bones so x-ray can show them even after loading ends.
  const lastBonesRef = useRef(bones);
  if (bones.length > 0) lastBonesRef.current = bones;
  const isInspected = enabled && inspectedId === id;
  // Components that mount already-loaded (e.g. list item remounted with a new key
  // once real data arrives) never have visible bones to cache, so fall back to
  // generating them straight from the measured boneTree.
  const structuralBones = boneTree ? generateBones(boneTree) : [];
  const cachedBones = lastBonesRef.current.length > 0 ? lastBonesRef.current : structuralBones;
  const displayBones = (xray || isInspected || isExiting) ? cachedBones : bones;

  // Real content ref + real leaves for waste overlay (measured from actual rendered content, not mock).
  const realContentRef = useRef<View | null>(null);
  const realLeavesRef = useRef<ScoringRect[]>([]);
  const [, forceRealLeaves] = React.useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!enabled || resolvedIsLoading || !isLayoutCaptured || isSkeletonVisible) return;
    const instance = realContentRef.current;
    if (!instance) return;

    const measure = (rootPageX: number, rootPageY: number) => {
      measureFiberLeaves(instance, rootPageX, rootPageY, { maxDepth: hocOptions.maxDepth, exclude: hocOptions.exclude ?? [] })
        .then(layouts => {
          if (layouts && layouts.length > 0 && boneTree) {
            const realLeaves = layouts.map(l => ({
              x: l.x, y: l.y, w: l.width, h: l.height,
              textW: l.textContentWidth !== undefined ? Math.min(l.textContentWidth, l.width) : undefined,
            }));
            realLeavesRef.current = realLeaves;
            forceRealLeaves();

            // Recompute score from real content (overwrites mock-based score)
            const sb = generateBones(boneTree);
            if (sb.length > 0) {
              const containerH = boneTree.layout.height;
              let fidelitySum = 0; let missedElements = 0;
              realLeaves.forEach(leaf => {
                const best = sb.reduce((acc, b) => {
                  const lw = leaf.textW ?? leaf.w;
                  const ix = Math.max(0, Math.min(b.x + b.width, leaf.x + lw) - Math.max(b.x, leaf.x));
                  const iy = Math.max(0, Math.min(b.y + b.height, leaf.y + leaf.h) - Math.max(b.y, leaf.y));
                  const inter = ix * iy;
                  const union = b.width * b.height + lw * leaf.h - inter;
                  return Math.max(acc, union > 0 ? inter / union : 0);
                }, 0);
                if (best < 0.1) missedElements++;
                fidelitySum += best;
              });
              const fidelity = Math.round((realLeaves.length > 0 ? fidelitySum / realLeaves.length : 0) * 100);
              let ghostBones = 0;
              const wasteRatios = sb.map(b => {
                if (b.isParagraph || b.isStatic) return 1;
                const bArea = b.width * b.height;
                if (bArea === 0) return 1;
                const covered = realLeaves.reduce((sum, leaf) => {
                  const lw = leaf.textW ?? leaf.w;
                  const ix = Math.max(0, Math.min(b.x + b.width, leaf.x + lw) - Math.max(b.x, leaf.x));
                  const iy = Math.max(0, Math.min(b.y + b.height, leaf.y + leaf.h) - Math.max(b.y, leaf.y));
                  return sum + ix * iy;
                }, 0);
                const ratio = Math.min(1, covered / bArea);
                if (ratio < 0.1) ghostBones++;
                return ratio;
              });
              const waste = Math.round((wasteRatios.reduce((a, b) => a + b, 0) / wasteRatios.length) * 100);
              const coveredLeaves = realLeaves.filter(leaf =>
                sb.some(b => {
                  const lw = leaf.textW ?? leaf.w;
                  const ix = Math.max(0, Math.min(b.x + b.width, leaf.x + lw) - Math.max(b.x, leaf.x));
                  const iy = Math.max(0, Math.min(b.y + b.height, leaf.y + leaf.h) - Math.max(b.y, leaf.y));
                  return ix * iy > 0;
                })
              ).length;
              const coverage = Math.round(realLeaves.length > 0 ? (coveredLeaves / realLeaves.length) * 100 : 100);
              const skeletonH = sb.reduce((max, b) => Math.max(max, b.y + b.height), 0);
              const stability = Math.round(Math.max(0, 1 - Math.abs(skeletonH - containerH) / Math.max(containerH, 1)) * 100);
              const total = Math.round(fidelity * 0.5 + waste * 0.25 + coverage * 0.15 + stability * 0.1);
              setMatchScore(id, { total, fidelity, waste, coverage, stability, missedElements, ghostBones });
            }
          }
        })
        .catch(() => {});
    };

    const sn = instance as unknown as Record<string, unknown>;
    const nativeTag = sn.__nativeTag as number | undefined;
    if (nativeTag && nativeTag > 0) {
      try {
        UIManager.measure(nativeTag, (_x, _y, _w, _h, px, py) => measure(px, py));
        return;
      } catch { /* fall through */ }
    }
    if (typeof (instance as unknown as { measure?: unknown }).measure === 'function') {
      (instance as unknown as { measure: (cb: (...a: number[]) => void) => void })
        .measure((_x, _y, _w, _h, px, py) => measure(px, py));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, resolvedIsLoading, isLayoutCaptured, isSkeletonVisible]);

  const structuralBoneCount = structuralBones.length;

  useEffect(() => {
    if (!enabled) return;
    registerComponent(id, {
      displayName,
      animation: mergedConfig.animation ?? 'pulse',
      bonesCount: structuralBoneCount,
      isLoading: resolvedIsLoading,
    });
    return () => unregisterComponent(id);
  }, [enabled, id, displayName, mergedConfig.animation, structuralBoneCount, resolvedIsLoading, registerComponent, unregisterComponent]);


  const visibleBones =
    isInFlatList && mergedConfig.maxBonesInList > 0
      ? displayBones.slice(0, mergedConfig.maxBonesInList)
      : displayBones;

  // Single Animated.Value shared across all non-shatter bones.
  const animatedValue = useRef(new Animated.Value(0)).current;

  // Enter animation: fade in skeleton when it first becomes visible.
  const enterOpacityRef = useRef(new Animated.Value(0)).current;

  // Exit animation: fade + translate bones when loading → loaded transition.
  const exitOpacityRef = useRef(new Animated.Value(1)).current;
  const exitTranslateYRef = useRef(new Animated.Value(0)).current;
  const exitTranslateXRef = useRef(new Animated.Value(0)).current;

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  // Enter fade: animate opacity 0→1 when skeleton becomes visible.
  useEffect(() => {
    if (isSkeletonVisible && !reduceMotion) {
      enterOpacityRef.setValue(0);
      Animated.timing(enterOpacityRef, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      enterOpacityRef.setValue(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSkeletonVisible]);

  // Track if skeleton was visible AND trigger exit animation on transition.
  const wasSkeletonVisibleRef = useRef(false);

  useEffect(() => {
    const wasVisible = wasSkeletonVisibleRef.current;
    const isNowVisible = isSkeletonVisible;

    // Transition from visible → hidden: trigger exit animation.
    if (wasVisible && !isNowVisible && !isExiting) {
      console.log('[EXIT-TRIGGERED-DIRECT]', { exitType: mergedConfig.exit, reduceMotion });
      const exitType = mergedConfig.exit;
      const shouldAnimateExit = exitType !== 'none' && !reduceMotion;

      if (shouldAnimateExit) {
        setIsExiting(true);

        // Calculate target transform values based on exit type.
        let targetY = 0, targetX = 0;
        if (exitType === 'fadeUp') targetY = -20;
        else if (exitType === 'fadeDown') targetY = 20;
        else if (exitType === 'fadeLeft') targetX = -20;
        else if (exitType === 'fadeRight') targetX = 20;

        // Run opacity + translate animations in parallel.
        Animated.parallel([
          Animated.timing(exitOpacityRef, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(exitTranslateYRef, {
            toValue: targetY,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(exitTranslateXRef, {
            toValue: targetX,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIsExiting(false);
          exitOpacityRef.setValue(1);
          exitTranslateYRef.setValue(0);
          exitTranslateXRef.setValue(0);
        });
      }
    }

    wasSkeletonVisibleRef.current = isNowVisible;
  }, [isSkeletonVisible, mergedConfig.exit, reduceMotion, isExiting, exitOpacityRef, exitTranslateYRef, exitTranslateXRef]);

  // Single animation loop : drives all bones from this component.
  useEffect(() => {
    const animation = mergedConfig.animation;
    if ((!isSkeletonVisible && !xray) || reduceMotion || animation === 'none' || animation === 'shatter') {
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
    } else if (animation === 'shaker') {
      const dur = 1800 / speed;
      animatedValue.setValue(0);
      anim = Animated.loop(
        Animated.timing(animatedValue, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: true })
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
  }, [isSkeletonVisible, xray, reduceMotion, mergedConfig.animation, mergedConfig.speed, animatedValue]);

  const showBones = isLayoutCaptured && !!boneTree && (visibleBones.length > 0 || isExiting);
  const showXrayOverlay = (xray || isInspected) && isLayoutCaptured && !!boneTree && visibleBones.length > 0;

  const bonesLayer = showBones ? (
    <View
      style={{ width: boneTree!.layout.width, height: boneTree!.layout.height }}
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
  ) : null;

  return (
    <View style={isExiting && boneTree ? { height: boneTree.layout.height, overflow: 'hidden' } : undefined}>
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

      {/* Normal skeleton mode: bones replace content, take up natural space */}
      {(isSkeletonVisible || isExiting) && (
        <Animated.View
          style={{
            ...(isExiting ? { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1 } : {}),
            opacity: isExiting ? exitOpacityRef : enterOpacityRef,
            transform: isExiting ? [
              { translateY: exitTranslateYRef },
              { translateX: exitTranslateXRef },
            ] : undefined,
          }}
        >
          {bonesLayer}
        </Animated.View>
      )}

      {/* Real content: pre-rendered (opacity 0) during loading so layout is ready when exit starts. Visible after. */}
      <View
        ref={realContentRef}
        collapsable={false}
        style={isSkeletonVisible && !isExiting ? { opacity: 0, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 } : undefined}
        pointerEvents={isSkeletonVisible && !isExiting ? 'none' : 'auto'}
      >
        <Component {...componentProps} />
      </View>
      {showXrayOverlay && (
        <View
          style={{ position: 'absolute', top: 0, left: 0, opacity: isSkeletonVisible ? 0.85 : 0.5 }}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View
            style={{ width: boneTree!.layout.width, height: boneTree!.layout.height }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {visibleBones.map((bone, index) => (
              <View
                key={`xray-${index}`}
                style={{
                  position: 'absolute',
                  left: bone.x, top: bone.y,
                  width: bone.width, height: bone.height,
                  backgroundColor: '#71717a',
                  borderRadius: bone.borderRadius ?? 4,
                  opacity: 0.5,
                }}
              />
            ))}
          </View>
        </View>
      )}

      {/* Waste overlay: red = wasted bone area, green = bone area covering REAL rendered content. */}
      {showWaste && isLayoutCaptured && boneTree && realLeavesRef.current.length > 0 && (() => {
        const wasteBones = lastBonesRef.current.length > 0 ? lastBonesRef.current : generateBones(boneTree);
        if (wasteBones.length === 0) return null;
        return (
        <View
          style={{ position: 'absolute', top: 0, left: 0 }}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {wasteBones.map((bone, bIdx) => (
            <React.Fragment key={`waste-${bIdx}`}>
              <View style={{
                position: 'absolute',
                left: bone.x, top: bone.y,
                width: bone.width, height: bone.height,
                backgroundColor: 'rgba(239,68,68,0.4)',
                borderRadius: bone.borderRadius ?? 0,
              }} />
              {realLeavesRef.current.map((leaf, lIdx) => {
                const lw = leaf.textW ?? leaf.w;
                const x = Math.max(bone.x, leaf.x);
                const y = Math.max(bone.y, leaf.y);
                const r = Math.min(bone.x + bone.width, leaf.x + lw);
                const b = Math.min(bone.y + bone.height, leaf.y + leaf.h);
                if (r <= x || b <= y) return null;
                return (
                  <View key={`cov-${bIdx}-${lIdx}`} style={{
                    position: 'absolute',
                    left: x, top: y,
                    width: r - x, height: b - y,
                    backgroundColor: 'rgba(34,197,94,0.55)',
                  }} />
                );
              })}
            </React.Fragment>
          ))}
        </View>
        );
      })()}

      {/* Score badge overlay when scores panel is active */}
      {highlight && enabled && isLayoutCaptured && boneTree && (() => {
        const score = matchScores.get(id);
        if (!score) return null;
        const pct = score.total;
        const color = pct >= 75 ? '#22c55e' : pct >= 45 ? '#f97316' : '#ef4444';
        return (
          <View style={{ position: 'absolute', top: 2, right: 2 }}>
            <Pressable
              onPress={() => setInspectedId(id)}
              style={{ backgroundColor: color, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}
            >
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{pct}%</Text>
            </Pressable>
          </View>
        );
      })()}
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
    } else if (animation === 'shaker') {
      const dur = 1800 / speed;
      animatedValue.setValue(0);
      anim = Animated.loop(
        Animated.timing(animatedValue, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: true })
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
          {bones.map((bone, index) => {
            const inner = mergedConfig.animation === 'shatter' ? (
              <ShatterBone key={`bone-${index}`} bone={bone} config={mergedConfig} />
            ) : (
              <SkeletonBone
                key={`bone-${index}`}
                bone={mergedConfig.cascade > 0 ? { ...bone, x: 0, y: 0 } : bone}
                config={mergedConfig}
                animatedValue={animatedValue}
              />
            );
            if (mergedConfig.cascade > 0) {
              const delay = Math.round(bone.y * mergedConfig.cascade);
              return (
                <CascadeBone key={`bone-${index}`} bone={bone} delay={delay}>
                  {inner}
                </CascadeBone>
              );
            }
            return inner;
          })}
        </View>
      )}

      {!isSkeletonVisible && <Component {...componentProps} />}
    </View>
  );
}) as <P extends object>(props: StaticSkeletonRendererProps<P>) => React.ReactElement;

# skelter

## 0.3.0

### New features

- **Per-element bones** — `withSkeleton(Component)` now generates one bone per native leaf element (View, Text, Image…) instead of a single block the size of the component root. Each bone precisely mirrors the shape, position, and `borderRadius` of the original element. Zero config change required — the default `measureStrategy: 'auto'` applies automatically.

- **`withSkeleton` second argument** — `withSkeleton(Component, options?)` accepts an optional `WithSkeletonOptions` object:
  - `measureStrategy: 'auto' | 'root-only'` — `'auto'` (default) enables per-element fiber walk; `'root-only'` restores v0.2 single-block behaviour.
  - `maxDepth: number` — max depth of the Fiber tree traversal (default: 8). Guards against runaway walks on deeply nested trees.
  - `exclude: string[]` — component displayNames to skip during traversal. Each excluded component produces no bones and is not traversed further. Useful for third-party widgets (`['MapView', 'VideoPlayer']`).

- **`registerSkeletonLeaf(...names)`** — registers additional component names as skeleton leaf elements. Useful for custom image libraries (`registerSkeletonLeaf('FastImage', 'ExpoImage')`).

- **React Fiber tree walker** (`fiberWalker.ts`) — internal module that reads `_reactInternals` / `_reactFiber` fiber keys from the native View instance, walks the tree depth-first, collects host component nodes, and measures each with `stateNode.measure()`. Compatible with both Old Architecture (UIManager) and New Architecture (Fabric/JSI). Falls back to single root bone when fibers are inaccessible (test runners, hermetic bundles).

- **FlatList auto-detect** — components rendered inside a FlatList are automatically switched to `root-only` mode (via `VirtualizedListContext`). Per-element fiber walks on 50+ list items are expensive; the root-only fallback keeps scroll performance smooth. The `shatter` animation is also silently replaced with `pulse` inside lists.

- **`MeasureStrategy` and `WithSkeletonOptions` types** exported from the package.

### Internal

- `useMeasureLayout` refactored into `buildAutoHook` (fiber-based) and `buildRootOnlyHook` (v0.2 compat). Strategy selected once at mount and never changes.
- `SkeletonRenderer` receives `hocOptions` and `warmupRef`. The invisible warmup View is now `ref`-attached so the fiber walker can reach the React tree from the native instance after `onLayout` fires.
- `generateBones` propagates `borderRadius` from measured fiber styles instead of hardcoding `0`.

### Migration

No breaking API changes. All existing `withSkeleton(Component)` calls work unchanged — they just produce richer skeletons automatically.

To opt out of per-element measurement (e.g. if your component's Fiber internals are not accessible):

```tsx
export default withSkeleton(MyComponent, { measureStrategy: 'root-only' })
```

To exclude a heavy third-party widget from the fiber walk:

```tsx
export default withSkeleton(Screen, { exclude: ['MapView', 'VideoPlayer'] })
```

## 0.2.1

### Bug fixes

- **fix(shatter)**: wrapper `View` now applies `borderRadius: bone.borderRadius || config.borderRadius`. Cards with rounded corners were rendered with square shatter tiles.
- **fix(wave/shiver)**: animation loop is now started once in `SkeletonRenderer` instead of once per bone. Multiple competing `Animated.loop` calls on the same shared `Animated.Value` prevented the animation from running on the native driver. wave/shiver now visibly shimmer.
- **fix(cache-aware)**: replaced one-shot `wasLoadingOnMount` flag with `everSeenLoading` ref. A component mounted with `isLoading=false` now correctly shows the skeleton when `isLoading` later becomes `true` (e.g. user-triggered reload, key-remount).

### New features

- **`AnimationSpeed` type** — `speed` now accepts `'slow' | 'normal' | 'rapid'` presets in addition to a numeric multiplier. `'slow'` = 0.5×, `'normal'` = 1.0× (default), `'rapid'` = 2.0×. Custom multipliers still work (`speed: 1.5`). All animation modules (pulse, wave, shiver, shatter) use the new `resolveSpeed()` helper.
- **`resolveSpeed`** exported from the package for advanced use cases.

## 0.2.0

### P0 Bug Fixes

- **fix(shatter)**: `shatter` now produces the real grid-fragmentation effect instead of silently falling back to `pulse`. `withSkeleton` routes `mergedConfig.animation === 'shatter'` to `ShatterBone` (grid of squares with staggered opacity, `fadeStyle`: random / cascade / radial). The `shatter→pulse` fallback that shipped in 0.1.1 is removed.

- **fix(shimmer)**: `wave` and `shiver` now render a real LinearGradient highlight (`[color, highlightColor, color]`) that sweeps across the bone instead of translating the entire bone. Requires `expo-linear-gradient` or `react-native-linear-gradient` as an optional peer. If absent, logs a warning once and falls back to solid bone (identical to 0.1.x visuals). The shimmer interpolation is computed synchronously via `useMemo` — available on the first render with no flicker.

- **fix(measure)**: The invisible warmup render used to size itself to its content, making `flex: 1` / `width: '100%'` resolve to 0. The warmup View now uses `left: 0, right: 0` so it inherits the full parent width and `flex`-based components measure correctly without requiring explicit numeric widths.

### Migration

No breaking API changes. `withSkeleton`, `SkeletonTheme`, `useSkeleton`, `hasSkeleton`, `isLoading`, `isLoadingSkeleton`, `skeletonConfig` all work identically.

To enable shimmer on `wave` / `shiver`, install one gradient peer:

```sh
# Expo
npx expo install expo-linear-gradient
# Bare RN
npm install react-native-linear-gradient
```

## 0.1.1

### Patch Changes

- 4d22a60: Fix critical bugs identified in initial audit:

  - **Web entry point** (`src/index.ts`): was exporting React Native bindings instead of web bindings — caused crashes in any web bundler
  - **ShatterBone**: component always returned `null` due to `useEffect`-only initialization; moved to `useMemo` for synchronous render
  - **measureLayout (native)**: replaced dead `forceUpdateRef` with `useReducer` to guarantee re-render after `onLayout` fires
  - **FlatList fallback**: spreading `animation: undefined` was overriding theme/default animation; now only overrides explicit `shatter` → `pulse`
  - **Rules of Hooks**: `useIsInFlatList` called `useContext` inside `try/catch`; context now resolved at module level
  - **SkeletonBone deps**: `config` object reference in `useEffect` deps caused animation restart on every parent re-render; removed redundant dep
  - **shiver animation**: removed unused `secondaryValue` that was animated but never drove any visual output
  - **mergedConfig memoization**: `useMemo` added in both `useSkeleton` hooks to stabilize config reference
  - **Web SkeletonBone**: `createShatterStyles` wrapped in `useMemo` to avoid O(gridSize²) work on every render

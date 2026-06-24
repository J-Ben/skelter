# skelter

## 2.0.0

### Major Changes

- 504a74f: Add SkeletonDevTools: a floating in-app panel to inspect skeleton match quality (fidelity/waste/coverage/stability), force-load all components at once, x-ray any component from the panel, and toggle a waste overlay. Available via `react-zero-skeleton/devtools` for both web and React Native.

## 1.2.1

### Patch Changes

- bfd0363: Expand npm keywords for better discoverability: skeleton-loader, content-placeholder, bone, expo, nextjs, typescript, adaptive, network-aware, auto-skeleton.

## 1.2.0

### Minor Changes

- 776c996: Add adaptive animation: pick the skeleton animation from device / connection signals the consumer provides. Skelter detects nothing itself — bring your own source (NetInfo, navigator.connection, battery…) and feed the values; the library only maps them to an animation.

  - `conditions` (network, battery, saveData, deviceTier, charging, reducedMotion + any custom signal) on `SkeletonTheme` (global) or `skeletonConfig` (per-element)
  - `adaptive` policy: a `when → use` rule matrix (AND within a rule, first match wins) or a function of conditions
  - The resolved animation overrides `animation`; reduced-motion accessibility still forces a static skeleton
  - Pure, zero-dependency, works on web and React Native

## 1.1.0

### Minor Changes

- 1609c94: Add `SkeletonParagraph`: wrap a block of text so it skeletons into several lines instead of one solid block.

  - `size` presets (`sm` = 2, `md` = 3, `lg` = 5 lines) or an explicit `lines={n}` count
  - Body lines get a naturally ragged width and the last line is shortened, like real text
  - `align` (`left` / `center` / `right`), inherited from the component's `textAlign` when omitted
  - `mode="words"` splits each line into word-sized bones separated by gaps
  - Works on web and React Native (iOS / Android); all widths are deterministic (no flicker)

## 1.0.2

### Patch Changes

- 0d910c8: Fix cascade on web: bones now animate sequentially top to bottom with a staggered per-bone delay (bone.y times cascade ms), matching native behavior. Previously the web build only faded bones in progressively instead of staggering their animation start.

## 1.1.0

### Minor Changes

- Add shaker animation, SkeletonBox, and SkeletonIgnore.

  **shaker**: a rapid horizontal vibration burst followed by a long rest - like a nervous tremor. The shake occupies the first ~20% of the cycle; the remaining ~80% is a stationary hold. Works on web (CSS keyframes) and React Native (Animated API).

  **SkeletonBox**: wraps containers that are visually meaningful shapes (stat cards, chips, badges). The box itself renders as a semi-transparent bone (opacity 0.25, always static) with its children bones on top. Pass `static` to suppress animation on the box bone. Web uses `data-testid="__skl_box__"`, React Native uses `testID="__skl_box__"`.

  **SkeletonIgnore**: wraps elements that should never receive a skeleton bone and always remain visible during loading - section headers, timestamps, decorative labels. The measurement layer skips the element and all its descendants entirely. Web uses `data-testid="__skl_ignore__"`, React Native uses `testID="__skl_ignore__"`.

  Both components are exported from the main entry point (`react-zero-skeleton`) on web and the native entry point (`react-zero-skeleton/native`) on React Native.

## 0.9.0

### Minor Changes

- 7d669eb: Add `drip` animation: a vertical shimmer that sweeps top-to-bottom with a subtle skew. Works on web (CSS keyframes) and React Native (Animated + LinearGradient).

## 0.8.0

### Minor Changes

- 7068eba: Add `beat` animation: a double heartbeat pattern combining scale and opacity.
  Two quick beats (stronger then softer) followed by a long rest, matching a real cardiac rhythm.
  Works on web (CSS keyframes) and React Native (Animated API, useNativeDriver).

## 0.7.0

### Minor Changes

- 8e3e5bf: Add `enter` animation and `revealOnExit` option.

  `enter` plays an entrance animation when the skeleton re-appears after content was previously shown (`'fade' | 'fadeUp' | 'fadeDown' | 'fadeLeft' | 'fadeRight' | 'none'`). It is skipped on first load to avoid a jarring initial flash.

  `revealOnExit` makes the real content visible underneath the skeleton while the exit animation plays, so the skeleton fades out revealing the content simultaneously instead of content appearing only after the exit completes.

## 0.6.0

### Minor Changes

- 6a7b7eb: feat: add slide animation, bones float up and fade in/out

## 0.5.1

### Patch Changes

- Fix exit animation: bones were cleared before exit played

  When isSkeletonVisible flipped to false, useSkeleton emptied the bones array
  immediately. The overlay existed during the exiting phase but had no bones,
  so the animation ran on an invisible div. Fixed by keeping the last non-empty
  bones in a ref and using them for display while the exit phase is active.

## 0.5.0

### Minor Changes

- Add `exit` option: animated skeleton exit transitions

  Skeletons no longer disappear abruptly. When `isLoading` flips to false the
  overlay now plays a 300 ms exit animation before the real content appears.

  **Available values** (set via `SkeletonConfig`, `SkeletonTheme`, or `skeletonConfig` prop):

  | value         | effect                              |
  | ------------- | ----------------------------------- |
  | `'fade'`      | opacity fade-out (default)          |
  | `'fadeUp'`    | fade + slide upward                 |
  | `'fadeDown'`  | fade + slide downward               |
  | `'fadeLeft'`  | fade + slide left                   |
  | `'fadeRight'` | fade + slide right                  |
  | `'none'`      | instant removal (pre-0.5 behaviour) |

  ```tsx
  // Per component
  <SkeletonTheme animation="wave" exit="fadeUp">
    <MyCard hasSkeleton isLoading={loading} />
  </SkeletonTheme>

  // Or via skeletonConfig prop
  <MyCard hasSkeleton isLoading={loading} skeletonConfig={{ exit: 'fadeDown' }} />
  ```

## 0.4.3

### Patch Changes

- feat(shatter): add `cellSize` option to ShatterConfig

  Fixed cell size in px : every bone uses cells of the same physical size
  regardless of its own dimensions. Narrow and wide bones now fragment
  with equal-sized squares; only the count differs with area.
  Takes priority over `gridSize`. `gridSize` is now optional.

## 0.4.0

### New features

- **`staticBones`** : nouvelle option de `withSkeleton` qui bypasse entièrement la mesure de layout. Aucun warmup render, aucune frame blanche, aucun ResizeObserver / Fiber walk. Le skeleton s'affiche immédiatement au premier render. Animation, thème, `minDuration` et accessibilité restent gérés par le HOC.

  Idéal pour les composants async sur web (fetch, React Query) où le warmup produirait un flash de contenu vide.

  ```tsx
  withSkeleton(ArticleCard, {
    staticBones: [
      { x: 12, y: 12, width: 200, height: 20, borderRadius: 4 }, // titre
      { x: 12, y: 44, width: 300, height: 14, borderRadius: 4 }, // sous-titre
      { x: 12, y: 72, width: 340, height: 80, borderRadius: 8 }, // image
    ],
  });
  ```

  `staticBones` prend la priorité sur `measureStrategy`, `maxDepth`, `exclude` et `mockProps` : ces options sont ignorées quand `staticBones` est fourni.

- **`StaticBone` type** exporté depuis le package.

- **Web `withSkeleton` second argument** : `withSkeleton(Component, options?)` accepte maintenant les options (web était en retard sur RN).

## 0.3.9

### Bug fixes

- **fix(web/borderRadius)**: bones on web always used `config.borderRadius` (default: 4) regardless of the element's actual style. Root cause: `buildBoneTree` never read `borderRadius` from the DOM : `node.layout.borderRadius` was always `undefined`. Fix: read `getComputedStyle(element).borderRadius` for each element during the tree walk. Circular avatars (`border-radius: 50%`) now produce correctly rounded bones; cards with `border-radius: 12px` produce bones with matching radius.

## 0.3.6

### Docs

- **docs(readme)**: full rewrite : correct package name (`react-zero-skeleton` throughout), separate React Native vs web sections, fix all import examples, tag platform-specific features (Fiber walk, gradient peer, FlatList fallback, JS thread).

## 0.3.5

### Bug fixes

- **fix(web/shatter)**: shatter animation was visually invisible on web. The parent bone container had `backgroundColor: config.color`, so when the child squares animated to `opacity: 0` they faded against the same color : producing no visible effect. Fix: parent container is now `backgroundColor: transparent`; only the individual squares carry the bone color, so they correctly animate against the page background.

## 0.3.4

### Bug fixes

- **fix(web/warmup)**: skeleton never showed correctly on web. The warmup `<div>` used `position: absolute, top: 0, left: 0` without `right: 0`, making the outer container collapse to `height: 0`. This caused `containerSize.height` to always be 0, so the skeleton overlay had `height: auto` and took no space in the document flow : bones rendered visually but collapsed the surrounding layout. Fix: warmup is now in-flow (`visibility: hidden` only, same approach as the RN v0.3.3 fix), and the overlay uses `boneTree.layout.width/height` directly instead of the unreliable `containerSize` state.

- **fix(web/measureLayout)**: removed the redundant manual `measure()` call after `observer.observe()`. The ResizeObserver spec guarantees a callback fires on the first observation, so the explicit call was both redundant and a potential source of double measurement.

- **feat(mockProps)**: new `mockProps` option on `withSkeleton` : resolves the cold start blank screen. The component renders invisibly with these fake props so the fiber walker measures a realistic layout before real data arrives. Once the real layout is captured, `mockProps` are never used again.

## 0.3.3

### Bug fixes

- **fix(warmup)**: skeleton never showed for `Text` components or any element without an explicit width when placed inside an `alignItems: flex-start` parent. Root cause: the warmup `View` used `position: absolute, left: 0, right: 0`, which made the outer container collapse to width 0, causing `onRootLayout` to fire with `width: 0` and bail out early. Fix: warmup is now rendered in-flow (`opacity: 0` only). The containing block is provided by the natural flex layout, so all component types resolve their correct dimensions.

- **chore(render-guard)**: removed the now-redundant `boneTree.layout.width > 0` condition : `isLayoutCaptured` is set only after a non-zero layout is measured, so the extra width check was dead code.

## 0.3.2

### Bug fixes

- **fix(warmup)**: skeleton was never displayed on first load. The warmup `View` is `position: absolute`, so the outer container reported `width: 0` to `onContainerLayout`, causing the `containerDimensions.width > 0` guard to block the skeleton indefinitely. Fix: replaced `containerDimensions` with `boneTree.layout` dimensions (captured during warmup measurement) : the skeleton now renders correctly as soon as layout is measured.

## 0.3.1

### Bug fixes

- **fix(gradient)**: `expo-linear-gradient` and `react-native-linear-gradient` were missing from the native bundle's `external` list. esbuild wrapped their `require()` calls with `__require()` helpers that Metro cannot statically analyze, causing wave/shiver to fall back to a solid bone with a module-not-found warning even when the gradient package was installed. Marking them as externals emits bare `require()` calls that Metro resolves correctly.

- **fix(warmup)**: bones were rendered inside a `0×0` wrapper when `isLoading=true` on first mount. Added `containerDimensions.width > 0` to the render guard : bones now wait for the container to report a real size.

- **feat(root-only)**: new `boneStyle` option on `withSkeleton` for root-only mode. Pass `boneStyle: { borderRadius: 48 }` to produce a circular bone for an Avatar, or `boneStyle: { width: 200 }` to constrain a bone that would otherwise fill a stretch parent. `BoneStyleOverride` type exported from the package.

- **chore(auto)**: `auto` strategy now emits a `console.warn` when the fiber walk returns 0 leaves and falls back to root-only.

## 0.3.0

### New features

- **Per-element bones** : `withSkeleton(Component)` now generates one bone per native leaf element (View, Text, Image…) instead of a single block the size of the component root. Each bone precisely mirrors the shape, position, and `borderRadius` of the original element. Zero config change required : the default `measureStrategy: 'auto'` applies automatically.

- **`withSkeleton` second argument** : `withSkeleton(Component, options?)` accepts an optional `WithSkeletonOptions` object:

  - `measureStrategy: 'auto' | 'root-only'` : `'auto'` (default) enables per-element fiber walk; `'root-only'` restores v0.2 single-block behaviour.
  - `maxDepth: number` : max depth of the Fiber tree traversal (default: 8). Guards against runaway walks on deeply nested trees.
  - `exclude: string[]` : component displayNames to skip during traversal. Each excluded component produces no bones and is not traversed further. Useful for third-party widgets (`['MapView', 'VideoPlayer']`).

- **`registerSkeletonLeaf(...names)`** : registers additional component names as skeleton leaf elements. Useful for custom image libraries (`registerSkeletonLeaf('FastImage', 'ExpoImage')`).

- **React Fiber tree walker** (`fiberWalker.ts`) : internal module that reads `_reactInternals` / `_reactFiber` fiber keys from the native View instance, walks the tree depth-first, collects host component nodes, and measures each with `stateNode.measure()`. Compatible with both Old Architecture (UIManager) and New Architecture (Fabric/JSI). Falls back to single root bone when fibers are inaccessible (test runners, hermetic bundles).

- **FlatList auto-detect** : components rendered inside a FlatList are automatically switched to `root-only` mode (via `VirtualizedListContext`). Per-element fiber walks on 50+ list items are expensive; the root-only fallback keeps scroll performance smooth. The `shatter` animation is also silently replaced with `pulse` inside lists.

- **`MeasureStrategy` and `WithSkeletonOptions` types** exported from the package.

### Internal

- `useMeasureLayout` refactored into `buildAutoHook` (fiber-based) and `buildRootOnlyHook` (v0.2 compat). Strategy selected once at mount and never changes.
- `SkeletonRenderer` receives `hocOptions` and `warmupRef`. The invisible warmup View is now `ref`-attached so the fiber walker can reach the React tree from the native instance after `onLayout` fires.
- `generateBones` propagates `borderRadius` from measured fiber styles instead of hardcoding `0`.

### Migration

No breaking API changes. All existing `withSkeleton(Component)` calls work unchanged : they just produce richer skeletons automatically.

To opt out of per-element measurement (e.g. if your component's Fiber internals are not accessible):

```tsx
export default withSkeleton(MyComponent, { measureStrategy: "root-only" });
```

To exclude a heavy third-party widget from the fiber walk:

```tsx
export default withSkeleton(Screen, { exclude: ["MapView", "VideoPlayer"] });
```

## 0.2.1

### Bug fixes

- **fix(shatter)**: wrapper `View` now applies `borderRadius: bone.borderRadius || config.borderRadius`. Cards with rounded corners were rendered with square shatter tiles.
- **fix(wave/shiver)**: animation loop is now started once in `SkeletonRenderer` instead of once per bone. Multiple competing `Animated.loop` calls on the same shared `Animated.Value` prevented the animation from running on the native driver. wave/shiver now visibly shimmer.
- **fix(cache-aware)**: replaced one-shot `wasLoadingOnMount` flag with `everSeenLoading` ref. A component mounted with `isLoading=false` now correctly shows the skeleton when `isLoading` later becomes `true` (e.g. user-triggered reload, key-remount).

### New features

- **`AnimationSpeed` type** : `speed` now accepts `'slow' | 'normal' | 'rapid'` presets in addition to a numeric multiplier. `'slow'` = 0.5×, `'normal'` = 1.0× (default), `'rapid'` = 2.0×. Custom multipliers still work (`speed: 1.5`). All animation modules (pulse, wave, shiver, shatter) use the new `resolveSpeed()` helper.
- **`resolveSpeed`** exported from the package for advanced use cases.

## 0.2.0

### P0 Bug Fixes

- **fix(shatter)**: `shatter` now produces the real grid-fragmentation effect instead of silently falling back to `pulse`. `withSkeleton` routes `mergedConfig.animation === 'shatter'` to `ShatterBone` (grid of squares with staggered opacity, `fadeStyle`: random / cascade / radial). The `shatter→pulse` fallback that shipped in 0.1.1 is removed.

- **fix(shimmer)**: `wave` and `shiver` now render a real LinearGradient highlight (`[color, highlightColor, color]`) that sweeps across the bone instead of translating the entire bone. Requires `expo-linear-gradient` or `react-native-linear-gradient` as an optional peer. If absent, logs a warning once and falls back to solid bone (identical to 0.1.x visuals). The shimmer interpolation is computed synchronously via `useMemo` : available on the first render with no flicker.

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

  - **Web entry point** (`src/index.ts`): was exporting React Native bindings instead of web bindings : caused crashes in any web bundler
  - **ShatterBone**: component always returned `null` due to `useEffect`-only initialization; moved to `useMemo` for synchronous render
  - **measureLayout (native)**: replaced dead `forceUpdateRef` with `useReducer` to guarantee re-render after `onLayout` fires
  - **FlatList fallback**: spreading `animation: undefined` was overriding theme/default animation; now only overrides explicit `shatter` → `pulse`
  - **Rules of Hooks**: `useIsInFlatList` called `useContext` inside `try/catch`; context now resolved at module level
  - **SkeletonBone deps**: `config` object reference in `useEffect` deps caused animation restart on every parent re-render; removed redundant dep
  - **shiver animation**: removed unused `secondaryValue` that was animated but never drove any visual output
  - **mergedConfig memoization**: `useMemo` added in both `useSkeleton` hooks to stabilize config reference
  - **Web SkeletonBone**: `createShatterStyles` wrapped in `useMemo` to avoid O(gridSize²) work on every render

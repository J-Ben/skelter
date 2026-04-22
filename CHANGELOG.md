# skelter

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

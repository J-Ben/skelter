---
"react-zero-skeleton": major
---

v4: advanced skeleton control and React Native rendering fixes.

**New options (opt-in, no API removed)**

- `skeletonRoot`: the component's root element becomes an implicit `SkeletonBox` (translucent card frame, content bones on top), including when the root is a `Pressable` / `TouchableOpacity`. No `SkeletonBox` wrapper needed.
- `rootId`: pick the element (`nativeID`, web `id`) used as the skeleton root; only its subtree is measured, the wrapper keeps its space.
- `skipIds`: elements (`nativeID`, web `id`) rendered as one solid bone without walking into them — badges, chips.
- `boxColor`, `boxOpacity`, `boxAnimated` (SkeletonTheme or `skeletonConfig`): color, opacity (default 0.25) and animation (default off) of `SkeletonBox` / `skeletonRoot` backgrounds. `<SkeletonBox static>` now actually stays still.
- `mockData`: typed alias of `mockProps` (`WithSkeletonOptions<P>` is now generic). `mockProps` keeps working; `mockData` wins when both are set.

**Fixes (React Native)**

- Removed the debug `console.log('[EXIT-TRIGGERED-DIRECT]')` shipped in the 3.0.0 bundle.
- No more flash when skeletons exit: the exit starts in the same render (no painted frame with content and no bones), and `revealOnExit: false` is honoured.
- `enter: 'none'` is honoured: no blank frames at the start of each load.
- FlatList detection works (it never did in published builds): `maxBonesInList` and the `shatter` → `pulse` fallback now apply in lists.
- Nested `SkeletonBox`: content is attached to its innermost box, never drawn under it.
- The fiber walk no longer leaves the measured root.
- `[skelter]` warnings are development-only and emitted once; unknown `rootId` / `skipIds` and an unreachable fiber tree are reported.
- Documented `maxDepth` default fixed (20).

**Breaking changes (defaults only)**

- `minDuration` defaults to `500` ms (was `0`). Set `minDuration: 0` for the v3 behaviour.
- React Native: skeletons no longer fade in by default (`enter: 'none'` is now respected). Set `enter: 'fade'` for the v3 look.
- React Native: lists no longer force `measureStrategy: 'root-only'` (the rule never ran because detection was broken). Pass `measureStrategy: 'root-only'` for one block per item.
- React Native: box backgrounds no longer animate by default (as on web). Set `boxAnimated: true` to animate them.
- React Native: with the default `revealOnExit: false`, real content now appears when the exit animation ends instead of under the fading bones. Set `revealOnExit: true` for the overlap.

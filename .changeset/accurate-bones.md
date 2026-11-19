---
"react-zero-skeleton": minor
---

`accurateBones` (default `true`): opens a 4 px gap between bones that would touch. Configurable globally (`SkeletonTheme`) or per component (`skeletonConfig`), `false` to disable. React Native dev hint when a short `Text` stretches to its container (`alignSelf: 'flex-start'`). An unknown host component without children (e.g. `LinearGradient`) now becomes one bone, with a dev warning.

`boxOpacity` default goes from `0.25` to `0.35`: `SkeletonBox` / `skeletonRoot` backgrounds are slightly darker. Set `boxOpacity: 0.25` to keep the previous look.

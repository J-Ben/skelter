---
"react-zero-skeleton": minor
---

Add adaptive animation: pick the skeleton animation from device / connection signals the consumer provides. Skelter detects nothing itself — bring your own source (NetInfo, navigator.connection, battery…) and feed the values; the library only maps them to an animation.

- `conditions` (network, battery, saveData, deviceTier, charging, reducedMotion + any custom signal) on `SkeletonTheme` (global) or `skeletonConfig` (per-element)
- `adaptive` policy: a `when → use` rule matrix (AND within a rule, first match wins) or a function of conditions
- The resolved animation overrides `animation`; reduced-motion accessibility still forces a static skeleton
- Pure, zero-dependency, works on web and React Native

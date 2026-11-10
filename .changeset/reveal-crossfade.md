---
"react-zero-skeleton": minor
---

`revealOnExit` is now a real cross-fade: the content fades in (0 → 1) while the bones fade out, instead of appearing at full opacity under bones that are still opaque (text wider than its bone showed around it at the start of the exit). New `exitDuration` option (SkeletonTheme or `skeletonConfig`, default 300 ms).

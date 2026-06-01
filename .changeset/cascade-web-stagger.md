---
"react-zero-skeleton": patch
---

Fix cascade on web: bones now animate sequentially top to bottom with a staggered per-bone delay (bone.y times cascade ms), matching native behavior. Previously the web build only faded bones in progressively instead of staggering their animation start.

---
"react-zero-skeleton": minor
---

Add `enter` animation and `revealOnExit` option.

`enter` plays an entrance animation when the skeleton re-appears after content was previously shown (`'fade' | 'fadeUp' | 'fadeDown' | 'fadeLeft' | 'fadeRight' | 'none'`). It is skipped on first load to avoid a jarring initial flash.

`revealOnExit` makes the real content visible underneath the skeleton while the exit animation plays, so the skeleton fades out revealing the content simultaneously instead of content appearing only after the exit completes.

---
"react-zero-skeleton": minor
---

Add `SkeletonParagraph`: wrap a block of text so it skeletons into several lines instead of one solid block.

- `size` presets (`sm` = 2, `md` = 3, `lg` = 5 lines) or an explicit `lines={n}` count
- Body lines get a naturally ragged width and the last line is shortened, like real text
- `align` (`left` / `center` / `right`), inherited from the component's `textAlign` when omitted
- `mode="words"` splits each line into word-sized bones separated by gaps
- Works on web and React Native (iOS / Android); all widths are deterministic (no flicker)

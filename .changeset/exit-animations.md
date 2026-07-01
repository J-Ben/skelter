---
"react-zero-skeleton": major
---

Add `useSkeleton` hook and exit animations to 2.0.0 major release

- **`useSkeleton` hook**: Core hook for skeleton state management. Provides `isSkeletonVisible` and `bones` to custom components, enabling granular control over skeleton behavior and timing.
- **Exit animations**: New `exit` prop on `SkeletonTheme` and `skeletonConfig` supports `fadeUp`, `fadeDown`, `fadeLeft`, `fadeRight`, and `none`. Configurable exit timing and animation style.
- **`revealOnExit`**: When enabled, real content becomes visible underneath the skeleton while the exit animation plays, creating a seamless transition effect.
- **Enter animations**: Supports fade-in variants (`fade`, `fadeUp`, `fadeDown`, `fadeLeft`, `fadeRight`) when skeleton first appears.

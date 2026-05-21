/**
 * The type of a UI element captured during layout measurement.
 */
export type ElementType = 'view' | 'image' | 'text';

/**
 * A single visual unit of a skeleton : represents one placeholder block.
 */
export interface Bone {
  /** Horizontal position relative to the component root */
  x: number;
  /** Vertical position relative to the component root */
  y: number;
  /** Width of the placeholder */
  width: number;
  /** Height of the placeholder */
  height: number;
  /** Corner radius of the placeholder */
  borderRadius: number;
  /** The type of the original UI element */
  type: ElementType;
}

/**
 * Exit animation played when the skeleton disappears.
 *
 * 'fade'      : opacity fade-out (default)
 * 'fadeUp'    : fade + slide upward
 * 'fadeDown'  : fade + slide downward
 * 'fadeLeft'  : fade + slide left
 * 'fadeRight' : fade + slide right
 * 'none'      : immediate removal (v0.4 behaviour)
 */
export type SkeletonExit = 'fade' | 'fadeUp' | 'fadeDown' | 'fadeLeft' | 'fadeRight' | 'none';

/**
 * Available animation modes for skeleton placeholders.
 */
export type SkeletonAnimation =
  | 'pulse'    // Soft fade in/out
  | 'wave'     // Shimmer left to right
  | 'shiver'   // Intense wave
  | 'shatter'  // Signature : grid fragmentation
  | 'slide'    // Bones float up and fade in/out
  | 'none';    // Static, no animation

/**
 * Animation speed : named preset or numeric multiplier.
 *
 * Named presets:
 *   'slow'   → 0.5× (half speed, longer duration)
 *   'normal' → 1.0× (default)
 *   'rapid'  → 2.0× (twice as fast, shorter duration)
 *
 * Number → custom multiplier (1.0 = normal, 2.0 = rapid, 0.5 = slow).
 * The multiplier divides the base duration: baseDuration / speed.
 */
export type AnimationSpeed = 'slow' | 'normal' | 'rapid' | number;

/**
 * Fade style for the shatter animation.
 */
export type ShatterFadeStyle = 'random' | 'cascade' | 'radial';

/**
 * Configuration for the shatter animation.
 */
export interface ShatterConfig {
  /**
   * Number of columns in the fragmentation grid.
   * 0 (default) = auto : columns derived from bone width to keep cells ~24px.
   * Any value > 0 = explicit column count.
   * Rows are always computed to keep squares roughly square.
   * Ignored when cellSize is set.
   */
  gridSize?: number;
  /**
   * Fixed cell size in px. When set, every bone uses cells of this exact size
   * regardless of its own dimensions : so narrow and wide bones always have
   * cells of the same physical size (counts differ naturally with area).
   * Takes priority over gridSize.
   */
  cellSize?: number;
  /** Delay in ms between each square's animation trigger */
  stagger: number;
  /** Order in which squares appear/disappear */
  fadeStyle: ShatterFadeStyle;
}

/**
 * Full configuration for skeleton appearance and behavior.
 * All fields are optional : defaults are applied from DEFAULT_SKELETON_CONFIG.
 *
 * Priority chain:
 * skeletonConfig prop > SkeletonTheme > DEFAULT_SKELETON_CONFIG
 */
export interface SkeletonConfig {
  /** Animation mode */
  animation?: SkeletonAnimation;
  /** Base color of the skeleton placeholder */
  color?: string;
  /** Highlight color used during animation */
  highlightColor?: string;
  /**
   * Animation speed : named preset or numeric multiplier.
   * 'slow' | 'normal' | 'rapid' or a custom number (1.0 = normal).
   */
  speed?: AnimationSpeed;
  /** Default corner radius for all bones */
  borderRadius?: number;
  /** Animation direction : useful for RTL layouts */
  direction?: 'ltr' | 'rtl';
  /** Minimum duration in ms the skeleton stays visible */
  minDuration?: number;
  /** If true, skeleton is never displayed regardless of isLoading */
  disabled?: boolean;
  /**
   * Exit animation played when the skeleton disappears.
   * Default: 'fade' (300 ms opacity fade-out).
   * Set to 'none' to restore the v0.4 instant-removal behaviour.
   */
  exit?: SkeletonExit;
  /** Shatter animation configuration */
  shatterConfig?: ShatterConfig;
  /** Image-specific configuration */
  imageConfig?: {
    /** Fallback aspect ratio when image dimensions are unknown */
    aspectRatio?: number;
  };
  /**
   * Maximum number of bones rendered simultaneously when inside a FlatList.
   * Limits memory and animation overhead for long lists.
   * Default: 0 (unlimited)
   */
  maxBonesInList?: number;
}

/**
 * Layout dimensions and position of a single measured UI element.
 */
export interface MeasuredLayout {
  /** Horizontal position relative to the component root */
  x: number;
  /** Vertical position relative to the component root */
  y: number;
  /** Measured width */
  width: number;
  /** Measured height */
  height: number;
  /** Type of the original UI element */
  type: ElementType;
  /** Corner radius read from StyleSheet.flatten(style).borderRadius */
  borderRadius?: number;
}

/**
 * Measurement strategy for per-element skeleton generation.
 *
 * 'auto'      : walks the React Fiber tree after the warmup render and measures
 *               each native element individually. One bone per leaf element.
 *               This is the v0.3 default.
 *
 * 'root-only' : measures only the root container. Produces a single block
 *               the size of the component. Identical to v0.2 behaviour.
 */
export type MeasureStrategy = 'auto' | 'root-only';

/**
 * Style overrides applied to the single root bone in root-only mode.
 * root-only measures the container's layout dimensions but cannot read
 * per-component style properties (borderRadius, explicit width) from the
 * wrapped component. Use boneStyle to supply them explicitly.
 *
 * @example
 * // Avatar with circular bone
 * withSkeleton(Avatar, { measureStrategy: 'root-only', boneStyle: { borderRadius: 48 } })
 *
 * // Card with fixed width inside a stretch parent
 * withSkeleton(Card, { measureStrategy: 'root-only', boneStyle: { width: 200 } })
 */
export interface BoneStyleOverride {
  /** Overrides the corner radius of the root bone */
  borderRadius?: number;
  /** Constrains the root bone width (px) instead of using the measured container width */
  width?: number;
}

/**
 * A manually declared skeleton bone : used with staticBones to bypass
 * layout measurement entirely. Useful for async components on web where
 * the warmup render would cause a blank frame.
 *
 * @example
 * withSkeleton(Card, {
 *   staticBones: [
 *     { x: 12, y: 12, width: 200, height: 16, borderRadius: 4 },
 *     { x: 12, y: 36, width: 300, height: 12, borderRadius: 4 },
 *   ]
 * })
 */
export interface StaticBone {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
  type?: ElementType;
}

/**
 * Options for withSkeleton (second argument).
 * All fields are optional : sensible defaults are applied.
 */
export interface WithSkeletonOptions {
  /**
   * 'auto'      → one bone per leaf element (default)
   * 'root-only' → single root block (v0.2 compat)
   */
  measureStrategy?: MeasureStrategy;
  /**
   * Maximum depth of the fiber tree walk.
   * Prevents runaway traversal on deeply nested components.
   * Default: 8
   */
  maxDepth?: number;
  /**
   * Component displayNames excluded from bone generation.
   * Excluded components still appear in the tree but produce a
   * single encompassing bone instead of being traversed.
   * Example: ['MapView', 'VideoPlayer']
   */
  exclude?: string[];
  /**
   * Style overrides for the root bone in root-only mode.
   * root-only cannot read borderRadius or explicit width from the wrapped
   * component's style : use boneStyle to pass them explicitly.
   * Has no effect in 'auto' mode (per-element styles are read from the
   * Fiber tree directly).
   */
  boneStyle?: BoneStyleOverride;
  /**
   * Mock props used for the invisible warmup render when real props carry no
   * data (cold start). The component is rendered with these props so the fiber
   * walker measures a realistic layout before real data arrives.
   *
   * Once the real layout is captured, mockProps are never used again.
   *
   * Example:
   *   withSkeleton(ArticleCard, {
   *     mockProps: { article: { title: 'Lorem ipsum', image: null } }
   *   })
   */
  mockProps?: Record<string, unknown>;
  /**
   * Predefined bones : bypasses layout measurement entirely.
   * No warmup render, no blank frame, no ResizeObserver.
   * Skeleton is shown immediately on first render.
   *
   * When provided, measureStrategy / maxDepth / exclude / mockProps
   * are all ignored. Animation, theming, minDuration, and accessibility
   * are still handled by the HOC.
   *
   * Best for: web async components, SSR, or any component where
   * the auto-measurement warmup would cause a visible flash.
   */
  staticBones?: StaticBone[];
}

/**
 * A tree node representing a measured UI element and its children.
 * Mirrors the component hierarchy captured during layout measurement.
 */
export interface BoneTree {
  /** Layout data for this node */
  layout: MeasuredLayout;
  /** Child nodes */
  children: BoneTree[];
}

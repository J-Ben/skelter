/**
 * The type of a UI element captured during layout measurement.
 */
export type ElementType = 'view' | 'image' | 'text';

/**
 * A single visual unit of a skeleton — represents one placeholder block.
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
 * Available animation modes for skeleton placeholders.
 */
export type SkeletonAnimation =
  | 'pulse'    // Soft fade in/out
  | 'wave'     // Shimmer left to right
  | 'shiver'   // Intense wave
  | 'shatter'  // Signature — grid fragmentation
  | 'none';    // Static, no animation

/**
 * Animation speed — named preset or numeric multiplier.
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
   * Rows are computed automatically to keep squares roughly square.
   * Example: gridSize 4 on a 200×80 bone → 4 cols × 2 rows = 8 squares.
   */
  gridSize: number;
  /** Delay in ms between each square's animation trigger */
  stagger: number;
  /** Order in which squares appear/disappear */
  fadeStyle: ShatterFadeStyle;
}

/**
 * Full configuration for skeleton appearance and behavior.
 * All fields are optional — defaults are applied from DEFAULT_SKELETON_CONFIG.
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
   * Animation speed — named preset or numeric multiplier.
   * 'slow' | 'normal' | 'rapid' or a custom number (1.0 = normal).
   */
  speed?: AnimationSpeed;
  /** Default corner radius for all bones */
  borderRadius?: number;
  /** Animation direction — useful for RTL layouts */
  direction?: 'ltr' | 'rtl';
  /** Minimum duration in ms the skeleton stays visible */
  minDuration?: number;
  /** If true, skeleton is never displayed regardless of isLoading */
  disabled?: boolean;
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

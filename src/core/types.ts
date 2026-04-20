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
 * Fade style for the shatter animation.
 */
export type ShatterFadeStyle = 'random' | 'cascade' | 'radial';

/**
 * Configuration for the shatter animation.
 */
export interface ShatterConfig {
  /** Number of columns in the fragmentation grid */
  gridSize: number;
  /** Delay in ms between each square */
  stagger: number;
  /** Order in which squares appear/disappear */
  fadeStyle: ShatterFadeStyle;
}

/**
 * Full configuration for skeleton appearance and behavior.
 * All fields are optional — defaults are applied from DEFAULT_SKELETON_CONFIG.
 */
export interface SkeletonConfig {
  /** Animation mode */
  animation?: SkeletonAnimation;
  /** Base color of the skeleton placeholder */
  color?: string;
  /** Highlight color used during animation */
  highlightColor?: string;
  /** Animation speed multiplier — 1.0 is default, 2.0 is twice as fast */
  speed?: number;
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
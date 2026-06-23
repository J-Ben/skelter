import type { AnimationSpeed, ParagraphAlign, ParagraphSize, SkeletonConfig } from './types';

export const SKELETON_ENTER_MS = 150;
export const SKELETON_EXIT_MS = 300;

// ─── Paragraph splitting ──────────────────────────────────────────────────────

/** Number of skeleton lines produced by each SkeletonParagraph size preset. */
export const PARAGRAPH_LINE_PRESETS: Record<ParagraphSize, number> = {
  sm: 2,
  md: 3,
  lg: 5,
};

/** Width of the last paragraph line, as a ratio of the block width. */
export const PARAGRAPH_LAST_LINE_RATIO = 0.6;

/**
 * Minimum width of a body (non-last) paragraph line, as a ratio of the block
 * width. Body lines vary deterministically between this and 1.0 so the right
 * edge looks naturally ragged instead of a solid rectangle.
 */
export const PARAGRAPH_LINE_WIDTH_MIN = 0.84;

/** Gap between paragraph lines, as a ratio of a single line's height. */
export const PARAGRAPH_LINE_GAP_RATIO = 0.5;

/** Word mode : gap between words, as a ratio of a single line's height. */
export const PARAGRAPH_WORD_GAP_RATIO = 0.4;

/** Word mode : target average word width, as a ratio of a single line's height. */
export const PARAGRAPH_WORD_WIDTH_RATIO = 2.4;

const PARAGRAPH_TESTID_RE = /^__skl_para_(\d+)(?:_(left|center|right))?(_w)?__$/;

/**
 * Builds the marker testID / data-testid for a paragraph.
 * The optional align is omitted when undefined so the adapter falls back to
 * inheriting textAlign from the measured component. The `_w` suffix flags word
 * mode (lines split into word-sized bones).
 */
export function paragraphTestId(lines: number, align?: ParagraphAlign, words?: boolean): string {
  return `__skl_para_${lines}${align ? `_${align}` : ''}${words ? '_w' : ''}__`;
}

/**
 * Reads the line count (and optional explicit align / word mode) back from a
 * paragraph marker testID. Returns undefined for any non-paragraph id.
 */
export function parseParagraph(
  testId: string | null | undefined
): { lines: number; align?: ParagraphAlign; words?: boolean } | undefined {
  if (!testId) return undefined;
  const match = PARAGRAPH_TESTID_RE.exec(testId);
  if (!match) return undefined;
  const lines = parseInt(match[1], 10);
  if (lines <= 0) return undefined;
  return {
    lines,
    align: match[2] as ParagraphAlign | undefined,
    words: match[3] ? true : undefined,
  };
}

/**
 * Normalises a CSS / RN textAlign value into a ParagraphAlign.
 * 'start'/'justify' map to 'left', 'end' to 'right'. Unknown → undefined.
 */
export function normalizeTextAlign(value: string | null | undefined): ParagraphAlign | undefined {
  if (!value) return undefined;
  if (value === 'center') return 'center';
  if (value === 'right' || value === 'end') return 'right';
  if (value === 'left' || value === 'start' || value === 'justify') return 'left';
  return undefined;
}

/**
 * Resolves a SkeletonParagraph's `size` preset and optional `lines` override
 * into a concrete line count. Explicit `lines` always wins.
 */
export function resolveParagraphLines(size: ParagraphSize = 'md', lines?: number): number {
  if (typeof lines === 'number' && lines > 0) return Math.floor(lines);
  return PARAGRAPH_LINE_PRESETS[size] ?? PARAGRAPH_LINE_PRESETS.md;
}

/**
 * Default configuration applied when no SkeletonTheme provider
 * is present and no skeletonConfig prop is passed.
 *
 * Acts as the lowest priority in the config resolution chain:
 * skeletonConfig prop > SkeletonTheme > DEFAULT_SKELETON_CONFIG
 */
export const DEFAULT_SKELETON_CONFIG: Required<SkeletonConfig> = {
  animation: 'pulse',
  color: '#E0E0E0',
  highlightColor: '#F5F5F5',
  speed: 'normal',
  borderRadius: 4,
  direction: 'ltr',
  minDuration: 0,
  disabled: false,
  shatterConfig: {
    gridSize: 0,
    stagger: 80,
    fadeStyle: 'random',
  },
  imageConfig: {
    aspectRatio: 1,
  },
  /** 0 = unlimited */
  maxBonesInList: 0,
  enter: 'none' as const,
  exit: 'fade' as const,
  revealOnExit: false,
  cascade: 0,
  conditions: {},
  adaptive: [],
};

/**
 * Resolves an AnimationSpeed value to a numeric multiplier.
 *
 *   'slow'   → 0.5  (half speed)
 *   'normal' → 1.0  (default)
 *   'rapid'  → 2.0  (twice as fast)
 *   number   → used as-is (1.0 = normal, 2.0 = rapid, 0.5 = slow)
 *
 * The multiplier divides the base duration of each animation:
 *   effectiveDuration = baseDuration / resolveSpeed(speed)
 */
export function resolveSpeed(speed: AnimationSpeed): number {
  if (speed === 'slow') return 0.5;
  if (speed === 'normal') return 1.0;
  if (speed === 'rapid') return 2.0;
  return speed;
}

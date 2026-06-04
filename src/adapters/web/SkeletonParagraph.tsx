import React from 'react';
import type { CSSProperties } from 'react';
import type { ParagraphAlign, ParagraphMode, ParagraphSize } from '../../core/types';
import { paragraphTestId, resolveParagraphLines } from '../../core/constants';

export interface SkeletonParagraphProps {
  children: React.ReactNode;
  style?: CSSProperties;
  className?: string;
  /**
   * Size preset controlling the number of skeleton lines.
   * 'sm' → 2, 'md' → 3 (default), 'lg' → 5.
   */
  size?: ParagraphSize;
  /** Explicit line count : overrides `size` when provided. */
  lines?: number;
  /**
   * Horizontal alignment of the lines (drives the shortened last line).
   * When omitted, inherited from the element's computed textAlign, else 'left'.
   */
  align?: ParagraphAlign;
  /**
   * 'lines' (default) : one bar per line.
   * 'words' : each line is split into word-sized bones separated by gaps.
   */
  mode?: ParagraphMode;
}

/**
 * Web implementation of SkeletonParagraph.
 *
 * Wraps a block of text in a transparent passthrough div, so the real layout is
 * unchanged. While the skeleton is shown, useMeasureLayout recognises the
 * data-testid "__skl_para_<n>__" and generateBones replaces the single text
 * block with `n` stacked line bones (last line shortened) instead of one solid
 * rectangle.
 */
export function SkeletonParagraph({ children, style, className, size, lines, align, mode }: SkeletonParagraphProps) {
  const lineCount = resolveParagraphLines(size, lines);
  return (
    <div data-testid={paragraphTestId(lineCount, align, mode === 'words')} style={style} className={className}>
      {children}
    </div>
  );
}

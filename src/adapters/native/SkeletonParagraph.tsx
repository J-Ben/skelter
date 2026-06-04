import React from 'react';
import { View } from 'react-native';
import type { ViewStyle, StyleProp } from 'react-native';
import type { ParagraphAlign, ParagraphMode, ParagraphSize } from '../../core/types';
import { paragraphTestId, resolveParagraphLines } from '../../core/constants';

export interface SkeletonParagraphProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Size preset controlling the number of skeleton lines.
   * 'sm' → 2, 'md' → 3 (default), 'lg' → 5.
   */
  size?: ParagraphSize;
  /** Explicit line count : overrides `size` when provided. */
  lines?: number;
  /**
   * Horizontal alignment of the lines (drives the shortened last line).
   * When omitted, inherited from the wrapper's textAlign style, else 'left'.
   */
  align?: ParagraphAlign;
  /**
   * 'lines' (default) : one bar per line.
   * 'words' : each line is split into word-sized bones separated by gaps.
   */
  mode?: ParagraphMode;
}

/**
 * React Native implementation of SkeletonParagraph.
 *
 * Wraps a block of text. At render time it is a transparent passthrough View,
 * so the real layout is unchanged. While the skeleton is shown, the fiber walker
 * recognises the testID "__skl_para_<n>__" and generateBones replaces the single
 * text block with `n` stacked line bones (last line shortened) instead of one
 * solid rectangle.
 */
export function SkeletonParagraph({ children, style, size, lines, align, mode }: SkeletonParagraphProps) {
  const lineCount = resolveParagraphLines(size, lines);
  return (
    <View testID={paragraphTestId(lineCount, align, mode === 'words')} style={style}>
      {children}
    </View>
  );
}

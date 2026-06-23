import React from 'react';
import type { CSSProperties } from 'react';

export interface SkeletonBoxProps {
  children: React.ReactNode;
  style?: CSSProperties;
  className?: string;
  /** When true, the box bone is rendered without animation. */
  static?: boolean;
}

/**
 * Web implementation of SkeletonBox.
 * Renders a div with data-testid="__skl_box__" (or "__skl_box_static__")
 * so the measurement layer recognises it as a box container: the box itself
 * gets a semi-transparent skeleton bone AND its children are rendered
 * as individual bones on top of it.
 *
 * Pass `static` to disable animation on the box bone.
 */
export function SkeletonBox({ children, style, className, static: isStatic }: SkeletonBoxProps) {
  return (
    <div
      data-testid={isStatic ? '__skl_box_static__' : '__skl_box__'}
      style={style}
      className={className}
    >
      {children}
    </div>
  );
}

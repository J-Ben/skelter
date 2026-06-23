import React from 'react';
import type { CSSProperties } from 'react';

export interface SkeletonIgnoreProps {
  children: React.ReactNode;
  style?: CSSProperties;
  className?: string;
}

/**
 * Web implementation of SkeletonIgnore.
 *
 * Children are never measured → no skeleton bones emitted for them.
 * They remain visible on top of the skeleton overlay during loading via:
 *   - visibility: visible   (overrides the hidden parent's visibility: hidden)
 *   - position: relative + zIndex: 1  (above the overlay)
 *
 * Use for static UI that should always be visible: labels, timestamps,
 * decorative icons, section headers.
 */
export function SkeletonIgnore({ children, style, className }: SkeletonIgnoreProps) {
  return (
    <div
      data-testid="__skl_ignore__"
      style={{
        visibility: 'visible',
        position: 'relative',
        zIndex: 1,
        ...style,
      }}
      className={className}
    >
      {children}
    </div>
  );
}

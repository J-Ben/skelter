import React from 'react';
import { View } from 'react-native';
import type { ViewStyle, StyleProp } from 'react-native';

export interface SkeletonBoxProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** When true, the box bone is rendered without animation. */
  static?: boolean;
}

/**
 * React Native implementation of SkeletonBox.
 * Renders a View with testID="__skl_box__" (or "__skl_box_static__")
 * so the fiber walker recognises it as a box container: the box itself
 * gets a semi-transparent skeleton bone AND its children are rendered
 * as individual bones on top of it.
 *
 * Pass `static` to disable animation on the box bone.
 */
export function SkeletonBox({ children, style, static: isStatic }: SkeletonBoxProps) {
  return (
    <View testID={isStatic ? '__skl_box_static__' : '__skl_box__'} style={style}>
      {children}
    </View>
  );
}

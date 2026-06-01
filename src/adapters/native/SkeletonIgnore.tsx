import React from 'react';
import { View } from 'react-native';
import type { ViewStyle, StyleProp } from 'react-native';

export interface SkeletonIgnoreProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * React Native implementation of SkeletonIgnore.
 *
 * Children are never measured → no skeleton bones emitted for them.
 * In React Native the skeleton overlay is an absolutely positioned View,
 * so ignored elements remain visible underneath it during loading.
 *
 * Use for static UI that should always be visible: labels, timestamps,
 * decorative icons, section headers.
 */
export function SkeletonIgnore({ children, style }: SkeletonIgnoreProps) {
  return (
    <View testID="__skl_ignore__" style={style}>
      {children}
    </View>
  );
}

/**
 * Minimal React Native mock for Jest.
 * Prevents errors when running tests in Node environment.
 */

const AnimatedValue = class {
  constructor(public value: number) {}
  setValue(_value: number) {}
  interpolate() { return this; }
};

const Animated = {
  Value: AnimatedValue,
  timing: () => ({ start: () => {}, stop: () => {} }),
  loop: () => ({ start: () => {}, stop: () => {} }),
  sequence: () => ({ start: () => {}, stop: () => {} }),
  parallel: () => ({ start: () => {}, stop: () => {} }),
  delay: () => ({ start: () => {}, stop: () => {} }),
  View: 'Animated.View',
};

const AccessibilityInfo = {
  isReduceMotionEnabled: () => Promise.resolve(false),
  addEventListener: () => ({ remove: () => {} }),
};

// Flattens nested style arrays the way RN does : later entries win.
const StyleSheet = {
  flatten(style: unknown): Record<string, unknown> {
    if (!style) return {};
    if (Array.isArray(style)) {
      return style.reduce<Record<string, unknown>>((acc, s) => ({ ...acc, ...StyleSheet.flatten(s) }), {});
    }
    return style as Record<string, unknown>;
  },
};

const UIManager = {
  measure: () => {},
};

const RNView = 'View';
const RNText = 'Text';
const RNImage = 'Image';

export {
  Animated,
  AccessibilityInfo,
  StyleSheet,
  UIManager,
  RNView as View,
  RNText as Text,
  RNImage as Image,
};

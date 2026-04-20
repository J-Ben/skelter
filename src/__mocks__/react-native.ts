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

const RNView = 'View';
const RNText = 'Text';
const RNImage = 'Image';

export {
  Animated,
  AccessibilityInfo,
  RNView as View,
  RNText as Text,
  RNImage as Image,
};
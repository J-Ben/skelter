import React, { useMemo } from 'react';
import { SkeletonContext } from './SkeletonContext';
import { DEFAULT_SKELETON_CONFIG } from '../core/constants';
import type { SkeletonConfig, SkeletonAnimation } from '../core/types';

/**
 * Props for SkeletonTheme.
 * Accepts all SkeletonConfig fields directly as props,
 * plus auto and exclude for the auto mode.
 */
export interface SkeletonThemeProps {
  /** Animation mode for all skeleton bones */
  animation?: SkeletonAnimation;
  /** Base color of skeleton placeholders */
  color?: string;
  /** Highlight color used during animation */
  highlightColor?: string;
  /** Animation speed multiplier */
  speed?: number;
  /** Default corner radius for all bones */
  borderRadius?: number;
  /** Animation direction — ltr or rtl */
  direction?: 'ltr' | 'rtl';
  /** Minimum duration in ms the skeleton stays visible */
  minDuration?: number;
  /** If true, skeleton is never shown regardless of isLoading */
  disabled?: boolean;
  /** Shatter animation configuration */
  shatterConfig?: SkeletonConfig['shatterConfig'];
  /** Image-specific configuration */
  imageConfig?: SkeletonConfig['imageConfig'];
  /**
   * If true, automatically injects hasSkeleton={true} on all
   * child components, except those listed in exclude.
   * Zero touch required on individual components.
   */
  auto?: boolean;
  /**
   * List of component displayNames to exclude from auto mode.
   * Example: ['MapView', 'NavigationContainer']
   */
  exclude?: string[];
  /** Child components */
  children: React.ReactNode;
}

/**
 * Recursively processes React children in auto mode.
 * Injects hasSkeleton={true} on all eligible components.
 * Defensive — wrapped in try/catch to never crash on third-party components.
 *
 * @param children - React children to process
 * @param exclude - DisplayNames to skip
 * @returns Processed children with hasSkeleton injected
 */
function injectSkeletonProps(
  children: React.ReactNode,
  exclude: string[]
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;

    try {
      const elementType = child.type;
      const displayName =
        typeof elementType === 'function'
          ? (elementType as { displayName?: string; name?: string })
              .displayName ||
            (elementType as { name?: string }).name ||
            ''
          : typeof elementType === 'string'
          ? elementType
          : '';

      // Skip excluded components
      if (exclude.includes(displayName)) return child;

      // Recursively process children of this element
      const childProps = child.props as Record<string, unknown>;
      const nestedChildren = childProps.children;
      const processedChildren = nestedChildren
        ? injectSkeletonProps(
            nestedChildren as React.ReactNode,
            exclude
          )
        : undefined;

      // Inject hasSkeleton and processed children
      return React.cloneElement(child, {
        hasSkeleton: true,
        ...(processedChildren !== undefined
          ? { children: processedChildren }
          : {}),
      } as Partial<typeof child.props>);
    } catch {
      // Never crash on third-party components
      return child;
    }
  });
}

/**
 * Global theme provider for Skelter.
 *
 * Wraps your app once to configure skeleton behavior for all components.
 * When auto={true}, automatically enables skeleton on all child components
 * without requiring withSkeleton or hasSkeleton on each one.
 *
 * Priority chain:
 * skeletonConfig per component > SkeletonTheme > DEFAULT_SKELETON_CONFIG
 *
 * @example
 * // Basic theme
 * <SkeletonTheme animation="wave" color="#E0E0E0">
 *   <App />
 * </SkeletonTheme>
 *
 * @example
 * // Auto mode — zero touch on individual components
 * <SkeletonTheme animation="shatter" auto exclude={['MapView']}>
 *   <App />
 * </SkeletonTheme>
 */
export function SkeletonTheme({
  animation,
  color,
  highlightColor,
  speed,
  borderRadius,
  direction,
  minDuration,
  disabled,
  shatterConfig,
  imageConfig,
  auto = false,
  exclude = [],
  children,
}: SkeletonThemeProps) {
  // Merge provided props with defaults
  const mergedConfig: SkeletonConfig = useMemo(
    () => ({
      ...DEFAULT_SKELETON_CONFIG,
      ...(animation !== undefined && { animation }),
      ...(color !== undefined && { color }),
      ...(highlightColor !== undefined && { highlightColor }),
      ...(speed !== undefined && { speed }),
      ...(borderRadius !== undefined && { borderRadius }),
      ...(direction !== undefined && { direction }),
      ...(minDuration !== undefined && { minDuration }),
      ...(disabled !== undefined && { disabled }),
      ...(shatterConfig !== undefined && {
        shatterConfig: {
          ...DEFAULT_SKELETON_CONFIG.shatterConfig,
          ...shatterConfig,
        },
      }),
      ...(imageConfig !== undefined && {
        imageConfig: {
          ...DEFAULT_SKELETON_CONFIG.imageConfig,
          ...imageConfig,
        },
      }),
    }),
    [
      animation,
      color,
      highlightColor,
      speed,
      borderRadius,
      direction,
      minDuration,
      disabled,
      shatterConfig,
      imageConfig,
    ]
  );

  const contextValue = useMemo(
    () => ({ config: mergedConfig, auto, exclude }),
    [mergedConfig, auto, exclude]
  );

  // Auto mode — inject hasSkeleton on all eligible children
  const processedChildren = useMemo(() => {
    if (!auto) return children;
    return injectSkeletonProps(children, exclude);
  }, [auto, children, exclude]);

  return (
    <SkeletonContext.Provider value={contextValue}>
      {processedChildren}
    </SkeletonContext.Provider>
  );
}
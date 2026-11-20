import type { WithSkeletonOptions } from './types';

/**
 * Resolves the props used for the invisible measurement pass.
 * `mockData` (v4) wins over its alias `mockProps` (v1–v3) when both are set.
 */
export function resolveMockProps<P>(options?: WithSkeletonOptions<P>): Partial<P> | undefined {
  return (options?.mockData ?? options?.mockProps) as Partial<P> | undefined;
}

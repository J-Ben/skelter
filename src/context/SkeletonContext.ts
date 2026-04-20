import { createContext } from 'react';
import type { SkeletonConfig } from '../core/types';

interface SkeletonContextValue {
  config?: SkeletonConfig;
  auto: boolean;
  exclude: string[];
}

export const SkeletonContext = createContext<SkeletonContextValue>({
  config: undefined,
  auto: false,
  exclude: [],
});
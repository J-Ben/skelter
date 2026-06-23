import { createContext, useContext } from 'react';

export interface DevToolsContextValue {
  enabled: boolean;
  forceLoading: boolean;
  setForceLoading: (v: boolean) => void;
  xray: boolean;
  setXray: (v: boolean) => void;
  forcedIds: Set<string>;
  setForcedId: (id: string, forced: boolean) => void;
  matchScores: Map<string, MatchScore>;
  setMatchScore: (id: string, score: MatchScore) => void;
  inspectedId: string | null;
  setInspectedId: (id: string | null) => void;
  highlight: boolean;
  setHighlight: (v: boolean) => void;
  showWaste: boolean;
  setShowWaste: (v: boolean) => void;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  components: Map<string, ComponentInfo>;
  registerComponent: (id: string, info: ComponentInfo) => void;
  unregisterComponent: (id: string) => void;
}

export interface MatchScore {
  total: number;
  /** Shape + position of bones vs real elements (50%) */
  fidelity: number;
  /** Fraction of each bone's area that covers real visual content (25%) */
  waste: number;
  /** All visible elements covered by at least one bone (15%) */
  coverage: number;
  /** Skeleton height ≈ content height — no layout jump (10%) */
  stability: number;
  missedElements: number;
  ghostBones: number;
}

export interface ComponentInfo {
  displayName: string;
  animation: string;
  bonesCount: number;
  isLoading: boolean;
}

const defaultValue: DevToolsContextValue = {
  enabled: false,
  forceLoading: false,
  setForceLoading: () => {},
  xray: false,
  setXray: () => {},
  forcedIds: new Set(),
  setForcedId: () => {},
  matchScores: new Map<string, MatchScore>(),
  setMatchScore: () => {},
  inspectedId: null,
  setInspectedId: () => {},
  highlight: false,
  setHighlight: () => {},
  showWaste: false,
  setShowWaste: () => {},
  hoveredId: null,
  setHoveredId: () => {},
  components: new Map(),
  registerComponent: () => {},
  unregisterComponent: () => {},
};

// Singleton: share the same context object across multiple bundle instances
// (needed when devtools and lib are loaded as separate chunks via symlinks)
const g = (typeof globalThis !== 'undefined' ? globalThis : {}) as Record<string, unknown>;
if (!g.__SKELTER_DEVTOOLS_CTX__) {
  g.__SKELTER_DEVTOOLS_CTX__ = createContext<DevToolsContextValue>(defaultValue);
}
export const DevToolsContext = g.__SKELTER_DEVTOOLS_CTX__ as ReturnType<typeof createContext<DevToolsContextValue>>;

export function useDevTools() {
  return useContext(DevToolsContext);
}

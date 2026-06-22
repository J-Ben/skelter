import React, {
  useState, useCallback, useRef, useMemo, useEffect,
} from 'react';
import {
  Dimensions, PanResponder, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _svg = (() => { try { return require('react-native-svg'); } catch { return null; } })();
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _glass = (() => { try { return require('expo-glass-effect'); } catch { return null; } })();
const GlassView: React.ComponentType<{ style?: object; intensity?: number; children?: React.ReactNode }> | null =
  _glass?.GlassView ?? _glass?.default?.GlassView ?? null;
const _Svg = _svg?.default ?? _svg?.Svg ?? null;
const _Polygon = _svg?.Polygon ?? null;
const _G = _svg?.G ?? null;
import { DevToolsContext, type ComponentInfo, type MatchScore } from '../context/DevToolsContext';

const BTN = 48;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Pentagon fallback using Views when react-native-svg is unavailable
function SkelterIconFallback() {
  return (
    <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 15, height: 18, backgroundColor: '#e9e9ee', borderRadius: 3, transform: [{ rotate: '-8deg' }, { translateX: -2 }] }} />
      <View style={{ position: 'absolute', width: 15, height: 18, backgroundColor: '#f97316', borderRadius: 3 }} />
    </View>
  );
}

// ErrorBoundary so a broken SVG native module falls back silently
class SkelterIconBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <SkelterIconFallback /> : this.props.children;
  }
}

function SkelterIconSvg() {
  if (!_Svg || !_Polygon || !_G) return <SkelterIconFallback />;
  const SvgEl = _Svg as React.ComponentType<{ width: number; height: number; viewBox: string; children?: React.ReactNode }>;
  const PolygonEl = _Polygon as React.ComponentType<{ points: string; fill: string; stroke: string; strokeWidth: string; strokeLinejoin: string }>;
  const GEl = _G as React.ComponentType<{ transform: string; children?: React.ReactNode }>;
  return (
    <SvgEl width={26} height={26} viewBox="0 0 200 200">
      <GEl transform="translate(5 6)">
        <GEl transform="translate(-10 2) rotate(-5 100 100)">
          <PolygonEl points="100,38 158.97,80.84 136.44,150.16 63.56,150.16 41.03,80.84" fill="#e9e9ee" stroke="#e9e9ee" strokeWidth="20" strokeLinejoin="round" />
        </GEl>
        <PolygonEl points="100,38 158.97,80.84 136.44,150.16 63.56,150.16 41.03,80.84" fill="#f97316" stroke="#f97316" strokeWidth="20" strokeLinejoin="round" />
      </GEl>
    </SvgEl>
  );
}

function SkelterIcon() {
  return (
    <SkelterIconBoundary>
      <SkelterIconSvg />
    </SkelterIconBoundary>
  );
}

function scoreColor(score: number) {
  if (score >= 75) return '#22c55e';
  if (score >= 45) return '#f59e0b';
  return '#ef4444';
}

/* ─── Panel ─────────────────────────────────────────────────── */
function Panel({
  visible, onClose,
  forceLoading, setForceLoading,
  highlight, setHighlight,
  xray, setXray,
  showWaste, setShowWaste,
  components, forcedIds, setForcedId, matchScores,
  inspectedId,
  panelPos, panHandlers,
}: {
  visible: boolean; onClose: () => void;
  forceLoading: boolean; setForceLoading: (v: boolean) => void;
  highlight: boolean; setHighlight: (v: boolean) => void;
  xray: boolean; setXray: (v: boolean) => void;
  showWaste: boolean; setShowWaste: (v: boolean) => void;
  components: Map<string, ComponentInfo>;
  forcedIds: Set<string>;
  setForcedId: (id: string, forced: boolean) => void;
  matchScores: Map<string, MatchScore>;
  inspectedId: string | null;
  panelPos: { x: number; y: number };
  panHandlers: object;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [size, setSize] = useState<'compact' | 'normal' | 'tall'>('normal');
  const scrollRef = useRef<ScrollView>(null);
  const rowOffsetsRef = useRef<Map<string, number>>(new Map());

  const listHeight = size === 'compact' ? 120 : size === 'tall' ? SCREEN_H * 0.45 : SCREEN_H * 0.28;
  const sizeIcon = size === 'compact' ? '⊡' : size === 'normal' ? '⊟' : '⊞';
  const nextSize = () => setSize(s => s === 'compact' ? 'normal' : s === 'normal' ? 'tall' : 'compact');

  useEffect(() => {
    if (!visible || !inspectedId) return;
    setExpanded(inspectedId);
    const offset = rowOffsetsRef.current.get(inspectedId);
    if (offset !== undefined) {
      setTimeout(() => scrollRef.current?.scrollTo({ y: offset, animated: true }), 100);
    }
  }, [visible, inspectedId]);

  if (!visible) return null;

  const list = Array.from(components.entries());
  const scores = list.map(([id]) => matchScores.get(id)?.total).filter((s): s is number => s !== undefined);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const scoreOn5 = avgScore !== null ? (avgScore / 100 * 5).toFixed(1) : null;

  const SheetEl = GlassView ?? View;
  const glassProps = GlassView ? { intensity: 60 } : {};

  return (
    <SheetEl {...glassProps} style={[s.sheet, !GlassView && s.sheetFallback, { position: 'absolute', left: panelPos.x, top: panelPos.y }] as any} pointerEvents="box-none">
      {/* Drag handle */}
      <View style={s.dragHandle} {...panHandlers}>
        <View style={s.dragBar} />
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.titleBlock}>
              <Text style={s.titleLabel}>skelter</Text>
              <Text style={s.title}>UI Quality</Text>
            </View>
            {scoreOn5 !== null && (
              <Text style={[s.globalScore, { color: scoreColor(avgScore!) }]}>
                {scoreOn5}<Text style={s.globalScoreDenom}>/5</Text>
              </Text>
            )}
          </View>
          <View style={s.headerRight}>
            <Pressable onPress={nextSize} style={s.closeBtn}>
              <Text style={s.closeBtnText}>{sizeIcon}</Text>
            </Pressable>
            <Pressable onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeBtnText}>✕</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={s.controls}>
        <Pressable style={[s.ctrlBtn, forceLoading && s.ctrlBtnActive]} onPress={() => setForceLoading(!forceLoading)}>
          <Text style={[s.ctrlBtnText, forceLoading && s.ctrlBtnTextActive]}>{forceLoading ? '⏸ data' : '▶ force'}</Text>
        </Pressable>
        <Pressable style={[s.ctrlBtn, xray && s.ctrlBtnXray]} onPress={() => setXray(!xray)}>
          <Text style={[s.ctrlBtnText, xray && s.ctrlBtnTextActive]}>{xray ? '✕ x-ray' : '◎ x-ray'}</Text>
        </Pressable>
        <Pressable style={[s.ctrlBtn, showWaste && s.ctrlBtnWaste]} onPress={() => setShowWaste(!showWaste)}>
          <Text style={[s.ctrlBtnText, showWaste && s.ctrlBtnTextActive]}>{showWaste ? '✕ waste' : '◧ waste'}</Text>
        </Pressable>
        <Pressable style={[s.ctrlBtn, highlight && s.ctrlBtnHighlight]} onPress={() => setHighlight(!highlight)}>
          <Text style={[s.ctrlBtnText, highlight && s.ctrlBtnTextActive]}>{highlight ? '✕ scores' : '⊞ scores'}</Text>
        </Pressable>
      </View>

      <View style={s.divider} />

      <ScrollView ref={scrollRef} style={[s.list, { height: listHeight }]} contentContainerStyle={s.listContent}>
        {list.length === 0 ? (
          <Text style={s.empty}>No components mounted.</Text>
        ) : (
          list.map(([id, info]) => {
            const isForced = forcedIds.has(id);
            const score = matchScores.get(id);
            const isExpanded = expanded === id;
            return (
              <View key={id} style={s.row} onLayout={e => rowOffsetsRef.current.set(id, e.nativeEvent.layout.y)}>
                <View style={s.rowMain}>
                  <Text style={s.rowName} numberOfLines={1}>{info.displayName}</Text>
                  <View style={s.rowActions}>
                    {score !== undefined && (
                      <Pressable style={[s.scoreBadge, { backgroundColor: scoreColor(score.total) }]} onPress={() => setExpanded(isExpanded ? null : id)}>
                        <Text style={s.scoreBadgeText}>{score.total}% {isExpanded ? '▲' : '▼'}</Text>
                      </Pressable>
                    )}
                    <Pressable style={[s.forceBadge, isForced && s.forceBadgeActive]} onPress={() => setForcedId(id, !isForced)}>
                      <Text style={[s.forceBadgeText, isForced && s.forceBadgeTextActive]}>{isForced ? '⏹' : '▶'}</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={s.rowMeta}>
                  <Text style={s.metaText}>anim: <Text style={s.metaVal}>{info.animation}</Text></Text>
                  <Text style={s.metaText}>bones: <Text style={s.metaVal}>{info.bonesCount}</Text></Text>
                </View>
                {isExpanded && score && (
                  <View style={s.scoreDetail}>
                    {(['fidelity', 'waste', 'coverage', 'stability'] as const).map(k => (
                      <View key={k} style={s.scoreRow}>
                        <Text style={s.scoreLabel}>{k}</Text>
                        <View style={s.scoreBarBg}>
                          <View style={[s.scoreBarFill, { width: `${score[k]}%` as any, backgroundColor: scoreColor(score[k]) }]} />
                        </View>
                        <Text style={[s.scoreVal, { color: scoreColor(score[k]) }]}>{score[k]}%</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SheetEl>
  );
}

/* ─── Root ───────────────────────────────────────────────────── */
export function SkeletonDevTools({ children }: { children?: React.ReactNode }) {
  if (!__DEV__) {
    return <>{children}</>;
  }

  return <SkeletonDevToolsImpl>{children}</SkeletonDevToolsImpl>;
}

function SkeletonDevToolsImpl({ children }: { children?: React.ReactNode }) {
  const { width, height } = Dimensions.get('window');

  const [forceLoading, setForceLoading] = useState(false);
  const [highlight, setHighlight] = useState(true);
  const [xray, setXray] = useState(false);
  const [showWaste, setShowWaste] = useState(false);
  const [open, setOpen] = useState(false);
  const [inspectedId, setInspectedIdState] = useState<string | null>(null);
  const openAndInspect = useCallback((id: string | null) => {
    setInspectedIdState(id);
    if (id) setOpen(true);
  }, []);

  const [panelPos, setPanelPos] = useState({ x: 8, y: height * 0.35 });
  const panelPosRef = useRef(panelPos);
  panelPosRef.current = panelPos;
  const panelStartPos = useRef({ x: 8, y: height * 0.35 });
  const panelPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
      onPanResponderGrant: () => { panelStartPos.current = { ...panelPosRef.current }; },
      onPanResponderMove: (_, g) => {
        setPanelPos({
          x: Math.min(Math.max(0, panelStartPos.current.x + g.dx), width - 40),
          y: Math.min(Math.max(0, panelStartPos.current.y + g.dy), height - 80),
        });
      },
    })
  ).current;
  const [pos, setPos] = useState({ x: width - BTN - 16, y: height - BTN - 80 });

  const componentsRef = useRef<Map<string, ComponentInfo>>(new Map());
  const forcedIdsRef = useRef<Set<string>>(new Set());
  const matchScoresRef = useRef<Map<string, MatchScore>>(new Map());
  const [tick, forceRender] = useState(0);

  const registerComponent = useCallback((id: string, info: ComponentInfo) => {
    componentsRef.current.set(id, info);
    forceRender(n => n + 1);
  }, []);

  const unregisterComponent = useCallback((id: string) => {
    componentsRef.current.delete(id);
    forcedIdsRef.current.delete(id);
    forceRender(n => n + 1);
  }, []);

  const setForcedId = useCallback((id: string, forced: boolean) => {
    if (forced) forcedIdsRef.current.add(id);
    else forcedIdsRef.current.delete(id);
    forceRender(n => n + 1);
  }, []);

  const setMatchScore = useCallback((id: string, score: MatchScore) => {
    matchScoresRef.current.set(id, score);
    forceRender(n => n + 1);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
      onPanResponderMove: (_, g) => {
        setPos({
          x: Math.min(Math.max(0, g.moveX - BTN / 2), width - BTN),
          y: Math.min(Math.max(0, g.moveY - BTN / 2), height - BTN),
        });
      },
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) < 4 && Math.abs(g.dy) < 4) setOpen(o => !o);
      },
    })
  ).current;

  const allScores = Array.from(matchScoresRef.current.values()).map(s => s.total);
  const avgPct = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;
  const avgScore = avgPct !== null ? parseFloat((avgPct / 100 * 5).toFixed(1)) : null;

  const ctx = useMemo(() => ({
    enabled: true,
    forceLoading, setForceLoading,
    xray, setXray,
    highlight, setHighlight,
    showWaste, setShowWaste,
    inspectedId, setInspectedId: openAndInspect,
    hoveredId: null, setHoveredId: () => {},
    forcedIds: forcedIdsRef.current,
    setForcedId,
    matchScores: matchScoresRef.current,
    setMatchScore,
    components: componentsRef.current,
    registerComponent,
    unregisterComponent,
  }), [tick, forceLoading, xray, highlight, showWaste, inspectedId, openAndInspect, setForcedId, setMatchScore, registerComponent, unregisterComponent]);

  return (
    <DevToolsContext.Provider value={ctx}>
      <View style={s.root}>
        {children}

        <Panel
          visible={open}
          onClose={() => { setOpen(false); setInspectedIdState(null); }}
          inspectedId={inspectedId}
          panelPos={panelPos}
          panHandlers={panelPanResponder.panHandlers}
          forceLoading={forceLoading}
          setForceLoading={setForceLoading}
          xray={xray}
          setXray={setXray}
          showWaste={showWaste}
          setShowWaste={setShowWaste}
          highlight={highlight}
          setHighlight={setHighlight}
          components={componentsRef.current}
          forcedIds={forcedIdsRef.current}
          setForcedId={setForcedId}
          matchScores={matchScoresRef.current}
        />

        {/* Floating button */}
        <View
          style={[s.fab, { left: pos.x, top: pos.y, backgroundColor: forceLoading ? '#f97316' : '#18181b' }]}
          {...panResponder.panHandlers}
        >
          <SkelterIcon />
          {avgScore !== null && avgPct !== null && (
            <View style={[s.badge, { backgroundColor: scoreColor(avgPct) }]}>
              <Text style={s.badgeText}>{avgScore}</Text>
            </View>
          )}
        </View>
      </View>
    </DevToolsContext.Provider>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  sheet: {
    backgroundColor: 'rgba(12,12,14,0.55)',
    borderRadius: 16,
    width: SCREEN_W - 16,
    paddingBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetFallback: {
    backgroundColor: 'rgba(12,12,14,0.88)',
  },
  dragHandle: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  dragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3f3f46',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  titleBlock: {
    flexDirection: 'column',
    gap: 0,
  },
  titleLabel: {
    color: '#52525b',
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f4f4f5',
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 15,
  },
  globalScore: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '700',
  },
  globalScoreDenom: {
    color: '#52525b',
    fontWeight: '400',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: '#71717a',
    fontSize: 14,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  ctrlBtn: {
    flex: 1,
    backgroundColor: '#27272a',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  ctrlBtnActive: {
    backgroundColor: '#f97316',
  },
  ctrlBtnHighlight: {
    backgroundColor: '#0ea5e9',
  },
  ctrlBtnXray: {
    backgroundColor: '#a855f7',
  },
  ctrlBtnWaste: {
    backgroundColor: '#ef4444',
  },
  ctrlBtnText: {
    color: '#a1a1aa',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '600',
  },
  ctrlBtnTextActive: {
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#1f1f23',
    marginHorizontal: 16,
  },
  list: {
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  empty: {
    color: '#52525b',
    fontFamily: 'monospace',
    fontSize: 10,
    marginTop: 8,
  },
  row: {
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  rowName: {
    color: '#f4f4f5',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    flexShrink: 0,
  },
  scoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
  },
  scoreBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  forceBadge: {
    backgroundColor: '#27272a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
  },
  forceBadgeActive: {
    backgroundColor: '#f97316',
  },
  forceBadgeText: {
    color: '#a1a1aa',
    fontSize: 9,
    fontFamily: 'monospace',
  },
  forceBadgeTextActive: {
    color: '#fff',
  },
  rowMeta: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 8,
    paddingBottom: 5,
  },
  metaText: {
    color: '#71717a',
    fontFamily: 'monospace',
    fontSize: 9,
  },
  metaVal: {
    color: '#f4f4f5',
  },
  scoreDetail: {
    backgroundColor: 'rgba(99,102,241,0.07)',
    padding: 8,
    gap: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreLabel: {
    color: '#71717a',
    fontFamily: 'monospace',
    fontSize: 9,
    width: 56,
  },
  scoreBarBg: {
    flex: 1,
    height: 3,
    borderRadius: 3,
    backgroundColor: '#27272a',
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreVal: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '700',
    width: 30,
    textAlign: 'right',
  },
  fab: {
    position: 'absolute',
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f97316',
    borderRadius: 10,
    minWidth: 22,
    height: 20,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});

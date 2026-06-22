import React, {
  useState, useCallback, useRef, useMemo, useEffect,
} from 'react';
import {
  Animated, Dimensions, PanResponder, Pressable, ScrollView,
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
const _Path = _svg?.Path ?? null;
const _Line = _svg?.Line ?? null;
const _Polyline = _svg?.Polyline ?? null;
const _Rect = _svg?.Rect ?? null;
const _Circle = _svg?.Circle ?? null;
import { DevToolsContext, type ComponentInfo, type MatchScore } from '../context/DevToolsContext';

type IconName =
  | 'play' | 'pause' | 'stop' | 'eye' | 'eyeOff' | 'grid' | 'barChart'
  | 'moon' | 'sun' | 'close' | 'maximize' | 'minimize' | 'chevronUp' | 'chevronDown';

const ICON_TEXT_FALLBACK: Record<IconName, string> = {
  play: '▶', pause: '⏸', stop: '⏹', eye: '◎', eyeOff: '✕',
  grid: '▦', barChart: '▤', moon: '☾', sun: '☀', close: '✕',
  maximize: '⤢', minimize: '⤡', chevronUp: '▲', chevronDown: '▼',
};

// Feather-style stroke icons. Falls back to a plain-text glyph if
// react-native-svg isn't installed — keeps the devtool usable without the dep.
function Icon({ name, size = 12, color = '#a1a1aa' }: { name: IconName; size?: number; color?: string }) {
  if (!_Svg || !_Path) {
    return <Text style={{ fontSize: size, color, lineHeight: size + 2 }}>{ICON_TEXT_FALLBACK[name]}</Text>;
  }
  const SvgEl = _Svg as React.ComponentType<{ width: number; height: number; viewBox: string; children?: React.ReactNode }>;
  const common = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  // Untyped passthrough props (d/x1/points/etc vary per primitive) — this is
  // internal icon rendering, not part of the library's public typed API.
  const PathEl = _Path as React.ComponentType<any>;
  const LineEl = (_Line ?? PathEl) as React.ComponentType<any>;
  const PolylineEl = _Polyline as React.ComponentType<any> | null;
  const RectEl = _Rect as React.ComponentType<any> | null;
  const CircleEl = _Circle as React.ComponentType<any> | null;

  let body: React.ReactNode = null;
  switch (name) {
    case 'play':
      body = <PathEl d="M6 3l15 9-15 9V3z" fill={color} stroke="none" />;
      break;
    case 'pause':
      body = <>{RectEl && <RectEl x={5} y={3} width={5} height={18} rx={1} fill={color} stroke="none" />}{RectEl && <RectEl x={14} y={3} width={5} height={18} rx={1} fill={color} stroke="none" />}</>;
      break;
    case 'stop':
      body = RectEl ? <RectEl x={4} y={4} width={16} height={16} rx={3} fill={color} stroke="none" /> : null;
      break;
    case 'eye':
      body = <>
        <PathEl d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" {...common} />
        {CircleEl && <CircleEl cx={12} cy={12} r={3} {...common} />}
      </>;
      break;
    case 'eyeOff':
      body = <>
        <PathEl d="M17.9 17.9A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5-5.9M9.9 4.2A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.2 3.2" {...common} />
        <LineEl x1={1} y1={1} x2={23} y2={23} {...common} />
      </>;
      break;
    case 'grid':
      body = RectEl ? <>
        <RectEl x={3} y={3} width={7} height={7} {...common} />
        <RectEl x={14} y={3} width={7} height={7} {...common} />
        <RectEl x={14} y={14} width={7} height={7} {...common} />
        <RectEl x={3} y={14} width={7} height={7} {...common} />
      </> : null;
      break;
    case 'barChart':
      body = <>
        <LineEl x1={18} y1={20} x2={18} y2={10} {...common} />
        <LineEl x1={12} y1={20} x2={12} y2={4} {...common} />
        <LineEl x1={6} y1={20} x2={6} y2={14} {...common} />
      </>;
      break;
    case 'moon':
      body = <PathEl d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" {...common} />;
      break;
    case 'sun':
      body = <>
        {CircleEl && <CircleEl cx={12} cy={12} r={5} {...common} />}
        <LineEl x1={12} y1={1} x2={12} y2={3} {...common} />
        <LineEl x1={12} y1={21} x2={12} y2={23} {...common} />
        <LineEl x1={4.2} y1={4.2} x2={5.6} y2={5.6} {...common} />
        <LineEl x1={18.4} y1={18.4} x2={19.8} y2={19.8} {...common} />
        <LineEl x1={1} y1={12} x2={3} y2={12} {...common} />
        <LineEl x1={21} y1={12} x2={23} y2={12} {...common} />
        <LineEl x1={4.2} y1={19.8} x2={5.6} y2={18.4} {...common} />
        <LineEl x1={18.4} y1={5.6} x2={19.8} y2={4.2} {...common} />
      </>;
      break;
    case 'close':
      body = <>
        <LineEl x1={18} y1={6} x2={6} y2={18} {...common} />
        <LineEl x1={6} y1={6} x2={18} y2={18} {...common} />
      </>;
      break;
    case 'maximize':
      body = <PathEl d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" {...common} />;
      break;
    case 'minimize':
      body = <PathEl d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" {...common} />;
      break;
    case 'chevronUp':
      body = PolylineEl ? <PolylineEl points="18 15 12 9 6 15" {...common} /> : null;
      break;
    case 'chevronDown':
      body = PolylineEl ? <PolylineEl points="6 9 12 15 18 9" {...common} /> : null;
      break;
  }
  if (!body) return <Text style={{ fontSize: size, color, lineHeight: size + 2 }}>{ICON_TEXT_FALLBACK[name]}</Text>;
  return <SvgEl width={size} height={size} viewBox="0 0 24 24">{body}</SvgEl>;
}

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

function usePanelTheme(mode: 'dark' | 'light') {
  const dark = mode !== 'light';
  return useMemo(() => ({
    dark,
    sheetBg: dark ? 'rgba(12,12,14,0.72)' : 'rgba(255,255,255,0.8)',
    title: dark ? '#f4f4f5' : '#18181b',
    titleLabel: dark ? '#52525b' : '#a1a1aa',
    text: dark ? '#a1a1aa' : '#52525b',
    border: dark ? '#1f1f23' : 'rgba(0,0,0,0.08)',
    row: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.035)',
    ctrlBtn: dark ? '#27272a' : '#e4e4e7',
    ctrlBtnText: dark ? '#a1a1aa' : '#52525b',
    forceBadge: dark ? '#27272a' : '#e4e4e7',
    forceBadgeText: dark ? '#a1a1aa' : '#52525b',
    dragBar: dark ? '#3f3f46' : '#d4d4d8',
    closeBtnText: dark ? '#71717a' : '#71717a',
    scoreBarBg: dark ? '#27272a' : '#e4e4e7',
  }), [dark]);
}

/* ─── Panel ─────────────────────────────────────────────────── */
function Panel({
  visible, onClose,
  forceLoading, setForceLoading,
  highlight, setHighlight,
  xray, setXray,
  showWaste, setShowWaste,
  components, forcedIds, setForcedId, matchScores,
  inspectedId, setInspectedId,
  panelPos, panHandlers,
  panelTheme, setPanelTheme,
  anim, fabPos,
}: {
  visible: boolean; onClose: () => void;
  forceLoading: boolean; setForceLoading: (v: boolean) => void;
  highlight: boolean; setHighlight: (v: boolean) => void;
  xray: boolean; setXray: (v: boolean) => void;
  showWaste: boolean; setShowWaste: (v: boolean) => void;
  components: Map<string, ComponentInfo>;
  forcedIds: Set<string>;
  setInspectedId: (id: string | null) => void;
  setForcedId: (id: string, forced: boolean) => void;
  matchScores: Map<string, MatchScore>;
  inspectedId: string | null;
  panelPos: { x: number; y: number };
  panHandlers: object;
  anim: Animated.Value;
  fabPos: { x: number; y: number };
  panelTheme: 'dark' | 'light';
  setPanelTheme: (v: 'dark' | 'light') => void;
}) {
  const T = usePanelTheme(panelTheme);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [size, setSize] = useState<'compact' | 'normal' | 'tall'>('normal');
  const scrollRef = useRef<ScrollView>(null);
  const rowOffsetsRef = useRef<Map<string, number>>(new Map());

  const listHeight = size === 'compact' ? 120 : size === 'tall' ? SCREEN_H * 0.45 : SCREEN_H * 0.28;
  const nextSize = () => setSize(s => s === 'compact' ? 'normal' : s === 'normal' ? 'tall' : 'compact');

  useEffect(() => {
    if (!visible || !inspectedId) return;
    setExpanded(inspectedId);
    const offset = rowOffsetsRef.current.get(inspectedId);
    if (offset !== undefined) {
      setTimeout(() => scrollRef.current?.scrollTo({ y: offset, animated: true }), 100);
    }
  }, [visible, inspectedId]);

  const list = Array.from(components.entries());
  const scores = list.map(([id]) => matchScores.get(id)?.total).filter((s): s is number => s !== undefined);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const scoreOn5 = avgScore !== null ? (avgScore / 100 * 5).toFixed(1) : null;

  const SheetEl = GlassView ?? View;
  const glassProps = GlassView ? { intensity: 60 } : {};

  const sheetW = SCREEN_W - 16;
  const sheetH = 320;
  const dx = (fabPos.x + BTN / 2) - (panelPos.x + sheetW / 2);
  const dy = (fabPos.y + BTN / 2) - (panelPos.y + sheetH / 2);
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] });

  return (
    <Animated.View
      style={[s.sheetShadow, { position: 'absolute', left: panelPos.x, top: panelPos.y, opacity: anim, transform: [{ translateX }, { translateY }, { scale }] }]}
      pointerEvents={visible ? 'box-none' : 'none'}
    >
    <SheetEl {...glassProps} style={[s.sheet, !GlassView && s.sheetFallback, { backgroundColor: T.sheetBg }] as any} pointerEvents="box-none">
      {/* Drag handle */}
      <View style={s.dragHandle} {...panHandlers}>
        <View style={[s.dragBar, { backgroundColor: T.dragBar }]} />
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.titleBlock}>
              <Text style={[s.titleLabel, { color: T.titleLabel }]}>skelter</Text>
              <Text style={[s.title, { color: T.title }]}>UI Quality</Text>
            </View>
            {scoreOn5 !== null && (
              <Text style={[s.globalScore, { color: scoreColor(avgScore!) }]}>
                {scoreOn5}<Text style={[s.globalScoreDenom, { color: T.titleLabel }]}>/5</Text>
              </Text>
            )}
          </View>
          <View style={s.headerRight}>
            <Pressable onPress={() => setPanelTheme(panelTheme === 'dark' ? 'light' : 'dark')} style={s.closeBtn}>
              <Icon name={panelTheme === 'dark' ? 'moon' : 'sun'} size={14} color={T.closeBtnText} />
            </Pressable>
            <Pressable onPress={nextSize} style={[s.closeBtn, s.sizeBtn]}>
              <Icon name={size === 'tall' ? 'minimize' : 'maximize'} size={12} color={T.closeBtnText} />
              <Text style={[s.sizeBtnText, { color: T.closeBtnText }]}>{size}</Text>
            </Pressable>
            <Pressable onPress={onClose} style={s.closeBtn}>
              <Icon name="close" size={14} color={T.closeBtnText} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={s.controls}>
        <Pressable style={[s.ctrlBtn, { backgroundColor: T.ctrlBtn }, forceLoading && s.ctrlBtnActive]} onPress={() => setForceLoading(!forceLoading)}>
          <Icon name={forceLoading ? 'pause' : 'play'} size={11} color={forceLoading ? '#fff' : T.ctrlBtnText} />
          <Text style={[s.ctrlBtnText, { color: T.ctrlBtnText }, forceLoading && s.ctrlBtnTextActive]}>force</Text>
        </Pressable>
        <Pressable style={[s.ctrlBtn, { backgroundColor: T.ctrlBtn }, xray && s.ctrlBtnXray]} onPress={() => setXray(!xray)}>
          <Icon name={xray ? 'eyeOff' : 'eye'} size={11} color={xray ? '#fff' : T.ctrlBtnText} />
          <Text style={[s.ctrlBtnText, { color: T.ctrlBtnText }, xray && s.ctrlBtnTextActive]}>x-ray</Text>
        </Pressable>
        <Pressable style={[s.ctrlBtn, { backgroundColor: T.ctrlBtn }, showWaste && s.ctrlBtnWaste]} onPress={() => setShowWaste(!showWaste)}>
          <Icon name="grid" size={11} color={showWaste ? '#fff' : T.ctrlBtnText} />
          <Text style={[s.ctrlBtnText, { color: T.ctrlBtnText }, showWaste && s.ctrlBtnTextActive]}>waste</Text>
        </Pressable>
        <Pressable style={[s.ctrlBtn, { backgroundColor: T.ctrlBtn }, highlight && s.ctrlBtnHighlight]} onPress={() => setHighlight(!highlight)}>
          <Icon name="barChart" size={11} color={highlight ? '#fff' : T.ctrlBtnText} />
          <Text style={[s.ctrlBtnText, { color: T.ctrlBtnText }, highlight && s.ctrlBtnTextActive]}>scores</Text>
        </Pressable>
      </View>

      <View style={[s.divider, { backgroundColor: T.border }]} />

      <ScrollView ref={scrollRef} style={[s.list, { height: listHeight }]} contentContainerStyle={s.listContent}>
        {list.length === 0 ? (
          <Text style={[s.empty, { color: T.titleLabel }]}>No components mounted.</Text>
        ) : (
          list.map(([id, info]) => {
            const isForced = forcedIds.has(id);
            const score = matchScores.get(id);
            const isExpanded = expanded === id;
            const isInspected = inspectedId === id;
            return (
              <Pressable
                key={id}
                style={[s.row, { backgroundColor: T.row }, isInspected && s.rowInspected]}
                onLayout={e => rowOffsetsRef.current.set(id, e.nativeEvent.layout.y)}
                onPress={() => setInspectedId(isInspected ? null : id)}
              >
                <View style={s.rowMain}>
                  <Text style={[s.rowName, { color: T.title }]} numberOfLines={1}>{info.displayName}</Text>
                  <View style={s.rowActions}>
                    {score !== undefined && (
                      <Pressable style={[s.scoreBadge, { backgroundColor: scoreColor(score.total) }]} onPress={() => setExpanded(isExpanded ? null : id)}>
                        <Text style={s.scoreBadgeText}>{score.total}%</Text>
                        <Icon name={isExpanded ? 'chevronUp' : 'chevronDown'} size={9} color="#fff" />
                      </Pressable>
                    )}
                    <Pressable style={[s.forceBadge, { backgroundColor: T.forceBadge }, isForced && s.forceBadgeActive]} onPress={() => setForcedId(id, !isForced)}>
                      <Icon name={isForced ? 'stop' : 'play'} size={9} color={isForced ? '#fff' : T.forceBadgeText} />
                    </Pressable>
                  </View>
                </View>
                <View style={s.rowMeta}>
                  <Text style={[s.metaText, { color: T.text }]}>anim: <Text style={[s.metaVal, { color: T.title }]}>{info.animation}</Text></Text>
                  <Text style={[s.metaText, { color: T.text }]}>bones: <Text style={[s.metaVal, { color: T.title }]}>{info.bonesCount}</Text></Text>
                </View>
                {isExpanded && score && (
                  <View style={s.scoreDetail}>
                    {(['fidelity', 'waste', 'coverage', 'stability'] as const).map(k => (
                      <View key={k} style={s.scoreRow}>
                        <Text style={[s.scoreLabel, { color: T.text }]}>{k}</Text>
                        <View style={[s.scoreBarBg, { backgroundColor: T.scoreBarBg }]}>
                          <View style={[s.scoreBarFill, { width: `${score[k]}%` as any, backgroundColor: scoreColor(score[k]) }]} />
                        </View>
                        <Text style={[s.scoreVal, { color: scoreColor(score[k]) }]}>{score[k]}%</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SheetEl>
    </Animated.View>
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
  const [panelMounted, setPanelMounted] = useState(false);
  const panelAnim = useRef(new Animated.Value(0)).current;
  const [panelTheme, setPanelTheme] = useState<'dark' | 'light'>('dark');
  const [inspectedId, setInspectedIdState] = useState<string | null>(null);
  const openAndInspect = useCallback((id: string | null) => {
    setInspectedIdState(id);
    if (id) setOpen(true);
  }, []);

  useEffect(() => {
    if (open) {
      setPanelMounted(true);
      Animated.spring(panelAnim, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }).start();
    } else {
      Animated.timing(panelAnim, { toValue: 0, duration: 180, useNativeDriver: true })
        .start(() => setPanelMounted(false));
    }
  }, [open, panelAnim]);

  const ESTIMATED_SHEET_HEIGHT = height * 0.28 + 150;
  const [panelPos, setPanelPos] = useState({ x: 8, y: Math.max(8, height - ESTIMATED_SHEET_HEIGHT - 8) });
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

  const fabScale = useRef(new Animated.Value(1)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
      onPanResponderGrant: () => {
        Animated.timing(fabScale, { toValue: 0.85, duration: 100, useNativeDriver: true }).start();
      },
      onPanResponderMove: (_, g) => {
        setPos({
          x: Math.min(Math.max(0, g.moveX - BTN / 2), width - BTN),
          y: Math.min(Math.max(0, g.moveY - BTN / 2), height - BTN),
        });
      },
      onPanResponderRelease: (_, g) => {
        Animated.spring(fabScale, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }).start();
        if (Math.abs(g.dx) < 4 && Math.abs(g.dy) < 4) setOpen(o => !o);
      },
      onPanResponderTerminate: () => {
        Animated.spring(fabScale, { toValue: 1, friction: 3, tension: 200, useNativeDriver: true }).start();
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

        {panelMounted && (
        <Panel
          visible={open}
          onClose={() => { setOpen(false); setInspectedIdState(null); }}
          inspectedId={inspectedId}
          setInspectedId={openAndInspect}
          panelTheme={panelTheme}
          setPanelTheme={setPanelTheme}
          anim={panelAnim}
          fabPos={pos}
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
        )}

        {/* Floating button */}
        <Animated.View
          style={[s.fab, { left: pos.x, top: pos.y, backgroundColor: forceLoading ? '#f97316' : '#18181b', transform: [{ scale: fabScale }] }]}
          {...panResponder.panHandlers}
        >
          <SkelterIcon />
          {avgScore !== null && avgPct !== null && (
            <View style={[s.badge, { backgroundColor: scoreColor(avgPct) }]}>
              <Text style={s.badgeText}>{avgScore}</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </DevToolsContext.Provider>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  sheetShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
  },
  sheet: {
    backgroundColor: 'rgba(12,12,14,0.55)',
    borderRadius: 16,
    width: SCREEN_W - 16,
    paddingBottom: 12,
    overflow: 'hidden',
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
  sizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sizeBtnText: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
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
  rowInspected: {
    backgroundColor: 'rgba(99,102,241,0.18)',
    borderWidth: 1,
    borderColor: '#6366f1',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
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

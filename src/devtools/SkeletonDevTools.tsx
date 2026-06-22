import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { DevToolsContext, type ComponentInfo, type MatchScore } from '../context/DevToolsContext';

const BTN_SIZE = 48;

const SkelterIcon = () => (
  <svg width="26" height="26" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(5 6)">
      <g transform="translate(-10 2) rotate(-5 100 100)">
        <polygon points="100,38 158.97,80.84 136.44,150.16 63.56,150.16 41.03,80.84"
          fill="#e9e9ee" stroke="#e9e9ee" strokeWidth="20" strokeLinejoin="round"/>
      </g>
      <polygon points="100,38 158.97,80.84 136.44,150.16 63.56,150.16 41.03,80.84"
        fill="#f97316" stroke="#f97316" strokeWidth="20" strokeLinejoin="round"/>
    </g>
  </svg>
);

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

const KPI_TOOLTIPS: Record<string, string> = {
  fidelity:  'Shape + position of each bone vs its nearest real element. A full-width bone for a 3-word text scores low. Highest weight (50%).',
  waste:     'Fraction of each bone\'s area that covers real visual content. A 280px bone for 40px of text = 14% — most of the bone is wasted space. Weight 25%.',
  coverage:  'Every visible element (text, image, button) has a bone covering it. Ghost bones (covering empty space) are penalised. Weight 15%.',
  stability: 'Skeleton height ≈ real content height. A mismatch causes a layout shift (CLS) when content loads. Weight 10%.',
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const [showTip, setShowTip] = useState(false);
  const tip = KPI_TOOLTIPS[label];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, position: 'relative' }}>
      <span
        style={{ color: '#71717a', width: 58, flexShrink: 0, cursor: tip ? 'help' : 'default', textDecoration: tip ? 'underline dotted' : 'none' }}
        onMouseEnter={() => tip && setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      >{label}</span>
      {showTip && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
          background: '#09090b', color: '#e4e4e7',
          fontSize: 9, fontFamily: 'monospace', lineHeight: 1.5,
          padding: '5px 8px', borderRadius: 6, width: 210,
          boxShadow: '0 4px 16px rgba(0,0,0,0.6)', zIndex: 99999,
          pointerEvents: 'none',
        }}>{tip}</div>
      )}
      <div style={{ flex: 1, height: 3, borderRadius: 3, background: '#27272a', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', borderRadius: 3, background: scoreColor(value), transition: 'width 0.3s ease' }} />
      </div>
      <span style={{ color: scoreColor(value), fontWeight: 700, width: 28, textAlign: 'right' }}>{value}%</span>
    </div>
  );
}

type DockSide = 'float' | 'left' | 'right';

/* ─── Panel ───────────────────────────────────────────────── */
function Panel({
  open, forceLoading, setForceLoading, xray, setXray,
  highlight, setHighlight, inspectedId, setInspectedId,
  hoveredId, setHoveredId, components, forcedIds, setForcedId, matchScores,
  btnX, btnY, theme, setTheme, dock, setDock,
}: {
  open: boolean;
  forceLoading: boolean; setForceLoading: (v: boolean) => void;
  xray: boolean; setXray: (v: boolean) => void;
  highlight: boolean; setHighlight: (v: boolean) => void;
  inspectedId: string | null; setInspectedId: (id: string | null) => void;
  hoveredId: string | null; setHoveredId: (id: string | null) => void;
  components: Map<string, ComponentInfo>;
  forcedIds: Set<string>;
  setForcedId: (id: string, forced: boolean) => void;
  theme: 'dark' | 'light'; setTheme: (t: 'dark' | 'light') => void;
  matchScores: Map<string, MatchScore>;
  btnX: number; btnY: number;
  dock: DockSide; setDock: (d: DockSide) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const isDocked = dock !== 'float';

  useEffect(() => {
    if (hoveredId) setExpanded(hoveredId);
  }, [hoveredId]);

  if (!open && !isDocked) return null;
  if (isDocked && !open) return null;
  const list = Array.from(components.entries());
  const panelW = isDocked ? 300 : 290;

  const isDark = theme === 'dark';
  const T = {
    bg: isDark ? 'rgba(12,12,14,0.92)' : 'rgba(250,250,252,0.92)',
    text: isDark ? '#a1a1aa' : '#52525b',
    title: isDark ? '#f4f4f5' : '#18181b',
    border: isDark ? '#1f1f23' : '#e4e4e7',
    row: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    rowActive: isDark ? 'rgba(249,115,22,0.10)' : 'rgba(249,115,22,0.08)',
    rowHover: isDark ? 'rgba(14,165,233,0.12)' : 'rgba(14,165,233,0.08)',
    btn: isDark ? '#27272a' : '#e4e4e7',
    btnText: isDark ? '#a1a1aa' : '#52525b',
    mutedScore: isDark ? '#52525b' : '#a1a1aa',
    shadow: isDark ? '0 20px 60px rgba(0,0,0,0.7)' : '0 20px 60px rgba(0,0,0,0.15)',
  };

  const scores = list.map(([id]) => matchScores.get(id)?.total).filter((s): s is number => s !== undefined);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const scoreOn5 = avgScore !== null ? (avgScore / 100 * 5).toFixed(1) : null;
  const globalColor = avgScore !== null ? scoreColor(avgScore) : '#52525b';

  // Docked: full height sidebar
  const dockedStyle = isDocked ? {
    position: 'fixed' as const,
    top: 0, bottom: 0, height: '100vh',
    [dock]: 0,
    width: panelW,
    borderRadius: 0,
    maxHeight: '100vh',
    transform: 'none',
  } : {};

  // Float: panel above button
  const left = Math.min(btnX, window.innerWidth - panelW - 8);
  const floatStyle = !isDocked ? {
    position: 'fixed' as const,
    left, top: btnY - 8, transform: 'translateY(-100%)',
    maxHeight: '70vh', borderRadius: 16,
  } : {};

  return (
    <div style={{
      zIndex: 99998, width: panelW,
      background: T.bg,
      fontFamily: 'monospace', fontSize: 10, color: T.text,
      boxShadow: T.shadow, backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      display: 'flex', flexDirection: 'column',
      ...dockedStyle, ...floatStyle,
    }}>
      {/* Fixed header */}
      <div style={{ padding: '12px 10px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <SkelterIcon />
          <span style={{ fontWeight: 700, color: T.title, fontSize: 13, flex: 1 }}>Skelter DevTools</span>
          {scoreOn5 !== null && (
            <span style={{ fontWeight: 700, color: globalColor, fontSize: 13 }}>
              {scoreOn5}<span style={{ color: T.mutedScore, fontWeight: 400 }}>/5</span>
            </span>
          )}
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: T.text, padding: '0 2px', lineHeight: 1,
          }}>{isDark ? '☀️' : '🌙'}</button>
          {/* Dock controls */}
          <button
            title={dock === 'right' ? 'Dock left' : 'Dock right'}
            onClick={() => setDock(dock === 'right' ? 'left' : 'right')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: T.text, padding: '0 2px' }}
          >{dock === 'right' ? '◧' : '◨'}</button>
          <button
            title={isDocked ? 'Undock' : 'Dock'}
            onClick={() => setDock(isDocked ? 'float' : 'right')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: isDocked ? '#0ea5e9' : T.text, padding: '0 2px' }}
          >{isDocked ? '⊡' : '⊞'}</button>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setForceLoading(!forceLoading)} style={{
            flex: 1, fontSize: 10, padding: '6px 4px', borderRadius: 8, cursor: 'pointer',
            background: forceLoading ? '#f97316' : T.btn, color: forceLoading ? '#fff' : T.btnText,
            border: 'none', fontFamily: 'monospace', fontWeight: 600,
          }}>{forceLoading ? '⏸ data' : '▶ force'}</button>
          <button onClick={() => setXray(!xray)} style={{
            flex: 1, fontSize: 10, padding: '6px 4px', borderRadius: 8, cursor: 'pointer',
            background: xray ? '#6366f1' : T.btn, color: xray ? '#fff' : T.btnText,
            border: 'none', fontFamily: 'monospace', fontWeight: 600,
          }}>{xray ? '✕ x-ray' : '⊡ x-ray'}</button>
          <button onClick={() => { setHighlight(!highlight); if (highlight) setInspectedId(null); }} style={{
            flex: 1, fontSize: 10, padding: '6px 4px', borderRadius: 8, cursor: 'pointer',
            background: highlight ? '#0ea5e9' : T.btn, color: highlight ? '#fff' : T.btnText,
            border: 'none', fontFamily: 'monospace', fontWeight: 600,
          }}>{highlight ? '✕ scores' : '◎ scores'}</button>
        </div>

        <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 10 }} />
      </div>

      {/* Scrollable list */}
      <div style={{ overflowY: 'auto', padding: '0 10px 10px' }}>
        {list.length === 0 ? (
          <p style={{ color: T.mutedScore, margin: 0 }}>No components mounted.</p>
        ) : (
          list.map(([id, info]) => {
            const isForced = forcedIds.has(id);
            const score = matchScores.get(id);
            const isExpanded = expanded === id;
            const isHoveredItem = hoveredId === id;
            const isInspectedItem = inspectedId === id;
            return (
              <div key={id} style={{ marginBottom: 3 }}
                onMouseEnter={() => setHoveredId(id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div style={{
                  padding: '5px 7px', borderRadius: isExpanded ? '8px 8px 0 0' : 8,
                  background: isHoveredItem ? T.rowHover : (info.isLoading || isForced) ? T.rowActive : T.row,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  outline: isInspectedItem ? '1px solid rgba(99,102,241,0.5)' : 'none',
                  cursor: 'default',
                }}>
                  <span style={{ color: T.title, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {info.displayName}
                  </span>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                    {score !== undefined && (
                      <span style={{
                        fontSize: 9, padding: '2px 5px', borderRadius: 20,
                        background: scoreColor(score.total), color: '#fff', fontWeight: 700, cursor: 'pointer',
                        boxShadow: isInspectedItem ? '0 0 0 2px #fff' : 'none',
                      }}
                        onClick={() => { setExpanded(isExpanded ? null : id); setInspectedId(isInspectedItem ? null : id); }}
                      >{score.total}% {isExpanded ? '▲' : '▼'}</span>
                    )}
                    <span onClick={() => setForcedId(id, !isForced)} style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 20, cursor: 'pointer',
                      background: isForced ? '#f97316' : T.btn, color: isForced ? '#fff' : T.btnText,
                    }}>{isForced ? '⏹' : '▶'}</span>
                  </div>
                </div>
                <div style={{ padding: '2px 7px 4px', background: T.row, borderRadius: isExpanded ? 0 : '0 0 8px 8px', color: T.text, display: 'flex', gap: 8 }}>
                  <span>anim: <span style={{ color: T.title }}>{info.animation}</span></span>
                  <span>bones: <span style={{ color: T.title }}>{info.bonesCount}</span></span>
                </div>
                {isExpanded && score && (
                  <div style={{ padding: '8px 8px 6px', borderRadius: '0 0 8px 8px', background: 'rgba(99,102,241,0.07)' }}>
                    <ScoreBar label="fidelity" value={score.fidelity} />
                    <ScoreBar label="waste" value={score.waste} />
                    <ScoreBar label="coverage" value={score.coverage} />
                    <ScoreBar label="stability" value={score.stability} />
                    {(score.missedElements > 0 || score.ghostBones > 0) && (
                      <div style={{ marginTop: 5, display: 'flex', gap: 8 }}>
                        {score.missedElements > 0 && (
                          <span style={{ fontSize: 8, color: '#ef4444', fontWeight: 600 }}>
                            {score.missedElements} uncovered element{score.missedElements > 1 ? 's' : ''}
                          </span>
                        )}
                        {score.ghostBones > 0 && (
                          <span style={{ fontSize: 8, color: '#f59e0b', fontWeight: 600 }}>
                            {score.ghostBones} ghost bone{score.ghostBones > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ marginTop: 4, color: T.mutedScore, fontSize: 9, lineHeight: 1.5 }}>
                      fidelity ×0.5 · waste ×0.25 · coverage ×0.15 · stability ×0.1
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─── Trigger ─────────────────────────────────────────────── */
export function SkeletonDevTools({ children }: { children?: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') {
    return <>{children}</>;
  }
  const [forceLoading, setForceLoading] = useState(false);
  const [xray, setXray] = useState(false);
  const [highlight, setHighlight] = useState(true);
  const [showWaste, setShowWaste] = useState(false);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [dock, setDock] = useState<DockSide>('float');

  // Push page content when docked — body margin so the page isn't hidden behind the panel
  useEffect(() => {
    const PANEL_W = 300;
    if (dock === 'right') {
      document.body.style.marginRight = `${PANEL_W}px`;
      document.body.style.marginLeft = '';
    } else if (dock === 'left') {
      document.body.style.marginLeft = `${PANEL_W}px`;
      document.body.style.marginRight = '';
    } else {
      document.body.style.marginRight = '';
      document.body.style.marginLeft = '';
    }
    return () => {
      document.body.style.marginRight = '';
      document.body.style.marginLeft = '';
    };
  }, [dock]);
  const [pos, setPos] = useState({ x: -1, y: -1 });
  type ThrowPhase = 'hidden' | 'center' | 'arc' | 'land' | 'bounce' | 'done';
  const [throwPhase, setThrowPhase] = useState<ThrowPhase>('hidden');
  const componentsRef = useRef<Map<string, ComponentInfo>>(new Map());
  const forcedIdsRef = useRef<Set<string>>(new Set());
  const matchScoresRef = useRef<Map<string, MatchScore>>(new Map());
  const [tick, forceRender] = useState(0);

  // Throw animation on mount
  useEffect(() => {
    const finalX = window.innerWidth - BTN_SIZE - 16;
    const finalY = window.innerHeight - BTN_SIZE - 16;
    // arc = midpoint between center and target, shifted upward
    const arcX = (window.innerWidth / 2 + finalX) / 2 - 40;
    const arcY = Math.min(window.innerHeight / 2, finalY) - 120;

    setPos({ x: window.innerWidth / 2 - BTN_SIZE / 2, y: window.innerHeight / 2 - BTN_SIZE / 2 });
    setThrowPhase('center');

    const t1 = setTimeout(() => setThrowPhase('arc'), 600);
    const t2 = setTimeout(() => { setPos({ x: arcX, y: arcY }); }, 620);
    const t3 = setTimeout(() => { setPos({ x: finalX + 6, y: finalY - 6 }); setThrowPhase('land'); }, 900);
    const t4 = setTimeout(() => { setPos({ x: finalX, y: finalY }); setThrowPhase('bounce'); }, 1150);
    const t5 = setTimeout(() => setThrowPhase('done'), 1350);
    return () => [t1,t2,t3,t4,t5].forEach(clearTimeout);
  }, []);

  // Drag
  const dragging = useRef(false);
  const hasMoved = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    hasMoved.current = false;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      hasMoved.current = true;
      const x = Math.min(Math.max(0, e.clientX - dragOffset.current.x), window.innerWidth - BTN_SIZE);
      const y = Math.min(Math.max(0, e.clientY - dragOffset.current.y), window.innerHeight - BTN_SIZE);
      setPos({ x, y });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

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

  const ctx = useMemo(() => ({
    enabled: true,
    forceLoading, setForceLoading,
    xray, setXray,
    highlight, setHighlight,
    showWaste, setShowWaste,
    inspectedId, setInspectedId,
    hoveredId, setHoveredId,
    forcedIds: forcedIdsRef.current,
    setForcedId,
    matchScores: matchScoresRef.current,
    setMatchScore,
    components: componentsRef.current,
    registerComponent,
    unregisterComponent,
  }), [tick, forceLoading, xray, highlight, inspectedId, hoveredId, setForcedId, setMatchScore, registerComponent, unregisterComponent]);

  const count = componentsRef.current.size;

  if (pos.x === -1) return <DevToolsContext.Provider value={ctx}>{children}</DevToolsContext.Provider>;

  const isAnimating = throwPhase !== 'done';
  const btnScale = throwPhase === 'center' ? 1.7
    : throwPhase === 'arc' ? 1.2
    : throwPhase === 'land' ? 0.85
    : throwPhase === 'bounce' ? 1.05
    : 1;
  const btnTransition = throwPhase === 'center' ? 'opacity 0.3s ease, transform 0.3s ease'
    : throwPhase === 'arc' ? 'left 0.28s cubic-bezier(0.4,0,0.6,1), top 0.28s cubic-bezier(0.4,0,0.6,1), transform 0.28s ease'
    : throwPhase === 'land' ? 'left 0.25s cubic-bezier(0.2,0.8,0.4,1), top 0.25s cubic-bezier(0.2,0.8,0.4,1), transform 0.2s ease'
    : throwPhase === 'bounce' ? 'all 0.2s cubic-bezier(0.34,1.6,0.64,1)'
    : 'none';

  return (
    <DevToolsContext.Provider value={ctx}>
      {children}

      {/* Floating button */}
      <button
        onMouseDown={isAnimating ? undefined : onMouseDown}
        onClick={() => { if (!hasMoved.current && !isAnimating) setOpen(o => !o); }}
        title="Skelter DevTools"
        style={{
          position: 'fixed', left: pos.x, top: pos.y, zIndex: 99999,
          width: BTN_SIZE, height: BTN_SIZE, borderRadius: '50%',
          border: 'none', cursor: isAnimating ? 'default' : 'grab',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: forceLoading ? '#f97316' : open ? '#27272a' : '#18181b',
          boxShadow: throwPhase === 'center' ? '0 0 40px rgba(249,115,22,0.5)' : '0 4px 24px rgba(0,0,0,0.6)',
          userSelect: 'none',
          transform: `scale(${btnScale})`,
          transition: btnTransition,
          opacity: throwPhase === 'hidden' ? 0 : 1,
        }}
      >
        <SkelterIcon />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            background: '#f97316', color: '#fff',
            borderRadius: '50%', width: 18, height: 18,
            fontSize: 9, fontWeight: 700, fontFamily: 'monospace',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
          }}>{count}</span>
        )}
      </button>

      <Panel
        open={open}
        forceLoading={forceLoading} setForceLoading={setForceLoading}
        xray={xray} setXray={setXray}
        highlight={highlight} setHighlight={setHighlight}
        inspectedId={inspectedId} setInspectedId={setInspectedId}
        hoveredId={hoveredId} setHoveredId={setHoveredId}
        components={componentsRef.current}
        forcedIds={forcedIdsRef.current}
        setForcedId={setForcedId}
        matchScores={matchScoresRef.current}
        btnX={pos.x} btnY={pos.y}
        theme={theme} setTheme={setTheme}
        dock={dock} setDock={setDock}
      />
    </DevToolsContext.Provider>
  );
}

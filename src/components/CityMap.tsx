import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import {
  Zap, Plus, Minus, RotateCcw, Route,
  ArrowBigUp, ArrowBigLeft, ArrowBigRight, ArrowBigDown,
  Dot, MapPin, AlertTriangle, X, Search,
  AlertCircle, User, Phone, Home, Tag, CheckCircle2,
} from "lucide-react";
import { mapDataRaw } from '../constant/map_content';
import type { CityRecord, MapData, NodeData, OutageRecord, OutageRoute } from 'outage-tracker';

// ─── Palette ──────────────────────────────────────────────────────────────────
// Confirmed single palette used everywhere across the component:
//   Map bg       #f2ede6
//   Surface      #ffffff / #f8fafc
//   Border       #e2e8f0
//   Text hi      #0f172a
//   Text mid     #64748b
//   Text lo      #94a3b8
//   Accent red   #dc2626  (source / critical)
//   Accent blue  #1d4ed8  (route / active)
//   Accent green #16a34a  (dest / ok)
//   Orange       #ea580c  (high priority)

/* Graph Configurations */
const mapData = mapDataRaw as MapData;
const SOURCE_NODE_ID = "eb_65";
const PADDING = 90;
const R_BASE = 6;
const R_SOURCE = 12;
const R_DEST = 10;
const R_PATH = 8;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 8;
const ZOOM_STEP = 1.15;
const PAN_STEP = 60;

// ─── Dummy user data (replace search body with AVL tree later) ────────────────

const DUMMY_USERS: CityRecord[] = [
  { name: "Amal Perera", city: "Nebula Heights", address: "14 Lake Drive", phone: "0771234567", category: "Infrastructure" },
  { name: "Nimal Silva", city: "Nebula Heights", address: "8 Garden Rd", phone: "0779876543", category: "Person" },
  { name: "Kamal Fernando", city: "Nebula Heights", address: "22 Main St", phone: "0712345678", category: "Infrastructure" },
  { name: "Sunethra Jayawardena", city: "Nebula Heights", address: "5 Park Lane", phone: "0754321987", category: "Person" },
  { name: "Thilini Rathnayake", city: "Nebula Heights", address: "3 River View", phone: "0761112233", category: "Infrastructure" },
  { name: "Chamara Bandara", city: "Nebula Heights", address: "17 Hill Top", phone: "0702223344", category: "Person" },
  { name: "Dilshan Wickrama", city: "Nebula Heights", address: "9 Temple Rd", phone: "0783334455", category: "Infrastructure" },
  { name: "Randika Herath", city: "Nebula Heights", address: "45 Station Rd", phone: "0714445566", category: "Person" },
  { name: "Priyanka Mendis", city: "Nebula Heights", address: "2 Lotus Ave", phone: "0725556677", category: "Infrastructure" },
  { name: "Lasith Gunawardena", city: "Nebula Heights", address: "31 Orchid Blvd", phone: "0736667788", category: "Person" },
];

/**
 * Search users by phone number.
 * AVL-tree-ready: replace the body of this function with your AVL search.
 * Receives the raw input string; returns a (possibly empty) CityRecord array.
 */
const searchUsers = (input: string): CityRecord[] => {
  const q = input.trim();
  if (!q) return [];
  // ── swap this block with AVL tree lookup ─────────────────────────────────
  return DUMMY_USERS.filter((u) => u.phone.includes(q));
  // ─────────────────────────────────────────────────────────────────────────
};

const DUMMY_OUTAGE_ROUTES: OutageRoute[] = [
  { id: "r1", label: "Node 82 — Nedungamuwa", nodePath: "65, 89, 25, 88", distance: "14.2", sector: "Sector A" },
  { id: "r2", label: "Node 27 — Habarakada", nodePath: "65, 89, 35, 40, 49, 28, 27", distance: "19.7", sector: "Sector B" },
];

/* Helper Methods */

const toNodeId = (n: number): string => {
  return n === 65 ? "eb_65" : `node_${n}`;
}

const nodeLabel = (id: string): string => {
  return id === "eb_65" ? "65" : id.replace("node_", "");
}

const edgeKey = (a: string, b: string): string => {
  return a < b ? `${a}¦${b}` : `${b}¦${a}`;
}

const parsePath = (raw: string): string[] => {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const n = parseInt(s, 10);
      return Number.isFinite(n) ? toNodeId(n) : null;
    })
    .filter((id): id is string => id !== null);
}

const priorityColor = (p: number): { bg: string; border: string; text: string; badge: string } => {
  if (p >= 8) return { bg: "#fff1f2", border: "#fecaca", text: "#dc2626", badge: "#dc2626" };
  if (p >= 5) return { bg: "#fff7ed", border: "#fed7aa", text: "#ea580c", badge: "#f97316" };
  return { bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a", badge: "#22c55e" };
};

/* Component */

const CityMap = () => {

  /* Inject animation keyframes once */
  useEffect(() => {
    const ID = "city-map-styles";
    if (document.getElementById(ID)) return;
    const s = document.createElement("style");
    s.id = ID;
    s.textContent = `
      @keyframes cmFlow {
        from { stroke-dashoffset: 24; }
        to   { stroke-dashoffset: 0; }
      }
      .cm-flow { stroke-dasharray: 8 4; animation: cmFlow 0.5s linear infinite; }
      @keyframes cmPulse {
        0%, 100% { opacity: 0.25; }
        50%       { opacity: 0.6; }
      }
      .cm-pulse { animation: cmPulse 2s ease-in-out infinite; }
      @keyframes slideUp {
        from { transform: translateY(40px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
      .outage-slide-up { animation: slideUp 0.45s cubic-bezier(0.22,1,0.36,1) both; }
      @keyframes fadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      .fade-in { animation: fadeIn 0.2s ease both; }
      @keyframes scaleIn {
        from { transform: scale(0.94); opacity: 0; }
        to   { transform: scale(1);    opacity: 1; }
      }
      .scale-in { animation: scaleIn 0.25s cubic-bezier(0.22,1,0.36,1) both; }
      @keyframes routeSlideIn {
        from { transform: translateY(-12px); opacity: 0; }
        to   { transform: translateY(0);     opacity: 1; }
      }
      .route-slide-in { animation: routeSlideIn 0.3s cubic-bezier(0.22,1,0.36,1) both; }
    `;
    document.head.appendChild(s);
    return () => { document.getElementById(ID)?.remove(); };
  }, []);

  /* Pan / Zoom */
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const panHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panHoldInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Map UI */
  const [activePath, setActivePath] = useState<string[]>([]);
  const [activeDistance, setActiveDistance] = useState<string>("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  /* Outage modal state */
  const [outageModalOpen, setOutageModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"report" | "list">("report");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [searchResults, setSearchResults] = useState<CityRecord[]>([]);
  const [outages, setOutages] = useState<OutageRecord[]>([]);

  /* Priority modal state */
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [pendingUser, setPendingUser] = useState<CityRecord | null>(null);
  const [priorityLevel, setPriorityLevel] = useState<number>(5);

  /* Search handler */
  const handlePhoneSearch = useCallback((val: string) => {
    setPhoneSearch(val);
    setSearchResults(searchUsers(val));
  }, []);

  /* Open priority modal for a user */
  const handleReportOutageClick = useCallback((user: CityRecord) => {
    setPendingUser(user);
    setPriorityLevel(5);
    setPriorityModalOpen(true);
  }, []);

  /* Confirm outage with priority */
  const handleConfirmOutage = useCallback(() => {
    if (!pendingUser) return;
    const newOutage: OutageRecord = {
      id: pendingUser.phone,
      priority: priorityLevel,
      user: pendingUser,
      timestamp: Date.now(),
      isNew: true,
    };

    setOutages((prev) => {
      const filtered = prev.filter((o) => o.id !== newOutage.id);
      const merged = [newOutage, ...filtered].sort((a, b) => b.priority - a.priority);
      return merged;
    });

    setPriorityModalOpen(false);
    setPendingUser(null);
    setPhoneSearch("");
    setSearchResults([]);
    setActiveTab("list");

    setTimeout(() => {
      setOutages((prev) =>
        prev.map((o) => (o.id === newOutage.id ? { ...o, isNew: false } : o))
      );
    }, 600);

  }, [pendingUser, priorityLevel]);

  /* Keyboard: arrow-key panning + +/- zoom */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as Element).closest("input, textarea")) return;

      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setScale((s) => Math.min(ZOOM_MAX, s * ZOOM_STEP));
        return;
      }

      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setScale((s) => Math.max(ZOOM_MIN, s / ZOOM_STEP));
        return;
      }

      const dirs: Record<string, { dx: number; dy: number }> = {
        ArrowUp: { dx: 0, dy: PAN_STEP },
        ArrowDown: { dx: 0, dy: -PAN_STEP },
        ArrowLeft: { dx: PAN_STEP, dy: 0 },
        ArrowRight: { dx: -PAN_STEP, dy: 0 },
      };

      const d = dirs[e.key];
      if (!d) return;
      e.preventDefault();
      setPan((p) => ({ x: p.x + d.dx, y: p.y + d.dy }));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); };
  }, []);

  /* Wheel zoom (non-passive) */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) { return };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) =>
        Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s * (e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP)))
      );
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => { el.removeEventListener("wheel", onWheel); };
  }, []);

  /* Precomputed map bounds */
  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of mapData.nodes) {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x;
      if (n.y > maxY) maxY = n.y;
    }
    return {
      minX: minX - PADDING,
      minY: minY - PADDING,
      w: maxX - minX + PADDING * 2,
      h: maxY - minY + PADDING * 2,
    };
  }, []);

  const nodeMap = useMemo(() => {
    const m = new Map<string, NodeData>();
    for (const n of mapData.nodes) m.set(n.id, n);
    return m;
  }, []);

  /* Derived active sets from path */
  const { activeEdgeKeys, activeNodeSet, destId, directedActiveEdges } = useMemo(() => {
    const activeEdgeKeys = new Set<string>();
    const activeNodeSet = new Set<string>(activePath);
    const directedActiveEdges = new Map<string, { fromId: string; toId: string }>();

    for (let i = 0; i < activePath.length - 1; i++) {
      const key = edgeKey(activePath[i], activePath[i + 1]);
      activeEdgeKeys.add(key);
      directedActiveEdges.set(key, { fromId: activePath[i], toId: activePath[i + 1] });
    }

    return {
      activeEdgeKeys,
      activeNodeSet,
      destId: activePath.length > 1 ? activePath.at(-1)! : null,
      directedActiveEdges,
    };
  }, [activePath]);

  /* Route activation from side-panel button */
  const handleRouteFromOutage = useCallback((route: OutageRoute) => {
    const parsed = parsePath(route.nodePath);
    if (parsed.length >= 2) {
      setActivePath(parsed);
      setActiveDistance(route.distance);
    }
  }, []);

  const handleClearRoute = useCallback(() => {
    setActivePath([]);
    setActiveDistance("");
  }, []);

  /* Arrow functions for zoom / reset */
  const zoomIn = () => setScale((s) => Math.min(ZOOM_MAX, s * ZOOM_STEP));
  const zoomOut = () => setScale((s) => Math.max(ZOOM_MIN, s / ZOOM_STEP));
  const resetView = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  /* Hold-to-pan */
  const stopContinuousPan = useCallback(() => {
    if (panHoldTimer.current) { clearTimeout(panHoldTimer.current); panHoldTimer.current = null; }
    if (panHoldInterval.current) { clearInterval(panHoldInterval.current); panHoldInterval.current = null; }
  }, []);

  const startContinuousPan = useCallback((dx: number, dy: number) => {
    stopContinuousPan();
    const step = () => setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    step();
    panHoldTimer.current = setTimeout(() => {
      panHoldInterval.current = setInterval(step, 40);
    }, 350);
  }, [stopContinuousPan]);

  const showWeightLabels = scale > 0.65;

  /* Render */

  return (
    <div
      className="relative flex h-screen overflow-hidden select-none"
      style={{ background: "#f2ede6", fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* District label — top-left */}
      <div
        className="absolute top-5 left-5 pointer-events-none bg-white z-50 px-3 py-2 rounded-lg"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)", border: "1px solid #e2e8f0" }}
      >
        <div style={{ color: "#0f172a", fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          {mapData.metadata.district}
        </div>
        <div className="flex gap-x-1 items-center justify-start" style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
          <span>{mapData.metadata.node_count} Cities</span>
          <Dot size={18} strokeWidth={4} />
          <span>{mapData.metadata.edge_count} Roads</span>
        </div>
      </div>

      {/* ══════════════════════════ MAP CANVAS ══════════════════════════ */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">

        {/* Blueprint grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(160,148,132,0.22) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(160,148,132,0.22) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            backgroundPosition: `${pan.x % 48}px ${pan.y % 48}px`,
          }}
        />

        {/* ── SVG Map ── */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`${bounds.minX} ${bounds.minY} ${bounds.w} ${bounds.h}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "50% 50%",
          }}
        >
          <defs>
            <filter id="glow-blue" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="7" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-green" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* ── Edges ── */}
          {mapData.edges.map((edge, i) => {
            const s = nodeMap.get(edge.source);
            const t = nodeMap.get(edge.target);
            if (!s || !t) return null;
            const key = edgeKey(edge.source, edge.target);
            const isAct = activeEdgeKeys.has(key);

            let x1 = s.x, y1 = s.y, x2 = t.x, y2 = t.y;
            if (isAct) {
              const dir = directedActiveEdges.get(key);
              if (dir) {
                const fromNode = nodeMap.get(dir.fromId);
                const toNode = nodeMap.get(dir.toId);
                if (fromNode && toNode) { x1 = fromNode.x; y1 = fromNode.y; x2 = toNode.x; y2 = toNode.y; }
              }
            }
            const mx = (s.x + t.x) / 2;
            const my = (s.y + t.y) / 2;

            return (
              <g key={i}>
                {isAct && (
                  <line x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#93c5fd" strokeWidth={10} strokeOpacity={0.2} strokeLinecap="round" />
                )}
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={isAct ? "#1d4ed8" : "#c8bfb4"}
                  strokeWidth={isAct ? 2.5 : 1.4}
                  strokeOpacity={isAct ? 1 : 0.7}
                  strokeLinecap="round"
                  className={isAct ? "cm-flow" : undefined}
                />
                {showWeightLabels && (
                  <text
                    x={mx} y={my - 5} textAnchor="middle"
                    fontSize={isAct ? 9 : 7.5}
                    fill={isAct ? "#1d4ed8" : "#a09890"}
                    fontFamily="monospace"
                    stroke="#f2ede6" strokeWidth={3}
                    className="tracking-widest"
                    paintOrder="stroke"
                    opacity={isAct ? 1 : 0.9}
                  >
                    {edge.weight}km
                  </text>
                )}
              </g>
            );
          })}

          {/* ── Nodes ── */}
          {mapData.nodes.map((node) => {
            const isSource = node.id === SOURCE_NODE_ID;
            const isDest = node.id === destId;
            const isActive = activeNodeSet.has(node.id);
            const isHovered = hoveredId === node.id;

            let r = R_BASE, fill = "#e8e2db", stroke = "#b5ada6", sw = 1.2;
            let filt: string | undefined;

            if (isSource) { r = R_SOURCE; fill = "#fff1f2"; stroke = "#dc2626"; sw = 2.5; filt = "url(#glow-red)"; }
            else if (isDest) { r = R_DEST; fill = "#f0fdf4"; stroke = "#16a34a"; sw = 2; filt = "url(#glow-green)"; }
            else if (isActive) { r = R_PATH; fill = "#eff6ff"; stroke = "#1d4ed8"; sw = 2; filt = "url(#glow-blue)"; }
            else if (isHovered) { r = R_BASE + 2; fill = "#eff6ff"; stroke = "#60a5fa"; sw = 1.5; }

            const ringColor = isSource ? "#dc2626" : isDest ? "#16a34a" : "#3b82f6";

            return (
              <g
                key={node.id}
                data-node="true"
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: "pointer" }}
              >
                {(isSource || isDest || isActive) && (
                  <circle
                    cx={node.x} cy={node.y} r={r + 6}
                    fill="none" stroke={ringColor} strokeWidth={1.2} strokeOpacity={0.3}
                    className={isSource ? "cm-pulse" : undefined}
                  />
                )}
                <circle cx={node.x} cy={node.y} r={r}
                  fill={fill} stroke={stroke} strokeWidth={sw} filter={filt} />
                {isSource && (
                  <text x={node.x} y={node.y + 1}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={10} fill="#dc2626">
                    ⚡
                  </text>
                )}
                {isDest && !isSource && (
                  <circle cx={node.x} cy={node.y} r={2.5} fill="#16a34a" />
                )}
                <text
                  x={node.x} y={node.y + r + 10}
                  textAnchor="middle" fontSize={7}
                  fill={
                    isSource ? "#dc2626" :
                      isDest ? "#16a34a" :
                        isActive ? "#1d4ed8" :
                          isHovered ? "#3b82f6" : "#b0a49a"
                  }
                  fontFamily="monospace"
                  stroke="#f2ede6" strokeWidth={2.5} paintOrder="stroke"
                >
                  {nodeLabel(node.id)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Shortest Route overlay — top-right of the map canvas Appears
            when a route is active. Minimal, professional design. */}
        {activePath.length > 1 && (
          <div
            className="absolute top-5 right-5 route-slide-in"
            style={{
              width: 300,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              boxShadow: "0 8px 28px rgba(15,23,42,0.10)",
              overflow: "hidden",
              zIndex: 30,
            }}
          >
            {/* Header row */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}
            >
              <div className="flex items-center gap-2">
                <Route size={15} style={{ color: "#1d4ed8" }} />
                <span style={{
                  fontSize: 11, fontWeight: 700, color: "#0f172a",
                  letterSpacing: "0.18em", textTransform: "uppercase",
                }}>
                  Active Route
                </span>
              </div>
              <button
                onClick={handleClearRoute}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#94a3b8", display: "flex", alignItems: "center",
                  padding: "3px 4px", borderRadius: 6,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.background = "#fff1f2"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "none"; }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Distance */}
            {activeDistance && (
              <div className="px-4 pt-3">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ background: "#f8fafc", border: "1px solid #1d4ed8" }}
                >
                  <MapPin size={11} style={{ color: "#1d4ed8" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1d4ed8" }}>{activeDistance}</span>
                  <span style={{ fontSize: 11, color: "#1d4ed8" }}>km</span>
                </div>
              </div>
            )}

            {/* Node chips */}
            <div className="flex flex-wrap items-center gap-1 gap-y-2 px-4 py-3">
              {activePath.map((id, i) => {
                const isFirst = i === 0;
                const isLast = i === activePath.length - 1;
                return (
                  <React.Fragment key={id}>
                    <span
                      className="inline-flex items-center px-2 py-1 rounded"
                      style={{
                        fontSize: 12, fontWeight: 700, fontFamily: "monospace",
                        background: isFirst ? "#fff1f2" : isLast ? "#f0fdf4" : "#f1f5f9",
                        color: isFirst ? "#dc2626" : isLast ? "#16a34a" : "#475569",
                        border: `1px solid ${isFirst ? "#fecaca" : isLast ? "#bbf7d0" : "#e2e8f0"}`,
                      }}
                    >
                      &#91;{nodeLabel(id)}&#93; {nodeMap.get(id)?.name}
                    </span>
                    {!isLast && (
                      <span style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1 }}>›</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Footer summary */}
            <div
              className="px-4 py-2.5"
              style={{ borderTop: "1px solid #f1f5f9", background: "#f8fafc" }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>
                {activePath.length - 1} HOP{activePath.length !== 2 ? "S" : ""}
              </span>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>
                {" TO "}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>
                {" "}{nodeMap.get(activePath.at(-1)!)?.name ?? nodeLabel(activePath.at(-1)!)}
              </span>
              <span style={{ fontSize: 12, color: "#94a3b8" }}> FROM
                {" "}<span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>CEB</span>
              </span>
            </div>
          </div>
        )}

        {/* ── Zoom controls (bottom-left) ── */}
        <div className="absolute bottom-6 left-5 flex flex-col gap-1.5">
          {([
            { icon: <Plus className="w-3.5 h-3.5" />, action: zoomIn },
            { icon: <Minus className="w-3.5 h-3.5" />, action: zoomOut },
            { icon: <RotateCcw className="w-3.5 h-3.5" />, action: resetView },
          ] as const).map(({ icon, action }, i) => (
            <button
              key={i}
              onClick={action}
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-all"
              style={{ background: "#ffffff", border: "1px solid #e2e8f0", color: "#64748b", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#93c5fd"; e.currentTarget.style.color = "#1d4ed8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* ── D-pad pan controls (bottom-right) ── */}
        <div
          className="absolute bottom-6 right-5"
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 36px)", gridTemplateRows: "repeat(3, 36px)", gap: 3 }}
        >
          {([
            null,
            { LabelIcon: ArrowBigUp, dx: 0, dy: PAN_STEP, title: "Pan up" },
            null,
            { LabelIcon: ArrowBigLeft, dx: PAN_STEP, dy: 0, title: "Pan left" },
            null,
            { LabelIcon: ArrowBigRight, dx: -PAN_STEP, dy: 0, title: "Pan right" },
            null,
            { LabelIcon: ArrowBigDown, dx: 0, dy: -PAN_STEP, title: "Pan down" },
            null,
          ] as const).map((btn, i) => {
            if (!btn) return <div key={i} />;
            const { LabelIcon, dx, dy, title } = btn;
            return (
              <button
                key={i}
                title={title}
                onMouseDown={() => startContinuousPan(dx, dy)}
                onMouseUp={stopContinuousPan}
                onMouseLeave={(e) => {
                  stopContinuousPan();
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.color = "#64748b";
                }}
                className="flex items-center justify-center rounded-lg transition-all"
                style={{ background: "#ffffff", border: "1px solid #e2e8f0", color: "#64748b", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", lineHeight: 1 }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#eff6ff";
                  e.currentTarget.style.borderColor = "#93c5fd";
                  e.currentTarget.style.color = "#1d4ed8";
                }}
              >
                <LabelIcon size={18} strokeWidth={1.5} />
              </button>
            );
          })}
        </div>

        {/* Floating Action Bar — bottom-centre
            Two segments, pill-shaped. The Outage Manager button is always
            visually actionable; the count badge is large and unmissable. */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-stretch rounded-2xl overflow-hidden"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 6px 24px rgba(15,23,42,0.11)",
            zIndex: 40,
          }}
        >
          {/* Left — district name */}
          <div
            className="flex items-center gap-2 px-5 py-3"
            style={{ borderRight: "1px solid #e2e8f0" }}
          >
            <MapPin size={13} style={{ color: "#94a3b8" }} />
            <span style={{
              fontSize: 11, fontWeight: 700,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: "#0f172a", whiteSpace: "nowrap",
            }}>
              {mapData.metadata.district}
            </span>
          </div>

          {/* Right — Outage Manager */}
          <button
            onClick={() => { setOutageModalOpen(true); setActiveTab("report"); }}
            className="flex items-center gap-3 px-5 py-3 transition-all"
            style={{
              background: outages.length > 0 ? "#dc2626" : "#f8fafc",
              color: outages.length > 0 ? "#ffffff" : "#475569",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = outages.length > 0 ? "#b91c1c" : "#fee2e2";
              e.currentTarget.style.color = outages.length > 0 ? "#ffffff" : "#dc2626";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = outages.length > 0 ? "#dc2626" : "#f8fafc";
              e.currentTarget.style.color = outages.length > 0 ? "#ffffff" : "#475569";
            }}
          >
            <AlertTriangle size={15} strokeWidth={2.5} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
              Outage Manager
            </span>

            {/* Large, high-contrast count badge */}
            {outages.length > 0 ? (
              <span
                style={{
                  background: "#ffffff",
                  color: "#dc2626",
                  fontSize: 14,
                  fontWeight: 800,
                  minWidth: 28,
                  height: 28,
                  borderRadius: 999,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 8px",
                  lineHeight: 1,
                  boxShadow: "0 0 0 2.5px rgba(220,38,38,0.4)",
                }}
              >
                {outages.length}
              </span>
            ) : (
              /* Subtle dot to signal the button is interactive even with 0 outages */
              <span
                style={{
                  width: 7, height: 7, borderRadius: 999,
                  background: "#94a3b8",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
            )}
          </button>
        </div>

        {/* Hover tooltip */}
        {hoveredId && (
          <div
            className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-lg text-xs pointer-events-none"
            style={{ background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background:
                  hoveredId === SOURCE_NODE_ID ? "#dc2626" :
                    hoveredId === destId ? "#16a34a" :
                      activeNodeSet.has(hoveredId) ? "#1d4ed8" : "#94a3b8",
              }}
            />
            Node {nodeLabel(hoveredId)}
            {nodeMap.get(hoveredId)?.name && (
              <span style={{ color: "#94a3b8" }}>— {nodeMap.get(hoveredId)!.name}</span>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════ RIGHT PANEL ══════════════════════════ */}
      <div
        className="w-80 flex flex-col overflow-y-auto"
        style={{ background: "#ffffff", borderLeft: "1px solid #e2e8f0" }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "#fff1f2", border: "1px solid #fecaca" }}
          >
            <Zap className="w-5 h-5" style={{ color: "#dc2626" }} />
          </div>
          <div>
            <div style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>Power Outage Map</div>
            <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 1 }}>Dijkstra Pathfinder</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 p-5">

          {/* Section label */}
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.18em" }}>
            Outage Routes
          </div>

          {/* Route cards */}
          <div className="flex flex-col gap-2" style={{ marginTop: -6 }}>
            {DUMMY_OUTAGE_ROUTES.map((route) => {
              const isActive = activePath.length > 1 && parsePath(route.nodePath).join() === activePath.join();
              return (
                <div
                  key={route.id}
                  className="rounded-xl p-3.5 flex flex-col gap-2.5"
                  style={{
                    background: isActive ? "#eff6ff" : "#f8fafc",
                    border: `1px solid ${isActive ? "#bfdbfe" : "#e2e8f0"}`,
                    transition: "all 0.2s",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.14em" }}>
                      {route.sector}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                      {route.label}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5" style={{ fontSize: 11, color: "#64748b" }}>
                      <MapPin size={11} style={{ color: "#94a3b8" }} />
                      <span>{route.distance} km</span>
                      <span style={{ color: "#e2e8f0" }}>·</span>
                      <span style={{ fontFamily: "monospace", color: "#94a3b8", fontSize: 10 }}>{route.nodePath}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRouteFromOutage(route)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all"
                      style={{
                        background: isActive ? "#1d4ed8" : "#0f172a",
                        color: "#fff", border: "none", cursor: "pointer",
                        fontSize: 11, fontWeight: 700,
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        fontFamily: "inherit",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#1e40af"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? "#1d4ed8" : "#0f172a"; }}
                    >
                      <Route size={12} />
                      Get Route
                    </button>
                    {isActive && (
                      <button
                        onClick={handleClearRoute}
                        className="flex items-center justify-center px-2.5 py-2 rounded-lg transition-all"
                        style={{ background: "#fff1f2", color: "#dc2626", border: "1px solid #fecaca", cursor: "pointer" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#fecaca"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#fff1f2"; }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* All-clear banner — shown when no outages have been reported */}
          {outages.length === 0 && (
            <div
              className="rounded-xl p-5 flex flex-col items-center gap-3 text-center"
              style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "#dcfce7", border: "1.5px solid #86efac" }}
              >
                <CheckCircle2 size={18} style={{ color: "#16a34a" }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#15803d" }}>All Systems Normal</div>
                <div style={{ fontSize: 10, color: "#4ade80", marginTop: 3 }}>
                  No outages reported in this district
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div
          className="px-5 py-4 flex flex-col gap-2"
          style={{ borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}
        >
          <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 4 }}>
            Legend
          </div>
          {[
            { color: "#dc2626", label: "Electricity Board (Source)" },
            { color: "#16a34a", label: "Destination Node" },
            { color: "#1d4ed8", label: "Path Nodes" },
            { color: "#b5ada6", label: "Inactive Nodes" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: color + "22", border: `1.5px solid ${color}` }}
              />
              <span style={{ fontSize: 11, color: "#64748b" }}>{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2.5 mt-1">
            <div className="w-8 h-0.5 rounded-full shrink-0"
              style={{ background: "linear-gradient(90deg, #1d4ed8, #60a5fa, #1d4ed8)" }} />
            <span style={{ fontSize: 11, color: "#64748b" }}>Active Route (Animated)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-0.5 rounded-full shrink-0" style={{ background: "#c8bfb4" }} />
            <span style={{ fontSize: 11, color: "#64748b" }}>Road / Edge</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: "#cbd5e1" }}>
            Scroll / +− to zoom · Arrow keys / D-pad to pan · Edge labels = km
          </div>
        </div>
      </div>

      {/* ══════════════ OUTAGE MODAL ══════════════ */}
      {outageModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center fade-in"
          style={{ background: "rgba(15,23,42,0.5)", zIndex: 100 }}
          onClick={(e) => { if (e.target === e.currentTarget) setOutageModalOpen(false); }}
        >
          <div
            className="scale-in flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "#ffffff",
              width: 620,
              maxWidth: "95vw",
              maxHeight: "88vh",
              boxShadow: "0 32px 72px rgba(15,23,42,0.18)",
              border: "1px solid #e2e8f0",
            }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-7 py-5"
              style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: "#fff1f2", border: "1px solid #fecaca" }}
                >
                  <AlertTriangle className="w-5 h-5" style={{ color: "#dc2626" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>Outage Manager</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{mapData.metadata.district}</div>
                </div>
              </div>
              <button
                onClick={() => setOutageModalOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
                style={{ background: "#f1f5f9", border: "none", color: "#64748b", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#fff1f2"; e.currentTarget.style.color = "#dc2626"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#64748b"; }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex" style={{ borderBottom: "1px solid #e2e8f0" }}>
              {(["report", "list"] as const).map((tab) => {
                const isAct = activeTab === tab;
                const label = tab === "report"
                  ? "Report Outage"
                  : `Current Outages${outages.length > 0 ? ` (${outages.length})` : ""}`;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1,
                      padding: "14px 16px",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      background: isAct ? "#ffffff" : "#f8fafc",
                      color: isAct ? "#dc2626" : "#94a3b8",
                      border: "none",
                      borderBottom: isAct ? "2px solid #dc2626" : "2px solid transparent",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "color 0.15s",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>

              {/* ── Report Outage Tab ── */}
              {activeTab === "report" && (
                <div className="p-7 flex flex-col gap-6">

                  {/* Search box */}
                  <div>
                    <label style={{
                      display: "block", fontSize: 9, fontWeight: 700,
                      color: "#64748b", textTransform: "uppercase",
                      letterSpacing: "0.18em", marginBottom: 10,
                    }}>
                      Search by Phone Number
                    </label>
                    <div className="relative">
                      <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#94a3b8" }} />
                      <input
                        type="text"
                        value={phoneSearch}
                        onChange={(e) => handlePhoneSearch(e.target.value)}
                        placeholder="Type phone number…  e.g. 0771234567"
                        style={{
                          width: "100%", padding: "13px 16px 13px 44px", borderRadius: 12,
                          border: "1.5px solid #e2e8f0", background: "#f8fafc",
                          color: "#0f172a", fontSize: 13, outline: "none",
                          fontFamily: "inherit", boxSizing: "border-box",
                          transition: "border-color 0.15s",
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#dc2626"; e.currentTarget.style.background = "#fff"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}
                      />
                    </div>
                  </div>

                  {/* Results */}
                  <div className="flex flex-col gap-3">
                    {phoneSearch.trim() === "" && (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Phone size={32} strokeWidth={1} style={{ color: "#cbd5e1" }} />
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>Enter a phone number to search</span>
                      </div>
                    )}

                    {phoneSearch.trim() !== "" && searchResults.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <AlertCircle size={32} strokeWidth={1} style={{ color: "#cbd5e1" }} />
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>No users found for this number</span>
                      </div>
                    )}

                    {searchResults.map((user) => (
                      <div
                        key={user.phone}
                        className="rounded-xl flex items-start gap-4 fade-in"
                        style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px 18px" }}
                      >
                        {/* Avatar */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}
                        >
                          <User size={17} style={{ color: "#1d4ed8" }} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{user.name}</div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                            {[
                              { Icon: Phone, val: user.phone },
                              { Icon: Home, val: user.address },
                              { Icon: MapPin, val: user.city },
                              { Icon: Tag, val: user.category },
                            ].map(({ Icon, val }) => (
                              <span key={val} className="flex items-center gap-1.5"
                                style={{ fontSize: 11, color: "#64748b" }}>
                                <Icon size={10} style={{ color: "#94a3b8" }} />
                                {val}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Report button */}
                        <button
                          onClick={() => handleReportOutageClick(user)}
                          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all"
                          style={{
                            background: "#fff1f2", border: "1px solid #fecaca",
                            color: "#dc2626", cursor: "pointer",
                            fontSize: 11, fontWeight: 700,
                            letterSpacing: "0.06em", textTransform: "uppercase",
                            fontFamily: "inherit",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#fecaca"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#fff1f2"; }}
                        >
                          <AlertTriangle size={12} />
                          Report
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Current Outages Tab ── */}
              {activeTab === "list" && (
                <div className="p-7 flex flex-col gap-3">
                  {outages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0" }}
                      >
                        <CheckCircle2 size={26} style={{ color: "#16a34a" }} />
                      </div>
                      <div className="text-center">
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>All Systems Normal</div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                          No outages reported in {mapData.metadata.district}
                        </div>
                      </div>
                    </div>
                  )}

                  {outages.map((outage) => {
                    const c = priorityColor(outage.priority);
                    return (
                      <div
                        key={outage.id}
                        className={`rounded-xl flex items-start gap-4 ${outage.isNew ? "outage-slide-up" : ""}`}
                        style={{ background: c.bg, border: `1px solid ${c.border}`, padding: "16px 18px" }}
                      >
                        {/* Priority badge */}
                        <div
                          className="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0"
                          style={{ background: c.badge, boxShadow: `0 4px 12px ${c.badge}55` }}
                        >
                          <span style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", lineHeight: 1 }}>
                            {outage.priority}
                          </span>
                          <span style={{ fontSize: 7, color: "#ffffff99", lineHeight: 1.4, letterSpacing: "0.1em" }}>P</span>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{outage.user.name}</div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                            {[
                              { Icon: Phone, val: outage.user.phone },
                              { Icon: Home, val: outage.user.address },
                              { Icon: Tag, val: outage.user.category },
                            ].map(({ Icon, val }) => (
                              <span key={val} className="flex items-center gap-1.5"
                                style={{ fontSize: 11, color: "#64748b" }}>
                                <Icon size={10} style={{ color: "#94a3b8" }} />
                                {val}
                              </span>
                            ))}
                          </div>
                          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>
                            Reported {new Date(outage.timestamp).toLocaleTimeString()}
                          </div>
                        </div>

                        {/* Severity chip */}
                        <div
                          className="shrink-0 px-3 py-1.5 rounded-lg"
                          style={{
                            background: c.badge, color: "#ffffff",
                            fontSize: 10, fontWeight: 700,
                            letterSpacing: "0.08em", textTransform: "uppercase",
                          }}
                        >
                          {outage.priority >= 8 ? "Critical" : outage.priority >= 5 ? "High" : "Normal"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ PRIORITY MODAL (on top) ══════════════ */}
      {priorityModalOpen && pendingUser && (
        <div
          className="fixed inset-0 flex items-center justify-center fade-in"
          style={{ background: "rgba(15,23,42,0.6)", zIndex: 200 }}
        >
          <div
            className="scale-in rounded-2xl overflow-hidden"
            style={{
              background: "#ffffff",
              width: 420,
              maxWidth: "92vw",
              boxShadow: "0 40px 90px rgba(15,23,42,0.24)",
              border: "1px solid #e2e8f0",
            }}
          >
            {/* Header */}
            <div className="px-7 py-6" style={{ background: "#fff1f2", borderBottom: "1px solid #fecaca" }}>
              <div className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: "#fecaca", border: "1px solid #fca5a5" }}
                >
                  <AlertTriangle className="w-5 h-5" style={{ color: "#dc2626" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Set Outage Priority</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    {pendingUser.name} · {pendingUser.phone}
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-7 py-6 flex flex-col gap-6">
              <div>
                <div style={{
                  fontSize: 9, fontWeight: 700, color: "#64748b",
                  textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 14,
                }}>
                  Priority Level — 1 (Low) to 10 (Critical)
                </div>

                {/* Priority grid */}
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((p) => {
                    const c = priorityColor(p);
                    const sel = priorityLevel === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setPriorityLevel(p)}
                        style={{
                          width: 44, height: 44, borderRadius: 12,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 800, fontSize: 15,
                          background: sel ? c.badge : c.bg,
                          border: `1.5px solid ${sel ? c.badge : c.border}`,
                          color: sel ? "#ffffff" : c.text,
                          cursor: "pointer",
                          transform: sel ? "scale(1.12)" : "scale(1)",
                          boxShadow: sel ? `0 6px 16px ${c.badge}66` : "none",
                          transition: "all 0.15s",
                          fontFamily: "inherit",
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                {/* Selection description */}
                <div
                  className="mt-5 rounded-xl flex items-center gap-4"
                  style={{
                    background: priorityColor(priorityLevel).bg,
                    border: `1px solid ${priorityColor(priorityLevel).border}`,
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: priorityColor(priorityLevel).badge,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, fontWeight: 800, color: "#fff",
                      boxShadow: `0 4px 12px ${priorityColor(priorityLevel).badge}66`,
                      flexShrink: 0,
                    }}
                  >
                    {priorityLevel}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: priorityColor(priorityLevel).text }}>
                      {priorityLevel >= 8 ? "Critical Priority" : priorityLevel >= 5 ? "High Priority" : "Normal Priority"}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      {priorityLevel >= 8
                        ? "Immediate dispatch required"
                        : priorityLevel >= 5
                          ? "Schedule soon"
                          : "Standard queue"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setPriorityModalOpen(false); setPendingUser(null); }}
                  style={{
                    flex: 1, padding: "13px 0", borderRadius: 12,
                    background: "#f1f5f9", color: "#475569",
                    border: "none", cursor: "pointer",
                    fontWeight: 700, fontSize: 11,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    fontFamily: "inherit", transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#e2e8f0"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmOutage}
                  style={{
                    flex: 2, padding: "13px 0", borderRadius: 12,
                    background: "#dc2626", color: "#ffffff",
                    border: "none", cursor: "pointer",
                    fontWeight: 700, fontSize: 11,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    fontFamily: "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#b91c1c"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#dc2626"; }}
                >
                  <AlertTriangle size={13} />
                  Confirm Outage
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CityMap;

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
  AlertCircle, User, Phone, Home, Tag,
} from "lucide-react";
import { mapDataRaw } from '../constant/map_content';
import type { CityRecord, MapData, NodeData, OutageRecord, OutageRoute } from 'outage-tracker';

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
  // ── swap this block with AVL tree lookup ──────────────────────────────────
  return DUMMY_USERS.filter((u) => u.phone.includes(q));
  // ─────────────────────────────────────────────────────────────────────────
}

// ─── Dummy outage routes for the left-panel list ─────────────────────────────
// Each entry has a pre-computed node-path string (same format as the old manual
// input).  The Get Route button just feeds it directly into setActivePath.


const DUMMY_OUTAGE_ROUTES: OutageRoute[] = [
  { id: "r1", label: "Node 82 — Nedungamuwa", nodePath: "65, 89, 38, 82", distance: "14.2", sector: "Sector A" },
  { id: "r2", label: "Node 27 — Habarakada", nodePath: "65, 89, 35, 40, 49, 28, 27", distance: "19.7", sector: "Sector B" },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

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
}

// ─── Component ────────────────────────────────────────────────────────────────

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
        from { transform: scale(0.93); opacity: 0; }
        to   { transform: scale(1);    opacity: 1; }
      }
      .scale-in { animation: scaleIn 0.25s cubic-bezier(0.22,1,0.36,1) both; }
    `;
    document.head.appendChild(s);
    return () => document.getElementById(ID)?.remove();
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
      /* Merge (avoid duplicate phone IDs, update priority if exists) */
      const filtered = prev.filter((o) => o.id !== newOutage.id);
      /* Insert and sort descending by priority (heap-like — replace with actual heap later) */
      const merged = [newOutage, ...filtered].sort((a, b) => b.priority - a.priority);
      return merged;
    });
    setPriorityModalOpen(false);
    setPendingUser(null);
    setPhoneSearch("");
    setSearchResults([]);
    setActiveTab("list");
    /* Remove isNew flag after animation completes */
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

      /* Zoom with + / - */
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
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* Wheel zoom (non-passive) */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) =>
        Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s * (e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP)))
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
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

  /* Route activation from left-panel button */
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
      <div className="absolute top-5 left-5 pointer-events-none bg-white z-50 px-2 py-1 rounded-md">
        <div style={{ color: "#6b7280", fontSize: 14, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>
          {mapData.metadata.district}
        </div>
        <div className="flex gap-x-1 items-center justify-start" style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>
          <span>{mapData.metadata.node_count} Cities</span>
          <Dot size={20} strokeWidth={4} />
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
                <line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={isAct ? "#1d4ed8" : "#c8bfb4"}
                  strokeWidth={isAct ? 2.5 : 1.4}
                  strokeOpacity={isAct ? 1 : 0.7}
                  strokeLinecap="round"
                  className={isAct ? "cm-flow" : undefined}
                />
                {showWeightLabels && (
                  <text x={mx} y={my - 5} textAnchor="middle"
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
            else if (isActive) { r = R_PATH; fill = "#eff6ff"; stroke = "#2563eb"; sw = 2; filt = "url(#glow-blue)"; }
            else if (isHovered) { r = R_BASE + 2; fill = "#eff6ff"; stroke = "#60a5fa"; sw = 1.5; }

            const ringColor = isSource ? "#dc2626" : isDest ? "#16a34a" : "#3b82f6";

            return (
              <g key={node.id} data-node="true"
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: "pointer" }}
              >
                {(isSource || isDest || isActive) && (
                  <circle cx={node.x} cy={node.y} r={r + 6}
                    fill="none" stroke={ringColor} strokeWidth={1.2}
                    strokeOpacity={0.3}
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
                <text x={node.x} y={node.y + r + 10}
                  textAnchor="middle" fontSize={7}
                  fill={isSource ? "#dc2626" : isDest ? "#16a34a" : isActive ? "#1d4ed8" : isHovered ? "#3b82f6" : "#b0a49a"}
                  fontFamily="monospace"
                  stroke="#f2ede6" strokeWidth={2.5} paintOrder="stroke"
                >
                  {nodeLabel(node.id)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* ── Zoom controls (bottom-left) ── */}
        <div className="absolute bottom-6 left-5 flex flex-col gap-1.5">
          {([
            { icon: <Plus className="w-3.5 h-3.5" />, action: zoomIn },
            { icon: <Minus className="w-3.5 h-3.5" />, action: zoomOut },
            { icon: <RotateCcw className="w-3.5 h-3.5" />, action: resetView },
          ] as const).map(({ icon, action }, i) => (
            <button key={i} onClick={action}
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-all"
              style={{ background: "#ffffff", border: "1px solid #d1d5db", color: "#6b7280", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#93c5fd"; e.currentTarget.style.color = "#2563eb"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.color = "#6b7280"; }}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* ── D-pad pan controls (bottom-right) ── */}
        <div className="absolute bottom-6 right-5"
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 36px)", gridTemplateRows: "repeat(3, 36px)", gap: 3 }}>
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
              <button key={i} title={title}
                onMouseDown={() => startContinuousPan(dx, dy)}
                onMouseUp={stopContinuousPan}
                onMouseLeave={(e) => { stopContinuousPan(); e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.color = "#6b7280"; }}
                className="flex items-center justify-center rounded-lg transition-all"
                style={{ background: "#ffffff", border: "1px solid #d1d5db", color: "#6b7280", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", lineHeight: 1 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#93c5fd"; e.currentTarget.style.color = "#2563eb"; }}
              >
                <LabelIcon size={18} strokeWidth={1.5} />
              </button>
            );
          })}
        </div>

        {/* ── Floating Action Bar ── */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-xl"
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            zIndex: 40,
          }}
        >
          {/* District name */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <MapPin size={13} style={{ color: "#9ca3af" }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#6b7280" }}>
              {mapData.metadata.district}
            </span>
          </div>

          <div style={{ width: 1, height: 20, background: "#e5e7eb" }} />

          {/* Outages button */}
          <button
            onClick={() => { setOutageModalOpen(true); setActiveTab("report"); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: outages.length > 0 ? "#fef2f2" : "#f9fafb",
              border: `1px solid ${outages.length > 0 ? "#fecaca" : "#e5e7eb"}`,
              color: outages.length > 0 ? "#dc2626" : "#374151",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.borderColor = "#fca5a5"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = outages.length > 0 ? "#fef2f2" : "#f9fafb"; e.currentTarget.style.borderColor = outages.length > 0 ? "#fecaca" : "#e5e7eb"; }}
          >
            <AlertTriangle size={13} />
            <span style={{ fontSize: 11, fontWeight: 700 }}>Outages</span>
            {outages.length > 0 && (
              <span
                className="inline-flex items-center justify-center rounded-full"
                style={{ background: "#dc2626", color: "#fff", fontSize: 9, fontWeight: 800, minWidth: 18, height: 18, padding: "0 5px" }}
              >
                {outages.length}
              </span>
            )}
          </button>
        </div>

        {/* Hover tooltip */}
        {hoveredId && (
          <div
            className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-lg text-xs pointer-events-none"
            style={{ background: "#ffffff", border: "1px solid #e5e7eb", color: "#374151", boxShadow: "0 2px 8px rgba(0,0,0,0.09)" }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: hoveredId === SOURCE_NODE_ID ? "#dc2626" :
                  hoveredId === destId ? "#16a34a" :
                    activeNodeSet.has(hoveredId) ? "#2563eb" : "#9ca3af",
              }}
            />
            Node {nodeLabel(hoveredId)}
            {nodeMap.get(hoveredId)?.name && (
              <span style={{ color: "#9ca3af" }}>— {nodeMap.get(hoveredId)!.name}</span>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════ RIGHT PANEL ══════════════════════════ */}
      <div className="w-80 flex flex-col overflow-y-auto" style={{ background: "#ffffff", borderLeft: "1px solid #e5e7eb" }}>

        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid #f3f4f6", background: "#fafafa" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
            <Zap className="w-5 h-5" style={{ color: "#dc2626" }} />
          </div>
          <div>
            <div style={{ color: "#111827", fontWeight: 700, fontSize: 14 }}>Power Outage Map</div>
            <div style={{ color: "#9ca3af", fontSize: 10, marginTop: 1 }}>Dijkstra Pathfinder</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 p-5">

          {/* Current Outage Routes */}
          <div>
            <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 10 }}>
              Current Outage Routes
            </div>

            <div className="flex flex-col gap-2">
              {DUMMY_OUTAGE_ROUTES.map((route) => {
                const isActive = activePath.length > 1 && parsePath(route.nodePath).join() === activePath.join();
                return (
                  <div
                    key={route.id}
                    className="rounded-xl p-3 flex flex-col gap-2"
                    style={{
                      background: isActive ? "#eff6ff" : "#f9fafb",
                      border: `1px solid ${isActive ? "#bfdbfe" : "#e5e7eb"}`,
                      transition: "all 0.2s",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                          {route.sector}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#111827", marginTop: 1 }}>
                          {route.label}
                        </div>
                        <div className="flex items-center gap-1 mt-1" style={{ fontSize: 9, color: "#6b7280" }}>
                          <MapPin size={9} />
                          <span>{route.distance} km</span>
                          <span style={{ color: "#d1d5db" }}>·</span>
                          <span style={{ fontFamily: "monospace", color: "#94a3b8" }}>{route.nodePath}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRouteFromOutage(route)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{
                          background: isActive ? "#2563eb" : "#1d4ed8",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          fontSize: 9,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#1e40af"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? "#2563eb" : "#1d4ed8"; }}
                      >
                        <Route size={10} />
                        Get Route
                      </button>
                      {isActive && (
                        <button
                          onClick={handleClearRoute}
                          className="flex items-center justify-center px-2.5 py-1.5 rounded-lg transition-all"
                          style={{ background: "#fee2e2", color: "#dc2626", border: "none", cursor: "pointer", fontSize: 9 }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#fecaca"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Route Result */}
          {activePath.length > 1 && (
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}>
              <div className="flex items-center gap-2">
                <Route className="w-3.5 h-3.5" style={{ color: "#0284c7" }} />
                <span style={{ fontSize: 9, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 700 }}>
                  Shortest Route
                </span>
              </div>

              {activeDistance && (
                <div className="self-start flex justify-center items-center gap-x-1 px-3 py-1.5 rounded-lg"
                  style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", fontWeight: 700, fontSize: 13 }}>
                  <MapPin size={18} /><span>{activeDistance}</span><span>km</span>
                </div>
              )}

              <div className="rounded-lg p-3" style={{ background: "#e0f2fe", fontSize: 10, color: "#0369a1", lineHeight: 1.8 }}>
                {activeDistance && (
                  <><span style={{ fontWeight: 700, color: "#92400e" }}>{activeDistance} km</span> via </>
                )}
                {activePath.slice(1, -1).map((id, i) => (
                  <span key={id}>
                    <span style={{ color: "#1d4ed8" }}>Node {nodeLabel(id)} ({nodeMap.get(id)?.name})</span>
                    {i < activePath.length - 3 && <span style={{ color: "#7dd3fc" }}> → </span>}
                  </span>
                ))}
                {activePath.length > 2 && <span style={{ color: "#7dd3fc" }}> → </span>}
                <span style={{ color: "#15803d", fontWeight: 700 }}>
                  Node {nodeLabel(activePath.at(-1)!)} ({nodeMap.get(activePath.at(-1)!)?.name})
                </span>
                <span style={{ color: "#94a3b8" }}> from Electricity Dept.</span>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {activePath.map((id, i) => {
                  const isFirst = i === 0;
                  const isLast = i === activePath.length - 1;
                  return (
                    <React.Fragment key={id}>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md"
                        style={{
                          fontSize: 10, fontWeight: 700,
                          background: isFirst ? "#fee2e2" : isLast ? "#dcfce7" : "#dbeafe",
                          color: isFirst ? "#dc2626" : isLast ? "#15803d" : "#1d4ed8",
                          border: `1px solid ${isFirst ? "#fca5a5" : isLast ? "#86efac" : "#93c5fd"}`,
                        }}
                      >
                        {nodeLabel(id)}
                      </span>
                      {!isLast && <span style={{ color: "#cbd5e1", fontSize: 10 }}>›</span>}
                    </React.Fragment>
                  );
                })}
              </div>

              <div style={{ fontSize: 9, color: "#94a3b8" }}>
                {activePath.length - 1} hop{activePath.length !== 2 ? "s" : ""} · {activePath.length} nodes
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="px-5 py-4 flex flex-col gap-2" style={{ borderTop: "1px solid #f3f4f6", background: "#fafafa" }}>
          <div style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 4 }}>
            Legend
          </div>
          {[
            { color: "#dc2626", label: "Electricity Board (source)" },
            { color: "#16a34a", label: "Destination node" },
            { color: "#2563eb", label: "Path nodes" },
            { color: "#b5ada6", label: "Inactive nodes" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color + "22", border: `1.5px solid ${color}` }} />
              <span style={{ fontSize: 10, color: "#6b7280" }}>{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2.5 mt-1">
            <div className="w-8 h-0.5 rounded-full shrink-0" style={{ background: "linear-gradient(90deg, #1d4ed8, #60a5fa, #1d4ed8)" }} />
            <span style={{ fontSize: 10, color: "#6b7280" }}>Active route (animated)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-0.5 rounded-full shrink-0" style={{ background: "#c8bfb4" }} />
            <span style={{ fontSize: 10, color: "#6b7280" }}>Road / edge</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 9, color: "#d1d5db" }}>
            Scroll / +− to zoom · Arrow keys / D-pad to pan · Edge labels = km
          </div>
        </div>
      </div>

      {/* ══════════════ OUTAGE MODAL ══════════════ */}
      {outageModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center fade-in"
          style={{ background: "rgba(0,0,0,0.45)", zIndex: 100 }}
          onClick={(e) => { if (e.target === e.currentTarget) setOutageModalOpen(false); }}
        >
          <div
            className="scale-in flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "#ffffff",
              width: 560,
              maxWidth: "95vw",
              maxHeight: "85vh",
              boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #f3f4f6", background: "#fafafa" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: "#dc2626" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>Outage Manager</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{mapData.metadata.district}</div>
                </div>
              </div>
              <button
                onClick={() => setOutageModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                style={{ background: "#f3f4f6", border: "none", color: "#6b7280", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#dc2626"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.color = "#6b7280"; }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex" style={{ borderBottom: "1px solid #f3f4f6" }}>
              {(["report", "list"] as const).map((tab) => {
                const label = tab === "report" ? "Report Outage" : `Current Outages${outages.length > 0 ? ` (${outages.length})` : ""}`;
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all"
                    style={{
                      background: isActive ? "#ffffff" : "#fafafa",
                      borderBottom: isActive ? "2px solid #dc2626" : "2px solid transparent",
                      color: isActive ? "#dc2626" : "#9ca3af",
                      cursor: "pointer",
                      border: "none",
                      letterSpacing: "0.15em",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>

              {/* Report Outage Tab */}
              {activeTab === "report" && (
                <div className="p-6 flex flex-col gap-4">
                  {/* Search box */}
                  <div>
                    <label style={{ display: "block", fontSize: 9, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 8 }}>
                      Search by Phone Number
                    </label>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9ca3af" }} />
                      <input
                        type="text"
                        value={phoneSearch}
                        onChange={(e) => handlePhoneSearch(e.target.value)}
                        placeholder="Type phone number…  e.g. 0771234567"
                        style={{
                          width: "100%", padding: "10px 14px 10px 36px", borderRadius: 10,
                          border: "1px solid #d1d5db", background: "#f9fafb",
                          color: "#111827", fontSize: 12, outline: "none",
                          fontFamily: "inherit", boxSizing: "border-box",
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#dc2626"; e.currentTarget.style.background = "#fff"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.background = "#f9fafb"; }}
                      />
                    </div>
                  </div>

                  {/* Results area */}
                  <div className="flex flex-col gap-2" style={{ minHeight: 80 }}>
                    {phoneSearch.trim() === "" && (
                      <div className="flex flex-col items-center justify-center py-8 gap-2" style={{ color: "#d1d5db" }}>
                        <Phone size={28} strokeWidth={1} />
                        <span style={{ fontSize: 11 }}>Enter a phone number to search</span>
                      </div>
                    )}

                    {phoneSearch.trim() !== "" && searchResults.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 gap-2" style={{ color: "#d1d5db" }}>
                        <AlertCircle size={28} strokeWidth={1} />
                        <span style={{ fontSize: 11 }}>No users found for this number</span>
                      </div>
                    )}

                    {searchResults.map((user) => (
                      <div
                        key={user.phone}
                        className="rounded-xl p-4 flex items-start gap-3 fade-in"
                        style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}
                      >
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                          <User size={16} style={{ color: "#2563eb" }} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{user.name}</div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            <span className="flex items-center gap-1" style={{ fontSize: 10, color: "#6b7280" }}>
                              <Phone size={9} />{user.phone}
                            </span>
                            <span className="flex items-center gap-1" style={{ fontSize: 10, color: "#6b7280" }}>
                              <Home size={9} />{user.address}
                            </span>
                            <span className="flex items-center gap-1" style={{ fontSize: 10, color: "#6b7280" }}>
                              <MapPin size={9} />{user.city}
                            </span>
                            <span className="flex items-center gap-1" style={{ fontSize: 10, color: "#6b7280" }}>
                              <Tag size={9} />{user.category}
                            </span>
                          </div>
                        </div>

                        {/* Report button */}
                        <button
                          onClick={() => handleReportOutageClick(user)}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all"
                          style={{
                            background: "#fef2f2", border: "1px solid #fecaca",
                            color: "#dc2626", cursor: "pointer", fontSize: 10, fontWeight: 700,
                            letterSpacing: "0.06em", textTransform: "uppercase",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                        >
                          <AlertTriangle size={11} />
                          Report
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Outages Tab */}
              {activeTab === "list" && (
                <div className="p-6 flex flex-col gap-3">
                  {outages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3" style={{ color: "#d1d5db" }}>
                      <AlertTriangle size={36} strokeWidth={1} />
                      <span style={{ fontSize: 11 }}>No outages reported yet</span>
                    </div>
                  )}

                  {outages.map((outage) => {
                    const c = priorityColor(outage.priority);
                    return (
                      <div
                        key={outage.id}
                        className={`rounded-xl p-4 flex items-start gap-3 ${outage.isNew ? "outage-slide-up" : ""}`}
                        style={{ background: c.bg, border: `1px solid ${c.border}` }}
                      >
                        {/* Priority badge */}
                        <div
                          className="w-9 h-9 rounded-xl flex flex-col items-center justify-center shrink-0"
                          style={{ background: c.badge + "22", border: `1.5px solid ${c.badge}` }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 800, color: c.text, lineHeight: 1 }}>
                            {outage.priority}
                          </span>
                          <span style={{ fontSize: 7, color: c.text, opacity: 0.7, lineHeight: 1 }}>P</span>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{outage.user.name}</div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            <span className="flex items-center gap-1" style={{ fontSize: 10, color: "#6b7280" }}>
                              <Phone size={9} />{outage.user.phone}
                            </span>
                            <span className="flex items-center gap-1" style={{ fontSize: 10, color: "#6b7280" }}>
                              <Home size={9} />{outage.user.address}
                            </span>
                            <span className="flex items-center gap-1" style={{ fontSize: 10, color: "#6b7280" }}>
                              <Tag size={9} />{outage.user.category}
                            </span>
                          </div>
                          <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 4 }}>
                            Reported {new Date(outage.timestamp).toLocaleTimeString()}
                          </div>
                        </div>

                        {/* Priority label chip */}
                        <div
                          className="shrink-0 px-2 py-1 rounded-lg"
                          style={{ background: c.badge, color: "#fff", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}
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
          style={{ background: "rgba(0,0,0,0.55)", zIndex: 200 }}
        >
          <div
            className="scale-in rounded-2xl overflow-hidden"
            style={{
              background: "#ffffff",
              width: 380,
              maxWidth: "90vw",
              boxShadow: "0 32px 80px rgba(0,0,0,0.22)",
            }}
          >
            {/* Header */}
            <div className="px-6 py-5" style={{ background: "#fef2f2", borderBottom: "1px solid #fecaca" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#fee2e2", border: "1px solid #fca5a5" }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: "#dc2626" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>Set Outage Priority</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{pendingUser.name} · {pendingUser.phone}</div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 flex flex-col gap-5">
              <div>
                <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 12 }}>
                  Priority Level (1 = Low · 10 = Critical)
                </div>

                {/* Priority picker */}
                <div className="flex gap-1.5 flex-wrap">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((p) => {
                    const c = priorityColor(p);
                    const sel = priorityLevel === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setPriorityLevel(p)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all"
                        style={{
                          background: sel ? c.badge : c.bg,
                          border: `1.5px solid ${sel ? c.badge : c.border}`,
                          color: sel ? "#ffffff" : c.text,
                          fontSize: 14,
                          cursor: "pointer",
                          transform: sel ? "scale(1.1)" : "scale(1)",
                          boxShadow: sel ? `0 4px 12px ${c.badge}55` : "none",
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                {/* Selected priority description */}
                <div className="mt-4 rounded-xl p-3 flex items-center gap-3" style={{ background: priorityColor(priorityLevel).bg, border: `1px solid ${priorityColor(priorityLevel).border}` }}>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-black"
                    style={{ background: priorityColor(priorityLevel).badge, color: "#fff", fontSize: 15 }}
                  >
                    {priorityLevel}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: priorityColor(priorityLevel).text }}>
                      {priorityLevel >= 8 ? "Critical Priority" : priorityLevel >= 5 ? "High Priority" : "Normal Priority"}
                    </div>
                    <div style={{ fontSize: 10, color: "#6b7280" }}>
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
              <div className="flex gap-2">
                <button
                  onClick={() => { setPriorityModalOpen(false); setPendingUser(null); }}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                  style={{ background: "#f3f4f6", color: "#6b7280", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#e5e7eb"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmOutage}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  style={{ background: "#dc2626", color: "#ffffff", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#b91c1c"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#dc2626"; }}
                >
                  <AlertTriangle size={12} />
                  Confirm Outage
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CityMap

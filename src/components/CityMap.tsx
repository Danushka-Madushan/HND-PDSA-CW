"use client";

/**
 * CityMap.tsx — Nebula Heights Power Outage Map
 *
 * Usage:
 *   import CityMap from "./CityMap";
 *   <CityMap />
 *
 * map_data.json must be in the same directory (or adjust the import path).
 * Place your Dijkstra result into the "Shortest Path" input field as
 * comma-separated node numbers, e.g.:  66, 23, 45, 89
 * Node 66 = eb_66 (Regional Electricity Board — always the source).
 */

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Button } from "@heroui/react";
import { Zap, Plus, Minus, RotateCcw, Route } from "lucide-react";
import { mapDataRaw } from '../constant/map_content';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NodeData {
  id: string;
  name: string;
  type: "PLACE" | "ELECTRICITY_BOARD";
  x: number;
  y: number;
}

interface EdgeData {
  source: string;
  target: string;
  weight: number;
}

interface MapData {
  metadata: { district: string; node_count: number; edge_count: number };
  nodes: NodeData[];
  edges: EdgeData[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const mapData = mapDataRaw as MapData;
const SOURCE_NODE_ID = "eb_66";
const PADDING = 90;
const R_BASE = 6;
const R_SOURCE = 12;
const R_DEST = 10;
const R_PATH = 9;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 8;
const ZOOM_STEP = 1.15;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Convert user-facing number to internal node id */
function toNodeId(n: number): string {
  return n === 66 ? "eb_66" : `node_${n}`;
}

/** Extract short display label from node id */
function nodeLabel(id: string): string {
  return id === "eb_66" ? "66" : id.replace("node_", "");
}

/** Canonical, order-independent edge key */
function edgeKey(a: string, b: string): string {
  return a < b ? `${a}¦${b}` : `${b}¦${a}`;
}

/** Parse a comma/space-separated string of node numbers into node id array */
function parsePath(raw: string): string[] {
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function CityMap() {
  // Inject animation keyframes once
  useEffect(() => {
    const id = "city-map-anim";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes cmFlow {
        from { stroke-dashoffset: 24; }
        to   { stroke-dashoffset: 0; }
      }
      .cm-flow { stroke-dasharray: 8 4; animation: cmFlow 0.45s linear infinite; }
      @keyframes cmPulse {
        0%, 100% { opacity: 0.25; r: 18px; }
        50%       { opacity: 0.6;  r: 22px; }
      }
      .cm-pulse-ring { animation: cmPulse 1.8s ease-in-out infinite; }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  // ── Pan / Zoom ──
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  // ── UI state ──
  const [pathInput, setPathInput] = useState("");
  const [distInput, setDistInput] = useState("");
  const [destInput, setDestInput] = useState("");
  const [activePath, setActivePath] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // ── Precomputed bounds ──
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

  // ── Node map ──
  const nodeMap = useMemo(() => {
    const m = new Map<string, NodeData>();
    for (const n of mapData.nodes) m.set(n.id, n);
    return m;
  }, []);

  // ── Derived active sets ──
  const { activeEdgeKeys, activeNodeSet, destId } = useMemo(() => {
    const activeEdgeKeys = new Set<string>();
    const activeNodeSet = new Set<string>(activePath);
    for (let i = 0; i < activePath.length - 1; i++) {
      activeEdgeKeys.add(edgeKey(activePath[i], activePath[i + 1]));
    }
    const destId = activePath.length > 1 ? activePath.at(-1)! : null;
    return { activeEdgeKeys, activeNodeSet, destId };
  }, [activePath]);

  // ── Highlight path from input ──
  const handleHighlight = useCallback(() => {
    const parsed = parsePath(pathInput);
    if (parsed.length >= 2) setActivePath(parsed);
  }, [pathInput]);

  const handleClear = useCallback(() => {
    setActivePath([]);
    setPathInput("");
    setDistInput("");
    setDestInput("");
  }, []);

  // ── Mouse handlers ──
  const onMouseDown = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("[data-node]")) return;
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    setPan((p) => ({ x: p.x + e.clientX - last.current.x, y: p.y + e.clientY - last.current.y }));
    last.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  const onWheel = useCallback((e: ReactWheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setScale((s) =>
      Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s * (e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP)))
    );
  }, []);

  const zoomIn = () => setScale((s) => Math.min(ZOOM_MAX, s * ZOOM_STEP));
  const zoomOut = () => setScale((s) => Math.max(ZOOM_MIN, s / ZOOM_STEP));
  const resetView = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  const showWeightLabels = scale > 0.65;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="flex h-screen overflow-hidden select-none"
      style={{ background: "#06091a", fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" }}
    >
      {/* ════════════════════════ MAP CANVAS ════════════════════════ */}
      <div
        className="flex-1 relative overflow-hidden"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        {/* Blueprint grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(30,58,138,0.12) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(30,58,138,0.12) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            backgroundPosition: `${pan.x % 48}px ${pan.y % 48}px`,
          }}
        />

        {/* Centre radial depth glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 55% at 45% 52%, rgba(14,36,96,0.35) 0%, transparent 65%)",
          }}
        />

        {/* District badge */}
        <div className="absolute top-5 left-5 pointer-events-none">
          <div className="text-[11px] font-bold tracking-[0.35em] uppercase text-blue-400 opacity-50">
            {mapData.metadata.district}
          </div>
          <div className="text-[9px] text-slate-700 tracking-widest mt-0.5">
            {mapData.metadata.node_count} nodes · {mapData.metadata.edge_count} edges
          </div>
        </div>

        {/* ── SVG map ── */}
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
            <filter id="glow-amber" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-src" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="9" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-dest" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-hover" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="b" />
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
            const mx = (s.x + t.x) / 2;
            const my = (s.y + t.y) / 2;

            return (
              <g key={i}>
                {/* Glow halo behind active edges */}
                {isAct && (
                  <line
                    x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                    stroke="#f59e0b" strokeWidth={14} strokeOpacity={0.1}
                    strokeLinecap="round"
                  />
                )}

                {/* Edge line */}
                <line
                  x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke={isAct ? "#f59e0b" : "#1e3a8a"}
                  strokeWidth={isAct ? 2.8 : 1.3}
                  strokeOpacity={isAct ? 0.95 : 0.45}
                  strokeLinecap="round"
                  className={isAct ? "cm-flow" : undefined}
                />

                {/* Weight label */}
                {showWeightLabels && (
                  <text
                    x={mx} y={my - 5}
                    textAnchor="middle"
                    fontSize={isAct ? 9 : 7.5}
                    fill={isAct ? "#fcd34d" : "#1e3a8a"}
                    fontFamily="monospace"
                    stroke="#06091a"
                    strokeWidth={3}
                    paintOrder="stroke"
                    opacity={isAct ? 1 : 0.7}
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

            let r = R_BASE;
            let fill = "#0c1535";
            let stroke = "#1d4ed8";
            let sw = 1;
            let filt: string | undefined;

            if (isSource) {
              r = R_SOURCE; fill = "#3b0d01"; stroke = "#f97316"; sw = 2.5;
              filt = "url(#glow-src)";
            } else if (isDest) {
              r = R_DEST; fill = "#012218"; stroke = "#10b981"; sw = 2;
              filt = "url(#glow-dest)";
            } else if (isActive) {
              r = R_PATH; fill = "#2d1400"; stroke = "#f59e0b"; sw = 2;
              filt = "url(#glow-amber)";
            } else if (isHovered) {
              r = R_BASE + 2; fill = "#0f1f4d"; stroke = "#60a5fa"; sw = 1.5;
              filt = "url(#glow-hover)";
            }

            const ringColor = isSource ? "#f97316" : isDest ? "#10b981" : "#f59e0b";

            return (
              <g
                key={node.id}
                data-node="true"
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Pulse ring — source / active / dest */}
                {(isSource || isDest || isActive) && (
                  <circle
                    cx={node.x} cy={node.y} r={r + 7}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth={1.2}
                    strokeOpacity={0.35}
                    className={isSource ? "cm-pulse-ring" : undefined}
                  />
                )}

                {/* Main circle */}
                <circle
                  cx={node.x} cy={node.y} r={r}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={sw}
                  filter={filt}
                />

                {/* Source bolt icon */}
                {isSource && (
                  <text
                    x={node.x} y={node.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={10}
                    fill="#fdba74"
                  >
                    ⚡
                  </text>
                )}

                {/* Destination pin icon */}
                {isDest && !isSource && (
                  <text
                    x={node.x} y={node.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={8}
                    fill="#6ee7b7"
                  >
                    ●
                  </text>
                )}

                {/* Node number label */}
                <text
                  x={node.x}
                  y={node.y + r + 10}
                  textAnchor="middle"
                  fontSize={7}
                  fill={
                    isActive ? "#fcd34d" :
                      isSource ? "#fb923c" :
                        isDest ? "#6ee7b7" :
                          isHovered ? "#93c5fd" :
                            "#1e3a8a"
                  }
                  fontFamily="monospace"
                  stroke="#06091a"
                  strokeWidth={2.5}
                  paintOrder="stroke"
                  opacity={isActive || isSource || isDest || isHovered ? 1 : 0.7}
                >
                  {nodeLabel(node.id)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* ── Zoom controls ── */}
        <div className="absolute bottom-6 left-5 flex flex-col gap-1.5">
          {[
            { icon: <Plus className="w-3.5 h-3.5" />, action: zoomIn },
            { icon: <Minus className="w-3.5 h-3.5" />, action: zoomOut },
            { icon: <RotateCcw className="w-3.5 h-3.5" />, action: resetView },
          ].map(({ icon, action }, i) => (
            <button
              key={i}
              onClick={action}
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
              style={{
                background: "#0d1730",
                border: "1px solid #1e3a8a44",
                color: "#475569",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#1e3a8a22";
                (e.currentTarget as HTMLButtonElement).style.color = "#93c5fd";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#0d1730";
                (e.currentTarget as HTMLButtonElement).style.color = "#475569";
              }}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Hovered node tooltip */}
        {hoveredId && (
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-lg text-xs pointer-events-none"
            style={{ background: "#0d1730", border: "1px solid #1e3a8a55", color: "#94a3b8" }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background:
                  hoveredId === SOURCE_NODE_ID ? "#f97316" :
                    hoveredId === destId ? "#10b981" :
                      activeNodeSet.has(hoveredId) ? "#f59e0b" : "#3b82f6",
              }}
            />
            Node {nodeLabel(hoveredId)}
            {nodeMap.get(hoveredId)?.name && (
              <span style={{ color: "#64748b" }}>— {nodeMap.get(hoveredId)!.name}</span>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════ RIGHT PANEL ════════════════════════ */}
      <div
        className="w-80 flex flex-col overflow-y-auto"
        style={{
          background: "#080e20",
          borderLeft: "1px solid #1e3a8a22",
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
        }}
      >
        {/* Panel header */}
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{ borderBottom: "1px solid #1e3a8a22" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "#3b0d01", border: "1px solid #f9731633" }}
          >
            <Zap className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-orange-400 tracking-wide">Power Outage Map</div>
            <div className="text-[10px] text-slate-600 tracking-widest mt-0.5">Dijkstra Pathfinder</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-5 p-5">

          {/* Source node indicator */}
          <div
            className="rounded-xl p-3.5 flex items-start gap-3"
            style={{ background: "#1a0800", border: "1px solid #f9731622" }}
          >
            <Zap className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-[9px] text-orange-700 uppercase tracking-[0.2em] mb-0.5">
                Source (Fixed)
              </div>
              <div className="text-orange-300 text-xs font-bold leading-snug">
                Node 66
              </div>
              <div className="text-orange-700 text-[10px] mt-0.5">
                Regional Electricity Board
              </div>
            </div>
          </div>

          {/* ── Destination input ── */}
          <div>
            <label className="block text-[9px] text-slate-600 uppercase tracking-[0.18em] mb-2">
              Destination Node
            </label>
            <input
              type="text"
              value={destInput}
              onChange={(e) => setDestInput(e.target.value)}
              placeholder="Node number (e.g. 89)"
              className="w-full px-3.5 py-2.5 rounded-lg text-xs transition-colors outline-none"
              style={{
                background: "#0c1535",
                border: "1px solid #1e3a8a44",
                color: "#e2e8f0",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#1e3a8a44")}
            />
          </div>

          {/* ── Path input ── */}
          <div>
            <label className="block text-[9px] text-slate-600 uppercase tracking-[0.18em] mb-2">
              Shortest Path (node IDs)
            </label>
            <input
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              onKeyDown={(e: ReactKeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") handleHighlight();
              }}
              placeholder="e.g.  66, 23, 45, 89"
              className="w-full px-3.5 py-2.5 rounded-lg text-xs transition-colors outline-none"
              style={{
                background: "#0c1535",
                border: "1px solid #1e3a8a44",
                color: "#e2e8f0",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#f59e0b")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#1e3a8a44")}
            />
            <div className="text-[9px] text-slate-700 mt-1.5">
              Separate by commas or spaces · Press Enter to highlight
            </div>
          </div>

          {/* ── Distance input ── */}
          <div>
            <label className="block text-[9px] text-slate-600 uppercase tracking-[0.18em] mb-2">
              Total Distance (km)
            </label>
            <input
              type="text"
              value={distInput}
              onChange={(e) => setDistInput(e.target.value)}
              placeholder="e.g.  42.5"
              className="w-full px-3.5 py-2.5 rounded-lg text-xs transition-colors outline-none"
              style={{
                background: "#0c1535",
                border: "1px solid #1e3a8a44",
                color: "#e2e8f0",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#1e3a8a44")}
            />
          </div>

          {/* ── Action buttons ── */}
          <div className="flex gap-2">
            <Button
              onPress={handleHighlight}
              className="flex-1 text-xs font-bold rounded-lg py-2.5 tracking-wide"
              style={{
                background: "linear-gradient(135deg, #b45309 0%, #92400e 100%)",
                color: "#fef3c7",
                border: "1px solid #f59e0b44",
              }}
            >
              ⚡ Highlight Path
            </Button>
            <Button
              onPress={handleClear}
              variant="primary"
              className="px-4 py-2.5 text-xs rounded-lg"
              style={{ background: "#1e293b", color: "#64748b" }}
            >
              Clear
            </Button>
          </div>

          {/* ── Route result display ── */}
          {activePath.length > 1 && (
            <div
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{ background: "#060f0c", border: "1px solid #10b98122" }}
            >
              {/* Route header */}
              <div className="flex items-center gap-2">
                <Route className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[9px] text-emerald-600 uppercase tracking-[0.2em] font-bold">
                  Shortest Route
                </span>
              </div>

              {/* Distance badge */}
              {distInput && (
                <div
                  className="self-start px-3 py-1.5 rounded-lg text-sm font-bold"
                  style={{ background: "#2d1400", color: "#fcd34d", border: "1px solid #f59e0b33" }}
                >
                  📍 {distInput} km
                </div>
              )}

              {/* Human-readable description */}
              <div
                className="text-[10px] leading-relaxed rounded-lg p-3"
                style={{ background: "#0a1220", color: "#64748b" }}
              >
                {distInput && (
                  <><span className="text-amber-400 font-bold">{distInput} km</span> via </>
                )}
                {activePath.slice(1, -1).map((id, i) => (
                  <span key={id}>
                    <span className="text-slate-400">node {nodeLabel(id)}</span>
                    {i < activePath.length - 3 && <span className="text-slate-700"> → </span>}
                  </span>
                ))}
                {activePath.length > 2 && <span className="text-slate-700"> → </span>}
                <span className="text-emerald-400 font-bold">
                  node {nodeLabel(activePath.at(-1)!)}
                </span>
                <span className="text-slate-700"> from Electricity Dept.</span>
              </div>

              {/* Node chip trail */}
              <div className="flex flex-wrap items-center gap-1">
                {activePath.map((id, i) => {
                  const isFirst = i === 0;
                  const isLast = i === activePath.length - 1;
                  return (
                    <React.Fragment key={id}>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold"
                        style={{
                          background: isFirst ? "#3b0d01" : isLast ? "#012218" : "#2d1400",
                          color: isFirst ? "#fdba74" : isLast ? "#6ee7b7" : "#fcd34d",
                          border: `1px solid ${isFirst ? "#f97316" : isLast ? "#10b981" : "#f59e0b"}44`,
                        }}
                      >
                        {isFirst ? "⚡ " : ""}{nodeLabel(id)}{isLast ? " 📍" : ""}
                      </span>
                      {!isLast && (
                        <span className="text-slate-800 text-[10px] leading-none">›</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Step count */}
              <div className="text-[9px] text-slate-700">
                {activePath.length - 1} hop{activePath.length !== 2 ? "s" : ""} · {activePath.length} nodes
              </div>
            </div>
          )}
        </div>

        {/* ── Legend ── */}
        <div
          className="px-5 py-4 flex flex-col gap-2"
          style={{ borderTop: "1px solid #1e3a8a18" }}
        >
          <div className="text-[9px] text-slate-700 uppercase tracking-[0.2em] mb-1">Legend</div>

          {[
            { color: "#f97316", label: "Electricity Board (source)" },
            { color: "#10b981", label: "Destination node" },
            { color: "#f59e0b", label: "Intermediate path nodes" },
            { color: "#1d4ed8", label: "Inactive nodes" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: color + "22", border: `1.5px solid ${color}` }}
              />
              <span className="text-[10px] text-slate-600">{label}</span>
            </div>
          ))}

          <div className="flex items-center gap-2.5 mt-1">
            <div
              className="w-8 h-0.5 shrink-0 rounded-full"
              style={{ background: "linear-gradient(90deg, #f59e0b, #fcd34d, #f59e0b)" }}
            />
            <span className="text-[10px] text-slate-600">Active route (animated)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-0.5 shrink-0 rounded-full" style={{ background: "#1e3a8a", opacity: 0.6 }} />
            <span className="text-[10px] text-slate-600">Road / edge</span>
          </div>

          <div className="mt-2 text-[9px] text-slate-800">
            Scroll to zoom · Drag to pan · Edge labels show km
          </div>
        </div>
      </div>
    </div>
  );
}

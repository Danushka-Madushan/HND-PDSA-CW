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
 * comma-separated node numbers, e.g.:  65, 23, 45, 89
 * Node 65 = eb_65 (Regional Electricity Board — always the source).
 */

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  type MouseEvent as ReactMouseEvent,
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
const SOURCE_NODE_ID = "eb_65";
const PADDING = 90;
const R_BASE = 6;
const R_SOURCE = 12;
const R_DEST = 10;
const R_PATH = 8;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 8;
const ZOOM_STEP = 1.15;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function toNodeId(n: number): string {
  return n === 65 ? "eb_65" : `node_${n}`;
}

function nodeLabel(id: string): string {
  return id === "eb_65" ? "65" : id.replace("node_", "");
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}¦${b}` : `${b}¦${a}`;
}

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
  // ── Inject animation keyframes once ──
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
    `;
    document.head.appendChild(s);
    return () => document.getElementById(ID)?.remove();
  }, []);

  // ── Pan / Zoom ──
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // ── UI ──
  const [pathInput, setPathInput] = useState("");
  const [distInput, setDistInput] = useState("");
  const [destInput, setDestInput] = useState("");
  const [activePath, setActivePath] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // ─── FIX: window-level listeners prevent drag from dropping when the cursor
  //         passes over SVG child elements (which would fire onMouseLeave on
  //         a container-level handler and cancel the gesture prematurely). ──────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPan((p) => ({
        x: p.x + e.clientX - lastMouse.current.x,
        y: p.y + e.clientY - lastMouse.current.y,
      }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => { dragging.current = false; };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ─── FIX: wheel must be non-passive so preventDefault() is allowed ────────
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

  // ── Precomputed map bounds ──
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

  // ── Derived active sets from path ──
  const { activeEdgeKeys, activeNodeSet, destId, directedActiveEdges } = useMemo(() => {
    const activeEdgeKeys = new Set<string>();
    const activeNodeSet = new Set<string>(activePath);
    // Maps normalised edgeKey → { fromId, toId } in path-traversal order so the
    // animated dash always flows source → destination regardless of how the edge
    // is stored in the data file.
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

  // ── Handlers ──
  const onMouseDown = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("[data-node]")) return;
    // Prevent the browser's native HTML5 drag gesture, which would swallow
    // subsequent mousemove events and break the custom pan handler.
    e.preventDefault();
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

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

  const zoomIn = () => setScale((s) => Math.min(ZOOM_MAX, s * ZOOM_STEP));
  const zoomOut = () => setScale((s) => Math.max(ZOOM_MIN, s / ZOOM_STEP));
  const resetView = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  const showWeightLabels = scale > 0.65;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="flex h-screen overflow-hidden select-none"
      style={{ background: "#f2ede6", fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" }}
    >

      {/* ══════════════════════════ MAP CANVAS ══════════════════════════ */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onMouseDown={onMouseDown}
      >
        {/* Blueprint grid — offset tracks pan so it feels anchored */}
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

        {/* District label */}
        <div className="absolute top-5 left-5 pointer-events-none">
          <div style={{ color: "#6b7280", fontSize: 11, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>
            {mapData.metadata.district}
          </div>
          <div style={{ color: "#9ca3af", fontSize: 10, marginTop: 2 }}>
            {mapData.metadata.node_count} nodes · {mapData.metadata.edge_count} edges
          </div>
        </div>

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

            // For active edges, resolve coordinates in path-traversal order so
            // the animated dash always flows from source → destination.
            let x1 = s.x, y1 = s.y, x2 = t.x, y2 = t.y;
            if (isAct) {
              const dir = directedActiveEdges.get(key);
              if (dir) {
                const fromNode = nodeMap.get(dir.fromId);
                const toNode = nodeMap.get(dir.toId);
                if (fromNode && toNode) {
                  x1 = fromNode.x; y1 = fromNode.y;
                  x2 = toNode.x; y2 = toNode.y;
                }
              }
            }

            const mx = (s.x + t.x) / 2;
            const my = (s.y + t.y) / 2;

            return (
              <g key={i}>
                {/* Glow halo on active edges */}
                {isAct && (
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#93c5fd" strokeWidth={10} strokeOpacity={0.2}
                    strokeLinecap="round"
                  />
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
                    x={mx} y={my - 5}
                    textAnchor="middle"
                    fontSize={isAct ? 9 : 7.5}
                    fill={isAct ? "#1d4ed8" : "#a09890"}
                    fontFamily="monospace"
                    stroke="#f2ede6"
                    strokeWidth={3}
                    className='tracking-widest'
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

            let r = R_BASE;
            let fill = "#e8e2db";
            let stroke = "#b5ada6";
            let sw = 1.2;
            let filt: string | undefined;

            if (isSource) {
              r = R_SOURCE; fill = "#fff1f2"; stroke = "#dc2626"; sw = 2.5;
              filt = "url(#glow-red)";
            } else if (isDest) {
              r = R_DEST; fill = "#f0fdf4"; stroke = "#16a34a"; sw = 2;
              filt = "url(#glow-green)";
            } else if (isActive) {
              r = R_PATH; fill = "#eff6ff"; stroke = "#2563eb"; sw = 2;
              filt = "url(#glow-blue)";
            } else if (isHovered) {
              r = R_BASE + 2; fill = "#eff6ff"; stroke = "#60a5fa"; sw = 1.5;
            }

            const ringColor =
              isSource ? "#dc2626" : isDest ? "#16a34a" : "#3b82f6";

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
                    fill="none"
                    stroke={ringColor}
                    strokeWidth={1.2}
                    strokeOpacity={0.3}
                    className={isSource ? "cm-pulse" : undefined}
                  />
                )}

                <circle
                  cx={node.x} cy={node.y} r={r}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={sw}
                  filter={filt}
                />

                {isSource && (
                  <text
                    x={node.x} y={node.y + 1}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={10} fill="#dc2626"
                  >
                    ⚡
                  </text>
                )}

                {isDest && !isSource && (
                  <circle cx={node.x} cy={node.y} r={2.5} fill="#16a34a" />
                )}

                <text
                  x={node.x}
                  y={node.y + r + 10}
                  textAnchor="middle"
                  fontSize={7}
                  fill={
                    isSource ? "#dc2626" :
                      isDest ? "#16a34a" :
                        isActive ? "#1d4ed8" :
                          isHovered ? "#3b82f6" :
                            "#b0a49a"
                  }
                  fontFamily="monospace"
                  stroke="#f2ede6"
                  strokeWidth={2.5}
                  paintOrder="stroke"
                >
                  {nodeLabel(node.id)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* ── Zoom controls ── */}
        <div className="absolute bottom-6 left-5 flex flex-col gap-1.5">
          {(
            [
              { icon: <Plus className="w-3.5 h-3.5" />, action: zoomIn },
              { icon: <Minus className="w-3.5 h-3.5" />, action: zoomOut },
              { icon: <RotateCcw className="w-3.5 h-3.5" />, action: resetView },
            ] as const
          ).map(({ icon, action }, i) => (
            <button
              key={i}
              onClick={action}
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-all"
              style={{
                background: "#ffffff",
                border: "1px solid #d1d5db",
                color: "#6b7280",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget;
                b.style.background = "#eff6ff";
                b.style.borderColor = "#93c5fd";
                b.style.color = "#2563eb";
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget;
                b.style.background = "#ffffff";
                b.style.borderColor = "#d1d5db";
                b.style.color = "#6b7280";
              }}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* Hover tooltip */}
        {hoveredId && (
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-lg text-xs pointer-events-none"
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              color: "#374151",
              boxShadow: "0 2px 8px rgba(0,0,0,0.09)",
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background:
                  hoveredId === SOURCE_NODE_ID ? "#dc2626" :
                    hoveredId === destId ? "#16a34a" :
                      activeNodeSet.has(hoveredId) ? "#2563eb" :
                        "#9ca3af",
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
      <div
        className="w-80 flex flex-col overflow-y-auto"
        style={{
          background: "#ffffff",
          borderLeft: "1px solid #e5e7eb",
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{ borderBottom: "1px solid #f3f4f6", background: "#fafafa" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
          >
            <Zap className="w-5 h-5" style={{ color: "#dc2626" }} />
          </div>
          <div>
            <div style={{ color: "#111827", fontWeight: 700, fontSize: 14 }}>Power Outage Map</div>
            <div style={{ color: "#9ca3af", fontSize: 10, marginTop: 1 }}>Dijkstra Pathfinder</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-5 p-5">

          {/* Source node indicator */}
          <div
            className="rounded-xl p-3.5 flex items-start gap-3"
            style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}
          >
            <Zap className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#ea580c" }} />
            <div>
              <div style={{ fontSize: 9, color: "#9a3412", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                Source (Fixed)
              </div>
              <div style={{ color: "#7c2d12", fontWeight: 700, fontSize: 12, marginTop: 2 }}>
                Node 65
              </div>
              <div style={{ color: "#c2410c", fontSize: 10, marginTop: 1 }}>
                Regional Electricity Board
              </div>
            </div>
          </div>

          {/* Destination input */}
          <div>
            <label style={{ display: "block", fontSize: 9, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 6 }}>
              Destination Node
            </label>
            <input
              type="text"
              value={destInput}
              onChange={(e) => setDestInput(e.target.value)}
              placeholder="Node number  (e.g. 89)"
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 8,
                border: "1px solid #d1d5db", background: "#f9fafb",
                color: "#111827", fontSize: 12, outline: "none",
                fontFamily: "inherit", boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
            />
          </div>

          {/* Path input */}
          <div>
            <label style={{ display: "block", fontSize: 9, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 6 }}>
              Shortest Path (node IDs)
            </label>
            <input
              type="text"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              onKeyDown={(e: ReactKeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") handleHighlight();
              }}
              placeholder="e.g.  65, 23, 45, 89"
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 8,
                border: "1px solid #d1d5db", background: "#f9fafb",
                color: "#111827", fontSize: 12, outline: "none",
                fontFamily: "inherit", boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#f59e0b")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
            />
            <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 5 }}>
              Comma or space separated · Enter to apply
            </div>
          </div>

          {/* Distance input */}
          <div>
            <label style={{ display: "block", fontSize: 9, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 6 }}>
              Total Distance (km)
            </label>
            <input
              type="text"
              value={distInput}
              onChange={(e) => setDistInput(e.target.value)}
              placeholder="e.g.  42.5"
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 8,
                border: "1px solid #d1d5db", background: "#f9fafb",
                color: "#111827", fontSize: 12, outline: "none",
                fontFamily: "inherit", boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onPress={handleHighlight}
              className="flex-1 text-xs font-bold rounded-lg py-2.5"
              style={{
                background: "#1d4ed8", color: "#ffffff",
                border: "none", letterSpacing: "0.04em",
              }}
            >
              Highlight Path
            </Button>
            <Button
              onPress={handleClear}
              variant="secondary"
              className="px-4 py-2.5 text-xs rounded-lg"
              style={{ background: "#f3f4f6", color: "#6b7280" }}
            >
              Clear
            </Button>
          </div>

          {/* ── Route result ── */}
          {activePath.length > 1 && (
            <div
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}
            >
              <div className="flex items-center gap-2">
                <Route className="w-3.5 h-3.5" style={{ color: "#0284c7" }} />
                <span style={{ fontSize: 9, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 700 }}>
                  Shortest Route
                </span>
              </div>

              {distInput && (
                <div
                  className="self-start px-3 py-1.5 rounded-lg"
                  style={{
                    background: "#fffbeb", border: "1px solid #fde68a",
                    color: "#92400e", fontWeight: 700, fontSize: 13,
                  }}
                >
                  📍 {distInput} km
                </div>
              )}

              {/* Human-readable summary */}
              <div
                className="rounded-lg p-3"
                style={{ background: "#e0f2fe", fontSize: 10, color: "#0369a1", lineHeight: 1.8 }}
              >
                {distInput && (
                  <><span style={{ fontWeight: 700, color: "#92400e" }}>{distInput} km</span> via </>
                )}
                {activePath.slice(1, -1).map((id, i) => (
                  <span key={id}>
                    <span style={{ color: "#1d4ed8" }}>node {nodeLabel(id)}</span>
                    {i < activePath.length - 3 && <span style={{ color: "#7dd3fc" }}> → </span>}
                  </span>
                ))}
                {activePath.length > 2 && <span style={{ color: "#7dd3fc" }}> → </span>}
                <span style={{ color: "#15803d", fontWeight: 700 }}>
                  node {nodeLabel(activePath.at(-1)!)}
                </span>
                <span style={{ color: "#94a3b8" }}> from Electricity Dept.</span>
              </div>

              {/* Node chip trail */}
              <div className="flex flex-wrap items-center gap-1">
                {activePath.map((id, i) => {
                  const isFirst = i === 0;
                  const isLast = i === activePath.length - 1;
                  return (
                    <React.Fragment key={id}>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md"
                        style={{
                          fontSize: 10, fontWeight: 700,
                          background: isFirst ? "#fee2e2" : isLast ? "#dcfce7" : "#dbeafe",
                          color: isFirst ? "#dc2626" : isLast ? "#15803d" : "#1d4ed8",
                          border: `1px solid ${isFirst ? "#fca5a5" : isLast ? "#86efac" : "#93c5fd"}`,
                        }}
                      >
                        {isFirst ? "⚡ " : ""}{nodeLabel(id)}{isLast ? " 📍" : ""}
                      </span>
                      {!isLast && (
                        <span style={{ color: "#cbd5e1", fontSize: 10 }}>›</span>
                      )}
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

        {/* ── Legend ── */}
        <div
          className="px-5 py-4 flex flex-col gap-2"
          style={{ borderTop: "1px solid #f3f4f6", background: "#fafafa" }}
        >
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
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: color + "22", border: `1.5px solid ${color}` }}
              />
              <span style={{ fontSize: 10, color: "#6b7280" }}>{label}</span>
            </div>
          ))}

          <div className="flex items-center gap-2.5 mt-1">
            <div
              className="w-8 h-0.5 rounded-full shrink-0"
              style={{ background: "linear-gradient(90deg, #1d4ed8, #60a5fa, #1d4ed8)" }}
            />
            <span style={{ fontSize: 10, color: "#6b7280" }}>Active route (animated)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-0.5 rounded-full shrink-0" style={{ background: "#c8bfb4" }} />
            <span style={{ fontSize: 10, color: "#6b7280" }}>Road / edge</span>
          </div>

          <div style={{ marginTop: 8, fontSize: 9, color: "#d1d5db" }}>
            Scroll to zoom · Drag to pan · Edge labels = km
          </div>
        </div>
      </div>
    </div>
  );
}

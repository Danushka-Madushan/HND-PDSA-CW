import type { MapData, NodeData, OutageRecord } from 'outage-tracker';
import SVGMap from './SVGMap';
import { useMemo, type Dispatch, type RefObject, type SetStateAction } from 'react';
import ZoomControls from './ZoomControls';
import DpadControls from './DpadControls';
import ActionBar from './ActionBar';
import ShortestRouteOverlay from './ShortestRouteOverlay';

interface Props {
  containerRef: RefObject<HTMLDivElement | null>,
  activePath: string[],
  activeDistance: string,
  handleClearRoute: () => void,
  zoomIn: () => void,
  zoomOut: () => void,
  resetView: () => void,
  PAN_STEP: number,
  startContinuousPan: (dx: number, dy: number) => void,
  stopContinuousPan: () => void,
  setOutageModalOpen: Dispatch<SetStateAction<boolean>>,
  setActiveTab: React.Dispatch<React.SetStateAction<"report" | "list">>,
  outages: OutageRecord[],
  containerSize: {
    w: number;
    h: number;
  },

  /* SVGMap */
  bounds: {
    minX: number;
    minY: number;
    w: number;
    h: number;
  },
  pan: {
    x: number;
    y: number;
  },
  scale: number,
  hoveredId: string | null,
  isTransitioning: boolean,
  mapData: MapData,
  nodeMap: Map<string, NodeData>,
  edgeKey: (a: string, b: string) => string,
  activeEdgeKeys: Set<string>,
  directedActiveEdges: Map<string, {
    fromId: string;
    toId: string;
  }>,
  showWeightLabels: boolean,
  SOURCE_NODE_ID: string,
  R_BASE: number,
  R_SOURCE: number,
  R_PATH: number,
  R_DEST: number,
  setHoveredId: Dispatch<SetStateAction<string | null>>,
  destId: string | null,
  activeNodeSet: Set<string>,
  nodeLabel: (id: string) => string,
}

const MapCanvas = ({
  bounds, pan, scale, isTransitioning, mapData, hoveredId,
  nodeMap, edgeKey, activeEdgeKeys, directedActiveEdges,
  showWeightLabels, SOURCE_NODE_ID, destId, activeNodeSet,
  setHoveredId, nodeLabel, R_BASE, R_DEST, R_PATH, R_SOURCE,
  containerRef, activePath, activeDistance, handleClearRoute,
  resetView, zoomIn, zoomOut, PAN_STEP, startContinuousPan, stopContinuousPan,
  outages, setOutageModalOpen, setActiveTab, containerSize
}: Props) => {
  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[#f2ede6]">

      {/* Blueprint grid — Optimized with transform to stay on GPU */}
      <div
        className="absolute pointer-events-none"
        style={{
          inset: "-100px",
          backgroundImage:
            "linear-gradient(rgba(160,148,132,0.15) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(160,148,132,0.15) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          transform: `translate(${pan.x % 48}px, ${pan.y % 48}px)`,
          willChange: "transform",
        }}
      />

      {/* ── SVG Map ── */}
      <SVGMap
        R_BASE={R_BASE}
        R_DEST={R_DEST}
        R_PATH={R_PATH}
        R_SOURCE={R_SOURCE}
        SOURCE_NODE_ID={SOURCE_NODE_ID}
        activeEdgeKeys={activeEdgeKeys}
        activeNodeSet={activeNodeSet}
        bounds={bounds}
        destId={destId}
        directedActiveEdges={directedActiveEdges}
        edgeKey={edgeKey}
        hoveredId={hoveredId}
        isTransitioning={isTransitioning}
        mapData={mapData}
        nodeLabel={nodeLabel}
        nodeMap={nodeMap}
        pan={pan}
        scale={scale}
        setHoveredId={setHoveredId}
        showWeightLabels={showWeightLabels}
      />

      {/* Shortest Route overlay — top-right of the map canvas Appears
            when a route is active. Minimal, professional design. */}
      {activePath.length > 1 && (
        <ShortestRouteOverlay
          activeDistance={activeDistance}
          activePath={activePath}
          handleClearRoute={handleClearRoute}
          nodeLabel={nodeLabel}
          nodeMap={nodeMap}
        />
      )}

      {/* ── Zoom controls (bottom-left) ── */}
      <ZoomControls
        resetView={resetView}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
      />

      {/* ── D-pad pan controls (bottom-right) ── */}
      <DpadControls
        PAN_STEP={PAN_STEP}
        startContinuousPan={startContinuousPan}
        stopContinuousPan={stopContinuousPan}
      />

      {/* Floating Action Bar — bottom-centre */}
      <ActionBar
        mapData={mapData}
        outages={outages}
        setActiveTab={setActiveTab}
        setOutageModalOpen={setOutageModalOpen}
      />

      {/* Node hover tooltip — anchored to node screen position, scales with zoom */}
      {useMemo(() => {
        if (!hoveredId || containerSize.w === 0) return null;
        const node = nodeMap.get(hoveredId);
        if (!node) return null;

        /* Reproduce SVG preserveAspectRatio="xMidYMid meet" → CSS-transform pipeline */
        const W = containerSize.w;
        const H = containerSize.h;
        const baseScale = Math.min(W / bounds.w, H / bounds.h);
        const baseX = (node.x - bounds.minX) * baseScale + (W - bounds.w * baseScale) / 2;
        const baseY = (node.y - bounds.minY) * baseScale + (H - bounds.h * baseScale) / 2;

        /* Apply the CSS transform: translate(pan) scale(s) with origin at (W/2, H/2) */
        const screenX = (baseX - W / 2) * scale + W / 2 + pan.x;
        const screenY = (baseY - H / 2) * scale + H / 2 + pan.y;

        const isSource = hoveredId === SOURCE_NODE_ID;
        const isDest = hoveredId === destId;
        const isOnPath = activeNodeSet.has(hoveredId);

        const accentColor =
          isSource ? "#dc2626" :
            isDest ? "#16a34a" :
              isOnPath ? "#1d4ed8" : "#475569";

        const nodeRole =
          isSource ? "Source · CEB" :
            isDest ? "Destination" :
              isOnPath ? "On Active Route" : null;

        /* Scale tooltip gently with zoom — capped at 1.5× so it never dominates the map */
        const tScale = Math.max(1, Math.min(scale, 1.5));

        /* Content-aware width: estimate from label + name character lengths rather than fixed value */
        const labelChars = nodeLabel(hoveredId).length;
        const nameChars = (node.name ?? "—").length;
        /* badge ≈ chars*8+20px, gap 8px, name ≈ chars*7px, outer padding 24px */
        const baseEstimate = labelChars * 8 + 20 + 8 + nameChars * 7 + 24;
        const TW = Math.round(Math.min(Math.max(baseEstimate, 110), 230) * tScale);

        /* Tooltip card height: main row + optional role row + padding */
        const cardH = Math.round((nodeRole ? 58 : 38) * tScale);
        const caretH = Math.round(6 * tScale);
        const gap = 4;

        /* Clamp horizontally and vertically so tooltip never leaves the canvas */
        const tipLeft = Math.max(6, Math.min(screenX - TW / 2, W - TW - 6));
        const tipTop = Math.max(6, screenY - cardH - caretH - gap);

        /* Caret offset — stays inside the card */
        const caretOffset = Math.min(
          Math.max(screenX - tipLeft - caretH, Math.round(8 * tScale)),
          TW - Math.round(16 * tScale)
        );

        const sp = (base: number) => Math.round(base * tScale);
        const fs = (base: number) => Math.round(base * tScale);

        return (
          <div
            className="absolute pointer-events-none fade-in"
            style={{ left: tipLeft, top: tipTop, width: TW, zIndex: 50 }}
          >
            {/* Card */}
            <div style={{
              background: "#ffffff",
              border: `1.5px solid ${accentColor}28`,
              borderRadius: sp(8),
              boxShadow: `0 ${sp(3)}px ${sp(12)}px rgba(15,23,42,0.11)`,
              padding: `${sp(6)}px ${sp(10)}px`,
              display: "flex",
              flexDirection: "column",
              gap: sp(4),
              overflow: "hidden",
              position: "relative",
            }}>
              {/* Top accent bar */}
              <div style={{
                position: "absolute",
                top: 0, left: 0, right: 0,
                height: sp(2),
                background: accentColor,
                opacity: 0.7,
              }} />

              {/* Main row: badge + name */}
              <div style={{ display: "flex", alignItems: "center", gap: sp(7), marginTop: sp(2) }}>
                <span style={{
                  background: accentColor,
                  color: "#fff",
                  fontSize: fs(10),
                  fontWeight: 800,
                  borderRadius: sp(4),
                  padding: `${sp(2)}px ${sp(6)}px`,
                  fontFamily: "monospace",
                  flexShrink: 0,
                  letterSpacing: "0.04em",
                }}>
                  {nodeLabel(hoveredId)}
                </span>
                <span style={{
                  fontSize: fs(11),
                  fontWeight: 600,
                  color: "#0f172a",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {node.name ?? "—"}
                </span>
              </div>

              {/* Role row — only when relevant */}
              {nodeRole && (
                <div style={{
                  paddingTop: sp(3),
                  borderTop: `1px solid ${accentColor}15`,
                  fontSize: fs(9),
                  fontWeight: 600,
                  color: accentColor,
                  letterSpacing: "0.04em",
                }}>
                  {nodeRole}
                </div>
              )}
            </div>

            {/* Caret pointing down toward the node */}
            <div style={{
              width: 0, height: 0,
              borderLeft: `${caretH}px solid transparent`,
              borderRight: `${caretH}px solid transparent`,
              borderTop: `${caretH}px solid ${accentColor}28`,
              marginLeft: caretOffset,
            }} />
          </div>
        );
      }, [hoveredId, containerSize, nodeMap, bounds, scale, pan, SOURCE_NODE_ID, destId, activeNodeSet, nodeLabel])}
    </div>
  )
}

export default MapCanvas

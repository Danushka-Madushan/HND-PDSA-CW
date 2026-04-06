import type { MapData, NodeData } from 'outage-tracker';
import type { Dispatch, SetStateAction } from 'react';

interface Props {
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

const SVGMap = ({
  bounds, pan, scale, isTransitioning, mapData, hoveredId,
  nodeMap, edgeKey, activeEdgeKeys, directedActiveEdges,
  showWeightLabels, SOURCE_NODE_ID, destId, activeNodeSet,
  setHoveredId, nodeLabel, R_BASE, R_DEST, R_PATH, R_SOURCE
}: Props) => {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.w} ${bounds.h}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
        transformOrigin: "50% 50%",
        transition: isTransitioning ? "transform 0.72s cubic-bezier(0.22, 1, 0.36, 1)" : "none",
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
  )
}

export default SVGMap

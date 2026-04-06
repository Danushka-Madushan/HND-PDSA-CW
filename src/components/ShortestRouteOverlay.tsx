import { MapPin, Route, X } from 'lucide-react';
import type { NodeData } from 'outage-tracker';
import { Fragment } from 'react/jsx-runtime';

interface Props {
  handleClearRoute: () => void,
  activeDistance: string,
  activePath: string[],
  nodeLabel: (id: string) => string,
  nodeMap: Map<string, NodeData>
}

const ShortestRouteOverlay = ({
  handleClearRoute, activeDistance, activePath, nodeLabel, nodeMap
}: Props) => {
  return (
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
            <Fragment key={id}>
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
            </Fragment>
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
  )
}

export default ShortestRouteOverlay

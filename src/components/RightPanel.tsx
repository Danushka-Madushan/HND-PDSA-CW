import { CheckCircle2, MapPin, Route, X, Zap } from 'lucide-react';
import type { OutageRecord, OutageRoute } from 'outage-tracker';

interface Props {
  outageRoutes: OutageRoute[],
  activePath: string[],
  parsedRoutePaths: Map<string, string[]>,
  handleRouteFromOutage: (route: OutageRoute) => void,
  handleClearRoute: () => void,
  outages: OutageRecord[]
}

const RightPanel = ({
  outageRoutes, activePath, parsedRoutePaths, handleRouteFromOutage,
  handleClearRoute, outages
}: Props) => {

  return (
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
          {outageRoutes.map((route) => {
            const isActive = activePath.length > 1 && (parsedRoutePaths.get(route.id)?.join() ?? "") === activePath.join();
            const pColor = route.priority >= 8 ? "#dc2626" : route.priority >= 5 ? "#ea580c" : "#16a34a";
            
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
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.14em" }}>
                      {route.sector}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                      {route.label}
                    </div>
                  </div>
                  <div 
                    className="flex flex-col items-center justify-center rounded-lg px-2 py-1 shrink-0"
                    style={{ background: pColor + "15", border: `1px solid ${pColor}33` }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 800, color: pColor, lineHeight: 1 }}>{route.priority}</span>
                    <span style={{ fontSize: 7, fontWeight: 700, color: pColor, opacity: 0.8, textTransform: "uppercase", marginTop: 1 }}>P</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5" style={{ fontSize: 11, color: "#64748b" }}>
                  <MapPin size={11} style={{ color: "#94a3b8" }} />
                  <span className='min-w-12'>{route.distance} km</span>
                  <span style={{ color: "#e2e8f0" }}>·</span>
                  <span style={{ fontFamily: "monospace", color: "#94a3b8", fontSize: 10 }}>{route.nodePath}</span>
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
  )
}

export default RightPanel

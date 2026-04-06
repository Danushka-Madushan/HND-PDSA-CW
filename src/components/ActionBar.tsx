import { AlertTriangle, MapPin } from 'lucide-react';
import type { MapData, OutageRecord } from 'outage-tracker';
import type { Dispatch, SetStateAction } from 'react';

interface Props {
  mapData: MapData,
  setOutageModalOpen: Dispatch<SetStateAction<boolean>>,
  setActiveTab: React.Dispatch<React.SetStateAction<"report" | "list">>,
  outages: OutageRecord[],
}

const ActionBar = ({
  mapData, setOutageModalOpen, setActiveTab, outages
}: Props) => {
  return (
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
  )
}

export default ActionBar

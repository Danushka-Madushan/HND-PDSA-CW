import { AlertCircle, AlertTriangle, CheckCircle2, Home, MapPin, Phone, Search, Tag, User, X } from 'lucide-react';
import type { CityRecord, MapData, OutageRecord } from 'outage-tracker';
import type { Dispatch, SetStateAction } from 'react';

interface Props {
  setOutageModalOpen: Dispatch<SetStateAction<boolean>>,
  mapData: MapData,
  activeTab: "report" | "list",
  setActiveTab: React.Dispatch<React.SetStateAction<"report" | "list">>,
  outages: OutageRecord[],
  phoneSearch: string,
  handlePhoneSearch: (val: string) => void,
  searchResults: CityRecord[],
  handleReportOutageClick: (user: CityRecord) => void,
  priorityColor: (p: number) => {
    bg: string;
    border: string;
    text: string;
    badge: string;
  },
}

const OutageModal = ({
  setOutageModalOpen, mapData, activeTab, setActiveTab, outages, phoneSearch,
  handlePhoneSearch, searchResults, handleReportOutageClick, priorityColor
}: Props) => {
  return (
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
                    placeholder="Type phone number…  e.g. 771234567"
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
                {phoneSearch.trim().length < 3 && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Phone size={32} strokeWidth={1} style={{ color: "#cbd5e1" }} />
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>Enter a phone number to search</span>
                  </div>
                )}

                {phoneSearch.trim().length >= 3 && searchResults.length === 0 && (
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
  )
}

export default OutageModal

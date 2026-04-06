import { AlertTriangle } from 'lucide-react';
import type { CityRecord } from 'outage-tracker';
import type { Dispatch, SetStateAction } from 'react';

interface Props {
  pendingUser: CityRecord,
  priorityLevel: number,
  priorityColor: (p: number) => {
    bg: string;
    border: string;
    text: string;
    badge: string;
  },
  setPriorityLevel: Dispatch<SetStateAction<number>>,
  setPriorityModalOpen: Dispatch<SetStateAction<boolean>>,
  setPendingUser: Dispatch<SetStateAction<CityRecord | null>>,
  handleConfirmOutage: () => void
}

const PriorityModal = ({
  pendingUser, priorityLevel, priorityColor, setPriorityLevel,
  setPriorityModalOpen, setPendingUser, handleConfirmOutage
}: Props) => {
  return (
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
  )
}

export default PriorityModal

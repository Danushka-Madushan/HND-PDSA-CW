import { memo } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';

interface Props {
  zoomIn: () => void,
  zoomOut: () => void,
  resetView: () => void
}

const ZoomControls = memo(({
  resetView, zoomIn, zoomOut
}: Props) => {
  return (
    <div className="absolute bottom-6 left-5 flex flex-col gap-1.5">
      {([
        { icon: <Plus className="w-3.5 h-3.5" />, action: zoomIn },
        { icon: <Minus className="w-3.5 h-3.5" />, action: zoomOut },
        { icon: <RotateCcw className="w-3.5 h-3.5" />, action: resetView },
      ] as const).map(({ icon, action }, i) => (
        <button
          key={i}
          onClick={action}
          className="w-9 h-9 flex items-center justify-center rounded-lg transition-all"
          style={{ background: "#ffffff", border: "1px solid #e2e8f0", color: "#64748b", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#93c5fd"; e.currentTarget.style.color = "#1d4ed8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#64748b"; }}
        >
          {icon}
        </button>
      ))}
    </div>
  )
});

ZoomControls.displayName = 'ZoomControls';

export default ZoomControls;

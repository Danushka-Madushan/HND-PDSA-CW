import { memo } from 'react';
import { ArrowBigDown, ArrowBigLeft, ArrowBigRight, ArrowBigUp } from 'lucide-react';

interface Props {
  PAN_STEP: number,
  startContinuousPan: (dx: number, dy: number) => void,
  stopContinuousPan: () => void
}

const DpadControls = memo(({
  PAN_STEP, startContinuousPan, stopContinuousPan
}: Props) => {
  return (
    <div
      className="absolute bottom-6 right-5"
      style={{ display: "grid", gridTemplateColumns: "repeat(3, 36px)", gridTemplateRows: "repeat(3, 36px)", gap: 3 }}
    >
      {([
        null,
        { LabelIcon: ArrowBigUp, dx: 0, dy: PAN_STEP, title: "Pan up" },
        null,
        { LabelIcon: ArrowBigLeft, dx: PAN_STEP, dy: 0, title: "Pan left" },
        null,
        { LabelIcon: ArrowBigRight, dx: -PAN_STEP, dy: 0, title: "Pan right" },
        null,
        { LabelIcon: ArrowBigDown, dx: 0, dy: -PAN_STEP, title: "Pan down" },
        null,
      ] as const).map((btn, i) => {
        if (!btn) return <div key={i} />;
        const { LabelIcon, dx, dy, title } = btn;
        return (
          <button
            key={i}
            title={title}
            onMouseDown={() => startContinuousPan(dx, dy)}
            onMouseUp={stopContinuousPan}
            onMouseLeave={(e) => {
              stopContinuousPan();
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.borderColor = "#e2e8f0";
              e.currentTarget.style.color = "#64748b";
            }}
            className="flex items-center justify-center rounded-lg transition-all"
            style={{ background: "#ffffff", border: "1px solid #e2e8f0", color: "#64748b", boxShadow: "0 1px 3px rgba(0,0,0,0.07)", lineHeight: 1 }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#eff6ff";
              e.currentTarget.style.borderColor = "#93c5fd";
              e.currentTarget.style.color = "#1d4ed8";
            }}
          >
            <LabelIcon size={18} strokeWidth={1.5} />
          </button>
        );
      })}
    </div>
  )
});

DpadControls.displayName = 'DpadControls';

export default DpadControls;

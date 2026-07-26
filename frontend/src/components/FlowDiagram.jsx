// frontend/src/components/FlowDiagram.jsx
import { COLORS } from '../lib/theme.jsx';

export default function FlowDiagram({ phase, canWithdraw }) {
  return (
    <div
      className="flow-diagram"
      style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}` }}
    >
      <FlowNode label="Employer" sub="funds the stream" color={COLORS.employer} colorDim={COLORS.employerDim} />
      <FlowPipe active={phase === 'active'} color={COLORS.stream} speed={0.9} />
      <FlowNode label="Covenant" sub="StreamPay.cash" color={COLORS.stream} colorDim={COLORS.streamDim} accentBorder />
      <FlowPipe active={canWithdraw} color={COLORS.earned} speed={0.7} />
      <FlowNode label="Worker" sub="earns continuously" color={COLORS.earned} colorDim={COLORS.earnedDim} />
    </div>
  );
}

function FlowNode({ label, sub, color, colorDim, accentBorder }) {
  return (
    <div style={{ textAlign: 'center', flexShrink: 0 }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          background: colorDim,
          border: `1px solid ${accentBorder ? color : COLORS.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 8px',
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 10, color: COLORS.dim, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function FlowPipe({ active, color, speed }) {
  const dots = active ? [0, 1, 2] : [];
  return (
    <div className="flow-pipe" style={{ flex: 1, position: 'relative', height: 8 }}>
      <svg width="100%" height="8" viewBox="0 0 140 8" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
        <line x1="0" y1="4" x2="140" y2="4" stroke={COLORS.border} strokeWidth="2" />
      </svg>
      {dots.map((i) => (
        <div
          key={i}
          className="sp-dot"
          style={{
            position: 'absolute',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: color,
            animationDuration: `${1.6 / speed}s`,
            animationDelay: `${i * (1.6 / speed / 3)}s`,
          }}
        />
      ))}
    </div>
  );
}

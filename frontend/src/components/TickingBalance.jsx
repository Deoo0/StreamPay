// frontend/src/components/TickingBalance.jsx
import { COLORS } from '../lib/theme.jsx';
import { fmtSats, fmtClock, satsToBch } from '../lib/stream-math.js';

export default function TickingBalance({ phase, available, pctVested, isFullyVested, durationMs, elapsedMs, burnRatePerSec }) {
  return (
    <div
      className="ticking-balance"
      style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        textAlign: 'center',
        marginBottom: 24,
      }}
    >
      <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: '0.08em', marginBottom: 10 }}>
        WORKER · AVAILABLE TO WITHDRAW
      </div>
      <div
        className="sp-mono"
        style={{
          fontSize: 52,
          fontWeight: 500,
          color: phase === 'active' ? COLORS.earned : COLORS.dim,
          lineHeight: 1,
          animation: phase === 'active' ? 'sp-pulse 2.4s ease-in-out infinite' : 'none',
        }}
      >
        {fmtSats(available)} <span style={{ fontSize: 20, color: COLORS.muted }}>sats</span>
      </div>
      <div className="sp-mono" style={{ fontSize: 13, color: COLORS.muted, marginTop: 6 }}>
        {satsToBch(available)} BCH
        {phase === 'active' && (
          <span style={{ color: COLORS.stream, marginLeft: 10 }}>
            +{Math.round(burnRatePerSec).toLocaleString()} sats/sec
          </span>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ height: 6, background: COLORS.panel2, borderRadius: 3, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, pctVested)}%`,
              background: isFullyVested ? COLORS.earned : COLORS.stream,
              transition: 'width 0.1s linear',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COLORS.dim, marginTop: 6 }} className="sp-mono">
          <span>{phase === 'idle' ? '0% vested' : `${pctVested.toFixed(1)}% vested`}</span>
          <span>{isFullyVested ? 'fully vested' : phase === 'active' ? fmtClock(durationMs - elapsedMs) + ' remaining' : '—'}</span>
        </div>
      </div>
    </div>
  );
}

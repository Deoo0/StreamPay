// frontend/src/components/ActivityLog.jsx
import { RefreshCw, Wallet, ArrowRight, Ban, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { COLORS, ghostButton } from '../lib/theme.jsx';
import { fmtSats } from '../lib/stream-math.js';

export default function ActivityLog({ log, phase, speedMode, onReset }) {
  return (
    <div className="activity-log" style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}` }}>
      <div className="activity-header">
        <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: '0.08em' }}>ON-CHAIN ACTIVITY</div>
        {phase !== 'idle' && (
          <button onClick={onReset} style={ghostButton}>
            <RefreshCw size={13} /> New demo
          </button>
        )}
      </div>
      {log.length === 0 ? (
        <div style={{ color: COLORS.dim, fontSize: 13, padding: '8px 0' }}>No transactions yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {log.map((entry) => (
            <LogRow key={entry.id} entry={entry} speedMode={speedMode} />
          ))}
        </div>
      )}
    </div>
  );
}

function LogRow({ entry, speedMode }) {
  const icons = { deploy: <Wallet size={13} />, withdraw: <ArrowRight size={13} />, cancel: <Ban size={13} /> };
  const colors = { deploy: COLORS.employer, withdraw: COLORS.earned, cancel: COLORS.danger };
  return (
    <div
      className="log-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 10px',
        background: COLORS.panel2,
        borderRadius: 8,
        fontSize: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors[entry.type] }}>
        {icons[entry.type]}
        <span style={{ color: COLORS.text }}>{entry.label}</span>
      </div>
      <div className="log-row-details">
        <span className="sp-mono" style={{ color: COLORS.muted }}>{fmtSats(entry.amount)} sats</span>
        <span className="sp-mono" style={{ color: COLORS.dim, fontSize: 11 }}>
          {speedMode === 'regtest' ? <CheckCircle2 size={11} style={{ verticalAlign: -1 }} /> : <Clock size={11} style={{ verticalAlign: -1 }} />}
          {' '}{speedMode === 'regtest' ? 'mined instantly' : '~10 min avg'}
        </span>
        <span className="sp-mono" style={{ color: COLORS.dim, display: 'flex', alignItems: 'center', gap: 3 }}>
          {entry.txid}<ExternalLink size={10} />
        </span>
      </div>
    </div>
  );
}

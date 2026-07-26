// frontend/src/components/WorkerDashboard.jsx
import { Zap, ArrowRight } from 'lucide-react';
import { COLORS, Panel, PanelHeader, Stat, primaryButton } from '../lib/theme.jsx';
import { fmtSats, DUST_LIMIT } from '../lib/stream-math.js';

export default function WorkerDashboard({ phase, withdrawnSoFar, available, canWithdraw, finalSplit, onWithdraw }) {
  return (
    <Panel>
      <PanelHeader icon={<Zap size={16} />} title="Worker" color={COLORS.earned} />
      {phase === 'idle' && (
        <div style={{ color: COLORS.dim, fontSize: 13, lineHeight: 1.6, marginTop: 4 }}>
          Waiting for the employer to fund a stream. Once funded, salary vests continuously and can be withdrawn anytime.
        </div>
      )}
      {phase !== 'idle' && (
        <>
          <Stat label="Withdrawn so far" value={`${fmtSats(withdrawnSoFar)} sats`} />
          <Stat label="Available now" value={`${fmtSats(available)} sats`} accent={COLORS.earned} />
          {phase === 'active' && (
            <button
              onClick={onWithdraw}
              disabled={!canWithdraw}
              style={{
                ...primaryButton,
                background: canWithdraw ? COLORS.earned : COLORS.panel2,
                color: canWithdraw ? '#241a06' : COLORS.dim,
                cursor: canWithdraw ? 'pointer' : 'default',
                marginTop: 12,
              }}
            >
              <ArrowRight size={15} /> Withdraw {canWithdraw ? `${fmtSats(available)} sats` : ''}
            </button>
          )}
          {phase === 'active' && !canWithdraw && (
            <div style={{ fontSize: 11, color: COLORS.dim, marginTop: 8 }}>
              Below the {DUST_LIMIT}-sat dust limit — keep earning
            </div>
          )}
          {phase === 'ended' && finalSplit && (
            <div style={{ marginTop: 12, fontSize: 12, color: COLORS.muted }}>
              Received {fmtSats(finalSplit.worker)} final sats on cancellation
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
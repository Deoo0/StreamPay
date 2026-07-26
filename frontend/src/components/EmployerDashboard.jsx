// frontend/src/components/EmployerDashboard.jsx
import { Wallet, Play, Ban } from 'lucide-react';
import { COLORS, Panel, PanelHeader, Field, Stat, inputStyle, pillButton, primaryButton } from '../lib/theme.jsx';
import { fmtSats, satsToBch, DEMO_PRESETS } from '../lib/stream-math.js';

export default function EmployerDashboard({
  phase,
  salaryBch,
  setSalaryBch,
  durationSec,
  setDurationSec,
  totalDeposit,
  remainingInContract,
  finalSplit,
  onDeploy,
  onCancel,
}) {
  return (
    <Panel>
      <PanelHeader icon={<Wallet size={16} />} title="Employer" color={COLORS.employer} />
      {phase === 'idle' ? (
        <>
          <Field label="Salary (BCH)">
            <input
              type="number"
              min="0.001"
              step="0.1"
              value={salaryBch}
              onChange={(e) => setSalaryBch(Math.max(0.001, Number(e.target.value) || 0))}
              style={inputStyle}
            />
          </Field>
          <Field label="Demo pay period">
            <div style={{ display: 'flex', gap: 6 }}>
              {DEMO_PRESETS.map((p) => (
                <button
                  key={p.seconds}
                  onClick={() => setDurationSec(p.seconds)}
                  style={{
                    ...pillButton,
                    background: durationSec === p.seconds ? COLORS.employerDim : 'transparent',
                    borderColor: durationSec === p.seconds ? COLORS.employer : COLORS.border,
                    color: durationSec === p.seconds ? COLORS.text : COLORS.muted,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: COLORS.dim, marginTop: 6 }}>
              Represents ~{DEMO_PRESETS.find((p) => p.seconds === durationSec)?.real} in a real deployment, compressed for the demo
            </div>
          </Field>
          <button onClick={onDeploy} style={{ ...primaryButton, background: COLORS.employer, color: '#0A1310' }}>
            <Play size={15} /> Fund stream
          </button>
        </>
      ) : (
        <>
          <Stat label="Total deposit" value={`${fmtSats(totalDeposit)} sats`} sub={`${satsToBch(totalDeposit)} BCH`} />
          <Stat label="Still in covenant" value={`${fmtSats(remainingInContract)} sats`} />
          {phase === 'active' && (
            <button
              onClick={onCancel}
              style={{ ...primaryButton, background: 'transparent', border: `1px solid ${COLORS.danger}`, color: COLORS.danger, marginTop: 12 }}
            >
              <Ban size={15} /> Cancel stream
            </button>
          )}
          {phase === 'ended' && finalSplit && (
            <div style={{ marginTop: 12, fontSize: 12, color: COLORS.muted }}>
              Refunded {fmtSats(finalSplit.employer)} sats unearned remainder
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
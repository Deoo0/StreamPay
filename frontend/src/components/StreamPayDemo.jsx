import { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Square, RefreshCw, ArrowRight, Wallet, Zap, ExternalLink, Ban, CheckCircle2, Clock } from 'lucide-react';

const COLORS = {
  void: '#0A1310',
  panel: '#101C17',
  panel2: '#16241D',
  border: '#223129',
  borderStrong: '#324A3D',
  text: '#EAF3EE',
  muted: '#7E9389',
  dim: '#4B5D53',
  stream: '#2FE0A0',
  streamDim: '#1A5C42',
  earned: '#F0B94A',
  earnedDim: '#5C4A1E',
  employer: '#7B93AE',
  employerDim: '#2E3B48',
  danger: '#E2604A',
  dangerDim: '#4A2A21',
};

const DUST_LIMIT = 546;
const MINER_FEE = 1000;
const DEMO_PRESETS = [
  { label: '30 sec', seconds: 30, real: '30 days' },
  { label: '60 sec', seconds: 60, real: '30 days' },
  { label: '120 sec', seconds: 120, real: '90 days' },
];

function satsToBch(sats) {
  return (sats / 1e8).toFixed(8).replace(/0+$/, '').replace(/\.$/, '.0');
}

function fmtSats(sats) {
  return Math.max(0, Math.round(sats)).toLocaleString('en-US');
}

function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

function shortTxid(seed) {
  const chars = 'abcdef0123456789';
  let out = '';
  let x = seed;
  for (let i = 0; i < 8; i++) {
    x = (x * 9301 + 49297) % 233280;
    out += chars[Math.floor((x / 233280) * chars.length)];
  }
  return out;
}

export default function StreamPayDemo() {
  const [salaryBch, setSalaryBch] = useState(1);
  const [durationSec, setDurationSec] = useState(60);
  const [speedMode, setSpeedMode] = useState('regtest');
  const [phase, setPhase] = useState('idle');
  const [startTime, setStartTime] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [withdrawnSoFar, setWithdrawnSoFar] = useState(0);
  const [log, setLog] = useState([]);
  const [finalSplit, setFinalSplit] = useState(null);
  const txSeed = useRef(1);

  useEffect(() => {
    if (phase !== 'active') return;
    const id = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(id);
  }, [phase]);

  const totalDeposit = Math.round(salaryBch * 1e8);
  const durationMs = durationSec * 1000;
  const endTime = startTime ? startTime + durationMs : null;
  const elapsedMs = startTime ? Math.min(Math.max(now - startTime, 0), durationMs) : 0;
  const unlockedTotal = startTime ? Math.floor((totalDeposit * elapsedMs) / durationMs) : 0;
  const available = phase === 'active' ? Math.max(0, unlockedTotal - withdrawnSoFar) : 0;
  const pctVested = startTime ? (elapsedMs / durationMs) * 100 : 0;
  const isFullyVested = phase === 'active' && elapsedMs >= durationMs;
  const remainingInContract = totalDeposit - withdrawnSoFar;

  const burnRatePerSec = totalDeposit / durationSec;

  function pushLog(entry) {
    txSeed.current += 1;
    setLog((l) => [{ ...entry, id: txSeed.current, txid: shortTxid(txSeed.current), at: Date.now() }, ...l]);
  }

  function handleDeploy() {
    const t = Date.now();
    setStartTime(t);
    setNow(t);
    setWithdrawnSoFar(0);
    setFinalSplit(null);
    setLog([]);
    setPhase('active');
    pushLog({ type: 'deploy', label: 'Stream funded', amount: totalDeposit, who: 'employer' });
  }

  function handleWithdraw() {
    if (available < DUST_LIMIT && !isFullyVested) return;
    const amt = available;
    if (amt <= 0) return;
    setWithdrawnSoFar((w) => w + amt);
    pushLog({ type: 'withdraw', label: 'Worker withdrew', amount: amt, who: 'worker' });
  }

  function handleCancel() {
    const earnedNotWithdrawn = unlockedTotal - withdrawnSoFar;
    const refund = remainingInContract - earnedNotWithdrawn - MINER_FEE;
    pushLog({ type: 'cancel', label: 'Stream cancelled', amount: earnedNotWithdrawn, who: 'employer', refund: Math.max(0, refund) });
    setFinalSplit({ worker: earnedNotWithdrawn, employer: Math.max(0, refund) });
    setPhase('ended');
  }

  function handleReset() {
    setPhase('idle');
    setStartTime(null);
    setWithdrawnSoFar(0);
    setLog([]);
    setFinalSplit(null);
  }

  const canWithdraw = phase === 'active' && (available >= DUST_LIMIT || isFullyVested) && available > 0;

  return (
    <div
      style={{
        background: COLORS.void,
        color: COLORS.text,
        fontFamily: "'Inter', system-ui, sans-serif",
        borderRadius: 16,
        padding: '2.5rem',
        maxWidth: 880,
        margin: '0 auto',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
        .sp-display { font-family: 'Space Grotesk', sans-serif; }
        .sp-mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
        @keyframes sp-flow {
          0% { offset-distance: 0%; opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        .sp-dot {
          offset-path: path('M0,4 H140');
          animation: sp-flow linear infinite;
        }
        @keyframes sp-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>

      <div style={{ fontSize: 12, letterSpacing: '0.12em', color: COLORS.muted, marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
        CASH 3.0 BUILDERS ARENA · LIVE COVENANT DEMO
      </div>
      <h1 className="sp-display" style={{ fontSize: 34, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
        StreamPay
      </h1>
      <p style={{ color: COLORS.muted, fontSize: 14, marginTop: 6, marginBottom: 32, maxWidth: 520 }}>
        Money that drips into a worker's wallet as they work, enforced by a BCH covenant, not a company's backend. This is a visual simulation of the demo flow, not connected to a real chain.
      </p>

      <div
        style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 14,
          padding: '2rem',
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

      <div
        style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 14,
          padding: '1.5rem 2rem',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <FlowNode label="Employer" sub="funds the stream" color={COLORS.employer} colorDim={COLORS.employerDim} />
        <FlowPipe active={phase === 'active'} color={COLORS.stream} speed={0.9} />
        <FlowNode label="Covenant" sub="StreamPay.cash" color={COLORS.stream} colorDim={COLORS.streamDim} accentBorder />
        <FlowPipe active={canWithdraw} color={COLORS.earned} speed={0.7} />
        <FlowNode label="Worker" sub="earns continuously" color={COLORS.earned} colorDim={COLORS.earnedDim} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Panel accent={COLORS.employer}>
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
              <button onClick={handleDeploy} style={{ ...primaryButton, background: COLORS.employer, color: '#0A1310' }}>
                <Play size={15} /> Fund stream
              </button>
            </>
          ) : (
            <>
              <Stat label="Total deposit" value={`${fmtSats(totalDeposit)} sats`} sub={`${satsToBch(totalDeposit)} BCH`} />
              <Stat label="Still in covenant" value={`${fmtSats(remainingInContract)} sats`} />
              {phase === 'active' && (
                <button onClick={handleCancel} style={{ ...primaryButton, background: 'transparent', border: `1px solid ${COLORS.danger}`, color: COLORS.danger, marginTop: 12 }}>
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

        <Panel accent={COLORS.earned}>
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
                  onClick={handleWithdraw}
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
      </div>

      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: '0.08em' }}>ON-CHAIN ACTIVITY</div>
          {phase !== 'idle' && (
            <button onClick={handleReset} style={{ ...ghostButton }}>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: COLORS.dim }}>
        <span>Simulated locally for demo purposes — no real BCH moves here.</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {['regtest', 'chipnet'].map((m) => (
            <button
              key={m}
              onClick={() => setSpeedMode(m)}
              style={{
                ...pillButton,
                padding: '3px 10px',
                fontSize: 10,
                background: speedMode === m ? COLORS.panel2 : 'transparent',
                borderColor: speedMode === m ? COLORS.borderStrong : COLORS.border,
                color: speedMode === m ? COLORS.text : COLORS.dim,
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
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
    <div style={{ flex: 1, position: 'relative', height: 8, minWidth: 60 }}>
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

function Panel({ children, accent }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: '1.25rem 1.5rem' }}>
      {children}
    </div>
  );
}

function PanelHeader({ icon, title, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color }}>
      {icon}
      <span className="sp-display" style={{ fontSize: 15, fontWeight: 600, color: COLORS.text }}>{title}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Stat({ label, value, sub, accent }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: COLORS.muted }}>{label}</div>
      <div className="sp-mono" style={{ fontSize: 18, color: accent || COLORS.text, marginTop: 2 }}>{value}</div>
      {sub && <div className="sp-mono" style={{ fontSize: 11, color: COLORS.dim }}>{sub}</div>}
    </div>
  );
}

function LogRow({ entry, speedMode }) {
  const icons = { deploy: <Wallet size={13} />, withdraw: <ArrowRight size={13} />, cancel: <Ban size={13} /> };
  const colors = { deploy: COLORS.employer, withdraw: COLORS.earned, cancel: COLORS.danger };
  return (
    <div
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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

const inputStyle = {
  width: '100%',
  background: COLORS.panel2,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: '8px 10px',
  color: COLORS.text,
  fontSize: 14,
  fontFamily: "'IBM Plex Mono', monospace",
  boxSizing: 'border-box',
};

const pillButton = {
  border: '1px solid',
  borderRadius: 999,
  padding: '5px 12px',
  fontSize: 12,
  background: 'transparent',
  cursor: 'pointer',
};

const primaryButton = {
  width: '100%',
  border: 'none',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 13,
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  cursor: 'pointer',
};

const ghostButton = {
  border: 'none',
  background: 'transparent',
  color: COLORS.dim,
  fontSize: 11,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  cursor: 'pointer',
};
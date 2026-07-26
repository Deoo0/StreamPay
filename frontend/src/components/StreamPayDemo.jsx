// frontend/src/components/StreamPayDemo.jsx
//
// Owns all stream state and the single shared "now" clock, then composes the
// split-out pieces below. Every child is presentational — the vesting math
// lives once, in lib/stream-math.js, and both this container and the
// contract itself agree on the same formula.
import { useState, useEffect, useRef } from 'react';
import { COLORS } from '../lib/theme.jsx';
import { computeUnlocked, shortTxid, DUST_LIMIT, MINER_FEE } from '../lib/stream-math.js';
import TickingBalance from './TickingBalance.jsx';
import FlowDiagram from './FlowDiagram.jsx';
import EmployerDashboard from './EmployerDashboard.jsx';
import WorkerDashboard from './WorkerDashboard.jsx';
import ActivityLog from './ActivityLog.jsx';

export default function StreamPayDemo() {
  const [salaryBch, setSalaryBch] = useState(1);
  const [durationSec, setDurationSec] = useState(60);
  const [speedMode, setSpeedMode] = useState('regtest');
  const [phase, setPhase] = useState('idle'); // 'idle' | 'active' | 'ended'
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
  const { elapsedMs, unlockedTotal, pctVested, isFullyVested } = computeUnlocked({
    totalDeposit, startTime, durationMs, now,
  });
  const available = phase === 'active' ? Math.max(0, unlockedTotal - withdrawnSoFar) : 0;
  const remainingInContract = totalDeposit - withdrawnSoFar;
  const burnRatePerSec = totalDeposit / durationSec;
  const canWithdraw = phase === 'active' && (available >= DUST_LIMIT || isFullyVested) && available > 0;

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

  return (
    <div
      className="streampay-demo"
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

      <div className="demo-eyebrow" style={{ color: COLORS.muted }}>
        CASH 3.0 BUILDERS ARENA · LIVE COVENANT DEMO
      </div>
      <h1 className="sp-display demo-title" style={{ fontWeight: 600 }}>
        StreamPay
      </h1>
      <p className="demo-intro" style={{ color: COLORS.muted }}>
        Money that drips into a worker's wallet as they work, enforced by a BCH covenant, not a company's backend. This is a visual simulation of the demo flow, not connected to a real chain.
      </p>

      <TickingBalance
        phase={phase}
        available={available}
        pctVested={pctVested}
        isFullyVested={isFullyVested}
        durationMs={durationMs}
        elapsedMs={elapsedMs}
        burnRatePerSec={burnRatePerSec}
      />

      <FlowDiagram phase={phase} canWithdraw={canWithdraw} />

      <div className="dashboard-grid">
        <EmployerDashboard
          phase={phase}
          salaryBch={salaryBch}
          setSalaryBch={setSalaryBch}
          durationSec={durationSec}
          setDurationSec={setDurationSec}
          totalDeposit={totalDeposit}
          remainingInContract={remainingInContract}
          finalSplit={finalSplit}
          onDeploy={handleDeploy}
          onCancel={handleCancel}
        />
        <WorkerDashboard
          phase={phase}
          withdrawnSoFar={withdrawnSoFar}
          available={available}
          canWithdraw={canWithdraw}
          finalSplit={finalSplit}
          onWithdraw={handleWithdraw}
        />
      </div>

      <ActivityLog log={log} phase={phase} speedMode={speedMode} onReset={handleReset} />

      <div className="demo-footer" style={{ color: COLORS.dim }}>
        <span>Simulated locally for demo purposes — no real BCH moves here.</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {['regtest', 'chipnet'].map((m) => (
            <button
              key={m}
              onClick={() => setSpeedMode(m)}
              style={{
                border: '1px solid',
                borderRadius: 999,
                padding: '3px 10px',
                fontSize: 10,
                cursor: 'pointer',
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

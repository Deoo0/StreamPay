// frontend/src/lib/stream-math.js
//
// Same formula the contract enforces, kept in one place so the UI never
// shows a number the contract would reject. Mirrors StreamPay.cash V2:
//   duration = endTime - startTime
//   elapsed  = min(now - startTime, duration)
//   unlocked = (totalDeposit * elapsed) / duration

export const DUST_LIMIT = 546;
export const MINER_FEE = 1000;

export const DEMO_PRESETS = [
  { label: '30 sec', seconds: 30, real: '30 days' },
  { label: '60 sec', seconds: 60, real: '30 days' },
  { label: '120 sec', seconds: 120, real: '90 days' },
];

export function computeUnlocked({ totalDeposit, startTime, durationMs, now }) {
  if (!startTime) return { elapsedMs: 0, unlockedTotal: 0, pctVested: 0, isFullyVested: false };
  const elapsedMs = Math.min(Math.max(now - startTime, 0), durationMs);
  const unlockedTotal = Math.floor((totalDeposit * elapsedMs) / durationMs);
  const pctVested = (elapsedMs / durationMs) * 100;
  const isFullyVested = elapsedMs >= durationMs;
  return { elapsedMs, unlockedTotal, pctVested, isFullyVested };
}

export function satsToBch(sats) {
  return (sats / 1e8).toFixed(8).replace(/0+$/, '').replace(/\.$/, '.0');
}

export function fmtSats(sats) {
  return Math.max(0, Math.round(sats)).toLocaleString('en-US');
}

export function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export function shortTxid(seed) {
  const chars = 'abcdef0123456789';
  let out = '';
  let x = seed;
  for (let i = 0; i < 8; i++) {
    x = (x * 9301 + 49297) % 233280;
    out += chars[Math.floor((x / 233280) * chars.length)];
  }
  return out;
}
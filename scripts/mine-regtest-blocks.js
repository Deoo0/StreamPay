// scripts/mine-regtest-blocks.js
//
// Usage: node scripts/mine-regtest-blocks.js [intervalSeconds]
//
// Run this in a background terminal during rehearsal/demo. Mines one block
// every `intervalSeconds` (default 5) so the chain's median-time-past keeps
// pace with wall-clock time, which is what lets withdraw.js / cancel.js
// broadcast successfully without manually catching up MTP each time.

import RegtestRpcProvider from './lib/RegtestRpcProvider.js';
import { RPC_CONFIG } from './lib/config.js';

const intervalSeconds = Number(process.argv[2] ?? 5);
const provider = new RegtestRpcProvider(RPC_CONFIG);

console.log(`Mining 1 regtest block every ${intervalSeconds}s. Ctrl+C to stop.`);

async function tick() {
  try {
    const hashes = await provider.mineBlocks(1);
    const height = await provider.getBlockHeight();
    const mtp = await provider.getMedianTimePast();
    console.log(`[height ${height}] mined ${hashes[0]?.slice(0, 12)}... mtp=${mtp}`);
  } catch (err) {
    console.error('mine tick failed:', err.message);
  }
}

setInterval(tick, intervalSeconds * 1000);
tick();
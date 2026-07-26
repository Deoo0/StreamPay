// scripts/withdraw.js
//
// Usage: node scripts/withdraw.js
//
// Reads .streampay-state.json (written by deploy-stream.js), computes what's
// currently unlocked using the exact same formula as the contract and the
// frontend (lib/stream-math.js), withdraws it all, and broadcasts a real
// transaction to the regtest node. Mines 1 confirming block afterward.

import { readFileSync, writeFileSync } from 'node:fs';
import { Contract, TransactionBuilder } from 'cashscript';
import RegtestRpcProvider from './lib/RegtestRpcProvider.js';
import {
  employerPKH, workerPKH, workerPk, workerSigTemplate,
  p2pkhLockingBytecode, RPC_CONFIG, STATE_FILE, MINER_FEE, DUST_LIMIT,
} from './lib/config.js';

import artifact from '../contracts/artifacts/StreamPay.json' with { type: 'json' };

async function main() {
  const state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  const startTime = BigInt(state.startTime);
  const endTime = BigInt(state.endTime);
  const totalDeposit = BigInt(state.totalDeposit);
  const withdrawnSoFar = BigInt(state.withdrawnSoFar ?? '0');

  const provider = new RegtestRpcProvider(RPC_CONFIG);
  const contract = new Contract(
    artifact,
    [employerPKH, workerPKH, startTime, endTime, totalDeposit],
    { provider },
  );

  const utxos = await provider.getUtxos(contract.address);
  if (utxos.length === 0) {
    throw new Error(`No UTXO found at ${contract.address} — has the stream been deployed/funded, or already fully drained?`);
  }
  const contractUtxo = utxos[0];

  // Mine a block first so the chain's median-time-past has a chance to catch
  // up close to wall-clock (regtest blocks carry real timestamps, so a fresh
  // block nudges MTP forward). We then use MTP itself as tx.locktime, since
  // that's what consensus actually checks an absolute locktime against for
  // mempool acceptance — using raw Date.now() here would intermittently
  // produce "bad-txns-nonfinal" if MTP hasn't caught up yet, exactly the
  // real-network confirmation-lag behavior discussed in the project notes.
  // Catch the chain's MTP up to (at least) wall-clock time by mining extra
  // blocks if needed — makes this script self-sufficient even without a
  // separate mine-regtest-blocks.js running in the background.
  const wallNow = Math.floor(Date.now() / 1000);
  await provider.catchUpMedianTimePast(wallNow);
  const mtp = BigInt(await provider.getMedianTimePast());
  // Mempool acceptance requires nLockTime STRICTLY LESS than MTP (not <=),
  // so back off by one second from the raw MTP value.
  const now = mtp - 1n;
  const duration = endTime - startTime;
  const elapsed = now < startTime ? 0n : (now - startTime > duration ? duration : now - startTime);
  const unlockedTotal = (totalDeposit * elapsed) / duration;
  const available = unlockedTotal - withdrawnSoFar;

  console.log(`Contract UTXO: ${contractUtxo.satoshis} sats at ${contractUtxo.txid}:${contractUtxo.vout}`);
  console.log(`Using chain MTP ${now} as locktime (elapsed ${elapsed}s / ${duration}s) -> unlocked total ${unlockedTotal} sats, ${available} sats available now`);

  if (available <= 0n) {
    console.log('Nothing unlocked yet — try again shortly.');
    return;
  }
  if (available < DUST_LIMIT && elapsed < duration) {
    console.log(`Available (${available} sats) is below the ${DUST_LIMIT}-sat dust limit — keep earning.`);
    return;
  }

  const isFinalDrain = elapsed >= duration || (contractUtxo.satoshis - available - MINER_FEE) <= MINER_FEE;
  const builder = new TransactionBuilder({ provider })
    .addInput(contractUtxo, contract.unlock.withdraw(workerSigTemplate, workerPk, available));

  if (isFinalDrain) {
    const payout = contractUtxo.satoshis - MINER_FEE;
    builder.addOutput({ to: p2pkhLockingBytecode(workerPKH), amount: payout });
    console.log(`Final drain: paying worker the entire remaining ${payout} sats.`);
  } else {
    const remainingAfter = contractUtxo.satoshis - available - MINER_FEE;
    builder
      .addOutput({ to: p2pkhLockingBytecode(workerPKH), amount: available })
      .addOutput({ to: contract.address, amount: remainingAfter });
    console.log(`Paying worker ${available} sats, recreating covenant with ${remainingAfter} sats remaining.`);
  }

  builder.setLocktime(Number(now));
  const txDetails = await builder.send();
  console.log(`Broadcast withdraw tx: ${txDetails.txid}`);

  await provider.mineBlocks(1);
  console.log('Mined 1 confirming block.');

  state.withdrawnSoFar = (withdrawnSoFar + available).toString();
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

main().catch((err) => {
  console.error('withdraw failed:', err.message);
  process.exit(1);
});
// scripts/cancel.js
//
// Usage: node scripts/cancel.js
//
// Employer ends the stream early. Worker gets everything earned-but-not-yet-
// withdrawn, employer gets the unearned remainder refunded. One transaction.

import { readFileSync, unlinkSync } from 'node:fs';
import { Contract, TransactionBuilder } from 'cashscript';
import RegtestRpcProvider from './lib/RegtestRpcProvider.js';
import {
  employerPKH, workerPKH, employerPk, employerSigTemplate,
  p2pkhLockingBytecode, RPC_CONFIG, STATE_FILE, MINER_FEE,
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
    throw new Error(`No UTXO found at ${contract.address} — already fully withdrawn/cancelled?`);
  }
  const contractUtxo = utxos[0];

  // See withdraw.js for why we use chain MTP (minus one) rather than wall-clock.
  const wallNow = Math.floor(Date.now() / 1000);
  await provider.catchUpMedianTimePast(wallNow);
  const mtp = BigInt(await provider.getMedianTimePast());
  const now = mtp - 1n;

  const duration = endTime - startTime;
  const elapsed = now < startTime ? 0n : (now - startTime > duration ? duration : now - startTime);
  const unlockedTotal = (totalDeposit * elapsed) / duration;
  const earnedNotWithdrawn = unlockedTotal - withdrawnSoFar;
  const refundToEmployer = contractUtxo.satoshis - earnedNotWithdrawn - MINER_FEE;

  console.log(`Cancelling at MTP ${now}: worker gets ${earnedNotWithdrawn} sats earned-but-unwithdrawn, employer refunded ${refundToEmployer} sats`);

  const builder = new TransactionBuilder({ provider })
    .addInput(contractUtxo, contract.unlock.cancel(employerSigTemplate, employerPk))
    .addOutput({ to: p2pkhLockingBytecode(workerPKH), amount: earnedNotWithdrawn })
    .addOutput({ to: p2pkhLockingBytecode(employerPKH), amount: refundToEmployer });
  builder.setLocktime(Number(now));

  const txDetails = await builder.send();
  console.log(`Broadcast cancel tx: ${txDetails.txid}`);

  await provider.mineBlocks(1);
  console.log('Mined 1 confirming block. Stream ended.');

  unlinkSync(STATE_FILE);
  console.log('State file removed — stream is closed.');
}

main().catch((err) => {
  console.error('cancel failed:', err.message);
  process.exit(1);
});
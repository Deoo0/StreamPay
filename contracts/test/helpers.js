// contracts/test/helpers.js
//
// CORRECTION vs. the original brief: CashScript's current SDK (0.13.x) does NOT
// spin up a real regtest BCH node for automated testing. Instead it ships a
// `MockNetworkProvider` that evaluates transactions against the *actual compiled
// script* fully locally (no node, no network, instant, deterministic) — every
// require()/checkSig/introspection opcode really runs, it's just never mined.
//
// Two separate tools, two separate jobs in this project:
//   1. Unit tests / correctness (this file)  -> MockNetworkProvider.
//      Fast, run hundreds of times while iterating, no infra needed.
//   2. Live demo "real chain" wow-moment      -> an actual regtest BCH Node (BCHN),
//      blocks mined on a timer via RPC. That's scripts/mine-regtest-blocks.js,
//      a genuinely different layer this file does NOT touch.
//
// setupStream() gives each test a clean contract instance with a funded UTXO.
// buildWithdrawTx() builds (but doesn't send) a withdraw() tx pinned to a
// simulated "now" via TransactionBuilder.setLocktime(), so a test can pretend
// "2000 seconds have elapsed" instantly instead of waiting or mining anything.

import { Contract, MockNetworkProvider, TransactionBuilder, randomUtxo, SignatureTemplate } from 'cashscript';
import { hash160 } from '@cashscript/utils';
import { secp256k1 } from '@bitauth/libauth';
import artifact from '../artifacts/StreamPay.json' with { type: 'json' };

// ---- deterministic test keypairs -------------------------------------------------
// Fixed private keys (NEVER use these for anything real) so test output is stable.
const EMPLOYER_PRIV = Uint8Array.from(Buffer.from('11'.repeat(32), 'hex'));
const WORKER_PRIV = Uint8Array.from(Buffer.from('22'.repeat(32), 'hex'));

function pubkeyOf(privKey) {
  const result = secp256k1.derivePublicKeyCompressed(privKey);
  if (typeof result === 'string') throw new Error(result);
  return result;
}

export const employerPk = pubkeyOf(EMPLOYER_PRIV);
export const workerPk = pubkeyOf(WORKER_PRIV);
export const employerPKH = hash160(employerPk);
export const workerPKH = hash160(workerPk);

export const employerSigTemplate = new SignatureTemplate(EMPLOYER_PRIV);
export const workerSigTemplate = new SignatureTemplate(WORKER_PRIV);

// ---- stream default params (deliberately clean numbers, useful for demo too) -----
export const STREAM_DURATION_SECONDS = 3600n; // 1 hour demo stream
export const TOTAL_DEPOSIT = 360000n;         // 100 sats/sec average over that hour
export const MINER_FEE = 1000n;
export const DUST_LIMIT = 546n;

/** Standard P2PKH locking script: OP_DUP OP_HASH160 <pkh> OP_EQUALVERIFY OP_CHECKSIG */
export function p2pkhLockingBytecode(pkh) {
  return Uint8Array.from([0x76, 0xa9, 0x14, ...pkh, 0x88, 0xac]);
}

/**
 * Builds a fresh StreamPay contract instance wired to a MockNetworkProvider,
 * funds it with a UTXO of `totalDeposit`, and returns everything a test needs.
 */
export function setupStream(overrides = {}) {
  const startTime = overrides.startTime ?? BigInt(Math.floor(Date.now() / 1000));
  const endTime = overrides.endTime ?? (startTime + (overrides.durationSeconds ?? STREAM_DURATION_SECONDS));
  const totalDeposit = overrides.totalDeposit ?? TOTAL_DEPOSIT;

  const provider = new MockNetworkProvider();
  const contract = new Contract(
    artifact,
    [employerPKH, workerPKH, startTime, endTime, totalDeposit],
    { provider },
  );

  const contractUtxo = provider.addUtxo(
    contract.address,
    randomUtxo({ satoshis: totalDeposit }),
  );

  return { provider, contract, contractUtxo, startTime, endTime, totalDeposit };
}

/**
 * Build (not send) a withdraw() transaction at a simulated "now" (`atTime`),
 * spending `contractUtxo`. Pays `amount` to the worker; if `changeAmount` is
 * given, recreates the covenant with that much left over (2-output branch),
 * otherwise builds the 1-output "final drain" branch.
 */
export function buildWithdrawTx({ provider, contract, contractUtxo, amount, atTime, changeAmount }) {
  // The contract's two branches pay the worker different amounts than what was
  // "requested": the 2-output (stream continues) branch pays exactly `amount`,
  // but the 1-output (final drain) branch always pays the ENTIRE remaining
  // balance minus the miner fee, regardless of `amount`. `amount` in that case
  // only has to be large enough to push remainingAfter <= minerFee and trigger
  // the branch — it does not determine the payout. Omitting `changeAmount`
  // signals "build the drain branch", so compute the real payout here rather
  // than reusing the requested `amount`.
  const payout = changeAmount !== undefined
    ? amount
    : contractUtxo.satoshis - MINER_FEE;

  const builder = new TransactionBuilder({ provider })
    .addInput(contractUtxo, contract.unlock.withdraw(workerSigTemplate, workerPk, amount))
    .addOutput({ to: p2pkhLockingBytecode(workerPKH), amount: payout });

  if (changeAmount !== undefined && changeAmount > 0n) {
    builder.addOutput({ to: contract.address, amount: changeAmount });
  }
  builder.setLocktime(Number(atTime));
  return builder;
}

/** Build (not send) a cancel() transaction at a simulated "now" (`atTime`). */
export function buildCancelTx({ provider, contract, contractUtxo, workerAmount, employerAmount, atTime }) {
  const builder = new TransactionBuilder({ provider })
    .addInput(contractUtxo, contract.unlock.cancel(employerSigTemplate, employerPk))
    .addOutput({ to: p2pkhLockingBytecode(workerPKH), amount: workerAmount })
    .addOutput({ to: p2pkhLockingBytecode(employerPKH), amount: employerAmount });
  builder.setLocktime(Number(atTime));
  return builder;
}
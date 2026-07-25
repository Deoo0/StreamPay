// contracts/test/streampay.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  setupStream,
  buildWithdrawTx,
  buildCancelTx,
  MINER_FEE,
} from './helpers.js';

describe('StreamPay.withdraw', () => {
  it('happy path: worker withdraws exactly what has unlocked, covenant recreates itself', async () => {
    const { provider, contract, contractUtxo, startTime, endTime, totalDeposit } = setupStream();

    const duration = endTime - startTime;
    const elapsed = duration / 2n; // halfway through the stream
    const unlocked = (totalDeposit * elapsed) / duration; // 50% vested
    const amount = unlocked;
    const remainingAfter = contractUtxo.satoshis - amount - MINER_FEE;

    const tx = buildWithdrawTx({
      provider, contract, contractUtxo,
      amount,
      atTime: startTime + elapsed,
      changeAmount: remainingAfter,
    });

    await assert.doesNotReject(() => tx.send());
  });

  it('rejects withdrawing more than has unlocked so far', async () => {
    const { provider, contract, contractUtxo, startTime, endTime, totalDeposit } = setupStream();

    const duration = endTime - startTime;
    const elapsed = duration / 2n;
    const unlocked = (totalDeposit * elapsed) / duration;
    const amount = unlocked + 1n; // one sat too many
    const remainingAfter = contractUtxo.satoshis - amount - MINER_FEE;

    const tx = buildWithdrawTx({
      provider, contract, contractUtxo,
      amount,
      atTime: startTime + elapsed,
      changeAmount: remainingAfter,
    });

    await assert.rejects(() => tx.send());
  });

  it('rejects a withdraw attempted before startTime', async () => {
    const { provider, contract, contractUtxo, startTime } = setupStream();

    const tx = buildWithdrawTx({
      provider, contract, contractUtxo,
      amount: 1000n,
      atTime: startTime - 10n, // before genesis
      changeAmount: contractUtxo.satoshis - 1000n - MINER_FEE,
    });

    await assert.rejects(() => tx.send());
  });

  it('caps unlocked amount at totalDeposit at exactly endTime (no rounding loss at 100%)', async () => {
    const { provider, contract, contractUtxo, endTime, totalDeposit } = setupStream();

    // At exactly endTime, elapsed == duration, so unlocked == totalDeposit exactly
    // (this is why the contract computes totalDeposit * elapsed / duration rather
    // than capping a per-second rate — it avoids any rounding loss right at 100%).
    const amount = totalDeposit;

    const tx = buildWithdrawTx({
      provider, contract, contractUtxo,
      amount,
      atTime: endTime,
      // no changeAmount -> single-output final drain branch
    });

    await assert.doesNotReject(() => tx.send());
  });

  it('caps unlocked amount at totalDeposit even long after endTime has passed', async () => {
    const { provider, contract, contractUtxo, endTime, totalDeposit } = setupStream();

    const farFuture = endTime + 1_000_000n; // way past the stream's end
    const amount = totalDeposit;

    const tx = buildWithdrawTx({
      provider, contract, contractUtxo,
      amount,
      atTime: farFuture,
    });

    await assert.doesNotReject(() => tx.send());
  });

  it('final-drain branch: a withdrawal that would leave a sub-fee remainder must drain everything in one output', async () => {
    const { provider, contract, contractUtxo, endTime, totalDeposit } = setupStream();

    const farFuture = endTime + 10n; // fully vested
    // Ask for slightly less than the full deposit, so remainingAfter < minerFee
    // and the contract MUST take the final-drain branch, not the 2-output branch.
    const almostAll = totalDeposit - 500n;

    const tx = buildWithdrawTx({
      provider, contract, contractUtxo,
      amount: almostAll,
      atTime: farFuture,
      // deliberately omit changeAmount: forces buildWithdrawTx's 1-output path,
      // which must match what the contract itself computes for its drain branch
    });

    await assert.doesNotReject(() => tx.send());
  });

  it('rejects a withdraw where duration would be zero (endTime == startTime)', async () => {
    const startTime = BigInt(Math.floor(Date.now() / 1000));
    const { provider, contract, contractUtxo } = setupStream({ startTime, endTime: startTime });

    const tx = buildWithdrawTx({
      provider, contract, contractUtxo,
      amount: 1000n,
      atTime: startTime,
      changeAmount: contractUtxo.satoshis - 1000n - MINER_FEE,
    });

    await assert.rejects(() => tx.send());
  });
});

describe('StreamPay.cancel', () => {
  it('splits correctly between worker (earned) and employer (unearned refund)', async () => {
    const { provider, contract, contractUtxo, startTime, endTime, totalDeposit } = setupStream();

    const duration = endTime - startTime;
    const elapsed = duration / 4n; // 25% through the stream
    const earned = (totalDeposit * elapsed) / duration;
    const refund = totalDeposit - earned - MINER_FEE;

    const tx = buildCancelTx({
      provider, contract, contractUtxo,
      workerAmount: earned,
      employerAmount: refund,
      atTime: startTime + elapsed,
    });

    await assert.doesNotReject(() => tx.send());
  });

  it('rejects a cancel that shortchanges the worker', async () => {
    const { provider, contract, contractUtxo, startTime, endTime, totalDeposit } = setupStream();

    const duration = endTime - startTime;
    const elapsed = duration / 4n;
    const earned = (totalDeposit * elapsed) / duration;
    const shortchanged = earned - 1000n; // employer trying to keep more than they should
    const refund = totalDeposit - shortchanged - MINER_FEE;

    const tx = buildCancelTx({
      provider, contract, contractUtxo,
      workerAmount: shortchanged,
      employerAmount: refund,
      atTime: startTime + elapsed,
    });

    await assert.rejects(() => tx.send());
  });
});
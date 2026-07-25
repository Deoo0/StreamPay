# StreamPay (in progress)

Real-time payroll streaming on Bitcoin Cash, enforced by a CashScript covenant.

**V2 note:** the contract now takes `startTime` + `endTime` instead of `ratePerSecond` — see `changes.md`-style rationale below. Employers think in dates, not satoshis-per-second.

## Run it

```bash
npm install
npm test
```

Compiles `contracts/StreamPay.cash` with `cashc`, then runs the unit test suite (9 tests, all passing) against a `MockNetworkProvider` — no node, no network, instant.

## What's built and verified

- **`contracts/StreamPay.cash`** — V2: constructor is `(employerPKH, workerPKH, startTime, endTime, totalDeposit)`. Vesting is linear:
  ```
  duration = endTime - startTime
  elapsed  = min(tx.locktime - startTime, duration)
  unlocked = (totalDeposit * elapsed) / duration
  ```
  `elapsed` is capped at `duration` (rather than capping the final `unlocked` value) so that at exactly `endTime`, `unlocked` comes out to exactly `totalDeposit` with no rounding loss — dividing `totalDeposit * duration / duration` is exact, whereas capping after a rate-based multiplication can undershoot by a few sats.
- **`contracts/test/helpers.js`** — fixture: deterministic test keypairs, `setupStream()` (funds a fresh contract instance, defaults to a 1-hour stream), `buildWithdrawTx()` / `buildCancelTx()` (simulate any elapsed time instantly via `TransactionBuilder.setLocktime()`).
- **`contracts/test/streampay.test.js`** — 9 tests: happy-path withdraw, over-claim rejection, pre-`startTime` rejection, exact-100%-at-`endTime` (no rounding loss), cap holding long after `endTime`, final-drain branch, zero-duration guard rejection, and both `cancel()` cases.

## Corrections made while building (worth knowing before the hackathon)

1. **`tx.time` → `tx.locktime`.** Renamed in current CashScript. Fixed throughout.
2. **`lockingBytecode` is `bytes`, not `bytes25`.** Fixed in the `selfLock` variable.
3. **No built-in "regtest test framework."** Current CashScript SDK testing uses `MockNetworkProvider` — evaluates transactions against the actual compiled script fully in-memory, no node, no network, instant, deterministic. That's what `helpers.js` uses. **This is not a substitute for the live-demo regtest node** (still needed for the "watch it confirm on a real chain, sped up" moment) — that piece is still on the to-build list.
4. **Final-drain payout subtlety**: in `withdraw()`'s final-drain branch, the contract always pays the worker the *entire* remaining balance minus the miner fee — the `amount` argument only determines whether that branch triggers, not the payout. Frontend must show the true remaining balance, not the requested amount, once a withdrawal is large enough to trigger drain.
5. **V2 — division-before-truncation ordering matters.** `unlockedTotal = (totalDeposit * elapsed) / duration` deliberately does the multiplication first. Computing `totalDeposit / duration` first (a "rate") and then multiplying by `elapsed` would truncate to 0 whenever `totalDeposit < duration`, e.g. a 100,000-sat deposit over a 30-day (2,592,000-second) stream — the "rate" would round down to 0 sats/sec and nothing would ever unlock. Also worth knowing: `totalDeposit * elapsed` is computed as one intermediate value before dividing, so it needs to stay under BCH's ~9.22e18 script-number ceiling; this is nowhere close for any realistic payroll-scale deposit/duration, but would matter if someone later tests with deliberately extreme demo numbers.
6. **Zero-duration guard.** `require(endTime > startTime)` is checked before the duration/elapsed math runs, so a malformed `endTime == startTime` stream fails cleanly on that require rather than risking a division-by-zero deeper in the script.

## Frontend formula (unchanged shape from V1, new inputs)

```js
const startTime = Math.floor(Date.now() / 1000);
const endTime = startTime + (30 * 24 * 60 * 60); // e.g. 30-day pay period

// ticking display, recalculated every second, same formula the contract enforces:
const duration = endTime - startTime;
const elapsed = Math.min(Math.floor(Date.now() / 1000) - startTime, duration);
const unlocked = Math.floor((totalDeposit * elapsed) / duration);
const available = unlocked - alreadyWithdrawn;
```

Note: JS numbers lose precision above 2^53; for real sat amounts prefer `BigInt` arithmetic in the actual withdrawal-building code (this snippet is illustrative for the display formula only).

## Not yet built

- Real regtest BCH node setup + `scripts/mine-regtest-blocks.js` (the live-demo layer, separate from unit testing above)
- `scripts/deploy-stream.js`, `withdraw.js`, `cancel.js` (CLI proof-of-flow against a real node)
- Frontend (`TickingBalance.jsx`, dashboards) — now needs a date-range picker instead of a rate input
- Dust-limit edge case tests
- Day-by-day build schedule and demo script tailored to StreamPay
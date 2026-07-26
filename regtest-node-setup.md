# Regtest node setup

## Quick start

```bash
./scripts/start-regtest-node.sh
```

Downloads Bitcoin Cash Node v29.0.0 (Linux/macOS x86_64) into `regtest-node/`
if not already present, and starts `bitcoind -regtest` as a background daemon
with `-txindex=1` (needed so `getRawTransaction` works for arbitrary txids,
not just wallet-relevant ones).

If this is a fresh chain, mine 101 blocks so coinbase funds mature into
spendable balance (the script prints the exact commands):

```bash
ADDR=$(regtest-node/bitcoin-cli -regtest -datadir=.bchn-regtest-data -rpcuser=streampay -rpcpassword=streampay getnewaddress)
regtest-node/bitcoin-cli -regtest -datadir=.bchn-regtest-data -rpcuser=streampay -rpcpassword=streampay generatetoaddress 101 "$ADDR"
```

Then run the actual flow:

```bash
node scripts/deploy-stream.js 0.1 60    # 0.1 BCH over a 60-second demo stream
node scripts/withdraw.js                # worker withdraws whatever's currently unlocked
node scripts/cancel.js                  # employer ends the stream early
```

Stop the node when done:

```bash
./scripts/stop-regtest-node.sh
```

## Why a custom RPC provider instead of ElectrumNetworkProvider

CashScript's SDK ships `ElectrumNetworkProvider`, but that speaks the
**Electrum protocol** — what a Fulcrum/ElectrumX indexer exposes, not what
`bitcoind` exposes natively. Standing up a full indexer on top of the regtest
node is more infrastructure than this project needs for a hackathon demo.

`cashscript`'s `NetworkProvider` interface turned out to be small — 5 methods
(`getUtxos`, `getUtxosForLockingBytecode`, `getBlockHeight`, `getRawTransaction`,
`sendRawTransaction`) — so `scripts/lib/RegtestRpcProvider.js` implements it
directly against `bitcoind`'s JSON-RPC. UTXO lookups use `scantxoutset`, a
stateless UTXO-set scan, deliberately chosen so the provider needs no wallet
bookkeeping (`importaddress`, etc.) — just a running node.

## The MTP gotcha, confirmed for real (not just theoretical)

This is the same "block time lags real time" mechanic discussed earlier in
the project, but it turned out to bite immediately when actually broadcasting
transactions, in a way worth documenting precisely:

- `tx.locktime` in the contract corresponds to a transaction's `nLockTime`.
- **Mempool acceptance requires `nLockTime` to be *strictly less than* the
  chain's median-time-past (MTP), not merely `<=`.** Setting `locktime =
  Math.floor(Date.now() / 1000)` produced `bad-txns-nonfinal` even on
  regtest, because MTP is the median of the *last 11 blocks'* timestamps —
  it lags behind whenever blocks aren't being produced continuously.
- On a regtest chain that was rapid-fire-mined (e.g. 101 blocks generated
  instantly to mature coinbase funds) and then left idle, MTP stays anchored
  to that old burst until fresh blocks push the 11-block window forward —
  in one test run this took mining 11 additional blocks before MTP caught
  up to the present.

**Fix implemented:** `RegtestRpcProvider.catchUpMedianTimePast(targetTime)`
mines blocks one at a time (capped at 30) until MTP reaches the target, then
`withdraw.js`/`cancel.js` use `MTP - 1` as the transaction's locktime — the
`-1` because of the strict inequality above. This makes each script
self-sufficient (it doesn't require `mine-regtest-blocks.js` to already be
running in the background), though for the actual live demo you'd still want
`mine-regtest-blocks.js` running continuously so MTP stays caught up to
wall-clock and withdrawals confirm immediately rather than each triggering
their own catch-up mining burst.

```bash
node scripts/mine-regtest-blocks.js 3   # mine 1 block every 3 seconds
```

## Verified end-to-end (real transactions, not simulated)

This flow was actually run against a live node while building it, not just
written and assumed correct:

- Deployed a 0.2 BCH / 30s stream → confirmed on-chain
- Withdrew after real elapsed time → worker received the correct final-drain
  amount (deposit minus 1000-sat fee), confirmed
- Deployed a second 0.05 BCH / 40s stream → cancelled partway through →
  worker and employer split exactly `1,250,000 + 3,749,000 + 1,000 fee =
  5,000,000` sats, matching the deposit exactly, confirmed

## Not yet built

- `.streampay-state.json` is a simple single-stream state file — fine for a
  demo, but doesn't support multiple concurrent streams
- No automatic retry/backoff if `bitcoind` isn't running yet when a script starts

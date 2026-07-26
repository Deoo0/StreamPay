// scripts/lib/RegtestRpcProvider.js
//
// CashScript's SDK ships ElectrumNetworkProvider, which speaks the Electrum
// protocol — that's what a Fulcrum/ElectrumX indexer exposes, not what
// bitcoind itself exposes. Standing up a full indexer on top of our regtest
// node is more infrastructure than this project needs. cashscript's
// NetworkProvider interface is only 5 methods (see node_modules/cashscript/
// dist/network/NetworkProvider.d.ts), so instead we implement it directly
// against bitcoind's JSON-RPC. UTXO lookups use `scantxoutset`, a stateless
// scan of the UTXO set — deliberately chosen so this provider needs no
// wallet, no importaddress bookkeeping, nothing but a running bitcoind.
//
// Requires bitcoind started with -txindex=1 (for getRawTransaction to work
// on arbitrary txids, not just wallet-relevant ones).

import { Network } from 'cashscript';

export default class RegtestRpcProvider {
  network = Network.REGTEST;

  constructor({ host = '127.0.0.1', port = 18443, user, pass } = {}) {
    this.url = `http://${host}:${port}/`;
    this.auth = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  }

  async #rpc(method, params = []) {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: this.auth },
      body: JSON.stringify({ jsonrpc: '1.0', id: 'streampay', method, params }),
    });
    const body = await res.json();
    if (body.error) {
      throw new Error(`bitcoind RPC ${method} failed: ${body.error.message}`);
    }
    return body.result;
  }

  async getUtxos(address) {
    const scan = await this.#rpc('scantxoutset', ['start', [`addr(${address})`]]);
    return (scan.unspents ?? []).map((u) => ({
      txid: u.txid,
      vout: u.vout,
      satoshis: BigInt(Math.round(u.amount * 1e8)),
    }));
  }

  async getUtxosForLockingBytecode(lockingBytecode) {
    const hex = typeof lockingBytecode === 'string'
      ? lockingBytecode
      : Buffer.from(lockingBytecode).toString('hex');
    const scan = await this.#rpc('scantxoutset', ['start', [`raw(${hex})`]]);
    return (scan.unspents ?? []).map((u) => ({
      txid: u.txid,
      vout: u.vout,
      satoshis: BigInt(Math.round(u.amount * 1e8)),
    }));
  }

  async getBlockHeight() {
    return this.#rpc('getblockcount');
  }

  /**
   * The chain's median-time-past (MTP) — the value consensus actually checks
   * an absolute nLockTime against for mempool acceptance, NOT wall-clock time.
   * This is the mechanic that makes real-network confirmation lag: MTP trails
   * wall-clock by design. On regtest we can just read it directly.
   */
  async getMedianTimePast() {
    const info = await this.#rpc('getblockchaininfo');
    return info.mediantime;
  }

  /**
   * Mine blocks one at a time (up to `maxBlocks`) until MTP reaches
   * `targetTime`, or give up and return whatever MTP ended up at. This makes
   * scripts self-sufficient even if a separate mine-regtest-blocks.js isn't
   * running in the background — useful for one-off script runs, though for
   * a real demo you'd still want the background miner going for the live
   * ticking visual.
   */
  async catchUpMedianTimePast(targetTime, maxBlocks = 30) {
    let mtp = await this.getMedianTimePast();
    let mined = 0;
    while (mtp < targetTime && mined < maxBlocks) {
      await this.mineBlocks(1);
      mtp = await this.getMedianTimePast();
      mined += 1;
    }
    return mtp;
  }

  async getRawTransaction(txid) {
    // verbose=false -> raw hex string directly
    return this.#rpc('getrawtransaction', [txid, false]);
  }

  async sendRawTransaction(txHex) {
    return this.#rpc('sendrawtransaction', [txHex]);
  }

  /** Not part of the NetworkProvider interface — convenience for our own scripts. */
  async mineBlocks(n, toAddress) {
    const addr = toAddress ?? (await this.#rpc('getnewaddress'));
    return this.#rpc('generatetoaddress', [n, addr]);
  }

  /** Convenience: fund an address from the regtest wallet's coinbase-mined balance. */
  async fundAddress(address, amountBch) {
    const txid = await this.#rpc('sendtoaddress', [address, amountBch]);
    await this.mineBlocks(1);
    return txid;
  }
}
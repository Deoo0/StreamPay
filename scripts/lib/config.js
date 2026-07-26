// scripts/lib/config.js
//
// DEV-ONLY fixed keypairs, matching contracts/test/helpers.js so behavior is
// consistent across the unit tests and these CLI scripts. NEVER use fixed
// keys like this for anything holding real funds.

import { SignatureTemplate } from 'cashscript';
import { hash160 } from '@cashscript/utils';
import { secp256k1 } from '@bitauth/libauth';

export const RPC_CONFIG = {
  host: process.env.BCHN_RPC_HOST || '127.0.0.1',
  port: Number(process.env.BCHN_RPC_PORT || 18443),
  user: process.env.BCHN_RPC_USER || 'streampay',
  pass: process.env.BCHN_RPC_PASS || 'streampay',
};

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

export const STATE_FILE = new URL('../.streampay-state.json', import.meta.url);
export const MINER_FEE = 1000n;
export const DUST_LIMIT = 546n;

/** Standard P2PKH locking script: OP_DUP OP_HASH160 <pkh> OP_EQUALVERIFY OP_CHECKSIG */
export function p2pkhLockingBytecode(pkh) {
  return Uint8Array.from([0x76, 0xa9, 0x14, ...pkh, 0x88, 0xac]);
}
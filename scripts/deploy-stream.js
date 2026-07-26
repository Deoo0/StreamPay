// scripts/deploy-stream.js
//
// Usage: node scripts/deploy-stream.js [salaryBch] [durationSeconds]
// Defaults: 1 BCH over 60 seconds (matches the frontend demo defaults).
//
// Funds a fresh StreamPay contract instance from the regtest wallet's
// coinbase-mined balance, mines a confirming block, and writes the deployed
// state (address, startTime, endTime, totalDeposit) to .streampay-state.json
// so withdraw.js / cancel.js can pick it up without re-specifying everything.

import { writeFileSync } from 'node:fs';
import { Contract } from 'cashscript';
import RegtestRpcProvider from './lib/RegtestRpcProvider.js';
import { employerPKH, workerPKH, RPC_CONFIG, STATE_FILE } from './lib/config.js';
import artifact from '../contracts/artifacts/StreamPay.json' with { type: 'json' };

const salaryBch = Number(process.argv[2] ?? 1);
const durationSeconds = Number(process.argv[3] ?? 60);

async function main() {
  const provider = new RegtestRpcProvider(RPC_CONFIG);

  const startTime = BigInt(Math.floor(Date.now() / 1000));
  const endTime = startTime + BigInt(durationSeconds);
  const totalDeposit = BigInt(Math.round(salaryBch * 1e8));

  const contract = new Contract(
    artifact,
    [employerPKH, workerPKH, startTime, endTime, totalDeposit],
    { provider },
  );

  console.log(`Deploying StreamPay at ${contract.address}`);
  console.log(`  salary:   ${salaryBch} BCH (${totalDeposit} sats)`);
  console.log(`  startTime: ${startTime} (${new Date(Number(startTime) * 1000).toISOString()})`);
  console.log(`  endTime:   ${endTime} (${new Date(Number(endTime) * 1000).toISOString()})`);

  const txid = await provider.fundAddress(contract.address, salaryBch);
  console.log(`Funded via txid ${txid}, mined 1 confirming block.`);

  const height = await provider.getBlockHeight();
  console.log(`Regtest chain now at height ${height}.`);

  writeFileSync(
    STATE_FILE,
    JSON.stringify(
      {
        address: contract.address,
        startTime: startTime.toString(),
        endTime: endTime.toString(),
        totalDeposit: totalDeposit.toString(),
        fundingTxid: txid,
      },
      null,
      2,
    ),
  );
  console.log(`State written to ${STATE_FILE.pathname}`);
}

main().catch((err) => {
  console.error('deploy-stream failed:', err.message);
  process.exit(1);
});
#!/usr/bin/env bash
# scripts/stop-regtest-node.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_DIR="$DIR/regtest-node"
DATA_DIR="$DIR/.bchn-regtest-data"

"$NODE_DIR/bitcoin-cli" -regtest -datadir="$DATA_DIR" \
  -rpcuser="${BCHN_RPC_USER:-streampay}" -rpcpassword="${BCHN_RPC_PASS:-streampay}" \
  stop
echo "Node stopping."
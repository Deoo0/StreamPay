#!/usr/bin/env bash
# scripts/start-regtest-node.sh
#
# Downloads Bitcoin Cash Node (if not already present in regtest-node/) and
# starts it in regtest mode, ready for deploy-stream.js / withdraw.js / cancel.js.
set -euo pipefail

BCHN_VERSION="29.0.0"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_DIR="$DIR/regtest-node"
DATA_DIR="$DIR/.bchn-regtest-data"

mkdir -p "$NODE_DIR" "$DATA_DIR"

if [ ! -x "$NODE_DIR/bitcoind" ]; then
  echo "Downloading Bitcoin Cash Node v$BCHN_VERSION..."
  OS="$(uname -s)"
  case "$OS" in
    Linux)  ASSET="bitcoin-cash-node-${BCHN_VERSION}-x86_64-linux-gnu.tar.gz" ;;
    Darwin) ASSET="bitcoin-cash-node-${BCHN_VERSION}-x86_64-apple-darwin.tar.gz" ;;
    *) echo "Unsupported OS: $OS. Download manually from https://bitcoincashnode.org/en/download and place bitcoind/bitcoin-cli in $NODE_DIR"; exit 1 ;;
  esac
  URL="https://github.com/bitcoin-cash-node/bitcoin-cash-node/releases/download/v${BCHN_VERSION}/${ASSET}"
  curl -sL -o /tmp/bchn.tar.gz "$URL"
  tar xzf /tmp/bchn.tar.gz -C /tmp
  cp "/tmp/bitcoin-cash-node-${BCHN_VERSION}/bin/bitcoind" "/tmp/bitcoin-cash-node-${BCHN_VERSION}/bin/bitcoin-cli" "$NODE_DIR/"
  rm -rf /tmp/bchn.tar.gz "/tmp/bitcoin-cash-node-${BCHN_VERSION}"
fi

echo "Starting bitcoind in regtest mode..."
"$NODE_DIR/bitcoind" \
  -regtest \
  -datadir="$DATA_DIR" \
  -daemon \
  -txindex=1 \
  -rpcuser="${BCHN_RPC_USER:-streampay}" \
  -rpcpassword="${BCHN_RPC_PASS:-streampay}" \
  -fallbackfee=0.00001

sleep 2
"$NODE_DIR/bitcoin-cli" -regtest -datadir="$DATA_DIR" -rpcuser="${BCHN_RPC_USER:-streampay}" -rpcpassword="${BCHN_RPC_PASS:-streampay}" getblockchaininfo

echo ""
echo "Node is running. If this is a fresh chain (blocks: 0), mine 101 blocks so"
echo "coinbase funds mature and deploy-stream.js has spendable BCH:"
echo ""
echo "  ADDR=\$($NODE_DIR/bitcoin-cli -regtest -datadir=$DATA_DIR -rpcuser=streampay -rpcpassword=streampay getnewaddress)"
echo "  $NODE_DIR/bitcoin-cli -regtest -datadir=$DATA_DIR -rpcuser=streampay -rpcpassword=streampay generatetoaddress 101 \"\$ADDR\""
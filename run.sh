#!/bin/bash

# Set path to Node.js executable
NODE_BIN="/mnt/nixmodules/nix/store/hdq16s6vq9smhmcyl4ipmwfp9f2558rc-nodejs-20.10.0/bin/node"

# Verify Node.js executable exists
if [ ! -f "$NODE_BIN" ]; then
  echo "Error: Node.js executable not found at $NODE_BIN"
  exit 1
fi

# Run the server using our Node.js launcher script
echo "Starting Day Reseller Platform with Node.js version $($NODE_BIN --version)"
$NODE_BIN run-server.js
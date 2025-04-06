#!/bin/bash

# Set path to Node.js executable
NODE_BIN="/mnt/nixmodules/nix/store/hdq16s6vq9smhmcyl4ipmwfp9f2558rc-nodejs-20.10.0/bin/node"

# Verify Node.js executable exists
if [ ! -f "$NODE_BIN" ]; then
  # Try alternate Node.js location
  NODE_BIN="/nix/store/wfxq6w9bkp5dcfr8yb6789b0w7128gnb-nodejs-20.18.1/bin/node"
  
  if [ ! -f "$NODE_BIN" ]; then
    echo "Error: Node.js executable not found"
    exit 1
  fi
fi

# Run the minimal server using Node.js
echo "Starting minimal Day Reseller Platform with Node.js version $($NODE_BIN --version)"
$NODE_BIN direct-run.js
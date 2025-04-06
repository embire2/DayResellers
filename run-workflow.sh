#!/bin/bash

echo "Day Reseller Platform - Starting server directly with Node.js"
echo "=========================================================="

# Define possible paths for Node.js
NODE_PATHS=(
  "/mnt/nixmodules/nix/store/hdq16s6vq9smhmcyl4ipmwfp9f2558rc-nodejs-20.10.0/bin/node"
  "/nix/store/wfxq6w9bkp5dcfr8yb6789b0w7128gnb-nodejs-20.18.1/bin/node"
  "/opt/nix/store/wfxq6w9bkp5dcfr8yb6789b0w7128gnb-nodejs-20.18.1/bin/node"
  "/nix/store/hdq16s6vq9smhmcyl4ipmwfp9f2558rc-nodejs-20.10.0/bin/node"
  "node"  # Try regular PATH as a fallback
)

# Find the first working Node.js binary
NODE_BIN=""
for path in "${NODE_PATHS[@]}"; do
  if [ -x "$path" ]; then
    echo "Found Node.js at: $path"
    NODE_BIN="$path"
    break
  fi
done

# Check if we found a valid Node.js binary
if [ -z "$NODE_BIN" ]; then
  echo "Error: Could not find a valid Node.js binary"
  exit 1
fi

# Show Node.js version
echo "Using Node.js version: $($NODE_BIN --version)"

# Run the server
$NODE_BIN server.js
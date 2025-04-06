#!/bin/bash

# Set the path to the Node.js and npm executables
NODE_BIN="/mnt/nixmodules/nix/store/hdq16s6vq9smhmcyl4ipmwfp9f2558rc-nodejs-20.10.0/bin"
export PATH="$NODE_BIN:$PATH"

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)

# Display Node.js and npm versions
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Check if tsx is available
TSX_PATH="./node_modules/.bin/tsx"
if [ ! -f "$TSX_PATH" ]; then
  echo "tsx not found. Installing dependencies..."
  npm install
fi

# Start the server
echo "Starting Day Reseller Platform..."
$TSX_PATH server/index.ts
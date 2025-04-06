#!/bin/bash

# Start script for Day Reseller Platform on Replit (Workflow version)
# This script finds Node.js in the Nix store and starts our server

# Find Node.js executable by searching common Nix paths
find_node_executable() {
  local possible_paths=(
    "/mnt/nixmodules/nix/store/hdq16s6vq9smhmcyl4ipmwfp9f2558rc-nodejs-20.10.0/bin/node"
    "/nix/store/wfxq6w9bkp5dcfr8yb6789b0w7128gnb-nodejs-20.18.1/bin/node"
    "/nix/store/*/bin/node"
    "/home/runner/.nix-profile/bin/node"
    "/run/current-system/sw/bin/node"
    "$(which node 2>/dev/null || echo '')"
  )

  for path in "${possible_paths[@]}"; do
    # If path contains a wildcard, expand it
    if [[ "$path" == *"*"* ]]; then
      for expanded_path in $path; do
        if [ -f "$expanded_path" ] && [ -x "$expanded_path" ]; then
          echo "$expanded_path"
          return 0
        fi
      done
    elif [ -f "$path" ] && [ -x "$path" ]; then
      echo "$path"
      return 0
    fi
  done

  return 1
}

# Find npm executable
find_npm_executable() {
  local node_dir=$(dirname "$(find_node_executable)")
  local npm_path="${node_dir}/npm"
  
  if [ -f "$npm_path" ] && [ -x "$npm_path" ]; then
    echo "$npm_path"
    return 0
  fi
  
  # Try other common paths
  local possible_paths=(
    "/mnt/nixmodules/nix/store/hdq16s6vq9smhmcyl4ipmwfp9f2558rc-nodejs-20.10.0/bin/npm"
    "/nix/store/wfxq6w9bkp5dcfr8yb6789b0w7128gnb-nodejs-20.18.1/bin/npm"
    "/nix/store/*/bin/npm"
    "/home/runner/.nix-profile/bin/npm"
    "/run/current-system/sw/bin/npm"
    "$(which npm 2>/dev/null || echo '')"
  )
  
  for path in "${possible_paths[@]}"; do
    # If path contains a wildcard, expand it
    if [[ "$path" == *"*"* ]]; then
      for expanded_path in $path; do
        if [ -f "$expanded_path" ] && [ -x "$expanded_path" ]; then
          echo "$expanded_path"
          return 0
        fi
      done
    elif [ -f "$path" ] && [ -x "$path" ]; then
      echo "$path"
      return 0
    fi
  done
  
  return 1
}

echo "Day Reseller Platform - Starting workflow server"
echo "================================================"

# Attempt to locate Node.js executable
NODE_BIN=$(find_node_executable)

if [ -z "$NODE_BIN" ]; then
  echo "Error: Could not find Node.js executable"
  exit 1
fi

echo "Found Node.js: $NODE_BIN ($(${NODE_BIN} --version))"

# Export PORT for Replit web preview
export PORT=8080

echo "Starting simplified Day Reseller Platform server..."
"${NODE_BIN}" server.js
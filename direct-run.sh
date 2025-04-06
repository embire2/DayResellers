#!/bin/bash

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

# Attempt to locate Node.js executable
NODE_BIN=$(find_node_executable)

if [ -z "$NODE_BIN" ]; then
  echo "Error: Could not find Node.js executable"
  echo "Attempting to use 'node' command directly..."
  
  if command -v node >/dev/null 2>&1; then
    NODE_BIN="node"
  else
    echo "Error: Node.js is not installed or not in PATH"
    exit 1
  fi
fi

# Create a PID file to track our server process
PID_FILE=".server.pid"

# Check if server is already running
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if ps -p "$OLD_PID" > /dev/null 2>&1; then
    echo "Server is already running with PID $OLD_PID"
    echo "To restart, kill the existing process first with: kill $OLD_PID"
    exit 0
  else
    echo "Removing stale PID file"
    rm "$PID_FILE"
  fi
fi

# Run the minimal server using Node.js
echo "Starting minimal Day Reseller Platform with Node.js version $($NODE_BIN --version)"
$NODE_BIN run-server.js &

# Save the PID
SERVER_PID=$!
echo $SERVER_PID > "$PID_FILE"

echo "Server started with PID $SERVER_PID"
echo "PID saved to $PID_FILE"
wait $SERVER_PID
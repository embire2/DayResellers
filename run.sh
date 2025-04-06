#!/bin/bash
cd "$(dirname "$0")"
echo "Attempting to run application..."

# First attempt: directly use node modules
echo "Trying to run with local node modules..."
if [ -f node_modules/tsx/dist/cli.mjs ]; then
  export NODE_PATH="./node_modules:$NODE_PATH"
  node_modules/.bin/tsx server/index.ts || echo "Failed to run with local tsx"
else
  echo "Local tsx module not found or not executable"
fi

# Second attempt: use npx if available
echo "Trying to run with npx..."
which npx && npx tsx server/index.ts || echo "Failed to run with npx"
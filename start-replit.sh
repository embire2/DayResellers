#!/bin/bash

# Path to Node.js v20 (if needed)
if [ ! -f "$(which node)" ]; then
  echo "Using predefined Node.js path..."
  NODE_PATH="/mnt/nixmodules/nix/store/hdq16s6vq9smhmcyl4ipmwfp9f2558rc-nodejs-20.10.0/bin/node"
  NPM_PATH="/mnt/nixmodules/nix/store/hdq16s6vq9smhmcyl4ipmwfp9f2558rc-nodejs-20.10.0/bin/npm"
  export PATH="/mnt/nixmodules/nix/store/hdq16s6vq9smhmcyl4ipmwfp9f2558rc-nodejs-20.10.0/bin:$PATH"
else
  echo "Using system Node.js..."
  NODE_PATH=$(which node)
  NPM_PATH=$(which npm)
fi

echo "Testing Node.js and npm availability..."
$NODE_PATH --version
$NPM_PATH --version

echo "Database connection details:"
echo "DATABASE_URL: ${DATABASE_URL:-Not set}"
echo "PGHOST: ${PGHOST:-Not set}"
echo "PGPORT: ${PGPORT:-Not set}"
echo "PGUSER: ${PGUSER:-Not set}"
echo "PGDATABASE: ${PGDATABASE:-Not set}"
echo "PGPASSWORD: ${PGPASSWORD:+Set (value hidden)}"

echo "Starting the application..."
npx tsx server/index.ts
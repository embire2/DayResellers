#!/bin/bash

# Path to Node.js v20
NODE_PATH="/mnt/nixmodules/nix/store/hdq16s6vq9smhmcyl4ipmwfp9f2558rc-nodejs-20.10.0/bin"
NPM_PATH="${NODE_PATH}/npm"

# Add Node.js to PATH
export PATH="${NODE_PATH}:${PATH}"

# Verify Node.js and npm are available
echo "Using Node.js: $(${NODE_PATH}/node --version)"
echo "Using npm: $(${NPM_PATH} --version)"

# Print database connection info
echo "Database connection details:"
echo "DATABASE_URL: ${DATABASE_URL:-Not set}"
echo "PGHOST: ${PGHOST:-Not set}"
echo "PGPORT: ${PGPORT:-Not set}"
echo "PGUSER: ${PGUSER:-Not set}"
echo "PGDATABASE: ${PGDATABASE:-Not set}"
echo "PGPASSWORD: ${PGPASSWORD:+Set (value hidden)}"

# Start the application
echo "Starting the application..."
${NODE_PATH}/npx tsx server/index.ts
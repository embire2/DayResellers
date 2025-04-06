#!/bin/bash

# Use direct path to Node.js 20
NODE_PATH=/mnt/nixmodules/nix/store/hdq16s6vq9smhmcyl4ipmwfp9f2558rc-nodejs-20.10.0/bin/node
NPM_PATH=/mnt/nixmodules/nix/store/hdq16s6vq9smhmcyl4ipmwfp9f2558rc-nodejs-20.10.0/bin/npm

echo "Testing Node.js and npm availability..."
$NODE_PATH --version
$NPM_PATH --version

# Export database environment variables
export DATABASE_URL="postgresql://neondb_owner:npg_OKg1chlDC5MF@ep-curly-sun-a5m9ycu6.us-east-2.aws.neon.tech/neondb?sslmode=require"
export PGDATABASE="neondb"
export PGHOST="ep-curly-sun-a5m9ycu6.us-east-2.aws.neon.tech"
export PGPORT="5432"
export PGUSER="neondb_owner"
export PGPASSWORD="npg_OKg1chlDC5MF"

echo "Installing dependencies..."
$NPM_PATH install

echo "Starting server directly using node and ts-node-esm..."
$NPM_PATH install -D ts-node esbuild @types/node --no-save

echo "Running server with ts-node-esm..."
PATH="$(dirname $NODE_PATH):$PATH" $NPM_PATH exec ts-node-esm server/index.ts
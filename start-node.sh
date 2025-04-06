#!/bin/bash

# Use direct path to Node.js 20
NODE_PATH=/mnt/nixmodules/nix/store/hdq16s6vq9smhmcyl4ipmwfp9f2558rc-nodejs-20.10.0/bin/node
NPM_PATH=/mnt/nixmodules/nix/store/hdq16s6vq9smhmcyl4ipmwfp9f2558rc-nodejs-20.10.0/bin/npm

echo "Testing Node.js and npm availability..."
$NODE_PATH --version
$NPM_PATH --version

echo "Installing dependencies..."
$NPM_PATH install

echo "Checking PostgreSQL database status..."
echo "DATABASE_URL exists: $([[ -n "${DATABASE_URL}" ]] && echo "yes" || echo "no")"

# Get PostgreSQL connection details from Replit
echo "Starting the application with proper database configuration..."
export DATABASE_URL="${DATABASE_URL:=postgres://postgres:postgres@localhost:5432/postgres}"
export PGHOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
export PGPORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
export PGUSER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')
export PGDATABASE=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Using database: $DATABASE_URL"
echo "Host: $PGHOST, Port: $PGPORT, User: $PGUSER, Database: $PGDATABASE"

echo "Starting the application..."
$NODE_PATH node_modules/.bin/tsx server/index.ts
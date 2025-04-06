#!/bin/bash
# Script to start the Node.js application

echo "Starting Day Reseller Platform..."
echo "Database connection details:"
echo "DATABASE_URL: ${DATABASE_URL:-Not set}"
echo "PGHOST: ${PGHOST:-Not set}"
echo "PGPORT: ${PGPORT:-Not set}"
echo "PGUSER: ${PGUSER:-Not set}"
echo "PGDATABASE: ${PGDATABASE:-Not set}"
echo "PGPASSWORD: ${PGPASSWORD:+Set (value hidden)}"

# Run the Node.js application with environment variables
npx tsx server/index.ts
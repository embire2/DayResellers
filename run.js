// Simple script to start the application directly
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log environment details
console.log('Database environment variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('PGHOST:', process.env.PGHOST);
console.log('PGPORT:', process.env.PGPORT);
console.log('PGUSER:', process.env.PGUSER);
console.log('PGDATABASE:', process.env.PGDATABASE);
console.log('PGPASSWORD:', process.env.PGPASSWORD ? 'Set' : 'Not set');

// Run the application
console.log('Starting application...');
const tsx = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: process.env
});

tsx.on('error', (err) => {
  console.error('Failed to start application:', err);
});

tsx.on('close', (code) => {
  console.log(`Application process exited with code ${code}`);
});
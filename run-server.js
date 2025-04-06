/**
 * Node.js script to run the server directly
 * This avoids the need for npm and other external tools
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
function loadEnv() {
  try {
    const envFile = fs.readFileSync('.env', 'utf8');
    const envVars = envFile.split('\n').filter(line => line.trim() !== '' && !line.startsWith('#'));
    
    envVars.forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key] = value;
      }
    });
    
    console.log('Loaded environment variables from .env file');
  } catch (err) {
    console.error('Error loading .env file:', err.message);
  }
}

// Main function to run the server
async function runServer() {
  console.log('Starting Day Reseller Platform server...');
  
  // Load environment variables
  loadEnv();
  
  // Check if tsx is installed
  const tsxPath = path.resolve('./node_modules/.bin/tsx');
  if (!fs.existsSync(tsxPath)) {
    console.error('Error: tsx not found in node_modules/.bin');
    console.log('Please run "npm install" first');
    process.exit(1);
  }
  
  // Start the server using tsx
  const serverProcess = spawn(tsxPath, ['server/index.ts'], {
    stdio: 'inherit',
    env: process.env
  });
  
  // Handle server process events
  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
  });
  
  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    serverProcess.kill('SIGINT');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    serverProcess.kill('SIGTERM');
    process.exit(0);
  });
}

// Run the server
runServer().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
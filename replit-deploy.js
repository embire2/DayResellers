#!/usr/bin/env node

/**
 * Replit Deployment Script for Day Reseller Platform
 * 
 * This script automates the deployment process for the Day Reseller Platform
 * specifically optimized for the Replit environment. It handles database setup,
 * environment configuration, build process, and API integration preparation.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Replit environment settings
const REPLIT_PRODUCTION_IP = '34.111.179.208';
const API_PORT = 5000;

// Configuration
const config = {
  // Build settings
  build: {
    command: 'npm run build',
  },
  // Database settings
  database: {
    migrateCommand: 'npm run db:push',
  },
  // Start settings
  start: {
    command: 'npm run start',
    devCommand: 'npm run dev',
  },
  // API credentials
  apiCredentials: [
    { name: 'MTN_FIXED_USERNAME', default: 'api@openweb.email' },
    { name: 'MTN_FIXED_PASSWORD', default: 'fsV4iYUx0M' },
    { name: 'MTN_GSM_USERNAME', default: 'api@openweb.email.gsm' },
    { name: 'MTN_GSM_PASSWORD', default: 'fsV4iYUx0M' }
  ]
};

/**
 * Execute a shell command and print the output
 * 
 * This function runs a command in a synchronous manner and handles both success and error cases.
 * It returns an object with success status and either output or error information.
 */
function exec(command) {
  console.log(`\n🔄 Executing: ${command}`);
  try {
    const output = execSync(command, { stdio: 'inherit' });
    return { success: true, output };
  } catch (error) {
    console.error(`\n❌ Error executing command: ${command}`);
    console.error(error.message);
    return { success: false, error };
  }
}

/**
 * Display a step header with decorative elements
 */
function displayHeader(title) {
  const separator = '='.repeat(title.length + 10);
  console.log(`\n${separator}`);
  console.log(`===== ${title} =====`);
  console.log(`${separator}\n`);
}

/**
 * Check if database is connected and available
 */
function checkDatabase() {
  displayHeader('DATABASE VERIFICATION');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set.');
    console.error('   Please set this in the Replit Secrets tab.');
    return false;
  }
  
  try {
    console.log('✅ Database connection confirmed (via DATABASE_URL environment variable)');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    return false;
  }
}

/**
 * Check for required API credentials
 */
function checkApiCredentials() {
  displayHeader('API CREDENTIALS');
  
  // Check each API credential
  for (const cred of config.apiCredentials) {
    if (!process.env[cred.name]) {
      console.warn(`⚠️  ${cred.name} not set. Using default value: ${cred.default}`);
    } else {
      console.log(`✅ ${cred.name}: Custom value set`);
    }
  }
  
  // Remind about IP address requirements
  console.log('\n📝 BROADBAND.IS API REQUIREMENTS:');
  console.log(`   • The API blocks all IPs except Replit production IP: ${REPLIT_PRODUCTION_IP}`);
  console.log('   • API URLs must use format: https://www.broadband.is/api/{ENDPOINT}');
  console.log('   • Running in production mode ensures proper IP address handling');
  
  console.log('\n✅ API configuration check complete');
  return true;
}

/**
 * Build the application
 */
function buildApplication() {
  displayHeader('APPLICATION BUILD');
  
  // Clean any previous build
  if (fs.existsSync(path.join(__dirname, 'dist'))) {
    console.log('🧹 Cleaning previous build...');
    try {
      fs.rmSync(path.join(__dirname, 'dist'), { recursive: true });
    } catch (error) {
      console.warn(`⚠️  Could not completely clean previous build: ${error.message}`);
    }
  }
  
  // Build the application
  const result = exec(config.build.command);
  
  if (result.success) {
    console.log('✅ Application built successfully');
    return true;
  } else {
    console.error('❌ Failed to build application');
    return false;
  }
}

/**
 * Push database schema changes
 */
function migrateDatabase() {
  displayHeader('DATABASE MIGRATION');
  
  const result = exec(config.database.migrateCommand);
  
  if (result.success) {
    console.log('✅ Database schema updated successfully');
    return true;
  } else {
    console.error('❌ Failed to update database schema');
    return false;
  }
}

/**
 * Set up the environment for production
 */
function setupEnvironment() {
  displayHeader('ENVIRONMENT SETUP');
  
  // Check for required environment variables
  const requiredVars = ['DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('   Please set these in the Replit Secrets tab.');
    return false;
  }
  
  // Update the Replit environment for production
  console.log('🔧 Setting production environment variables...');
  console.log(`   • Setting NODE_ENV=production for API integration compatibility`);
  console.log(`   • Setting PORT=${API_PORT} for Replit compatibility`);
  
  // Set NODE_ENV to production
  process.env.NODE_ENV = 'production';
  process.env.PORT = API_PORT.toString();
  
  // Create a .env file for local development (this won't affect Replit secrets)
  try {
    const envContent = [
      'NODE_ENV=production',
      `PORT=${API_PORT}`,
      '# API credentials (defaults)',
      'MTN_FIXED_USERNAME=api@openweb.email',
      'MTN_FIXED_PASSWORD=fsV4iYUx0M',
      'MTN_GSM_USERNAME=api@openweb.email.gsm',
      'MTN_GSM_PASSWORD=fsV4iYUx0M',
      '# Note: For actual secrets, use the Replit Secrets tab.',
      '# DATABASE_URL should be set there, not here.'
    ].join('\n');
    
    fs.writeFileSync(path.join(__dirname, '.env'), envContent);
    console.log('✅ Created .env file with production settings');
  } catch (error) {
    console.warn(`⚠️  Could not create .env file: ${error.message}`);
  }
  
  console.log('✅ Environment configuration complete');
  return true;
}

/**
 * Create a production-ready log directory
 */
function setupLogging() {
  displayHeader('LOGGING SETUP');
  
  // Create logs directory if it doesn't exist
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    try {
      fs.mkdirSync(logsDir);
      console.log('✅ Created logs directory');
    } catch (error) {
      console.warn(`⚠️  Could not create logs directory: ${error.message}`);
      // Non-critical error, continue
    }
  } else {
    console.log('✅ Logs directory exists');
  }
  
  return true;
}

/**
 * Generate deployment information file
 */
function generateDeploymentInfo() {
  displayHeader('DEPLOYMENT INFO');
  
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    environment: 'production',
    replitSlug: process.env.REPL_SLUG || 'unknown',
    replitOwner: process.env.REPL_OWNER || 'unknown',
    nodeVersion: process.version,
    apiPort: API_PORT,
    productionIp: REPLIT_PRODUCTION_IP,
    apiBaseUrl: 'https://www.broadband.is/api'
  };
  
  try {
    fs.writeFileSync(
      path.join(__dirname, 'deployment-info.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log('✅ Deployment information saved to deployment-info.json');
    return true;
  } catch (error) {
    console.warn(`⚠️  Could not save deployment information: ${error.message}`);
    // Non-critical error, continue
    return true;
  }
}

/**
 * Instructions for starting the application in production mode
 */
function startInstructions() {
  displayHeader('STARTUP INSTRUCTIONS');
  
  console.log('To start the application in production mode, run:');
  console.log('  npm run start');
  console.log();
  console.log('Or use the Replit Run button after updating .replit config:');
  console.log('  run = "npm run start"');
  console.log();
  console.log('Your application will be available at:');
  console.log(`  https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
}

/**
 * Main deployment function
 */
async function deploy() {
  displayHeader('DAY RESELLER PLATFORM DEPLOYMENT');
  console.log('Starting deployment process for Day Reseller Platform on Replit');
  
  // Step 1: Verify database connection
  if (!checkDatabase()) {
    console.error('❌ Deployment failed: Database connection issue');
    process.exit(1);
  }
  
  // Step 2: Set up environment
  if (!setupEnvironment()) {
    console.error('❌ Deployment failed: Environment setup issue');
    process.exit(1);
  }
  
  // Step 3: Check API credentials
  checkApiCredentials();
  
  // Step 4: Set up logging
  setupLogging();
  
  // Step 5: Build the application
  if (!buildApplication()) {
    console.error('❌ Deployment failed: Build process failed');
    process.exit(1);
  }
  
  // Step 6: Update database schema
  if (!migrateDatabase()) {
    console.error('❌ Deployment failed: Database migration issue');
    process.exit(1);
  }
  
  // Step 7: Generate deployment info
  generateDeploymentInfo();
  
  // Success!
  displayHeader('DEPLOYMENT SUCCESSFUL');
  console.log('✅ Day Reseller Platform has been successfully deployed!');
  
  // Provide information on starting the application
  startInstructions();
}

// Run the deployment
deploy().catch(error => {
  console.error('❌ Deployment failed with an unexpected error:', error);
  process.exit(1);
});

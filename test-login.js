/**
 * Test Login Script for OpenWeb Reseller Platform
 * This script checks if a user can log in with provided credentials
 * by testing password hash comparison directly against the database.
 */

import pg from 'pg';
import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const { Pool } = pg;
const scryptAsync = promisify(scrypt);

// Function to compare passwords (same as in auth.ts)
async function comparePasswords(supplied, stored) {
  try {
    // For development, if the stored password doesn't contain a salt, assume plain text comparison
    if (!stored.includes('.')) {
      return supplied === stored;
    }
    
    // Otherwise, do the secure comparison with salt
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = await scryptAsync(supplied, salt, 64);
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error(`Password comparison failed:`, error);
    return false;
  }
}

// Function to test login
async function testLogin(username, password) {
  // Create a connection to the PostgreSQL database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log(`Testing login for username: ${username}`);
    
    // Step 1: Check if user exists
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (userResult.rows.length === 0) {
      console.error(`❌ User '${username}' does not exist in the database`);
      return false;
    }
    
    console.log(`✅ User '${username}' exists in the database`);
    const user = userResult.rows[0];
    
    // Step 2: Test password
    const passwordValid = await comparePasswords(password, user.password);
    
    if (!passwordValid) {
      console.error(`❌ Password validation failed for '${username}'`);
      
      // Additional diagnostic info
      if (!user.password.includes('.')) {
        console.log(`   ℹ️ Password is stored in plain text format (not hashed)`);
      } else {
        console.log(`   ℹ️ Password is stored in hashed format with salt`);
      }
      return false;
    }
    
    console.log(`✅ Password validation successful for '${username}'`);
    console.log(`✅ Login test successful! User would be authenticated.`);
    console.log(`   ℹ️ User details: Role=${user.role}, ID=${user.id}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error testing login:`, error);
    return false;
  } finally {
    await pool.end();
  }
}

// Function to list all users in the system
async function listUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log(`Retrieving all users from the database...`);
    
    const result = await pool.query('SELECT id, username, role, created_at FROM users ORDER BY id');
    
    console.log(`\n=====================================`);
    console.log(`Total users found: ${result.rows.length}`);
    console.log(`=====================================`);
    
    result.rows.forEach(user => {
      console.log(`ID: ${user.id}, Username: ${user.username}, Role: ${user.role}, Created: ${user.created_at}`);
    });
    
    console.log(`=====================================\n`);
  } catch (error) {
    console.error(`❌ Error listing users:`, error);
  } finally {
    await pool.end();
  }
}

// Function to check if an admin user exists and create one if not
async function ensureAdminUser(username, password) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log(`Checking if admin user '${username}' exists...`);
    
    // Check if user exists
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      console.log(`Admin user '${username}' does not exist, creating...`);
      
      // Import crypto for password hashing
      const crypto = await import('crypto');
      const scryptAsync = promisify(crypto.scrypt);
      
      // Hash the password
      const salt = crypto.randomBytes(16).toString("hex");
      const buf = await scryptAsync(password, salt, 64);
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      // Create admin user
      await pool.query(
        'INSERT INTO users (username, password, role, credit_balance, reseller_group) VALUES ($1, $2, $3, $4, $5)',
        [username, hashedPassword, 'admin', 1000, 1]
      );
      
      console.log(`✅ Admin user '${username}' created successfully!`);
    } else {
      console.log(`✅ Admin user '${username}' already exists.`);
    }
  } catch (error) {
    console.error(`❌ Error managing admin user:`, error);
  } finally {
    await pool.end();
  }
}

// Function to reset a user's password
async function resetUserPassword(username, newPassword) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log(`Resetting password for user '${username}'...`);
    
    // Check if user exists
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      console.error(`❌ User '${username}' does not exist in the database`);
      return false;
    }
    
    // Import crypto for password hashing
    const crypto = await import('crypto');
    const scryptAsync = promisify(crypto.scrypt);
    
    // Hash the password
    const salt = crypto.randomBytes(16).toString("hex");
    const buf = await scryptAsync(newPassword, salt, 64);
    const hashedPassword = `${buf.toString("hex")}.${salt}`;
    
    // Update user password
    await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2',
      [hashedPassword, username]
    );
    
    console.log(`✅ Password for '${username}' has been reset successfully!`);
    return true;
  } catch (error) {
    console.error(`❌ Error resetting password:`, error);
    return false;
  } finally {
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  if (!command) {
    console.log(`
OpenWeb Reseller Platform Login Diagnostic Tool
==============================================
Available commands:
  - test-login <username> <password>  : Test if login would succeed with given credentials
  - list-users                        : List all users in the system
  - ensure-admin <username> <password>: Ensure admin user exists, create if not
  - reset-password <username> <password>: Reset a user's password
    `);
    return;
  }

  switch(command) {
    case 'test-login':
      if (args.length < 3) {
        console.error('❌ Please provide both username and password');
        return;
      }
      await testLogin(args[1], args[2]);
      break;
      
    case 'list-users':
      await listUsers();
      break;
      
    case 'ensure-admin':
      if (args.length < 3) {
        console.error('❌ Please provide both username and password');
        return;
      }
      await ensureAdminUser(args[1], args[2]);
      break;
      
    case 'reset-password':
      if (args.length < 3) {
        console.error('❌ Please provide both username and password');
        return;
      }
      await resetUserPassword(args[1], args[2]);
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
  }
}

main().catch(error => {
  console.error('Unexpected error:', error);
});
import pg from 'pg';
import crypto from 'crypto';
import { promisify } from 'util';

const { Pool } = pg;
const scryptAsync = promisify(crypto.scrypt);

// Function to hash the password
async function hashPassword(password) {
  try {
    const salt = crypto.randomBytes(16).toString("hex");
    const buf = await scryptAsync(password, salt, 64);
    return `${buf.toString("hex")}.${salt}`;
  } catch (error) {
    console.error(`Password hashing failed`, error);
    throw new Error(`Failed to hash password: ${error.message}`);
  }
}

// Main function to create an admin user
async function createAdminUser() {
  // Create a connection to the PostgreSQL database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("Checking if admin user exists...");
    
    // Check if the user already exists
    const checkResult = await pool.query('SELECT * FROM users WHERE username = $1', ['ceo@openweb.co.za']);
    
    if (checkResult.rows.length > 0) {
      console.log("Admin user already exists.");
      return;
    }
    
    console.log("Admin user does not exist, creating...");
    
    // Hash the password
    const hashedPassword = await hashPassword('Maniac20!');
    
    // Create the admin user
    await pool.query(
      'INSERT INTO users (username, password, role, credit_balance, reseller_group) VALUES ($1, $2, $3, $4, $5)',
      ['ceo@openweb.co.za', hashedPassword, 'admin', 1000, 1]
    );
    
    console.log("Admin user created successfully!");
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Execute the main function
createAdminUser();
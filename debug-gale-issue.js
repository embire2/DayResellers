/**
 * Script to diagnose why user ID 3 (Gale) is being confused with another user
 */

const { Pool } = require('pg');

// Create database connection pool with SSL
const pool = new Pool({
  ssl: {
    rejectUnauthorized: false
  }
});

async function debugGaleIssue() {
  try {
    console.log('=========== DIAGNOSTIC: User ID 3 Issue ===========');
    
    // Check if multiple users have ID = 3
    console.log('\nChecking users with ID = 3:');
    const userQuery = await pool.query('SELECT * FROM users WHERE id = 3');
    console.log(`Found ${userQuery.rows.length} users with ID = 3`);
    
    // Print all user records
    console.log('\nAll users in database:');
    const allUsersQuery = await pool.query('SELECT id, username, role FROM users ORDER BY id');
    console.log('Users table contents:');
    console.table(allUsersQuery.rows);
    
    // Check SQL user ID sequence state
    const seqQuery = await pool.query('SELECT last_value FROM users_id_seq');
    console.log(`\nUser ID sequence last_value = ${seqQuery.rows[0].last_value}`);
    
    // Examining user products again
    console.log('\nChecking user products for user ID 3:');
    const userProductsQuery = await pool.query('SELECT * FROM user_products WHERE user_id = 3');
    console.log(`Found ${userProductsQuery.rows.length} products for user_id = 3`);
    console.table(userProductsQuery.rows);
  } catch (error) {
    console.error('Error during diagnostics:', error);
  } finally {
    await pool.end();
  }
}

debugGaleIssue();
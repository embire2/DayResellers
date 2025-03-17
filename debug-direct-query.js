/**
 * Debug utility for direct database queries to diagnose user products issue
 */
import pg from 'pg';
const { Pool } = pg;

// Create a connection pool using the DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runDirectDatabaseQueries() {
  console.log('=== DEBUG: DIRECT DATABASE QUERIES ===');
  
  try {
    // Query 1: Check if user exists
    console.log('\n1. Verifying user exists:');
    const userQuery = 'SELECT * FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [3]); // Gale's ID
    
    if (userResult.rows.length > 0) {
      console.log('User found:', userResult.rows[0]);
    } else {
      console.log('User not found with ID 3');
    }

    // Query 2: Check if user products exist (snake_case columns)
    console.log('\n2. Checking user_products with snake_case:');
    const snakeCaseQuery = 'SELECT * FROM user_products WHERE user_id = $1';
    const snakeCaseResult = await pool.query(snakeCaseQuery, [3]);
    
    console.log(`Found ${snakeCaseResult.rows.length} products with snake_case query:`);
    console.log(JSON.stringify(snakeCaseResult.rows, null, 2));
    
    // Query 3: See all table columns
    console.log('\n3. Describe user_products table structure:');
    const tableInfoQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'user_products'
      ORDER BY ordinal_position;
    `;
    const tableInfo = await pool.query(tableInfoQuery);
    
    console.log('Table columns:');
    console.table(tableInfo.rows);
    
    // Query 4: Examine Drizzle ORM-based SQL query (camelCase columns)
    console.log('\n4. Testing camelCase query that might be used by Drizzle:');
    const camelCaseQuery = 'SELECT * FROM user_products WHERE "userId" = $1';
    try {
      const camelCaseResult = await pool.query(camelCaseQuery, [3]);
      console.log(`Found ${camelCaseResult.rows.length} products with camelCase query:`);
      console.log(JSON.stringify(camelCaseResult.rows, null, 2));
    } catch (error) {
      console.error('Error with camelCase query:', error.message);
    }
    
  } catch (error) {
    console.error('Error during database queries:', error);
  } finally {
    // Close the connection pool
    await pool.end();
    console.log('\nDatabase connection closed');
  }
}

runDirectDatabaseQueries().catch(console.error);
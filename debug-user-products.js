/**
 * Debug script to diagnose user product retrieval issue for user gale (ID 3)
 */
const { Pool } = require('pg');

// Create database connection pool
const pool = new Pool({
  ssl: {
    rejectUnauthorized: false
  }
});

async function debugUserProducts() {
  try {
    console.log('Diagnosing user products issue for gale (ID 3)');
    
    // 1. First check the users table
    console.log('Checking user in database:');
    const userResult = await pool.query('SELECT id, username, role FROM users WHERE id = 3');
    
    if (userResult.rows.length === 0) {
      console.log('ERROR: User with ID 3 not found in database!');
      return;
    }
    
    console.log('User found:', userResult.rows[0]);
    
    // 2. Check user_products for this user
    console.log('\nChecking user_products in database:');
    const userProductsResult = await pool.query('SELECT * FROM user_products WHERE user_id = 3');
    
    console.log('Found user_products:', userProductsResult.rows.length);
    console.table(userProductsResult.rows);
    
    // 3. Check that products exist
    if (userProductsResult.rows.length > 0) {
      const productIds = userProductsResult.rows.map(row => row.product_id);
      console.log('\nVerifying referenced products exist:');
      
      for (const productId of productIds) {
        const productResult = await pool.query('SELECT id, name, status FROM products WHERE id = $1', [productId]);
        console.log(`Product ID ${productId}:`, productResult.rows[0] || 'NOT FOUND');
      }
    }
    
    // 4. Final comparison to API results
    console.log('\nComparing with API results:');
    console.log('Database shows:', userProductsResult.rows.length, 'products for user ID 3');
    
    console.log('\nDEBUG COMPLETE');
  } catch (error) {
    console.error('Error during diagnostics:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

debugUserProducts();
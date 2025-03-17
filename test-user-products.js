/**
 * Test script to query user products directly from the database
 */
import pg from 'pg';

const { Pool } = pg;

// Initialize PostgreSQL connection pool with DATABASE_URL from environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getUserProducts() {
  try {
    console.log('=============================================');
    console.log('TESTING USER PRODUCTS DATABASE ACCESS');
    console.log('=============================================');
    
    // User ID we're testing with (Gale)
    const userId = 3;
    
    console.log(`\n1. Testing direct query for user ID ${userId}:`);
    const { rows } = await pool.query(
      'SELECT * FROM user_products WHERE user_id = $1',
      [userId]
    );
    
    console.log(`Found ${rows.length} products`);
    if (rows.length > 0) {
      console.log('First product:');
      console.log(rows[0]);
    } else {
      console.log('No products found');
    }
    
    console.log('\n2. Getting all user products:');
    const allProducts = await pool.query('SELECT * FROM user_products');
    console.log(`Total products in database: ${allProducts.rows.length}`);
    
    // List all the users who have products
    const userIds = [...new Set(allProducts.rows.map(row => row.user_id))];
    console.log(`Users with products: ${userIds.join(', ')}`);
    
    if (allProducts.rows.length > 0) {
      console.log('\nProduct IDs and statuses:');
      allProducts.rows.forEach(product => {
        console.log(`User ID: ${product.user_id}, Product ID: ${product.product_id}, Status: ${product.status}`);
      });
    }
    
    // Get information about a specific user
    console.log(`\n3. Getting user information for user ID ${userId}:`);
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log(`Username: ${user.username}`);
      console.log(`Role: ${user.role}`);
      console.log(`Credit Balance: ${user.credit_balance}`);
    } else {
      console.log(`User with ID ${userId} not found`);
    }
    
    console.log('\n4. Checking product categories:');
    const categories = await pool.query('SELECT * FROM product_categories');
    console.log(`Total categories: ${categories.rows.length}`);
    if (categories.rows.length > 0) {
      console.log('Categories:');
      categories.rows.forEach(cat => {
        console.log(`ID: ${cat.id}, Name: ${cat.name}, Master: ${cat.master_category}`);
      });
    }
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Error in getUserProducts test:', error);
  } finally {
    await pool.end();
  }
}

getUserProducts();
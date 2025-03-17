/**
 * Database test script for retrieving user products
 */
import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import * as url from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect directly to the database
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testGetUserProducts(userId) {
  try {
    console.log(`Testing getUserProductsByUser for userId: ${userId}`);
    
    // Direct SQL query to get user products
    const sql = `SELECT * FROM user_products WHERE user_id = ${userId}`;
    console.log(`Running SQL: ${sql}`);
    const userProductsResult = await pool.query(sql);
    console.log('User products result:', userProductsResult.rows);
    
    // Get product details for each user product
    if (userProductsResult.rows.length > 0) {
      console.log("\nGetting product details for each user product:");
      for (const userProduct of userProductsResult.rows) {
        const productSql = `SELECT * FROM products WHERE id = ${userProduct.product_id}`;
        console.log(`Running SQL: ${productSql}`);
        const productResult = await pool.query(productSql);
        console.log(`Product details for product_id ${userProduct.product_id}:`, productResult.rows[0]);
      }
    }
    
    // Direct SQL query to get user product endpoints
    const endpointSql = `SELECT * FROM user_product_endpoints WHERE user_product_id IN (SELECT id FROM user_products WHERE user_id = ${userId})`;
    console.log(`\nRunning SQL: ${endpointSql}`);
    const endpointResult = await pool.query(endpointSql);
    console.log('User product endpoints result:', endpointResult.rows);
    
    return userProductsResult.rows;
  } catch (error) {
    console.error('Error testing user products retrieval:', error);
    throw error;
  }
}

async function main() {
  try {
    // Test for user ID 3 (gale)
    await testGetUserProducts(3);
    
    console.log('\nDone. Exiting.');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
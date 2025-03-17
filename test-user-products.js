/**
 * Test script to query user products directly from the database
 */
import { pool } from './server/db.js';

async function getUserProducts() {
  try {
    console.log('Querying user products directly from database...');
    
    const userId = 3; // Gale's user ID
    
    // Query user products
    const userProductsResult = await pool.query(
      'SELECT * FROM user_products WHERE user_id = $1',
      [userId]
    );
    
    console.log(`Found ${userProductsResult.rows.length} user products for user ID ${userId}`);
    console.log('User products:', userProductsResult.rows);
    
    // For each product, get the product details
    if (userProductsResult.rows.length > 0) {
      console.log('\nEnhancing with product details:');
      
      for (const userProduct of userProductsResult.rows) {
        const productResult = await pool.query(
          'SELECT * FROM products WHERE id = $1',
          [userProduct.product_id]
        );
        
        console.log(`Product details for user product ID ${userProduct.id}:`, 
          productResult.rows.length > 0 ? productResult.rows[0] : 'No product found');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

getUserProducts();
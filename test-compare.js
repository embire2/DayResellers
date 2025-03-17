/**
 * Test script to compare direct database query with API response
 */
import pg from 'pg';
import fetch from 'node-fetch';

// Database connection
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function compareQueryResults() {
  try {
    console.log('🔍 RUNNING DATABASE VS API COMPARISON TEST');
    console.log('==========================================');
    
    // Part 1: Direct database query
    console.log('\n📊 PART 1: DIRECT DATABASE QUERY');
    console.log('----------------------------------');
    
    const dbQueryResult = await pool.query(
      'SELECT * FROM user_products WHERE user_id = $1',
      [3] // Gale's user ID
    );
    
    console.log(`Found ${dbQueryResult.rows.length} products in database`);
    if (dbQueryResult.rows.length > 0) {
      console.log('Database query results:', JSON.stringify(dbQueryResult.rows, null, 2));
    }
    
    // Part 2: Login and get API data
    console.log('\n🌐 PART 2: API REQUEST VIA HTTP');
    console.log('----------------------------------');
    
    // First login as gale
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'gale',
        password: 'gale123',
      }),
    });
    
    if (!loginResponse.ok) {
      console.error('Login failed:', loginResponse.status, loginResponse.statusText);
      return;
    }
    
    // Extract cookies for session
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Login successful, got session cookie');
    
    // Now fetch user products
    const productsResponse = await fetch('http://localhost:5000/api/user-products/3', {
      headers: {
        Cookie: cookies,
      },
    });
    
    const apiProducts = await productsResponse.json();
    
    console.log(`Found ${apiProducts.length} products via API`);
    if (apiProducts.length > 0) {
      console.log('API response products:', JSON.stringify(apiProducts, null, 2));
    }
    
    // Part 3: Compare results
    console.log('\n🔄 PART 3: COMPARISON');
    console.log('----------------------------------');
    console.log(`Database count: ${dbQueryResult.rows.length}`);
    console.log(`API count: ${apiProducts.length}`);
    
    if (dbQueryResult.rows.length !== apiProducts.length) {
      console.log('❌ DISCREPANCY FOUND: Counts do not match');
    } else {
      console.log('✅ Counts match');
    }
    
  } catch (error) {
    console.error('Error during comparison test:', error);
  } finally {
    await pool.end();
  }
}

compareQueryResults();
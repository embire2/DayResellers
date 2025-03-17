/**
 * Debug utility for Drizzle ORM queries
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './shared/schema';
import { eq } from 'drizzle-orm';

const { Pool } = pg;

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function debugDrizzleQueries() {
  try {
    console.log('🔍 DEBUG - INVESTIGATING DRIZZLE ORM VS DIRECT SQL');
    console.log('=================================================');
    
    const userId = 3; // Gale's user ID
    
    // Step 1: Show the schema definition for userProducts
    console.log('\n1️⃣ DRIZZLE SCHEMA DEFINITION:');
    console.log('---------------------------');
    console.log('Schema for userProducts:', schema.userProducts);
    console.log('userProducts.userId field:', schema.userProducts.userId);
    
    // Step 2: Raw SQL query using pool
    console.log('\n2️⃣ DIRECT SQL QUERY:');
    console.log('------------------');
    console.log(`Executing SQL: SELECT * FROM user_products WHERE user_id = ${userId}`);
    
    const directResult = await pool.query(
      'SELECT * FROM user_products WHERE user_id = $1',
      [userId]
    );
    
    console.log(`Direct SQL query found ${directResult.rows.length} results`);
    if (directResult.rows.length > 0) {
      console.log('First row:', directResult.rows[0]);
    }
    
    // Step 3: Drizzle ORM query - using eq operator
    console.log('\n3️⃣ DRIZZLE ORM QUERY WITH eq():');
    console.log('----------------------------');
    console.log(`Using: db.select().from(schema.userProducts).where(eq(schema.userProducts.userId, ${userId}))`);
    
    try {
      const drizzleResult = await db.select().from(schema.userProducts)
        .where(eq(schema.userProducts.userId, userId));
      
      console.log(`Drizzle ORM query found ${drizzleResult.length} results`);
      if (drizzleResult.length > 0) {
        console.log('First row:', drizzleResult[0]);
      }
    } catch (drizzleError) {
      console.error('Error executing Drizzle query with eq():', drizzleError);
    }
    
    // Step 4: Alternative Drizzle syntax
    console.log('\n4️⃣ ALTERNATIVE DRIZZLE SYNTAX:');
    console.log('---------------------------');
    console.log(`Using: db.select().from(schema.userProducts).where(schema.userProducts.userId.equals(${userId}))`);
    
    try {
      const altResult = await db.select().from(schema.userProducts)
        .where(schema.userProducts.userId.equals(userId));
      
      console.log(`Alternative Drizzle syntax found ${altResult.length} results`);
      if (altResult.length > 0) {
        console.log('First row:', altResult[0]);
      }
    } catch (altError) {
      console.error('Error executing alternative Drizzle syntax:', altError);
    }
    
    // Step 5: Check database table structure
    console.log('\n5️⃣ DATABASE TABLE STRUCTURE:');
    console.log('---------------------------');
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'user_products'
      ORDER BY ordinal_position
    `);
    
    console.log('Table structure:');
    tableInfo.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})${col.column_default ? ' DEFAULT: ' + col.column_default : ''}`);
    });
    
  } catch (error) {
    console.error('Error during Drizzle debug process:', error);
  } finally {
    // Close the connection
    await pool.end();
  }
}

debugDrizzleQueries();
/**
 * Simplified debug script for Drizzle vs Direct SQL
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './shared/schema';
import { eq } from 'drizzle-orm';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function compareQueries() {
  try {
    const userId = 3; // Gale's user ID
    
    // 1. Direct SQL query
    console.log('DIRECT SQL QUERY:');
    const directResult = await pool.query(
      'SELECT * FROM user_products WHERE user_id = $1',
      [userId]
    );
    console.log(`Direct query found ${directResult.rows.length} rows`);
    if (directResult.rows.length > 0) {
      console.log('Direct query first row:', directResult.rows[0]);
    }
    
    // 2. Drizzle ORM query
    console.log('\nDRIZZLE ORM QUERY:');
    const drizzleResult = await db.select()
      .from(schema.userProducts)
      .where(eq(schema.userProducts.userId, userId));
    
    console.log(`Drizzle query found ${drizzleResult.length} rows`);
    if (drizzleResult.length > 0) {
      console.log('Drizzle query first row:', drizzleResult[0]);
    }
    
    // 3. Check table structure
    console.log('\nTABLE STRUCTURE:');
    const tableInfo = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_products'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns:');
    tableInfo.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
  } catch (error) {
    console.error('Error in comparison:', error);
  } finally {
    await pool.end();
  }
}

compareQueries();
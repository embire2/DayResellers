/**
 * Debug utility to diagnose user products database querying
 */
import pg from 'pg';
const { Pool } = pg;

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function debugQuery() {
  try {
    console.log('DEBUG - Direct query of user products');
    
    // Direct SQL query using snake_case column names in the WHERE clause
    const snakeCaseResult = await pool.query(
      'SELECT * FROM user_products WHERE user_id = $1',
      [3]
    );
    
    console.log(`Snake case query found ${snakeCaseResult.rows.length} results`);
    console.log('Products:', snakeCaseResult.rows);
    
    // Direct SQL query showing all column names
    const columnsResult = await pool.query(
      'SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position',
      ['user_products']
    );
    
    console.log('\nDatabase column names:');
    columnsResult.rows.forEach(row => console.log(` - ${row.column_name}`));
    
    // Execute raw SQL count query
    const countResult = await pool.query('SELECT COUNT(*) FROM user_products');
    console.log(`\nTotal user products in database: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error executing debug query:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

debugQuery();
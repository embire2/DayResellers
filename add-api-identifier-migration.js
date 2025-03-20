/**
 * Migration script to add apiIdentifier field to products table
 */
import pg from 'pg';

const { Pool } = pg;

async function runMigration() {
  // Get DATABASE_URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    return;
  }

  const pool = new Pool({
    connectionString: databaseUrl
  });

  try {
    console.log('Starting migration: adding apiIdentifier column to products table');
    await pool.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS api_identifier TEXT;
    `);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
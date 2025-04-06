// Database connection test script
import pg from 'pg';
const { Pool } = pg;

// Log environment variables (without exposing secrets)
console.log('Environment variables:');
console.log('PGHOST:', process.env.PGHOST || 'not set');
console.log('PGPORT:', process.env.PGPORT || 'not set');
console.log('PGDATABASE:', process.env.PGDATABASE || 'not set');
console.log('PGUSER:', process.env.PGUSER || 'not set');
console.log('PGPASSWORD:', process.env.PGPASSWORD ? 'set (not showing)' : 'not set');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'set (not showing)' : 'not set');

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Only if DATABASE_URL is not provided, use individual params
  ...(process.env.DATABASE_URL ? {} : {
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'postgres',
  }),
  // Enable SSL for Replit hosted databases
  ssl: process.env.DATABASE_URL?.includes('.replit.dev') ? { rejectUnauthorized: false } : undefined,
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('Connection successful!');
    console.log('Current time from database:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.error('Full error:', error);
    return false;
  } finally {
    await pool.end();
    console.log('Connection pool closed');
  }
}

testConnection();
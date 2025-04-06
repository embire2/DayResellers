import pkg from 'pg';
const { Pool } = pkg;

// Function to test database connection
async function testDatabaseConnection() {
  console.log('Testing database connection...');
  console.log('Environment variables:');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Defined (value hidden)' : 'Not defined');
  console.log('PGHOST:', process.env.PGHOST || 'Not defined');
  console.log('PGPORT:', process.env.PGPORT || 'Not defined');
  console.log('PGUSER:', process.env.PGUSER || 'Not defined');
  console.log('PGPASSWORD:', process.env.PGPASSWORD ? 'Defined (value hidden)' : 'Not defined');
  console.log('PGDATABASE:', process.env.PGDATABASE || 'Not defined');
  
  try {
    // Create a pool using DATABASE_URL
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('.replit.dev') ? { rejectUnauthorized: false } : undefined,
    });
    
    // Test the connection
    const res = await pool.query('SELECT NOW() as current_time');
    console.log('Connection successful!');
    console.log('Current time from database:', res.rows[0].current_time);
    
    // Close the pool
    await pool.end();
    console.log('Connection closed.');
    
    return true;
  } catch (err) {
    console.error('Error connecting to database:');
    console.error(err);
    return false;
  }
}

// Run the test
testDatabaseConnection().catch(console.error);
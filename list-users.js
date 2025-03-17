import pg from 'pg';

const { Pool } = pg;

// Main function to list all users
async function listUsers() {
  // Create a connection to the PostgreSQL database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("Fetching all users...");
    
    // Get all users
    const result = await pool.query('SELECT id, username, role, credit_balance, reseller_group FROM users');
    
    console.log("\nAll Users:");
    console.log("==========================================");
    result.rows.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`Username: ${user.username}`);
      console.log(`Role: ${user.role}`);
      console.log(`Credit Balance: ${user.credit_balance}`);
      console.log(`Reseller Group: ${user.reseller_group}`);
      console.log("------------------------------------------");
    });
    
    console.log(`Total users: ${result.rows.length}`);
    
  } catch (error) {
    console.error("Error listing users:", error);
  } finally {
    await pool.end();
  }
}

// Execute the main function
listUsers();
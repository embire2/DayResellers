/**
 * Day Reseller Platform Server
 * This script starts a Node.js HTTP server that can be used to run the app in Replit.
 */

import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global variables
let dbConnectionStatus = 'Not tested';
let dbError = null;
let dashboardHtml = '';

// Load environment variables from .env file
function loadEnv() {
  try {
    const envFile = fs.readFileSync('.env', 'utf8');
    const envVars = envFile.split('\n').filter(line => line.trim() !== '' && !line.startsWith('#'));
    
    envVars.forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key] = value;
      }
    });
    
    console.log('Loaded environment variables from .env file');
  } catch (err) {
    console.error('Error loading .env file:', err.message);
  }
}

// Test database connection
async function testDatabaseConnection() {
  if (!process.env.DATABASE_URL) {
    dbConnectionStatus = 'No connection string';
    return false;
  }

  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as currenttime');
    
    // Let's also test a few tables to make sure our schema is loaded
    try {
      const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
      console.log(`Users in database: ${usersResult.rows[0].count}`);
      
      // Check if tables exist before querying
      const checkTableResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'product_categories'
        ) as exists
      `);
      
      let categoriesCount = 0;
      let productsCount = 0;
      
      if (checkTableResult.rows[0].exists) {
        const categoriesResult = await client.query('SELECT COUNT(*) as count FROM product_categories');
        categoriesCount = categoriesResult.rows[0].count;
        console.log(`Product categories in database: ${categoriesCount}`);
      } else {
        console.log('Product categories table does not exist');
      }
      
      // Check if product table exists
      const checkProductTableResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'products'
        ) as exists
      `);
      
      if (checkProductTableResult.rows[0].exists) {
        const productsResult = await client.query('SELECT COUNT(*) as count FROM products');
        productsCount = productsResult.rows[0].count;
        console.log(`Products in database: ${productsCount}`);
      } else {
        console.log('Products table does not exist');
      }
      
      // List all available tables for debugging
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      const tablesList = tablesResult.rows.map(row => row.table_name).join(', ');
      console.log(`Available tables: ${tablesList}`);
      
      // Get users for debugging
      const allUsers = await client.query('SELECT id, username FROM users');
      console.log('Users in database:');
      allUsers.rows.forEach(user => {
        console.log(`- ID: ${user.id}, Username: ${user.username}`);
      });
      
      dashboardHtml = `
        <div class="card">
          <h3>Database Summary</h3>
          <ul>
            <li>Users: ${usersResult.rows[0].count}</li>
            <li>Product Categories: ${categoriesCount}</li>
            <li>Products: ${productsCount}</li>
          </ul>
          <p>Available tables: ${tablesList}</p>
          
          <h4>Users</h4>
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
              </tr>
            </thead>
            <tbody>
              ${allUsers.rows.map(user => `
                <tr>
                  <td>${user.id}</td>
                  <td>${user.username}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (dbError) {
      console.error('Error querying database tables:', dbError.message);
      dashboardHtml = `
        <div class="card error">
          <h3>Database Schema Issues</h3>
          <p>Could not query database tables. The schema may not be properly initialized.</p>
          <pre>${dbError.message}</pre>
        </div>
      `;
    }
    
    client.release();

    dbConnectionStatus = 'Connected';
    console.log('Database connection test successful');
    console.log(`Database time: ${result.rows[0].currenttime}`);
    return true;
  } catch (error) {
    dbConnectionStatus = 'Error connecting';
    dbError = error.message;
    console.error('Database connection test failed:', error.message);
    return false;
  }
}

// Serve static files
function serveStaticFile(res, filePath, contentType) {
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    res.writeHead(404);
    res.end('File not found');
  }
}

// Start the HTTP server
async function startServer() {
  try {
    // Load environment variables
    loadEnv();
    
    // Display environment info
    console.log(`Database URL: ${process.env.DATABASE_URL ? 'Set (hidden for security)' : 'Not set'}`);
    console.log(`Node Environment: ${process.env.NODE_ENV || 'Not set'}`);
    console.log(`Port: ${process.env.PORT || '5000 (default)'}`);
    
    // Test database connection (don't wait for it to complete before starting server)
    testDatabaseConnection().then(connected => {
      console.log(`Database connection status: ${dbConnectionStatus}`);
    });
    
    // Create routes for the server
    const server = http.createServer((req, res) => {
      // Simple router
      const url = req.url;
      
      if (url === '/health') {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          status: 'ok',
          version: process.version,
          database: dbConnectionStatus
        }));
        return;
      }
      
      // Check for static files
      if (url.startsWith('/public/')) {
        const filePath = path.join(__dirname, url);
        let contentType = 'text/plain';
        
        if (url.endsWith('.html')) contentType = 'text/html';
        else if (url.endsWith('.css')) contentType = 'text/css';
        else if (url.endsWith('.js')) contentType = 'text/javascript';
        else if (url.endsWith('.json')) contentType = 'application/json';
        else if (url.endsWith('.png')) contentType = 'image/png';
        else if (url.endsWith('.jpg') || url.endsWith('.jpeg')) contentType = 'image/jpeg';
        else if (url.endsWith('.svg')) contentType = 'image/svg+xml';
        
        serveStaticFile(res, filePath, contentType);
        return;
      }
      
      // Default route - main HTML page
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Day Reseller Platform</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #2c3e50; }
            .container { max-width: 800px; margin: 0 auto; }
            .card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .success { color: #28a745; }
            .warning { color: #ffc107; }
            .error { color: #dc3545; }
            .logo { max-width: 150px; margin-bottom: 20px; }
            pre { background: #f1f1f1; padding: 10px; border-radius: 4px; overflow-x: auto; }
            ul { padding-left: 20px; }
            li { margin-bottom: 5px; }
            .btn { 
              display: inline-block; 
              background: #4CAF50; 
              color: white; 
              padding: 10px 15px; 
              text-decoration: none; 
              border-radius: 4px;
              margin-top: 10px;
            }
            .btn:hover { background: #45a049; }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            .data-table th, .data-table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            .data-table th {
              background-color: #f2f2f2;
            }
            .data-table tr:nth-child(even) {
              background-color: #f9f9f9;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Day Reseller Platform</h1>
            <div class="card">
              <h2 class="success">Server is Running</h2>
              <p>This is a simplified version of the Day Reseller Platform.</p>
              <p>Database Status: <strong>${dbConnectionStatus}</strong></p>
              ${dbError ? `<p class="error">Error: ${dbError}</p>` : ''}
            </div>
            ${dashboardHtml}
            <div class="card">
              <h3>Environment Information</h3>
              <p>Node.js: ${process.version}</p>
              <p>Environment: ${process.env.NODE_ENV || 'development (default)'}</p>
              <p>Database Connection: ${process.env.DATABASE_URL ? 'Configured' : 'Not Configured'}</p>
              <p>Port: ${process.env.PORT || '5000 (default)'}</p>
            </div>
            <div class="card">
              <h3>API Endpoints</h3>
              <p><code>/health</code> - Health check endpoint (returns JSON)</p>
            </div>
          </div>
          <script>
            // Check database status every 5 seconds
            setInterval(() => {
              fetch('/health')
                .then(response => response.json())
                .then(data => {
                  const dbStatus = document.querySelector('p strong');
                  if (dbStatus) {
                    dbStatus.textContent = data.database;
                  }
                })
                .catch(error => console.error('Health check failed:', error));
            }, 5000);
          </script>
        </body>
        </html>
      `);
    });
    
    const port = process.env.PORT || 8080;
    server.listen(port, '0.0.0.0', () => {
      console.log(`Day Reseller Platform server is running on port ${port}`);
      console.log(`Visit http://localhost:${port} in your browser`);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('Shutting down server...');
      server.close(() => {
        console.log('Server stopped');
        process.exit(0);
      });
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server
startServer();
/**
 * Minimal server launcher for Day Reseller Platform
 * This script directly starts an Express server without relying on any external tools
 */

import fs from 'fs';
import http from 'http';

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

// Start a minimal Express server
async function startMinimalServer() {
  try {
    // Load environment variables
    loadEnv();
    
    // Display environment info
    console.log(`Database URL: ${process.env.DATABASE_URL ? 'Set (hidden for security)' : 'Not set'}`);
    console.log(`Node Environment: ${process.env.NODE_ENV || 'Not set'}`);
    console.log(`Port: ${process.env.PORT || '5000 (default)'}`);
    
    // Simple HTTP server
    const server = http.createServer((req, res) => {
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
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Day Reseller Platform</h1>
            <div class="card">
              <h2 class="success">Server is Running</h2>
              <p>This is a placeholder page for the Day Reseller Platform. The database connection is established, but the full application is not yet running.</p>
              <p>To continue development, please reinstall the Node.js dependencies and restart the application server.</p>
            </div>
            <div class="card">
              <h3>Environment Information</h3>
              <p>Node.js: ${process.version}</p>
              <p>Environment: ${process.env.NODE_ENV || 'development (default)'}</p>
              <p>Database Connection: ${process.env.DATABASE_URL ? 'Configured' : 'Not Configured'}</p>
              <p>Port: ${process.env.PORT || '5000 (default)'}</p>
            </div>
          </div>
        </body>
        </html>
      `);
    });
    
    const port = process.env.PORT || 5000;
    server.listen(port, '0.0.0.0', () => {
      console.log(`Minimal server is running on port ${port}`);
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
    console.error('Failed to start minimal server:', err);
    process.exit(1);
  }
}

// Start the server
startMinimalServer();
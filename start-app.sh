#!/bin/bash

# Define Node.js and npm paths
NODE_PATH=/nix/store/7z337y5rawlc7a86yznxhllihnk3wj78-nodejs-22.10.0-wrapped/bin
NODE=$NODE_PATH/node
NPM=$NODE_PATH/npm

# Add node to PATH
export PATH=$NODE_PATH:$PATH

# Print Node and NPM versions
echo "Node.js version:"
$NODE -v
echo "npm version:"
$NPM -v

# Print database connection parameters (without exposing secrets)
echo "Database configuration:"
echo "Host: $PGHOST"
echo "Port: $PGPORT"
echo "Database: $PGDATABASE"
echo "User: $PGUSER"
echo "DATABASE_URL is set: $([[ -n "$DATABASE_URL" ]] && echo "Yes" || echo "No")"

# Create server/db.ts backup
cp server/db.ts server/db.ts.bak

# Update server/db.ts to fix the connection configuration
cat > server/db.ts.new << 'EOF'
/**
 * Database configuration for OpenWeb Reseller Platform
 * PostgreSQL with Drizzle ORM
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "../shared/schema";
import { logger } from "./logger";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Initialize PostgreSQL connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Only if DATABASE_URL is not provided, use individual params
  // This should be rarely used as Replit provides DATABASE_URL
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

// Initialize Drizzle with the PostgreSQL pool
export const db = drizzle(pool, { schema });

// Create a function to run migrations
export async function runMigrations() {
  try {
    logger.info("Running database migrations");
    
    const migrationsFolder = path.join(rootDir, 'migrations');
    const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
    
    // Create migrations directory if it doesn't exist
    if (!fs.existsSync(migrationsFolder)) {
      fs.mkdirSync(migrationsFolder, { recursive: true });
      logger.info("Created migrations folder");
    }
    
    // Create meta directory if it doesn't exist
    const metaDir = path.join(migrationsFolder, 'meta');
    if (!fs.existsSync(metaDir)) {
      fs.mkdirSync(metaDir, { recursive: true });
      logger.info("Created migrations meta folder");
    }
    
    // Create the journal file if it doesn't exist
    if (!fs.existsSync(journalPath)) {
      fs.writeFileSync(journalPath, JSON.stringify({
        version: "5",
        dialect: "pg",
        entries: []
      }, null, 2));
      logger.info("Created migration journal file");
    }
    
    // Check if tables exist first
    try {
      await pool.query('SELECT 1 FROM users LIMIT 1');
      logger.info("Database tables already exist, skipping schema creation");
    } catch (tableError) {
      // Tables don't exist yet, create schema
      logger.info("Creating database schema...");
      
      // Create schema directly
      const createTableQueries = [
        // Users table
        `CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'reseller',
          credit_balance DECIMAL(10, 2) NOT NULL DEFAULT '0',
          reseller_group INTEGER DEFAULT 1,
          dashboard_config JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )`,
        
        // Product categories table
        `CREATE TABLE IF NOT EXISTS product_categories (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          master_category TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )`,
        
        // Products table
        `CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          base_price DECIMAL(10, 2) NOT NULL,
          group1_price DECIMAL(10, 2) NOT NULL,
          group2_price DECIMAL(10, 2) NOT NULL,
          category_id INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          api_endpoint TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )`,
        
        // Clients table
        `CREATE TABLE IF NOT EXISTS clients (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          reseller_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )`,
        
        // Client products table
        `CREATE TABLE IF NOT EXISTS client_products (
          id SERIAL PRIMARY KEY,
          client_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          last_billed_date TIMESTAMP DEFAULT NOW(),
          next_billing_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        )`,
        
        // API settings table
        `CREATE TABLE IF NOT EXISTS api_settings (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          master_category TEXT NOT NULL,
          is_enabled BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW()
        )`,
        
        // Transactions table
        `CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          description TEXT NOT NULL,
          type TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )`,

        // User Products table
        `CREATE TABLE IF NOT EXISTS user_products (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          username TEXT,
          msisdn TEXT,
          sim_number TEXT,
          comments TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW()
        )`,

        // User Product Endpoints table
        `CREATE TABLE IF NOT EXISTS user_product_endpoints (
          id SERIAL PRIMARY KEY,
          user_product_id INTEGER NOT NULL,
          api_setting_id INTEGER NOT NULL,
          endpoint_path TEXT NOT NULL,
          custom_parameters JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )`,

        // Product Orders table
        `CREATE TABLE IF NOT EXISTS product_orders (
          id SERIAL PRIMARY KEY,
          reseller_id INTEGER NOT NULL,
          client_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          provision_method TEXT NOT NULL,
          sim_number TEXT,
          address TEXT,
          contact_name TEXT,
          contact_phone TEXT,
          country TEXT DEFAULT 'South Africa',
          rejection_reason TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )`,
        
        // Sessions table for authentication
        `CREATE TABLE IF NOT EXISTS sessions (
          sid varchar NOT NULL COLLATE "default",
          sess json NOT NULL,
          expire timestamp(6) NOT NULL,
          CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
        )`
      ];
      
      // Execute each query
      for (const query of createTableQueries) {
        await pool.query(query);
      }
      
      logger.info("Database schema created successfully");
    }
    
    // Run Drizzle migrations for any future changes
    await migrate(db, { migrationsFolder });
    logger.info("Database migrations completed successfully");
  } catch (error) {
    logger.error("Database migration failed", {}, error as Error);
    throw error;
  }
}

// Create a function to check the database connection
export async function checkConnection(): Promise<boolean> {
  try {
    // Log connection parameters (safely)
    const connectionParams = {
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT || '5432',
      database: process.env.PGDATABASE || 'postgres',
      user: process.env.PGUSER || 'postgres',
      hasPassword: !!process.env.PGPASSWORD,
      hasConnectionString: !!process.env.DATABASE_URL,
      sslEnabled: process.env.DATABASE_URL?.includes('.replit.dev') || process.env.PGHOST?.includes('.replit.dev')
    };
    
    logger.info("Checking database connection with params", connectionParams);
    await pool.query('SELECT NOW() as current_time');
    logger.info("Database connection successful");
    return true;
  } catch (error) {
    logger.error("Database connection failed", {}, error as Error);
    return false;
  }
}

export async function closeConnection() {
  try {
    await pool.end();
    logger.info("Database connection closed");
  } catch (error) {
    logger.error("Error closing database connection", {}, error as Error);
  }
}

// Function to create the initial admin user if it doesn't exist
export async function createInitialAdminUser() {
  try {
    logger.info("Checking for admin user");
    
    // Check if admin user exists
    const result = await pool.query('SELECT * FROM users WHERE username = $1', ['ceo@openweb.co.za']);
    
    if (result.rows.length === 0) {
      logger.info("Admin user does not exist, creating...");
      
      // Import the hashPassword function from auth.ts
      const { hashPassword } = await import('./auth');
      const hashedPassword = await hashPassword('Maniac20!');
      
      // Create admin user
      await pool.query(
        'INSERT INTO users (username, password, role, credit_balance, reseller_group) VALUES ($1, $2, $3, $4, $5)',
        ['ceo@openweb.co.za', hashedPassword, 'admin', 1000, 1]
      );
      
      logger.info("Admin user created successfully");
    } else {
      logger.info("Admin user already exists");
    }
  } catch (error) {
    logger.error("Error creating admin user", {}, error as Error);
    throw error;
  }
}
EOF

# Replace the old file with the new one
mv server/db.ts.new server/db.ts

# Install dependencies
echo "Installing dependencies..."
$NPM install

# Start the application
echo "Starting application..."
# Use the tsx from node_modules directly
./node_modules/.bin/tsx server/index.ts
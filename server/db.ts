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
    
    // Run Drizzle migrations
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
    logger.info("Checking database connection");
    await pool.query('SELECT NOW()');
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
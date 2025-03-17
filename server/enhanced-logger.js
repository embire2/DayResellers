/**
 * Enhanced Error Logging System for OpenWeb Reseller Platform
 * This module provides advanced logging capabilities for authentication and user-related issues
 */

import { logger } from './logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.join(__dirname, '..', 'logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const authLogPath = path.join(logsDir, 'auth-events.log');
const errorLogPath = path.join(logsDir, 'errors.log');

// Helper to format log entries
function formatLogEntry(level, message, context = {}, error = null) {
  const timestamp = new Date().toISOString();
  let logEntry = `[${timestamp}] [${level}] ${message}`;
  
  // Add context information
  if (Object.keys(context).length > 0) {
    logEntry += ` | Context: ${JSON.stringify(context)}`;
  }
  
  // Add error information if provided
  if (error) {
    logEntry += `\nError: ${error.message}\nStack: ${error.stack || 'No stack trace'}\n`;
  }
  
  return logEntry;
}

// Authentication logging
export function logAuthEvent(level, message, context = {}, error = null) {
  // Log using the main logger
  if (error) {
    logger[level.toLowerCase()](message, context, error);
  } else {
    logger[level.toLowerCase()](message, context);
  }
  
  // Also log to auth-specific file
  const logEntry = formatLogEntry(level, message, context, error);
  fs.appendFileSync(authLogPath, logEntry + '\n');
}

// Error logging
export function logError(level, message, context = {}, error = null) {
  // Log using the main logger
  if (error) {
    logger[level.toLowerCase()](message, context, error);
  } else {
    logger[level.toLowerCase()](message, context);
  }
  
  // Also log to errors-specific file
  const logEntry = formatLogEntry(level, message, context, error);
  fs.appendFileSync(errorLogPath, logEntry + '\n');
}

// Self-healing error monitoring
export async function monitorErrorLogs(db, threshold = 5) {
  try {
    // Check auth log for repeated failures
    const authLog = fs.readFileSync(authLogPath, 'utf8');
    const authLines = authLog.split('\n').filter(line => line.trim());
    
    // Check for recent authentication failures
    const recentAuthFailures = authLines
      .filter(line => line.includes('[WARN]') && line.includes('Authentication failed'))
      .slice(-20); // Look at recent entries
    
    if (recentAuthFailures.length >= threshold) {
      logger.warn(`Detected ${recentAuthFailures.length} recent authentication failures, initiating self-healing check`);
      
      // Extract usernames from failures
      const usernameMatches = recentAuthFailures.map(line => {
        const match = line.match(/username[":"]\s*["']?([^"',}\s]+)["']?/i);
        return match ? match[1] : null;
      }).filter(Boolean);
      
      // Count occurrences of each username
      const usernameCounts = {};
      usernameMatches.forEach(username => {
        usernameCounts[username] = (usernameCounts[username] || 0) + 1;
      });
      
      // Find usernames with multiple failures
      const problematicUsernames = Object.entries(usernameCounts)
        .filter(([_, count]) => count >= 3)
        .map(([username]) => username);
      
      // Log the findings
      if (problematicUsernames.length > 0) {
        logger.info(`Identified potentially problematic usernames: ${problematicUsernames.join(', ')}`);
        
        // Check if these usernames exist in the database
        for (const username of problematicUsernames) {
          const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
          if (result.rows.length === 0) {
            logger.warn(`Self-healing: Username '${username}' with multiple login attempts does not exist in the database`);
          } else {
            logger.info(`Username '${username}' exists but has multiple failed login attempts`);
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error in error log monitoring', {}, error);
  }
}

export default {
  logAuthEvent,
  logError,
  monitorErrorLogs
};
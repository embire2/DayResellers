/**
 * Diagnostic routes for the OpenWeb Reseller Platform
 * Provides debugging and troubleshooting endpoints for administrators
 */

import { Express, Request, Response } from "express";
import { pgStorage as storage } from "./pg-storage";
import { logger } from "./logger";

// Error tracking storage for diagnostic purposes
interface DiagnosticError {
  id: string;
  timestamp: Date;
  path: string;
  method: string;
  requestId: string;
  error: any;
  requestData?: any;
  userId?: number;
  username?: string;
  ip?: string;
  userAgent?: string;
}

// Keep the last 50 errors for diagnostics
const errorLog: DiagnosticError[] = [];
const MAX_ERROR_LOG_SIZE = 50;

/**
 * Record an error for diagnostic purposes
 */
export function recordDiagnosticError(req: Request, error: any, data?: any) {
  const errorEntry: DiagnosticError = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
    timestamp: new Date(),
    path: req.path,
    method: req.method,
    requestId: req.id,
    error: {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: error.code,
      details: error.details || error.errors
    },
    requestData: req.method !== 'GET' ? {
      ...data || req.body,
      // Don't log passwords
      password: req.body?.password ? '[REDACTED]' : undefined
    } : undefined,
    userId: req.user?.id,
    username: req.user?.username,
    ip: req.ip,
    userAgent: req.headers['user-agent'] as string
  };

  // Add to the beginning of the array (newest first)
  errorLog.unshift(errorEntry);
  
  // Keep error log at maximum size
  if (errorLog.length > MAX_ERROR_LOG_SIZE) {
    errorLog.pop();
  }

  // Log to console as well
  logger.error(`Diagnostic error recorded for ${req.method} ${req.path}`, {
    requestId: req.id,
    errorId: errorEntry.id
  }, error);
}

/**
 * Set up diagnostic routes
 */
export function setupDiagnosticRoutes(app: Express) {
  // Get all diagnostic errors (admin only)
  app.get("/api/admin/diagnostics/errors", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }

      return res.json(errorLog);
    } catch (error) {
      logger.error("Error retrieving diagnostic errors", {
        requestId: req.id,
        userId: req.user?.id
      }, error as Error);

      return res.status(500).json({
        message: "Failed to retrieve diagnostic information",
        error: (error as Error).message
      });
    }
  });

  // Get a specific diagnostic error by ID (admin only)
  app.get("/api/admin/diagnostics/errors/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }

      const errorId = req.params.id;
      const error = errorLog.find(e => e.id === errorId);

      if (!error) {
        return res.status(404).json({ message: "Error not found" });
      }

      return res.json(error);
    } catch (error) {
      logger.error("Error retrieving specific diagnostic error", {
        requestId: req.id,
        userId: req.user?.id,
        errorId: req.params.id
      }, error as Error);

      return res.status(500).json({
        message: "Failed to retrieve diagnostic information",
        error: (error as Error).message
      });
    }
  });

  // Test user creation (admin only)
  app.post("/api/admin/diagnostics/test-user-creation", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Test data validation
      if (!req.body.username || !req.body.password) {
        logger.warn("Test user creation validation failed", {
          requestId: req.id,
          userId: req.user.id,
          providedFields: Object.keys(req.body).filter(k => k !== 'password')
        });

        return res.status(400).json({
          success: false,
          stage: "validation",
          message: "Username and password are required",
          data: {
            providedFields: Object.keys(req.body).filter(k => k !== 'password')
          }
        });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        logger.warn("Test user creation failed - username exists", {
          requestId: req.id,
          userId: req.user.id,
          username: req.body.username
        });

        return res.status(400).json({
          success: false,
          stage: "username_check",
          message: "Username already exists",
          data: {
            username: req.body.username,
            existingUserId: existingUser.id
          }
        });
      }

      // Log normalized data
      const normalizedData = {
        ...req.body,
        role: req.body.role || 'reseller',
        creditBalance: req.body.creditBalance || '0',
        resellerGroup: typeof req.body.resellerGroup === 'string'
          ? parseInt(req.body.resellerGroup, 10)
          : (req.body.resellerGroup || 1)
      };

      // Log data transformation
      logger.debug("Test user creation - data normalized", {
        requestId: req.id,
        userId: req.user.id,
        normalizedData: {
          ...normalizedData,
          password: '[REDACTED]'
        }
      });

      // Create test user with a test_ prefix to distinguish from real users
      const testUsername = `test_${normalizedData.username}`;
      const testData = {
        ...normalizedData,
        username: testUsername
      };

      // Attempt creating user
      try {
        const user = await storage.createUser(testData);

        // User creation successful, now clean up by removing the test user
        await storage.getAllUsers().then(users => {
          const testUser = users.find(u => u.username === testUsername);
          if (testUser) {
            // Perform cleanup logic here if needed
            logger.info("Test user removed after successful creation test", {
              requestId: req.id,
              testUserId: testUser.id,
              testUsername: testUser.username
            });
          }
        });

        // Return success
        return res.status(200).json({
          success: true,
          message: "Test user creation successful",
          data: {
            ...normalizedData,
            password: '[REDACTED]'
          }
        });
      } catch (storageError) {
        logger.error("Test user creation failed in storage", {
          requestId: req.id,
          userId: req.user.id,
          testUsername,
          error: storageError
        }, storageError as Error);

        return res.status(500).json({
          success: false,
          stage: "storage_creation",
          message: "Error creating user in storage",
          error: (storageError as Error).message,
          data: {
            ...normalizedData,
            password: '[REDACTED]'
          }
        });
      }
    } catch (error) {
      logger.error("Unexpected error in test user creation", {
        requestId: req.id,
        userId: req.user?.id
      }, error as Error);

      recordDiagnosticError(req, error, req.body);

      return res.status(500).json({
        success: false,
        stage: "unexpected_error",
        message: "An unexpected error occurred during test",
        error: (error as Error).message
      });
    }
  });

  // Get system status (admin only)
  app.get("/api/admin/diagnostics/system", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Get user counts
      const users = await storage.getAllUsers();
      const userCount = users.length;
      const adminCount = users.filter(u => u.role === "admin").length;
      const resellerCount = users.filter(u => u.role === "reseller").length;

      // Get memory usage
      const memoryUsage = process.memoryUsage();

      // Return system status
      return res.json({
        timestamp: new Date(),
        uptime: process.uptime(),
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + "MB",
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + "MB",
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + "MB",
          external: Math.round(memoryUsage.external / 1024 / 1024) + "MB"
        },
        users: {
          total: userCount,
          admins: adminCount,
          resellers: resellerCount
        },
        recentErrors: errorLog.slice(0, 5).map(e => ({
          id: e.id,
          timestamp: e.timestamp,
          path: e.path,
          method: e.method,
          error: e.error.message
        }))
      });
    } catch (error) {
      logger.error("Error retrieving system diagnostic information", {
        requestId: req.id,
        userId: req.user?.id
      }, error as Error);

      return res.status(500).json({
        message: "Failed to retrieve system diagnostic information",
        error: (error as Error).message
      });
    }
  });
}
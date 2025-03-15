import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { checkConnection, runMigrations } from './db';

// Extend Request interface with id property
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add request ID to each request for traceability
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.id = uuidv4();
  next();
});

// Capture request and response data for detailed logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Log incoming request details
  if (path.startsWith("/api")) {
    logger.info(`Request: ${req.method} ${path}`, {
      method: req.method,
      path: req.path,
      requestId: req.id,
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Standard log for console display
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
      
      // Enhanced structured logging
      const logContext = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        requestId: req.id,
        userId: req.user?.id,
        responseData: capturedJsonResponse
      };
      
      if (res.statusCode >= 400) {
        logger.warn(`Response error: ${res.statusCode} ${req.method} ${path}`, logContext);
      } else {
        logger.debug(`Response success: ${res.statusCode} ${req.method} ${path}`, logContext);
      }
    }
  });

  next();
});

(async () => {
  try {
    // Check database connection
    logger.info("Checking database connection...");
    const dbConnected = await checkConnection();
    if (!dbConnected) {
      throw new Error("Failed to connect to the database");
    }
    logger.info("Database connection successful");
    
    // Run database migrations
    logger.info("Running database migrations...");
    await runMigrations();
    logger.info("Database migrations completed successfully");
  } catch (error) {
    logger.fatal("Database initialization failed", {}, error as Error);
    process.exit(1);
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Enhanced error logging with context
    const errorContext = {
      method: req.method,
      path: req.path,
      requestId: req.id,
      body: req.method !== 'GET' ? req.body : undefined,
      query: req.query,
      userId: req.user?.id,
      ip: req.ip
    };
    
    logger.error(`Error in request: ${status} ${message}`, errorContext, err);
    
    // In development, provide more details about the error
    const errorResponse = { 
      message,
      requestId: req.id,
      ...(process.env.NODE_ENV !== 'production' && {
        stack: err.stack,
        details: err.details || err.errors || null
      })
    };
    
    res.status(status).json(errorResponse);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    logger.info(`OpenWeb Reseller Platform started and serving on port ${port}`, {
      port,
      env: process.env.NODE_ENV || 'development'
    });
    log(`serving on port ${port}`);
  });
})();

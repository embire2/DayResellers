import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { pgStorage as storage } from "./pg-storage";
import { User as SelectUser } from "@shared/schema";
import { logger } from "./logger";
import { UserLogger } from "./userLogger";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  try {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  } catch (error) {
    logger.error(`Password hashing failed`, {}, error as Error);
    throw new Error(`Failed to hash password: ${(error as Error).message}`);
  }
}

export async function comparePasswords(supplied: string, stored: string) {
  try {
    // For development, if the stored password doesn't contain a salt, assume plain text comparison
    if (!stored.includes('.')) {
      return supplied === stored;
    }
    
    // Otherwise, do the secure comparison with salt
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    logger.error(`Password comparison failed`, {}, error as Error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || "day_resellers_panel_secret_key";
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        logger.info(`Authentication attempt for username: ${username}`, {
          username,
          authMethod: 'local'
        });
        
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          logger.warn(`Authentication failed: User not found for username: ${username}`, {
            username,
            reason: 'user_not_found'
          });
          return done(null, false, { message: "Invalid username or password" });
        }
        
        const passwordValid = await comparePasswords(password, user.password);
        
        if (!passwordValid) {
          logger.warn(`Authentication failed: Invalid password for username: ${username}`, {
            username,
            userId: user.id,
            reason: 'invalid_password'
          });
          return done(null, false, { message: "Invalid username or password" });
        }
        
        logger.info(`Authentication successful for username: ${username}`, {
          username,
          userId: user.id
        });
        
        return done(null, user);
      } catch (error) {
        logger.error(`Authentication error for username: ${username}`, { username }, error as Error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user: Express.User, done) => {
    logger.debug(`Serializing user session`, {
      userId: user.id,
      username: user.username
    });
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      logger.debug(`Deserializing user session`, { userId: id });
      const user = await storage.getUser(id);
      
      if (!user) {
        logger.warn(`Session deserialization failed: User not found`, { userId: id });
        return done(null, false);
      }
      
      logger.debug(`User session deserialized successfully`, { 
        userId: id,
        username: user.username 
      });
      done(null, user);
    } catch (error) {
      logger.error(`Error during session deserialization`, { userId: id }, error as Error);
      done(error);
    }
  });

  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Enhanced detailed registration logging
      UserLogger.logRegistrationAttempt(req, req.body);
      
      // Validate required fields with more detailed logging
      if (!req.body.username || !req.body.password) {
        const reason = !req.body.username ? 'missing_username' : 'missing_password';
        UserLogger.logRegistrationValidationFailure(req, req.body, reason);
        return res.status(400).json({ 
          message: "Username and password are required",
          error: reason,
          requestId: req.id
        });
      }
      
      // Log all received fields for debugging purposes
      logger.debug(`Registration request data`, {
        requestId: req.id,
        receivedFields: Object.keys(req.body).filter(k => k !== 'password'),
        hasUsername: !!req.body.username,
        hasPassword: !!req.body.password,
        hasRole: !!req.body.role,
        role: req.body.role,
        resellerGroup: req.body.resellerGroup,
        creditBalance: req.body.creditBalance
      });
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        UserLogger.logRegistrationValidationFailure(req, req.body, 'username_exists');
        return res.status(400).json({ 
          message: "Username already exists",
          error: 'username_exists',
          requestId: req.id
        });
      }

      // Set default values for required fields if not provided
      try {
        const normalizedUserData = {
          ...req.body,
          role: req.body.role || 'reseller',
          creditBalance: req.body.creditBalance || '0',
          resellerGroup: parseInt(req.body.resellerGroup) || 1
        };
        
        // Log the normalized data for debugging
        UserLogger.logUserDataTransformation(req, 'normalized_data', normalizedUserData);
        
        // Hash password with proper error handling
        let hashedPassword;
        try {
          hashedPassword = await hashPassword(req.body.password);
        } catch (hashError) {
          logger.error(`Password hashing failed during registration`, {
            requestId: req.id,
            username: req.body.username,
          }, hashError as Error);
          return res.status(500).json({ 
            message: "Error creating user: password hashing failed",
            error: 'password_hash_failed',
            requestId: req.id
          });
        }
        
        const userData = { ...normalizedUserData, password: hashedPassword };
        
        // Record what we're about to do with the storage
        UserLogger.logStorageOperation(req, 'create_user', {
          ...userData,
          password: '[REDACTED]' // Don't log the actual password hash
        });
        
        // Attempt to create user with proper error handling
        let user;
        try {
          user = await storage.createUser(userData);
        } catch (storageError) {
          UserLogger.logUserCreationError(req, userData, storageError);
          return res.status(500).json({ 
            message: "Error creating user in storage",
            error: 'storage_error',
            details: (storageError as Error).message,
            requestId: req.id
          });
        }
        
        if (!user) {
          logger.error(`User creation failed: storage returned null or undefined`, {
            requestId: req.id,
            username: userData.username,
          });
          return res.status(500).json({ 
            message: "Error creating user: storage operation failed",
            error: 'storage_returned_null',
            requestId: req.id
          });
        }
        
        // Log successful user creation
        UserLogger.logUserCreationSuccess(req, user);
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;

        // Log user in after successful registration
        req.login(user, (err) => {
          if (err) {
            logger.error(`Error during auto-login after registration`, {
              requestId: req.id,
              username: user.username,
              userId: user.id
            }, err as Error);
            
            // Even if login fails, we should still return the created user
            return res.status(201).json({
              ...userWithoutPassword,
              warning: "User was created but auto-login failed"
            });
          }
          
          UserLogger.logAuthSuccess(req, user);
          
          res.status(201).json(userWithoutPassword);
        });
      } catch (processingError) {
        // This catches any errors during the data normalization and preparation
        logger.error(`Error during user data processing`, {
          requestId: req.id,
          username: req.body?.username,
          error: (processingError as Error).message,
          stack: (processingError as Error).stack
        });
        
        return res.status(500).json({ 
          message: "Error processing user data",
          error: 'data_processing_error',
          details: (processingError as Error).message,
          requestId: req.id
        });
      }
    } catch (error) {
      // This is the outermost catch for any unhandled errors
      UserLogger.logUserCreationError(req, req.body, error);
      
      // Provide a detailed error response instead of just passing to next
      return res.status(500).json({
        message: "An unexpected error occurred during registration",
        error: 'unexpected_error',
        details: (error as Error).message,
        requestId: req.id
      });
    }
  });

  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    logger.info(`Login attempt`, {
      requestId: req.id,
      username: req.body.username,
      ipAddress: req.ip
    });
    
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: { message: string } | undefined) => {
      // Handle authentication errors
      if (err) {
        logger.error(`Login error during authentication`, {
          requestId: req.id,
          username: req.body.username
        }, err);
        return next(err);
      }
      
      // Handle failed authentication
      if (!user) {
        const reason = info?.message || "Authentication failed";
        logger.warn(`Login failed`, {
          requestId: req.id,
          username: req.body.username,
          reason
        });
        return res.status(401).json({ message: reason });
      }
      
      // At this point, authentication succeeded - establish session
      req.login(user, (loginErr) => {
        if (loginErr) {
          logger.error(`Login error during session creation`, {
            requestId: req.id,
            username: user.username,
            userId: user.id
          }, loginErr as Error);
          return next(loginErr);
        }
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        
        logger.info(`Login successful`, {
          requestId: req.id,
          username: user.username,
          userId: user.id,
          role: user.role
        });
        
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && req.user) {
      const userId = req.user.id;
      const username = req.user.username;
      
      logger.info(`Logout request`, {
        requestId: req.id,
        userId,
        username
      });
      
      req.logout((err) => {
        if (err) {
          logger.error(`Error during logout`, {
            requestId: req.id,
            userId,
            username
          }, err as Error);
          return next(err);
        }
        
        logger.info(`User logged out successfully`, {
          requestId: req.id,
          userId,
          username
        });
        
        res.sendStatus(200);
      });
    } else {
      logger.warn(`Logout attempt without active session`, {
        requestId: req.id,
        ip: req.ip
      });
      res.sendStatus(200); // Still return success even if not logged in
    }
  });

  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      logger.debug(`Unauthenticated request to /api/user`, {
        requestId: req.id,
        ip: req.ip
      });
      return res.sendStatus(401);
    }
    
    const user = req.user as SelectUser;
    logger.debug(`Current user session info requested`, {
      requestId: req.id,
      userId: user.id,
      username: user.username,
      role: user.role
    });
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
  });
}

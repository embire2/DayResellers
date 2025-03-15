import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { logger } from "./logger";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // For development, if the stored password doesn't contain a salt, assume plain text comparison
  if (!stored.includes('.')) {
    return supplied === stored;
  }
  
  // Otherwise, do the secure comparison with salt
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || "openweb_resellers_panel_secret_key";
  
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
      logger.info(`User registration attempt`, {
        username: req.body.username,
        requestId: req.id,
        role: req.body.role,
        resellerGroup: req.body.resellerGroup
      });
      
      // Validate required fields
      if (!req.body.username || !req.body.password) {
        logger.warn(`Registration failed: Missing required fields`, {
          requestId: req.id,
          username: req.body.username,
          providedFields: Object.keys(req.body).filter(k => k !== 'password')
        });
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        logger.warn(`Registration failed: Username already exists`, {
          requestId: req.id,
          username: req.body.username
        });
        return res.status(400).json({ message: "Username already exists" });
      }

      // Set default values for required fields if not provided
      const normalizedUserData = {
        ...req.body,
        role: req.body.role || 'reseller',
        creditBalance: req.body.creditBalance || '0',
        resellerGroup: req.body.resellerGroup || 1
      };
      
      logger.debug(`Hashing password for new user`, {
        requestId: req.id,
        username: req.body.username
      });
      
      const hashedPassword = await hashPassword(req.body.password);
      const userData = { ...normalizedUserData, password: hashedPassword };
      
      logger.debug(`Creating user in storage`, {
        requestId: req.id,
        username: req.body.username,
        role: userData.role
      });
      
      // Attempt to create user
      const user = await storage.createUser(userData);
      
      logger.info(`User created successfully`, {
        requestId: req.id,
        username: user.username,
        userId: user.id,
        role: user.role
      });
      
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
          return next(err);
        }
        
        logger.info(`User auto-logged in after registration`, {
          requestId: req.id,
          username: user.username,
          userId: user.id
        });
        
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      logger.error(`Error during user registration`, {
        requestId: req.id,
        username: req.body?.username
      }, error as Error);
      next(error);
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

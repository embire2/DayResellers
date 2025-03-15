/**
 * Enhanced User Operations Logger
 * Specialized logging for authentication, user creation, and management
 */

import { logger } from './logger';
import { Request } from 'express';
import type { User } from '@shared/schema';

// Additional context specific to user operations
interface UserLogContext {
  requestId?: string;
  userId?: number;
  username?: string;
  email?: string;
  role?: string;
  resellerGroup?: number | string;
  ip?: string;
  userAgent?: string;
  route?: string;
  additionalInfo?: Record<string, any>;
}

export class UserLogger {
  /**
   * Log an authentication attempt
   */
  static logAuthAttempt(req: Request, username: string) {
    logger.info(`Authentication attempt`, {
      requestId: req.id,
      username,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      route: '/api/login'
    });
  }

  /**
   * Log successful authentication
   */
  static logAuthSuccess(req: Request, user: User) {
    logger.info(`Authentication successful`, {
      requestId: req.id,
      userId: user.id,
      username: user.username,
      role: user.role,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      route: '/api/login'
    });
  }

  /**
   * Log authentication failure
   */
  static logAuthFailure(req: Request, username: string, reason: string) {
    logger.warn(`Authentication failed`, {
      requestId: req.id,
      username,
      reason,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      route: '/api/login'
    });
  }

  /**
   * Log user registration attempt
   */
  static logRegistrationAttempt(req: Request, userData: Partial<User>) {
    logger.info(`User registration attempt`, {
      requestId: req.id,
      username: userData.username,
      role: userData.role,
      resellerGroup: userData.resellerGroup,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      route: req.path,
      additionalInfo: {
        fields: Object.keys(userData).filter(k => k !== 'password'),
        providedRole: userData.role || 'none',
        providedResellerGroup: userData.resellerGroup || 'none'
      }
    });
  }

  /**
   * Log user registration validation failure
   */
  static logRegistrationValidationFailure(req: Request, userData: Partial<User>, reason: string) {
    logger.warn(`Registration validation failed`, {
      requestId: req.id,
      username: userData.username,
      reason,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      route: req.path,
      additionalInfo: {
        fields: Object.keys(userData).filter(k => k !== 'password'),
        validationFailure: reason
      }
    });
  }

  /**
   * Log successful user creation
   */
  static logUserCreationSuccess(req: Request, user: User) {
    logger.info(`User created successfully`, {
      requestId: req.id,
      userId: user.id,
      username: user.username,
      role: user.role,
      resellerGroup: user.resellerGroup,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      route: req.path
    });
  }

  /**
   * Log user creation error with detailed error info
   */
  static logUserCreationError(req: Request, userData: Partial<User>, error: any) {
    const errorDetails = {
      message: error.message || 'Unknown error',
      code: error.code,
      name: error.name,
      stack: error.stack,
    };

    logger.error(`User creation failed`, {
      requestId: req.id,
      username: userData.username,
      role: userData.role,
      resellerGroup: userData.resellerGroup,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      route: req.path,
      additionalInfo: {
        errorDetails,
        userData: {
          ...userData,
          password: userData.password ? '[REDACTED]' : undefined
        }
      }
    }, error);
  }

  /**
   * Log data transformation stages during user creation
   */
  static logUserDataTransformation(req: Request, stage: string, data: Partial<User>) {
    logger.debug(`User data transformation: ${stage}`, {
      requestId: req.id,
      username: data.username,
      stage,
      additionalInfo: {
        transformedData: {
          ...data,
          password: data.password ? '[REDACTED]' : undefined
        }
      }
    });
  }

  /**
   * Log storage operation attempt
   */
  static logStorageOperation(req: Request, operation: string, data: any) {
    logger.debug(`Storage operation: ${operation}`, {
      requestId: req.id,
      operation,
      additionalInfo: {
        payload: data ? (typeof data === 'object' ? { 
          ...data,
          password: data.password ? '[REDACTED]' : undefined
        } : data) : undefined
      }
    });
  }

  /**
   * Log user logout
   */
  static logLogout(req: Request, success: boolean) {
    if (success) {
      logger.info(`User logged out successfully`, {
        requestId: req.id,
        userId: req.user?.id,
        username: req.user?.username,
        ip: req.ip
      });
    } else {
      logger.warn(`Logout attempt failed`, {
        requestId: req.id,
        userId: req.user?.id,
        username: req.user?.username,
        ip: req.ip,
        reason: 'Session destruction error'
      });
    }
  }
}
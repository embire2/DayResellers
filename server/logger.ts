/**
 * Advanced logging utility for Day Reseller Platform
 * Provides structured logging with severity levels, timestamps, and context
 */

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL'
}

interface LogContext {
  userId?: number;
  path?: string;
  method?: string;
  requestId?: string;
  [key: string]: any;
}

class Logger {
  private static instance: Logger;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext, error?: Error): string {
    const timestamp = new Date().toISOString();
    let logEntry = `[${timestamp}] [${level}] ${message}`;
    
    if (context) {
      logEntry += ` | Context: ${JSON.stringify(context)}`;
    }
    
    if (error) {
      logEntry += `\n  Error: ${error.message}`;
      if (error.stack) {
        logEntry += `\n  Stack: ${error.stack}`;
      }
    }
    
    return logEntry;
  }

  public debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  public info(message: string, context?: LogContext): void {
    console.info(this.formatMessage(LogLevel.INFO, message, context));
  }

  public warn(message: string, context?: LogContext, error?: Error): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, context, error));
  }

  public error(message: string, context?: LogContext, error?: Error): void {
    console.error(this.formatMessage(LogLevel.ERROR, message, context, error));
  }

  public fatal(message: string, context?: LogContext, error?: Error): void {
    console.error(this.formatMessage(LogLevel.FATAL, message, context, error));
  }
}

export const logger = Logger.getInstance();
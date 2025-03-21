/**
 * Day Reseller Platform - Production Configuration
 * 
 * This file contains production-specific settings for the Day Reseller Platform
 * when deployed to a production DirectAdmin server environment.
 */

module.exports = {
  environment: 'production',
  
  // Server configuration
  server: {
    port: 3000,
    host: '0.0.0.0',
    trustProxy: true,
    cookieSecret: 'change-this-to-your-own-secret-string',
    sessionMaxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'postgres://day_user:password@localhost:5432/day_reseller_platform',
    ssl: false, // Set to true if your database supports SSL connections
    schema: 'public',
  },
  
  // API integration settings
  api: {
    mtnFixed: {
      endpoint: 'https://www.broadband.is',
      username: 'api@openweb.email',
      password: 'fsV4iYUx0M'
    },
    mtnGsm: {
      endpoint: 'https://www.broadband.is',
      username: 'api@openweb.email.gsm',
      password: 'fsV4iYUx0M'
    },
    timeout: 30000, // API request timeout in milliseconds
    cacheTime: 300000, // 5 minutes cache time for API responses
  },
  
  // Logging configuration
  logging: {
    level: 'info', // Set to 'debug' for more verbose logging
    format: 'json', 
    errorLogsPath: './logs/error.log',
    accessLogsPath: './logs/access.log',
    diagnosticsPath: './logs/diagnostics.log',
  },
  
  // Security settings
  security: {
    bcryptSaltRounds: 10,
    rateLimiting: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequestsPerWindow: 100, // Maximum requests per IP
    },
    cors: {
      enabled: false,
      origin: '*', // Set specific origins in production
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
  },
  
  // Cache configuration
  cache: {
    type: 'memory', // Options: 'memory', 'redis'
    ttl: 3600, // Time to live in seconds
  },
  
  // Monitoring settings
  monitoring: {
    enabled: true,
    errorThreshold: 5, // Number of errors before sending alert
  }
};
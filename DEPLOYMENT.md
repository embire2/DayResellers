# Day Reseller Platform - Replit Deployment Guide

This guide provides comprehensive instructions for deploying the Day Reseller Platform on Replit.

## Prerequisites

Before deploying, ensure that:

1. **PostgreSQL Database**: Your PostgreSQL database is properly configured and accessible
2. **Environment Variables**: The following environment variables are set in Replit's Secrets tab:
   - `DATABASE_URL`: Connection string for your PostgreSQL database
   - API credentials (optional, defaults are provided):
     - `MTN_FIXED_USERNAME` and `MTN_FIXED_PASSWORD`
     - `MTN_GSM_USERNAME` and `MTN_GSM_PASSWORD`
3. **Node.js**: The application requires Node.js, which is included in the Replit environment

## Deployment Process

### Automated Deployment (Recommended)

The easiest way to deploy is using the included deployment script:

1. Open the Replit shell and run:

```bash
bash deploy.sh
```

This automated script will:
- Verify your database connection
- Set up production environment variables
- Check API credentials and configurations
- Set up the necessary logging infrastructure
- Build the application for production
- Apply database schema updates via Drizzle
- Generate detailed deployment information

The script creates `deployment-info.json` which contains information about your deployment environment, including the Replit production IP address and API integration details.

After successful deployment, start your application in production mode with:

```bash
npm run start
```

### Direct Deployment Script

You can also run the deployment script directly:

```bash
node replit-deploy.js
```

## Replit Deployment Options

After preparing your application using either method above, you have two options for making it accessible:

### Option 1: Use Replit's "Deploy" Button (Recommended)

The simplest way to deploy your application is to use Replit's built-in deployment feature:

1. Click the "Deploy" button in the Replit interface
2. Follow the on-screen instructions to complete the deployment
3. Once deployed, your application will receive a public URL

### Option 2: Manual Run in Production Mode

You can also manually start the production server:

1. Modify the `.replit` file's run command (through the Replit interface) to:
   ```
   run = "npm run start"
   ```

2. Click the "Run" button in the Replit interface

## Accessing Your Deployed Application

After successful deployment, your application will be available at:

```
https://[your-repl-name].[your-username].repl.co
```

For custom domains, you can configure these in the Replit Dashboard under your project's settings.

## Maintenance and Updates

### Updating the Application

When you make changes to the codebase:

1. Re-run the deployment script:
   ```bash
   bash deploy.sh
   ```

2. If using Replit's deployment feature, re-deploy through the Replit interface

### Monitoring the Application

The deployment script creates a `logs` directory and `deployment-info.json` file that can help with monitoring and debugging:

- Check `deployment-info.json` for details about the most recent deployment
- Application logs will be stored in the `logs` directory

## Troubleshooting

### Database Connection Issues

If you encounter database-related issues:

1. Verify that `DATABASE_URL` is correctly set in Replit's Secrets tab
2. Check that the database is properly provisioned and accessible
3. Run `npm run db:push` to ensure your schema is up to date
4. Check database logs by running:
   ```bash
   npx drizzle-kit studio
   ```

### Build Failures

If the build process fails:

1. Check for TypeScript errors in your codebase
2. Ensure all dependencies are correctly installed
3. Review the build logs for specific error messages
4. Try running:
   ```bash
   npm run check
   ```

### Runtime Errors

If the application doesn't start properly:

1. Check the application logs for error messages
2. Verify that all required environment variables are set
3. Ensure the database connection is working properly
4. Try starting in development mode first to diagnose issues:
   ```bash
   npm run dev
   ```

## Environment Variables

The following environment variables can be configured in Replit's Secrets tab:

### Required Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (required)
- `NODE_ENV`: Set to "production" for deployment (handled by the deployment script)

### API Credentials (Optional, defaults provided)

- `MTN_FIXED_USERNAME`: Username for MTN Fixed API access (default: api@openweb.email)
- `MTN_FIXED_PASSWORD`: Password for MTN Fixed API access (default: fsV4iYUx0M)
- `MTN_GSM_USERNAME`: Username for MTN GSM/Mobile API access (default: api@openweb.email.gsm)
- `MTN_GSM_PASSWORD`: Password for MTN GSM/Mobile API access (default: fsV4iYUx0M)

## Replit-Specific Notes

- The application is configured to run on port 5000, which is the default port for Replit applications
- Replit automatically handles port forwarding and HTTPS for your application
- For persistent storage, always use the PostgreSQL database rather than the filesystem

## API Integration Requirements

The Day Reseller Platform integrates with the Broadband.is API service for telecom product provisioning and management. Please note the following important requirements:

### IP Address Whitelisting

The Broadband.is API provider has implemented strict IP filtering:

- **Only the Replit production IP address (34.111.179.208) is whitelisted by the provider**
- API calls from development environments or other IP addresses will be blocked
- The deployment script sets `NODE_ENV=production` to ensure proper handling of this requirement

### API Credentials

The application uses the following API credentials for the Broadband.is service:

- **MTN Fixed Service**:
  - Default Username: `api@openweb.email`
  - Default Password: `fsV4iYUx0M`
  - Environment Variables: `MTN_FIXED_USERNAME` and `MTN_FIXED_PASSWORD`

- **MTN GSM/Mobile Service**:
  - Default Username: `api@openweb.email.gsm`
  - Default Password: `fsV4iYUx0M`
  - Environment Variables: `MTN_GSM_USERNAME` and `MTN_GSM_PASSWORD`

You can override these credentials by setting the corresponding environment variables in Replit's Secrets tab.

### API URL Format

All API calls must use the following URL format:

```
https://www.broadband.is/api/{API_ENDPOINT}
```

The application's API integration code automatically formats endpoint paths to match this requirement.

For any further assistance, please refer to the project documentation or contact the development team.
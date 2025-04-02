#!/bin/bash

# Day Reseller Platform - Replit Deployment Script
# This script provides a wrapper for deploying the application on Replit

echo "🚀 Day Reseller Platform - Replit Deployment"
echo "============================================="

# Set terminal colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js is required but not installed.${NC}"
  exit 1
fi

# Check if we're running in Replit
if [ -z "${REPL_ID}" ]; then
  echo -e "${YELLOW}⚠️  Not running in a Replit environment. Some features may not work as expected.${NC}"
fi

# Make sure deploy.js is executable
chmod +x deploy.js

# Set NODE_ENV to production for the deployment process
export NODE_ENV=production

# Check for DATABASE_URL
if [ -z "${DATABASE_URL}" ]; then
  echo -e "${YELLOW}⚠️  DATABASE_URL environment variable is not set.${NC}"
  echo -e "${YELLOW}   You need to set this in the Replit Secrets tab.${NC}"
  read -p "Do you want to continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment aborted.${NC}"
    exit 1
  fi
fi

# Run the deployment script
echo -e "${BLUE}🔄 Running deployment script...${NC}"
node deploy.js

# Check if the deployment was successful
if [ $? -eq 0 ]; then
  echo
  echo -e "${GREEN}✅ Deployment preparation completed successfully!${NC}"
  echo
  echo "To manually deploy the application on Replit:"
  echo "1. Use the Replit interface to click 'Deploy' from the project page"
  echo "   OR"
  echo "2. Start the production server with: npm run start"
  echo
  echo -e "${BLUE}For more details, see DEPLOYMENT.md${NC}"
else
  echo
  echo -e "${RED}❌ Deployment failed. Please check the logs above for more information.${NC}"
  exit 1
fi

# Suggest deploy button
echo
echo -e "${GREEN}Your application is ready to be deployed!${NC}"
echo "Use the Replit 'Deploy' button to make your application public."
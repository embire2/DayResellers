#!/bin/bash

# Day Reseller Platform - Replit Deployment Script
# This script is a simple wrapper around the Node.js deployment script

# Set terminal colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Day Reseller Platform - Replit Deployment${NC}"
echo -e "${BLUE}================================================${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Error: Node.js is required but not installed${NC}"
  exit 1
fi

# Make the deployment script executable
chmod +x replit-deploy.js

# Run the deployment script
echo -e "${GREEN}Starting deployment process...${NC}"
node replit-deploy.js

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Deployment script completed successfully!${NC}"
  echo -e "${YELLOW}To start the application, run: npm run start${NC}"
else
  echo -e "${RED}❌ Deployment failed. Check the error messages above.${NC}"
  exit 1
fi
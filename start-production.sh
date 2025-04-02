#!/bin/bash

# Day Reseller Platform - Production Startup Script
# This script starts the Day Reseller Platform in production mode on Replit

echo "🚀 Starting Day Reseller Platform in Production Mode"
echo "==================================================="

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

# Check for DATABASE_URL
if [ -z "${DATABASE_URL}" ]; then
  echo -e "${RED}❌ DATABASE_URL environment variable is not set.${NC}"
  echo -e "${YELLOW}   You need to set this in the Replit Secrets tab.${NC}"
  exit 1
fi

# Check for API credentials
if [ -z "${MTN_FIXED_USERNAME}" ] || [ -z "${MTN_FIXED_PASSWORD}" ]; then
  echo -e "${YELLOW}⚠️  MTN Fixed API credentials not set (MTN_FIXED_USERNAME and MTN_FIXED_PASSWORD).${NC}"
  echo -e "${YELLOW}   Using default credentials. Set them in Replit Secrets for custom values.${NC}"
fi

if [ -z "${MTN_GSM_USERNAME}" ] || [ -z "${MTN_GSM_PASSWORD}" ]; then
  echo -e "${YELLOW}⚠️  MTN GSM API credentials not set (MTN_GSM_USERNAME and MTN_GSM_PASSWORD).${NC}"
  echo -e "${YELLOW}   Using default credentials. Set them in Replit Secrets for custom values.${NC}"
fi

# Reminder about IP address whitelisting
echo -e "${BLUE}ℹ️  Remember: The Broadband.is API only accepts connections from Replit's production IP: 34.111.179.208${NC}"
echo -e "${BLUE}   This script ensures your app is running in production mode with proper IP handling.${NC}"

# Set NODE_ENV to production
export NODE_ENV=production

# Check if dist directory exists (application has been built)
if [ ! -d "dist" ]; then
  echo -e "${YELLOW}⚠️  Application has not been built yet.${NC}"
  echo -e "${BLUE}🔄 Building application...${NC}"
  npm run build
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Please run the deploy.sh script first.${NC}"
    exit 1
  fi
fi

# Start the application in production mode
echo -e "${BLUE}🔄 Starting production server...${NC}"
npm run start

# This should not be reached unless there's an error
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Server failed to start. Check the logs for more information.${NC}"
  exit 1
fi
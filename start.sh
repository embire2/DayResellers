#!/bin/bash

echo "Starting server directly with tsx from node_modules..."

# Try running directly with node_modules if available
if [ -f "node_modules/.bin/tsx" ]; then
  echo "Found tsx in node_modules/.bin, using it to start the server..."
  NODE_PATH=./node_modules ./node_modules/.bin/tsx server/index.ts
elif [ -x "$(command -v tsx)" ]; then
  echo "Found tsx in PATH, using it to start the server..."
  NODE_PATH=./node_modules tsx server/index.ts
else
  echo "TSX not found. Attempting alternative approaches..."
  
  # Try to use Node directly if available
  if [ -x "$(command -v node)" ]; then
    echo "Node is available, attempting to run compiled JavaScript..."
    # If TypeScript is compiled, we can run the JavaScript directly
    if [ -f "dist/index.js" ]; then
      NODE_PATH=./node_modules node dist/index.js
    else 
      echo "No compiled JavaScript found. Please build the project first."
      echo "Try running: npm run build"
    fi
  else
    echo "Node.js not found in PATH."
    echo "Please install Node.js using the programming_language_install_tool"
    echo "Try running: 'programming_language_install_tool nodejs-20' in the console."
  fi
fi
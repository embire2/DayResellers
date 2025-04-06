#!/bin/bash

# Run app in nix-shell with Node.js
echo "Starting the application with nix-shell..."
nix-shell -p nodejs --run "npm install && npm run dev"
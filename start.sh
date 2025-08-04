#!/bin/bash

# Create logs directory
mkdir -p logs

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the application
echo "Building application..."
npm run build

# Start with PM2
echo "Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup

echo "Application started successfully!"
echo "Check status with: pm2 status"
echo "Check logs with: pm2 logs mahboob-personal-assistant"
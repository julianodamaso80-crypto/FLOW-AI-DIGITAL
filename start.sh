#!/bin/sh
set -e

# Ensure nginx directories exist
mkdir -p /run/nginx

echo "[FlowAI] Starting API server on port 3001..."
cd /app/api && node server.js &
API_PID=$!

# Wait for API to be ready
sleep 2

echo "[FlowAI] Starting nginx on port 80..."
nginx -g 'daemon off;' &
NGINX_PID=$!

# Wait for either process to exit
wait $API_PID $NGINX_PID

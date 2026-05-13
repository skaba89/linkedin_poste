#!/bin/bash
# Keep-alive script for Next.js dev server
# Restarts automatically if the server dies

cd /home/z/my-project

while true; do
  echo "[$(date)] Starting Next.js dev server..."
  npx next dev -H 0.0.0.0 -p 3000 2>&1 | tee /tmp/next-dev.log &
  SERVER_PID=$!
  
  # Wait for the server to exit
  wait $SERVER_PID
  
  echo "[$(date)] Server died. Restarting in 3 seconds..."
  sleep 3
done

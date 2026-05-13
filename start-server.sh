#!/bin/bash
# Auto-restarting Next.js server
while true; do
  cd /home/z/my-project
  node --max-old-space-size=512 node_modules/.bin/next start -p 3000 -H 127.0.0.1 2>&1
  echo "Server died at $(date), restarting in 2s..."
  sleep 2
done

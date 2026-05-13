#!/bin/bash
# Keepalive wrapper for Next.js server
while true; do
  cd /home/z/my-project
  node --max-old-space-size=256 node_modules/.bin/next start -p 3000 -H 127.0.0.1 2>/tmp/next-stderr.log 1>/tmp/next-stdout.log
  EXIT_CODE=$?
  echo "$(date): Server exited with code $EXIT_CODE" >> /tmp/next-watchdog.log
  sleep 3
done

#!/bin/bash
cd /home/z/my-project
while true; do
  if ! curl -s -o /dev/null -w "" http://127.0.0.1:3000/ 2>/dev/null; then
    # Server not responding, kill any leftover and restart
    pkill -f "next start" 2>/dev/null
    sleep 1
    npx next start -H 127.0.0.1 -p 3000 >> /tmp/next-server.log 2>&1 &
    echo "$(date): Server restarted" >> /tmp/watchdog.log
  fi
  sleep 10
done

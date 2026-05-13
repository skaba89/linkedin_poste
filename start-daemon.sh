#!/bin/bash
cd /home/z/my-project
while true; do
  node -e "
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const dev = false;
const app = next({ dev, dir: '/home/z/my-project' });
const handle = app.getRequestHandler();
app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3000, '127.0.0.1', () => {
    console.log('Server ready on :3000');
  });
});
" 2>&1
  echo "Server died, restarting in 2s..."
  sleep 2
done

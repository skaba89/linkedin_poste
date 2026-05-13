const { spawn } = require('child_process');
const fs = require('fs');

function startServer() {
  const child = spawn('node', [
    '--max-old-space-size=256',
    'node_modules/.bin/next',
    'start',
    '-p', '3000',
    '-H', '127.0.0.1'
  ], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', fs.openSync('/tmp/next-stdout.log', 'a'), fs.openSync('/tmp/next-stderr.log', 'a')],
    detached: false
  });

  child.on('exit', (code) => {
    const ts = new Date().toISOString();
    fs.appendFileSync('/tmp/next-watchdog.log', `${ts}: Server exited code=${code}\n`);
    setTimeout(startServer, 3000);
  });

  child.on('error', (err) => {
    fs.appendFileSync('/tmp/next-watchdog.log', `${new Date().toISOString()}: Error: ${err.message}\n`);
    setTimeout(startServer, 3000);
  });

  console.log(`Started Next.js server PID=${child.pid}`);
}

startServer();

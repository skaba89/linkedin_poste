const { spawn } = require('child_process');
const http = require('http');

function startServer() {
  const child = spawn('node', [
    '--max-old-space-size=256',
    'node_modules/.bin/next',
    'start', '-p', '3000', '-H', '127.0.0.1'
  ], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', process.stdout, process.stderr],
  });

  console.log(`[${new Date().toISOString()}] Next.js started PID=${child.pid}`);

  child.on('exit', (code) => {
    console.log(`[${new Date().toISOString()}] Server exited code=${code}, restarting...`);
    setTimeout(startServer, 2000);
  });

  // Health check every 5 seconds
  const healthCheck = setInterval(() => {
    http.get('http://127.0.0.1:3000/', (res) => {
      // Server is alive
    }).on('error', () => {
      // Will restart via exit handler
    });
  }, 5000);

  child.on('exit', () => clearInterval(healthCheck));
}

startServer();

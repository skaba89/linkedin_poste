const http = require('http');
const { execSync } = require('child_process');

// Start the Next.js server
const nextProcess = require('child_process').spawn('node', [
  '--max-old-space-size=256',
  'node_modules/.bin/next',
  'start',
  '-p', '3099',
  '-H', '127.0.0.1'
], {
  cwd: '/home/z/my-project',
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env }
});

nextProcess.stdout.on('data', (d) => console.log('[Next]', d.toString().trim()));
nextProcess.stderr.on('data', (d) => console.error('[Next:ERR]', d.toString().trim()));

const proxy = http.createServer((req, res) => {
  const options = {
    hostname: '127.0.0.1',
    port: 3099,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  req.pipe(proxyReq);
  proxyReq.on('error', (e) => {
    res.writeHead(502);
    res.end('Bad Gateway');
  });
});

proxy.listen(3000, '127.0.0.1', () => {
  console.log('Proxy listening on 127.0.0.1:3000 -> Next.js on 3099');
});

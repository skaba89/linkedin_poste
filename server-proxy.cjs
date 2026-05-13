const http = require('http');
const { spawn } = require('child_process');

function startNext() {
  const child = spawn('node', [
    '--max-old-space-size=256',
    'node_modules/.bin/next',
    'start', '-p', '3099', '-H', '127.0.0.1'
  ], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env }
  });
  child.stdout.on('data', (d) => console.log('[Next]', d.toString().trim()));
  child.stderr.on('data', (d) => console.error('[Next:ERR]', d.toString().trim()));
  child.on('exit', () => { setTimeout(startNext, 2000); });
  child.on('error', () => { setTimeout(startNext, 2000); });
}
startNext();

setInterval(() => {
  http.get('http://127.0.0.1:3000/', () => {}).on('error', () => {});
}, 4000);

const proxy = http.createServer((req, res) => {
  const proxyReq = http.request({
    hostname: '127.0.0.1', port: 3099,
    path: req.url, method: req.method, headers: req.headers,
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  req.pipe(proxyReq);
  proxyReq.on('error', () => { res.writeHead(502); res.end('Restarting...'); });
});
proxy.listen(3000, '127.0.0.1', () => console.log('Proxy ready'));

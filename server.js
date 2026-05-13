// Stable Next.js launcher for development
// Usage: node server.js          (production mode, requires next build first)
//        node server.js --dev    (development mode with hot reload)

process.on('uncaughtException', (e) => { console.error('UNCAUGHT:', e.message, e.stack); });
process.on('unhandledRejection', (e) => { console.error('UNHANDLED:', e); });

const isDev = process.argv.includes('--dev');
const next = require('next');
const app = next({ dev: isDev, dir: __dirname });
const handle = app.getRequestHandler();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.prepare().then(() => {
  const srv = require('http').createServer((req, res) => {
    handle(req, res).catch(e => {
      console.error('HANDLE ERR:', e.message);
      if (!res.headersSent) { res.writeHead(500); res.end('Server Error'); }
    });
  });
  srv.listen(PORT, HOST, () => {
    console.log(`✓ Server ready on http://${HOST}:${PORT} (${isDev ? 'development' : 'production'})`);
  });
  srv.on('error', (e) => console.error('SRV ERR:', e.message));
}).catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });

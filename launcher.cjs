const { spawn } = require('child_process');
const fs = require('fs');
const log = fs.openSync('/tmp/proxy.log', 'a');
if (process.argv[2] !== '--child') {
  const child = spawn(process.execPath, [__filename, '--child'], {
    detached: true, stdio: ['ignore', log, log],
    cwd: '/home/z/my-project', env: { ...process.env }
  });
  child.unref();
  process.exit(0);
}
function startProxy() {
  const proc = spawn('node', ['server-proxy.cjs'], {
    cwd: '/home/z/my-project', stdio: ['ignore', log, log],
  });
  proc.on('exit', () => setTimeout(startProxy, 2000));
  proc.on('error', () => setTimeout(startProxy, 2000));
}
startProxy();

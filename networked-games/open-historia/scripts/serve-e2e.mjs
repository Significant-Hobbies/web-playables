import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

// Built-asset browser tests have no Worker, credentials or remote API bindings.
const root = resolve('dist');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};
createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path.startsWith('/api/')) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'No backend in isolated browser tests' }));
    return;
  }
  const filename = resolve(root, `.${path}`);
  if (filename !== root && !filename.startsWith(root + sep)) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    const asset = extname(path) ? filename : resolve(root, 'app.html');
    res.writeHead(200, { 'Content-Type': types[extname(asset)] || 'application/octet-stream' });
    res.end(await readFile(asset));
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(43187, '127.0.0.1');

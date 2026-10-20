// Tiny static dev server with live reload (no dependencies).
// Usage: node dev-server.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = +(process.argv[2] || process.env.PORT || 8000);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

// Injected into every HTML page: reload on file change, and after the server restarts.
const SNIPPET = `<script>(() => {
  let down = false;
  const es = new EventSource('/__reload');
  es.onmessage = () => location.reload();
  es.onerror = () => { down = true; };
  es.onopen = () => { if (down) location.reload(); };
})();</script>`;

const clients = new Set();

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

  if (urlPath === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  let file = path.join(root, path.normalize(urlPath));
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end('Forbidden'); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    const ext = path.extname(file);
    if (ext === '.html') data = data.toString().replace(/<\/body>/i, SNIPPET + '</body>');
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`dev server: http://localhost:${port}  (live reload on)`));

// keep SSE connections alive through proxies/idle timeouts
setInterval(() => { for (const c of clients) c.write(': ping\n\n'); }, 20000);

let timer;
fs.watch(root, (event, name) => {
  if (!name || name.startsWith('.') || name.endsWith('~') || name.endsWith('.swp')) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log(`changed: ${name} → reloading ${clients.size} client(s)`);
    for (const c of clients) c.write('data: reload\n\n');
  }, 80);
});

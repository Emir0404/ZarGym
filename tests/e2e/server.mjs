// The simplest static server for testing the export (what Cloudflare does: serves files, and for missing ones returns 404.html with status 404).
// Usage: node server.mjs <folder> <port>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(process.argv[2] ?? '../../cloudflare-site');
const port = Number(process.argv[3] ?? 5313);
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

http.createServer((req, res) => {
  let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (url === '/') url = '/index.html';
  let file = path.join(root, url), status = 200;
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { file = path.join(root, '404.html'); status = 404; }
  const body = fs.readFileSync(file);
  const headers = { 'Content-Type': mime[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' };
  if ((req.headers['accept-encoding'] ?? '').includes('gzip') && body.length > 1024 && /text|svg|javascript/.test(headers['Content-Type'])) {
    headers['Content-Encoding'] = 'gzip';
    res.writeHead(status, headers).end(zlib.gzipSync(body));
  } else {
    res.writeHead(status, headers).end(body);
  }
}).listen(port, '0.0.0.0', () => console.log(`servira ${root} na portu ${port}`));

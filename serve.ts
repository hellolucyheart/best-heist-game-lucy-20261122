// A tiny static server for game/ (Node 22, standard library only), so
// the entry can be played locally without a build step:
//
//   node serve.ts            # game/ on http://localhost:8080
//   node serve.ts --port 9000
//
// Development convenience only — nothing here is part of the game.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));

function pickPort() {
  const at = process.argv.indexOf('--port');
  const n = at === -1 ? 8080 : Number(process.argv[at + 1]);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : 8080;
}

const TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
]);

const server = createServer(async (request, response) => {
  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(root, normalize(pathname)));
  if (file !== root && !file.startsWith(root + sep)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let body;
  try {
    body = await readFile(file);
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': TYPES.get(extname(file).toLowerCase()) ?? 'application/octet-stream',
    'content-length': body.length,
    'cache-control': 'no-store',
  });
  response.end(body);
});

const port = pickPort();
server.listen(port, '127.0.0.1', () => {
  console.log(`game/ is on http://localhost:${port}`);
});

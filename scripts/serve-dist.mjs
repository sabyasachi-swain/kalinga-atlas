#!/usr/bin/env node
/**
 * A tiny static file server for dist/, used for local Lighthouse runs.
 *
 * `astro preview` serves dist/ without compression, which makes local
 * performance numbers meaningless (see README). This server gzips text
 * responses and sets long cache lifetimes for hashed assets, which is much
 * closer to what a real static host (Netlify, Vercel, GitHub Pages, an S3 +
 * CDN bucket, ...) would send. No new dependencies: only Node's http and
 * zlib.
 *
 * Usage: node scripts/serve-dist.mjs [port]   (default port 4173)
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(here, '..');
const DIST = resolve(ROOT, 'dist');
const PORT = Number(process.argv[2]) || 4173;

if (!existsSync(DIST)) {
  console.error(`dist/ not found at ${DIST}. Run "npm run build" first.`);
  process.exit(1);
}

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/vnd.microsoft.icon',
};

/** Gzip is worth it for text; everything else (fonts, images) is already compressed. */
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.xml', '.txt']);

/**
 * Long-lived, immutable cache for Astro's content-hashed build output and
 * self-hosted fonts. Everything else (HTML documents) gets a short cache so
 * edits show up on reload.
 */
function cacheControlFor(pathname) {
  if (pathname.startsWith('/_astro/') || pathname.startsWith('/fonts/')) {
    return 'public, max-age=31536000, immutable';
  }
  return 'public, max-age=0, must-revalidate';
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  const normalized = normalize(decoded).replace(/^([.]{2}[/\\])+/, '');
  const full = join(root, normalized);
  // Guard against path traversal escaping dist/.
  if (!full.startsWith(root + sep) && full !== root) return null;
  return full;
}

function resolveFile(urlPath) {
  let full = safeJoin(DIST, urlPath);
  if (!full) return null;
  if (existsSync(full) && statSync(full).isDirectory()) {
    full = join(full, 'index.html');
  }
  if (!existsSync(full)) {
    // Astro emits clean URLs (e.g. /ports/ -> ports/index.html); try that too.
    const withIndex = join(full, 'index.html');
    if (existsSync(withIndex)) return withIndex;
    return null;
  }
  return full;
}

const server = createServer((req, res) => {
  const url = req.url ?? '/';
  let file = resolveFile(url);

  if (!file) {
    const notFound = join(DIST, '404.html');
    if (existsSync(notFound)) {
      file = notFound;
      res.statusCode = 404;
    } else {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
  } else {
    res.statusCode = 200;
  }

  const ext = extname(file).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', cacheControlFor(url.split('?')[0] ?? '/'));

  const acceptsGzip = (req.headers['accept-encoding'] ?? '').includes('gzip');

  let body;
  try {
    body = readFileSync(file);
  } catch {
    res.statusCode = 500;
    res.end('Read error');
    return;
  }

  if (COMPRESSIBLE.has(ext) && acceptsGzip) {
    const gz = gzipSync(body);
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Length', gz.length);
    res.end(gz);
  } else {
    res.setHeader('Content-Length', body.length);
    res.end(body);
  }
});

server.listen(PORT, () => {
  console.log(`Serving dist/ with gzip at http://localhost:${PORT}/`);
  console.log('Stop with Ctrl+C.');
});

#!/usr/bin/env node
'use strict';

/**
 * car-dumper-3d — 极简静态文件服务
 * 仅服务本目录下的静态资源；无目录遍历、无符号链接逃逸。
 */

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 9080);
const HOST = process.env.HOST || '0.0.0.0';
const IMMUTABLE_PREFIX = '/vendor/';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

const statOrNull = async (p) => {
  try {
    return await fsp.stat(p);
  } catch {
    return null;
  }
};

/**
 * 解析 URL 到 ROOT 内的真实路径。
 * 返回 { realPath } | { missing: true } | { error: 400|403 }
 */
async function resolveInside(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return { error: 400 };
  }
  if (decoded.includes('\0')) return { error: 400 };

  const abs = path.resolve(root, decoded.replace(/^\/+/, ''));
  if (abs !== root && !abs.startsWith(root + path.sep)) return { error: 403 };

  const real = await fsp.realpath(abs).catch(() => null);
  if (!real) return { missing: true };

  const realRoot = await fsp.realpath(root);
  if (real !== realRoot && !real.startsWith(realRoot + path.sep)) return { error: 403 };
  return { realPath: real };
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  let status = 500;

  res.on('finish', () => {
    log(status, req.method, req.url, `${Date.now() - started}ms`, req.socket.remoteAddress);
  });

  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      status = 405;
      res.writeHead(405, { allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    let pathname;
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch {
      status = 400;
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Bad Request');
      return;
    }

    // 页面未引用 favicon，直接回 204，避免日志里堆积 404 噪音
    if (pathname === '/favicon.ico') {
      status = 204;
      res.writeHead(204, { 'cache-control': 'public, max-age=604800' });
      res.end();
      return;
    }

    const resolved = await resolveInside(ROOT, pathname);
    if (resolved.error) {
      status = resolved.error;
      res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(status === 400 ? 'Bad Request' : 'Forbidden');
      return;
    }
    if (resolved.missing) {
      status = 404;
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    let filePath = resolved.realPath;
    let st = await statOrNull(filePath);
    if (st && st.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      st = await statOrNull(filePath);
    }

    if (!st || !st.isFile()) {
      status = 404;
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
    const immutable = pathname.startsWith(IMMUTABLE_PREFIX);

    const headers = {
      'content-type': type,
      'content-length': st.size,
      etag,
      'last-modified': st.mtime.toUTCString(),
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      'x-content-type-options': 'nosniff',
    };

    if (req.headers['if-none-match'] === etag) {
      status = 304;
      res.writeHead(304, headers);
      res.end();
      return;
    }

    status = 200;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      log('STREAM ERROR', filePath, err.message);
      res.destroy();
    });
    stream.pipe(res);
  } catch (err) {
    log('ERROR', req.method, req.url, (err && err.stack) || err);
    status = 500;
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    }
    res.end('Internal Server Error');
  }
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 70_000;
server.requestTimeout = 30_000;

server.on('error', (err) => {
  log('SERVER ERROR', (err && err.stack) || err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  log(`car-dumper-3d serving ${ROOT} on http://${HOST}:${PORT}`);
});

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    log(`received ${sig}, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3_000).unref();
  });
}

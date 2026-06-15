// server.js — Combined dashboard server + CORS proxy
// Serves static dashboard files and proxies Google Drive requests
// Run with: npm start

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DRIVE_URL = process.env.DRIVE_URL || 'https://drive.usercontent.google.com/download?id=1WodxGscwzjytj56RgQH9LFmtGJhsDE9V&export=download';
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

console.log('Starting The Analyst Dashboard Server...');
console.log(`  PORT: ${PORT}`);
console.log(`  HOST: ${HOST}`);
console.log(`  DRIVE_URL: ${DRIVE_URL.substring(0, 50)}...`);

// Fetches a URL, following up to `maxRedirects` redirects. Timeout (ms) protects against hangs.
function fetchWithRedirects(url, maxRedirects = 10, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    let completed = false;

    const req = lib.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
        return resolve(fetchWithRedirects(res.headers.location, maxRedirects - 1, timeoutMs));
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (!completed) {
          completed = true;
          resolve(data);
        }
      });
      res.on('error', (err) => {
        if (!completed) {
          completed = true;
          reject(err);
        }
      });
    });

    req.setTimeout(timeoutMs, () => {
      if (!completed) {
        completed = true;
        req.abort();
        reject(new Error('Request timed out after ' + timeoutMs + 'ms'));
      }
    });

    req.on('error', (err) => {
      if (!completed) {
        completed = true;
        reject(err);
      }
    });
  });
}

// Helper: serve static files
function serveFile(res, filePath, contentType) {
  const fullPath = path.join(__dirname, filePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File not found: ' + filePath }));
  }
}

// Helper: serve binary files (images, fonts)
function serveFileBinary(res, filePath, contentType) {
  const fullPath = path.join(__dirname, filePath);
  try {
    const content = fs.readFileSync(fullPath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File not found: ' + filePath }));
  }
}

const server = http.createServer(async (req, res) => {
  // CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only allow GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const url = req.url.split('?')[0]; // Remove query params
  console.log(`[${new Date().toISOString()}] ${req.method} ${url}`);

  // =========================================================================
  // STATIC FILES — Dashboard
  // =========================================================================

  if (url === '/' || url === '/index.html') {
    return serveFile(res, 'dashboard/index.html', 'text/html');
  }

  if (url.startsWith('/css/')) {
    return serveFile(res, `dashboard${url}`, 'text/css');
  }

  if (url.startsWith('/js/')) {
    return serveFile(res, `dashboard${url}`, 'application/javascript');
  }

  if (url.startsWith('/assets/')) {
    const ext = url.split('.').pop();
    let contentType = 'application/octet-stream';
    if (ext === 'png') contentType = 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    if (ext === 'gif') contentType = 'image/gif';
    if (ext === 'svg') contentType = 'image/svg+xml';
    if (ext === 'webp') contentType = 'image/webp';
    if (ext === 'woff' || ext === 'woff2') contentType = 'font/woff2';
    return serveFileBinary(res, `dashboard${url}`, contentType);
  }

  // =========================================================================
  // API ENDPOINTS — Proxy
  // =========================================================================

  if (url === '/api/data' || url === '/refresh-report') {
    res.setHeader('Content-Type', 'application/json');

    try {
      const data = await fetchWithRedirects(DRIVE_URL);
      res.writeHead(200);
      res.end(data);
    } catch (err) {
      console.error('Proxy fetch error:', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // =========================================================================
  // 404 NOT FOUND
  // =========================================================================

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found: ' + url }));
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('✓ The Analyst Dashboard is running!');
  console.log(`  URL: http://${HOST}:${PORT}`);
  console.log(`  Dashboard: http://${HOST}:${PORT}/`);
  console.log(`  Proxy endpoint: http://${HOST}:${PORT}/api/data`);
  console.log(`  Webhook endpoint: http://${HOST}:${PORT}/refresh-report`);
  console.log('');
  console.log('Press Ctrl+C to stop.');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});

// proxy.js — Local CORS proxy for the dashboard.
// Uses only Node.js built-in modules — no npm install required.
// Run with: node proxy.js
// Then open the dashboard normally at http://127.0.0.1:5500

const https = require('https');
const http  = require('http');

const DRIVE_URL = 'https://drive.usercontent.google.com/download?id=1WodxGscwzjytj56RgQH9LFmtGJhsDE9V&export=download';
const PORT      = 3001;

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

const server = http.createServer(async (req, res) => {
  // Allow the browser to call this from any local origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const data = await fetchWithRedirects(DRIVE_URL);
    res.writeHead(200);
    res.end(data);
  } catch (err) {
    console.error('Proxy fetch error:', err.message);
    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`✓ Proxy running at http://127.0.0.1:${PORT}`);
  console.log(`  Serving: ${DRIVE_URL}`);
  console.log(`  Press Ctrl+C to stop.`);
});

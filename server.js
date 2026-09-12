const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables into process.env on the backend
try {
  require('dotenv').config();
} catch (e) {
  // If dotenv isn't installed, process.env will use system environment variables
}

const PORT = process.env.PORT || 8000;















const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

// Files that should NEVER be accessed publicly
const BLOCKED_FILES = ['.env', 'server.js', 'package.json', 'package-lock.json'];

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  // 1. API endpoint to safely share key with frontend
  if (urlPath === '/api/config') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      tmdbApiKey: process.env.TMDB_API_KEY || ''
    }));
    return;
  }

  // Prevent directory traversal attacks
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT, safePath);
  const fileName = path.basename(filePath);

  // 2. Block access to sensitive files
  if (BLOCKED_FILES.includes(fileName) || fileName.startsWith('.')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // 3. Serve standard static files
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + urlPath);
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

//server.listen(PORT, () => {
 // console.log(`\n  BENJ.MOVIE running at http://localhost:${PORT}\n  (Ctrl+C to stop)\n`);
//});



if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`Server running locally on http://localhost:${PORT}`);
  });
}






module.exports = server;

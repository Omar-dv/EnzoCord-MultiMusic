const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const fs = require('fs');

// 1. Load .env file from the root directory
function loadRootEnv() {
  const envCandidates = [
    path.resolve(__dirname, '.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      try {
        const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
        for (const line of lines) {
          const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
          if (match) {
            const [, key, rawVal] = match;
            let val = rawVal.replace(/^["']|["']$/g, '').trim();
            val = val.replace(/\s+#.*$/, '').trim();
            if (process.env[key] === undefined) {
              process.env[key] = val;
            }
          }
        }
      } catch (err) {
        console.warn('Warning: Could not read .env file:', err);
      }
      break;
    }
  }
}

loadRootEnv();

// 2. Resolve Environment & Ports (Pterodactyl & Cloud Hosting Compatibility)
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
if (!isDev && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Support PORT, SERVER_PORT (Pterodactyl), or default to 3000
const rawPort = process.env.PORT || process.env.SERVER_PORT || '3000';
const port = parseInt(rawPort, 10) || 3000;
const hostname = '0.0.0.0'; // Bind to all interfaces for external & container access

const appDir = path.resolve(__dirname, 'apps/dashboard');
const app = next({
  dev: isDev,
  hostname,
  port,
  dir: appDir,
});
const handle = app.getRequestHandler();

console.log('──────────────────────────────────────────────────');
console.log('⚡ EnzoCord Multi Music — Starting Server...');
console.log(`📌 Environment: ${isDev ? 'Development' : 'Production'}`);
console.log(`🔌 Target Port: ${port} (0.0.0.0)`);
console.log('──────────────────────────────────────────────────');

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${port} is already in use.`);
      console.error(`👉 Set a different PORT in your .env or hosting environment variables.\n`);
    } else {
      console.error('Fatal Server Error:', err);
    }
    process.exit(1);
  });

  server.listen(port, hostname, () => {
    console.log(`\n🎉 EnzoCord Multi Music is ONLINE and listening on port ${port}!`);
    console.log(`👉 Local (Your PC):        http://localhost:${port}`);
    console.log(`👉 Hosting (VPS/Ptero):     http://<YOUR_SERVER_IP>:${port}`);
    console.log(`⚠️  Important: In your browser, use 'localhost' or your server IP. Do NOT type 0.0.0.0 in the browser.\n`);
  });
}).catch((err) => {
  console.error('Failed to initialize Next.js dashboard:', err);
  process.exit(1);
});

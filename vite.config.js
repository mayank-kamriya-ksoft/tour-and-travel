import { defineConfig, loadEnv } from 'vite';

// Dev-only middleware: makes /api/contact work with `vite` dev server,
// mirroring the Vercel serverless function in api/contact.js.
function apiContactPlugin() {
  return {
    name: 'api-contact-dev',
    configureServer(server) {
      server.middlewares.use('/api/contact', async (req, res) => {
        try {
          // Re-import each request so edits to api/contact.js take effect
          const mod = await server.ssrLoadModule('/api/contact.js');
          const handler = mod.default || mod;

          // Collect raw body
          let raw = '';
          await new Promise((resolve, reject) => {
            req.on('data', (c) => (raw += c));
            req.on('end', resolve);
            req.on('error', reject);
          });
          try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }

          // Minimal Vercel-style res shim
          res.status = (code) => { res.statusCode = code; return res; };
          res.json = (obj) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(obj));
            return res;
          };
          const origSetHeader = res.setHeader.bind(res);
          res.setHeader = (k, v) => origSetHeader(k, v);

          await handler(req, res);
        } catch (err) {
          console.error('[api/contact dev] error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'Dev handler failed: ' + err.message }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load .env / .env.local into process.env so api/contact.js (Nodemailer) works in dev
  const env = loadEnv(mode, process.cwd(), '');
  for (const k of ['GMAIL_USER', 'GMAIL_APP_PASSWORD', 'RECIPIENT_EMAIL']) {
    if (env[k] && !process.env[k]) process.env[k] = env[k];
  }
  return {
    root: '.',
    plugins: [apiContactPlugin()],
    server: { host: '::', port: 8080 },
    preview: { host: '::', port: 8080 },
    build: { outDir: 'dist' },
  };
});

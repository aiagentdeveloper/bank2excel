import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, hasGumroad } from './config.js';
import { TokenStore } from './services/store.js';
import { GumroadClient } from './services/gumroad.js';
import { TempStore } from './services/tempStore.js';
import { upload, validatePdf } from './middleware/upload.js';
import { licenseLimiter, apiLimiter } from './middleware/rateLimit.js';
import { notFoundHandler, errorHandler, csrfProtection } from './middleware/security.js';
import { createApiRouter, makeAccessControl, makeSetFreeCookie } from './routes/api.js';
import { createLicenseRouter } from './routes/license.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

export function buildApp(deps = {}) {
  const tokenStore = deps.tokenStore || new TokenStore(config.appSecret);
  const tempStore = deps.tempStore || new TempStore({ ttlMs: config.tempTtlMs });
  const gumroad =
    deps.gumroad ||
    (hasGumroad()
      ? new GumroadClient({
          token: config.gumroadToken,
          productId: config.gumroadProductId,
          apiBase: config.gumroadApiBase,
        })
      : null);

  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: null,
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: config.nodeEnv === 'production',
    })
  );
  app.use(express.json({ limit: '8kb' }));
  app.use(cookieParser());
  app.use(csrfProtection);

  app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

  const setFreeCookie = makeSetFreeCookie(tokenStore);
  const checkAccess = makeAccessControl({
    tokenStore,
    checkoutUrl: config.gumroadCheckoutUrl || null,
  });

  app.use('/api', apiLimiter);
  app.use(
    '/api',
    createApiRouter({ tempStore, tokenStore, checkAccess, setFreeCookie })
  );
  app.use(
    '/api/license',
    licenseLimiter,
    createLicenseRouter({ gumroad, tokenStore })
  );

  app.use(express.static(PUBLIC_DIR, { maxAge: '1h', index: 'index.html' }));
  app.use('/privacy', express.static(join(PUBLIC_DIR, 'privacy.html')));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, tokenStore, tempStore };
}

export async function start() {
  if (config.nodeEnv === 'production' && !hasGumroad()) {
    throw new Error(
      'GUMROAD_ACCESS_TOKEN and GUMROAD_PRODUCT_ID are required in production.'
    );
  }
  const { app, tempStore } = buildApp();
  const server = app.listen(config.port, () => {
    console.log(`bank2excel listening on :${config.port}`);
  });
  const shutdown = () => {
    server.close(() => {
      tempStore.destroy();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
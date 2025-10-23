import express from 'express';
import type { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { registerRoutes } from './routes/index.js';
import { blogRouter } from './routes/blog.js';
import { seoRouter } from './routes/seo.js';
import { errorLoggingMiddleware, requestIdMiddleware, requestLoggingMiddleware } from './lib/logger.js';
import type { Db } from './lib/db.js';

export function createApp(_db?: Db) {
  const app = express();

  // Dynamic CORS configuration that accepts any localhost port
  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow any localhost origin regardless of port
      if (origin.startsWith('http://localhost:') ||
          origin.startsWith('https://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          origin.startsWith('https://127.0.0.1:')) {
        return callback(null, true);
      }

      // For production, check against environment variable
      const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Reject other origins
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'x-request-id',
      'X-Release',
      'x-release',
      'X-Environment',
      'x-environment',
    ]
  };

  app.use(cors(corsOptions));
  app.use(helmet());
  app.use(express.json({ limit: '10mb' }));

  // Observability: request id + structured logging
  app.use(requestIdMiddleware());
  app.use(requestLoggingMiddleware());

  registerStaticAssetMiddleware(app);

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Mount public blog and SEO routers with cache headers
  app.use('/blog', blogRouter());
  app.use('/', seoRouter());

  registerRoutes(app);

  // Error logging middleware should be last
  app.use(errorLoggingMiddleware());

  return app;
}

function registerStaticAssetMiddleware(app: Express) {
  const distRoot = resolveFromCwd(process.env.VITE_CLIENT_DIST || 'dist');
  const assetDir = path.join(distRoot, 'assets');
  const brandingDir = resolveFromCwd('branding');

  if (fs.existsSync(assetDir)) {
    app.use('/assets', express.static(assetDir, {
      immutable: true,
      maxAge: '31536000',
    }));
  }

  if (fs.existsSync(brandingDir)) {
    app.use('/branding', express.static(brandingDir, {
      immutable: true,
      maxAge: '31536000',
    }));
  }
}

function resolveFromCwd(targetPath: string) {
  return path.isAbsolute(targetPath) ? targetPath : path.resolve(process.cwd(), targetPath);
}

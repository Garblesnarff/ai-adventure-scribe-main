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
import { metricsMiddleware } from './middleware/metrics.js';
import { register } from './lib/metrics.js';
import type { PgDb as Db } from '../../src/infrastructure/database/index.js';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './trpc/root.js';
import { createContext } from './trpc/context.js';
import { db } from '../../db/client.js';
import { sql } from 'drizzle-orm';

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

  // Observability: request id + structured logging + metrics
  app.use(requestIdMiddleware());
  app.use(requestLoggingMiddleware());
  app.use(metricsMiddleware);

  registerStaticAssetMiddleware(app);

  // Prometheus metrics endpoint
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  // Enhanced health check endpoint
  app.get('/health', async (_req, res) => {
    try {
      // Check database connection
      await db.execute(sql`SELECT 1`);

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: (error as Error).message,
      });
    }
  });

  // Mount tRPC API at /api/trpc
  app.use(
    '/api/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

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

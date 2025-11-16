# Deployment Guide - Foundry VTT Integration

Complete guide for deploying the AI Adventure Scribe Foundry VTT integration to production.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Build Process](#build-process)
- [Deployment Platforms](#deployment-platforms)
- [Asset Hosting](#asset-hosting)
- [Performance Optimization](#performance-optimization)
- [Security Considerations](#security-considerations)
- [Monitoring](#monitoring)
- [Scaling Considerations](#scaling-considerations)
- [Troubleshooting](#troubleshooting)

## Overview

The Foundry VTT integration is a Next.js application with:
- Server-side rendering (SSR)
- API routes (tRPC)
- Client-side 3D rendering (React Three Fiber)
- PostgreSQL database (Supabase)
- Static asset hosting

## Prerequisites

### Required Services

1. **Supabase** (or self-hosted PostgreSQL)
   - PostgreSQL 14+
   - Realtime subscriptions (optional)
   - Storage buckets for assets

2. **Node.js Environment**
   - Node.js 18+ LTS
   - NPM, Yarn, or pnpm

3. **CDN/Asset Storage** (recommended)
   - AWS S3, Cloudflare R2, or similar
   - For maps, tokens, and other media

### System Requirements

**Minimum:**
- 2 CPU cores
- 4GB RAM
- 20GB storage
- 1Gbps network

**Recommended:**
- 4+ CPU cores
- 8GB+ RAM
- 50GB+ SSD storage
- 10Gbps network

## Environment Variables

Create a `.env.production` file with the following variables:

### Required Variables

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Database (if not using Supabase)
DATABASE_URL=postgresql://user:password@host:5432/database

# Optional: LangChain/AI
LANGCHAIN_API_KEY=your-langchain-key
OPENAI_API_KEY=your-openai-key

# Optional: Analytics
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX
```

### Optional Variables

```bash
# Asset Storage
NEXT_PUBLIC_CDN_URL=https://cdn.your-domain.com
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# Performance
NEXT_PUBLIC_PERFORMANCE_MODE=high
NEXT_PUBLIC_MAX_TOKENS=200

# WebSocket (if using real-time features)
NEXT_PUBLIC_WS_URL=wss://ws.your-domain.com

# Logging
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

### Security Notes

- **Never commit** `.env` files to version control
- Use environment-specific files: `.env.production`, `.env.staging`
- Rotate keys regularly
- Use secrets management (AWS Secrets Manager, Vault, etc.)

## Database Setup

### 1. Create Supabase Project

```bash
# Using Supabase CLI
supabase init
supabase start
supabase db reset  # Applies all migrations
```

### 2. Run Migrations

```bash
# Using npm scripts
npm run db:migrate

# Or manually via Supabase
supabase db push
```

### 3. Database Configuration

**connection pooling:**
```sql
-- Set connection limits
ALTER DATABASE your_db SET max_connections = 100;
```

**Performance tuning:**
```sql
-- Optimize for reads
ALTER DATABASE your_db SET default_statistics_target = 100;
ALTER DATABASE your_db SET random_page_cost = 1.1;
```

### 4. Indexes

Ensure critical indexes exist:

```sql
-- Token queries
CREATE INDEX IF NOT EXISTS idx_tokens_scene_id ON foundry_tokens(scene_id);
CREATE INDEX IF NOT EXISTS idx_tokens_actor_id ON foundry_tokens(actor_id);

-- Vision calculations
CREATE INDEX IF NOT EXISTS idx_vision_blockers_scene_id ON foundry_vision_blockers(scene_id);

-- Fog of war
CREATE INDEX IF NOT EXISTS idx_fog_scene_user ON foundry_fog_of_war(scene_id, user_id);

-- Drawings
CREATE INDEX IF NOT EXISTS idx_drawings_scene_id ON foundry_drawings(scene_id);
```

### 5. Row Level Security (RLS)

Enable RLS on all tables:

```sql
ALTER TABLE foundry_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE foundry_tokens ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Example policy: Users can only access their campaign scenes
CREATE POLICY "Users can view their campaign scenes"
  ON foundry_scenes FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE user_id = auth.uid()
    )
  );
```

### 6. Backup Strategy

**Automated backups:**
- Supabase: Enable automatic backups (7-30 day retention)
- Self-hosted: Use `pg_dump` with cron

```bash
# Daily backup script
#!/bin/bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
aws s3 cp backup_$(date +%Y%m%d).sql s3://backups/
```

## Build Process

### 1. Install Dependencies

```bash
npm ci --production
```

### 2. Build Application

```bash
npm run build
```

This creates:
- `.next/` - Production build
- `public/` - Static assets
- Server bundles

### 3. Build Output

```
.next/
├── cache/              # Build cache
├── server/             # Server-side code
│   ├── pages/          # Page routes
│   └── chunks/         # Code chunks
├── static/             # Static chunks
└── standalone/         # Standalone server (if enabled)
```

### 4. Optimize Build

**next.config.js:**
```javascript
module.exports = {
  output: 'standalone',  // For Docker
  compress: true,        // Gzip compression
  swcMinify: true,       // Fast minification

  images: {
    domains: ['cdn.your-domain.com'],
    formats: ['image/avif', 'image/webp'],
  },

  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@react-three/fiber', 'three'],
  },
};
```

## Deployment Platforms

### Vercel (Recommended for Next.js)

**Deploy:**
```bash
vercel --prod
```

**Configuration:**
1. Connect GitHub repository
2. Set environment variables in Vercel dashboard
3. Enable edge caching
4. Configure custom domain

**Advantages:**
- Zero-config Next.js deployment
- Automatic edge caching
- Serverless functions
- Global CDN

### Docker

**Dockerfile:**
```dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

**Build and run:**
```bash
docker build -t adventure-scribe .
docker run -p 3000:3000 --env-file .env.production adventure-scribe
```

**Docker Compose:**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    restart: unless-stopped

  # Optional: PostgreSQL
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: adventure_scribe
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### AWS (EC2 + ECS)

**EC2 deployment:**
1. Launch Ubuntu 22.04 instance
2. Install Node.js and PM2
3. Clone repository
4. Run build process
5. Start with PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "adventure-scribe" -- start
pm2 save
pm2 startup
```

**ECS deployment:**
1. Build Docker image
2. Push to ECR
3. Create ECS task definition
4. Deploy to ECS cluster

### Google Cloud (Cloud Run)

**Deploy:**
```bash
gcloud run deploy adventure-scribe \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

### Netlify

**netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

## Asset Hosting

### CDN Configuration

**Cloudflare:**
1. Add domain to Cloudflare
2. Enable CDN caching
3. Set cache rules for static assets
4. Configure image optimization

**AWS CloudFront:**
```javascript
// next.config.js
module.exports = {
  images: {
    loader: 'cloudinary',
    path: 'https://d1234567890.cloudfront.net/',
  },

  assetPrefix: 'https://d1234567890.cloudfront.net',
};
```

### Image Optimization

**Upload maps and tokens:**
```bash
# AWS S3
aws s3 sync public/maps s3://your-bucket/maps --acl public-read

# Optimize images before upload
npm install -g sharp-cli
sharp -i input.jpg -o output.webp -f webp -q 80
```

**Next.js Image Component:**
```tsx
import Image from 'next/image';

<Image
  src="https://cdn.your-domain.com/maps/tavern.jpg"
  width={2048}
  height={1536}
  alt="Tavern Map"
  priority={true}
  quality={85}
/>
```

### Storage Buckets

**Supabase Storage:**
```typescript
import { supabase } from '@/lib/supabase';

// Upload file
const { data, error } = await supabase.storage
  .from('maps')
  .upload('dungeon.jpg', file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('maps')
  .getPublicUrl('dungeon.jpg');
```

## Performance Optimization

### 1. Next.js Optimization

**Code splitting:**
```tsx
import dynamic from 'next/dynamic';

const BattleCanvas = dynamic(
  () => import('@/components/battle-map/BattleCanvas'),
  { ssr: false }
);
```

**Prefetching:**
```tsx
import Link from 'next/link';

<Link href="/scenes/123" prefetch={true}>
  View Scene
</Link>
```

### 2. Database Optimization

**Connection pooling:**
```typescript
// Use PgBouncer or Supabase connection pooler
DATABASE_URL=postgresql://user:pass@pooler.supabase.com:6543/db?pgbouncer=true
```

**Query optimization:**
```sql
-- Use prepared statements
PREPARE get_scene_tokens AS
  SELECT * FROM foundry_tokens WHERE scene_id = $1;

EXECUTE get_scene_tokens('scene-uuid');
```

### 3. Caching Strategy

**Redis caching:**
```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

// Cache scene data
await redis.set(`scene:${sceneId}`, sceneData, { ex: 300 });
```

**Client-side caching:**
```typescript
// tRPC with React Query
const { data } = trpc.scenes.get.useQuery(
  { id: sceneId },
  {
    staleTime: 60000,  // 1 minute
    cacheTime: 300000, // 5 minutes
  }
);
```

### 4. WebGL Optimization

**Texture compression:**
```typescript
import { TextureLoader, CompressedTextureLoader } from 'three';

// Use KTX2 compressed textures
const loader = new KTX2Loader();
loader.setTranscoderPath('/basis/');
```

**LOD and Culling:**
```typescript
import { LODManager } from '@/utils/performance/lod';
import { FrustumCuller } from '@/utils/performance/culling';

const lodManager = new LODManager();
const culler = new FrustumCuller();

// In render loop
culler.updateFromCamera(camera);
const visibleTokens = culler.getVisibleObjects(tokens);
```

## Security Considerations

### 1. Authentication

**Supabase Auth:**
- Enable email verification
- Set up OAuth providers (Google, Discord, etc.)
- Implement MFA (Multi-Factor Authentication)

### 2. Authorization

**RLS Policies:**
```sql
-- Only GMs can modify scenes
CREATE POLICY "Only GMs can update scenes"
  ON foundry_scenes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE id = campaign_id
      AND user_id = auth.uid()
      AND role = 'gm'
    )
  );
```

### 3. Rate Limiting

**API protection:**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,              // 100 requests
  message: 'Too many requests',
});

export default limiter;
```

### 4. Input Validation

**Zod schemas:**
```typescript
import { z } from 'zod';

const sceneSchema = z.object({
  name: z.string().min(1).max(255),
  width: z.number().int().min(1).max(100),
  // ...
});
```

### 5. HTTPS/TLS

- Use TLS 1.3
- Enable HSTS headers
- Configure CSP (Content Security Policy)

**Next.js headers:**
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval';",
          },
        ],
      },
    ];
  },
};
```

## Monitoring

### 1. Application Monitoring

**Sentry:**
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### 2. Performance Monitoring

**Web Vitals:**
```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

### 3. Database Monitoring

**Query performance:**
```sql
-- Enable query logging
ALTER DATABASE your_db SET log_min_duration_statement = 1000;

-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### 4. Uptime Monitoring

Use services like:
- UptimeRobot
- Pingdom
- StatusCake
- Better Uptime

## Scaling Considerations

### Horizontal Scaling

**Load balancing:**
```nginx
upstream app_servers {
  server app1.internal:3000;
  server app2.internal:3000;
  server app3.internal:3000;
}

server {
  listen 80;

  location / {
    proxy_pass http://app_servers;
    proxy_set_header Host $host;
  }
}
```

### Database Scaling

**Read replicas:**
- Configure read replicas in Supabase
- Route read queries to replicas
- Write queries to primary

**Connection pooling:**
- Use PgBouncer
- Set appropriate pool sizes
- Monitor connection usage

### Caching Layer

**Redis cluster:**
```bash
# Deploy Redis cluster
helm install redis bitnami/redis-cluster
```

### CDN Distribution

- Use Cloudflare, AWS CloudFront, or Fastly
- Cache static assets at edge locations
- Enable HTTP/3 and QUIC

## Troubleshooting

### Common Issues

**Out of memory:**
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

**Database connection errors:**
- Check connection pool limits
- Verify database URL and credentials
- Check firewall rules

**Slow image loading:**
- Optimize image sizes
- Use WebP/AVIF formats
- Enable lazy loading
- Configure CDN caching

**WebGL context lost:**
- Reduce texture sizes
- Implement context restoration
- Limit simultaneous 3D instances

### Logs

**Access logs:**
```bash
# PM2 logs
pm2 logs adventure-scribe

# Docker logs
docker logs -f container-id

# Cloud logs
# Vercel: Dashboard > Logs
# AWS: CloudWatch
# GCP: Cloud Logging
```

---

**Last Updated:** 2025-11-16
**Version:** 1.0.0

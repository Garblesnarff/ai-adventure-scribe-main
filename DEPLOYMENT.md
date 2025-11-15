# Deployment Guide

> Last Updated: 2025-11-14

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Configuration](#environment-configuration)
4. [Supabase Setup](#supabase-setup)
5. [Build Process](#build-process)
6. [Deployment Options](#deployment-options)
7. [Database Migrations](#database-migrations)
8. [Production Checklist](#production-checklist)
9. [Monitoring & Health Checks](#monitoring--health-checks)
10. [Rollback Procedures](#rollback-procedures)
11. [CI/CD Pipeline](#cicd-pipeline)
12. [Troubleshooting](#troubleshooting)

---

## Overview

InfiniteRealms is deployed as:
- **Frontend**: Static React SPA (can be hosted on any static hosting)
- **Backend**: Node.js Express server (requires Node 22+)
- **Database**: Supabase PostgreSQL (managed service)

### Deployment Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   CDN/Static    │      │   Backend API   │      │    Supabase     │
│   (Frontend)    │─────▶│   (Express)     │─────▶│   (Database)    │
│   Vercel/Netlify│      │   Render/Railway│      │   (Managed)     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

---

## Prerequisites

### System Requirements

**Development:**
- Node.js 22.x or later
- npm 10.x or later
- Git
- 4GB RAM minimum

**Production:**
- Node.js 22.x (LTS)
- PostgreSQL 14+ (via Supabase)
- 1GB RAM minimum for backend
- SSL certificate (automatic with most platforms)

### Required Accounts

1. **Supabase** - Database and authentication
2. **Deployment Platform** - One of:
   - Vercel (recommended for frontend)
   - Netlify (alternative for frontend)
   - Render (recommended for backend)
   - Railway (alternative for backend)
   - Fly.io (alternative for backend)
3. **AI Service** - At least one of:
   - Google Gemini API key
   - OpenAI API key
   - Anthropic API key
4. **Optional Services:**
   - ElevenLabs (text-to-speech)
   - Stripe (payments)

---

## Environment Configuration

### Environment Variables

Create appropriate `.env` files for each environment:

#### Frontend Environment Variables (`.env.local`)

```bash
# API Configuration
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# AI Services (at least one required)
VITE_GEMINI_API_KEYS=key1,key2,key3  # Multiple keys for rotation
VITE_GOOGLE_GEMINI_API_KEY=your-gemini-key
VITE_OPENAI_API_KEY=your-openai-key  # Fallback
VITE_ANTHROPIC_API_KEY=your-anthropic-key  # Fallback

# Environment
VITE_ENVIRONMENT=production  # or 'development'

# Optional: Text-to-Speech
VITE_ELEVENLABS_API_KEY=your-elevenlabs-key
```

#### Backend Environment Variables (`server/.env`)

```bash
# Server Configuration
NODE_ENV=production
PORT=8888

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Database (optional direct access)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres

# JWT
JWT_SECRET=your-strong-jwt-secret-min-32-chars

# AI Services
OPENROUTER_API_KEY=your-openrouter-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Optional: Payments
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Optional: Text-to-Speech
ELEVENLABS_API_KEY=your-elevenlabs-key

# Optional: Monitoring
SENTRY_DSN=your-sentry-dsn
```

### Environment Variable Validation

The application validates required environment variables at startup:

```typescript
// server/src/utils/validate-env.ts validates:
// - All required variables are present
// - Format is correct (URLs, keys, etc.)
// - Values meet security requirements (length, format)
// - Exits with error if validation fails
```

See server logs on startup for validation results.

---

## Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Choose region closest to your users
4. Set a strong database password
5. Wait for project to provision (~2 minutes)

### 2. Configure Authentication

```sql
-- Enable email authentication
-- In Supabase Dashboard: Authentication → Settings
-- Enable: Email (default)
-- Disable: Phone (unless needed)

-- Configure email templates
-- Authentication → Email Templates
-- Customize confirmation and password reset emails
```

### 3. Create Database Schema

Run migrations to set up the database:

```bash
# Option 1: Using migration scripts
npm run db:migrate

# Option 2: Manual SQL execution
# Copy contents of migrations/*.sql files
# Run in Supabase SQL Editor
```

**Key tables created:**
- `users` (managed by Supabase Auth)
- `characters` and related tables
- `campaigns` and related tables
- `spells`, `classes`, `races`
- `combat_encounters` and related tables
- `agent_checkpoints` for AI memory
- `performance_metrics` for monitoring

### 4. Enable Row Level Security (RLS)

RLS policies are automatically created by migrations. Verify they're enabled:

```sql
-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;

-- Should return no rows (all tables should have RLS enabled)
```

### 5. Create Storage Buckets (Optional)

For character portraits and map images:

```sql
-- In Supabase Dashboard: Storage → New Bucket
-- Bucket name: character-portraits
-- Public: false
-- Allowed MIME types: image/jpeg, image/png, image/webp
-- Max file size: 5MB

-- Set up RLS policies for storage
CREATE POLICY "Users can upload their own portraits"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'character-portraits' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own portraits"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'character-portraits' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 6. Configure Edge Functions (Optional)

For serverless AI processing:

```bash
# Deploy Supabase Edge Function
supabase functions deploy generate-narrative

# Set secrets for edge function
supabase secrets set OPENAI_API_KEY=your-key
supabase secrets set ANTHROPIC_API_KEY=your-key
```

---

## Build Process

### Frontend Build

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Output: dist/ directory
# Contains optimized static files ready to deploy
```

**Build Configuration:**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: false,  // Disable in production
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
});
```

### Backend Build

```bash
# Install dependencies
npm install

# Build TypeScript
npm run server:build

# Output: server/dist/ directory
# Contains compiled JavaScript files
```

### Build Optimization

**Frontend:**
- Code splitting for faster loading
- Tree shaking to remove unused code
- Minification and compression
- CSS purging (TailwindCSS removes unused styles)

**Backend:**
- TypeScript compilation
- No bundling needed (Node modules)
- Environment-specific builds

---

## Deployment Options

### Option 1: Vercel (Frontend) + Render (Backend)

**Recommended** for simplicity and performance.

#### Deploy Frontend to Vercel

1. **Connect Repository:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login
   vercel login

   # Deploy
   vercel
   ```

2. **Configure Project:**
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Set Environment Variables:**
   - Go to Project Settings → Environment Variables
   - Add all `VITE_*` variables from `.env.local`
   - Mark sensitive variables as "Sensitive"

4. **Deploy:**
   ```bash
   vercel --prod
   ```

#### Deploy Backend to Render

1. **Create Web Service:**
   - Go to [render.com](https://render.com)
   - New → Web Service
   - Connect your Git repository

2. **Configure Service:**
   - Name: `infiniterealms-api`
   - Environment: `Node`
   - Build Command: `npm install && npm run server:build`
   - Start Command: `npm run server:start`
   - Plan: Starter ($7/month) or higher

3. **Set Environment Variables:**
   - Add all backend environment variables
   - Ensure `NODE_ENV=production`
   - Set `PORT=8888` (or use Render's default)

4. **Configure Health Check:**
   - Path: `/health`
   - Expected Status: 200

5. **Deploy:**
   - Render automatically deploys on push to main branch

### Option 2: Netlify (Frontend) + Railway (Backend)

#### Deploy Frontend to Netlify

1. **Install Netlify CLI:**
   ```bash
   npm i -g netlify-cli
   netlify login
   ```

2. **Deploy:**
   ```bash
   netlify init
   netlify deploy --prod
   ```

3. **Configuration** (`netlify.toml`):
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200

   [build.environment]
     NODE_VERSION = "22"
   ```

#### Deploy Backend to Railway

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Deploy:**
   ```bash
   railway init
   railway up
   ```

3. **Configure:**
   - Add environment variables via dashboard
   - Railway auto-detects Node.js and runs build

### Option 3: Self-Hosted (VPS)

For complete control, deploy to your own server.

#### Server Setup (Ubuntu 22.04)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install nginx
sudo apt install -y nginx

# Install PM2 for process management
sudo npm install -g pm2

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

#### Deploy Backend

```bash
# Clone repository
git clone https://github.com/yourusername/infinite-realms.git
cd infinite-realms

# Install dependencies and build
npm install
npm run server:build

# Create .env file
nano server/.env
# Paste environment variables

# Start with PM2
pm2 start npm --name "infiniterealms-api" -- run server:start
pm2 save
pm2 startup

# Configure nginx reverse proxy
sudo nano /etc/nginx/sites-available/infiniterealms-api

# Add configuration:
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8888;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/infiniterealms-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL
sudo certbot --nginx -d api.yourdomain.com
```

#### Deploy Frontend

```bash
# Build frontend
npm run build

# Copy to nginx web root
sudo cp -r dist/* /var/www/infiniterealms/

# Configure nginx
sudo nano /etc/nginx/sites-available/infiniterealms

# Add configuration:
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/infiniterealms;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}

# Enable site and setup SSL
sudo ln -s /etc/nginx/sites-available/infiniterealms /etc/nginx/sites-enabled/
sudo certbot --nginx -d yourdomain.com
```

---

## Database Migrations

### Running Migrations

**Development:**
```bash
# Run all pending migrations
npm run db:migrate

# Create new migration
npm run db:create-migration -- migration-name

# Rollback last migration
npm run db:rollback
```

**Production:**
```bash
# Run migrations on production database
DATABASE_URL=your-production-url npm run db:migrate

# Or manually in Supabase SQL Editor
# Copy migration SQL and execute
```

### Migration Strategy

1. **Test locally** with development database
2. **Backup production** database before migration
3. **Run migration** during low-traffic period
4. **Verify** data integrity after migration
5. **Monitor** for errors

### Zero-Downtime Migrations

For breaking changes, use a multi-step process:

```sql
-- Step 1: Add new column (nullable)
ALTER TABLE characters ADD COLUMN new_field text;

-- Deploy code that writes to both old and new fields
-- Wait for deployment to complete

-- Step 2: Backfill data
UPDATE characters SET new_field = old_field WHERE new_field IS NULL;

-- Step 3: Make new field required
ALTER TABLE characters ALTER COLUMN new_field SET NOT NULL;

-- Deploy code that only uses new field
-- Wait for deployment to complete

-- Step 4: Drop old field
ALTER TABLE characters DROP COLUMN old_field;
```

See [MIGRATIONS.md](/home/user/ai-adventure-scribe-main/docs/MIGRATIONS.md) for detailed migration documentation.

---

## Production Checklist

### Pre-Deployment

- [ ] All tests passing (`npm test`, `npm run e2e`)
- [ ] Linting clean (`npm run lint`)
- [ ] Type checking passed (`npm run type-check`)
- [ ] Coverage above 80% (`npm run test:coverage`)
- [ ] No security vulnerabilities (`npm audit`)
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Backup of production database created

### Deployment

- [ ] Build succeeds without errors
- [ ] Environment-specific config applied
- [ ] Database migrations run successfully
- [ ] Health check endpoint responding
- [ ] SSL certificate valid
- [ ] CORS configured correctly
- [ ] Rate limiting enabled

### Post-Deployment

- [ ] Smoke test critical paths:
  - [ ] User registration
  - [ ] Login
  - [ ] Character creation
  - [ ] Start game session
  - [ ] AI response generation
- [ ] Monitor error logs for 30 minutes
- [ ] Check performance metrics
- [ ] Verify external services (AI, database)
- [ ] Test from different geographic regions
- [ ] Mobile responsiveness check

### Security Checklist

- [ ] HTTPS enabled everywhere
- [ ] Security headers configured (Helmet.js)
- [ ] Row Level Security (RLS) enabled
- [ ] Secrets not in code or logs
- [ ] API rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] XSS protection enabled
- [ ] CSRF protection for state-changing operations
- [ ] Authentication tokens secure
- [ ] Database credentials rotated

---

## Monitoring & Health Checks

### Health Check Endpoint

```typescript
// Backend health check
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2025-11-14T10:30:00Z",
  "version": "1.0.0",
  "uptime": 3600,
  "database": "connected",
  "ai_service": "available"
}
```

### Monitoring Setup

**Application Metrics (Prometheus):**
```typescript
// Automatically collected metrics:
- HTTP request duration
- Request count by endpoint
- Error rate
- Active connections
- Memory usage
- CPU usage
```

**Custom Metrics:**
```typescript
// Track custom events
import { metrics } from './lib/metrics';

metrics.increment('character.created');
metrics.timing('ai.response.duration', duration);
metrics.gauge('active.game.sessions', count);
```

**Log Aggregation:**
```bash
# Winston logs to stdout
# Aggregate with logging service:
# - Datadog
# - Logtail
# - Better Stack
# - CloudWatch
```

**Error Tracking:**
```typescript
// Optional: Integrate Sentry
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Alerting

Set up alerts for:
- API response time > 2 seconds
- Error rate > 1%
- Database connection failures
- AI service failures
- Memory usage > 80%
- Disk space < 20%

---

## Rollback Procedures

### Quick Rollback (< 5 minutes)

**Frontend (Vercel):**
```bash
# Rollback to previous deployment
vercel rollback
```

**Frontend (Netlify):**
```bash
# Use Netlify dashboard to rollback
# Deploys → Previous Deploy → Publish Deploy
```

**Backend (Render):**
```bash
# Render keeps previous deploys
# Dashboard → Deploys → Select previous → Redeploy
```

**Backend (Railway):**
```bash
# Railway auto-keeps previous versions
# Dashboard → Deployments → Previous deployment → Redeploy
```

### Code Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or rollback multiple commits
git revert HEAD~3..HEAD
git push origin main

# Automatic redeployment will occur
```

### Database Rollback

**If migration causes issues:**

```bash
# Rollback last migration
npm run db:rollback

# Or manually in SQL
-- Find migration to rollback
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 1;

-- Execute rollback SQL (if available)
-- migrations/XXXX_migration_name.down.sql
```

**If data was corrupted:**

```sql
-- Restore from backup
-- In Supabase Dashboard: Database → Backups
-- Click "Restore" on desired backup point
```

### Emergency Rollback Playbook

1. **Stop incoming traffic** (optional): Put up maintenance page
2. **Rollback frontend** deployment
3. **Rollback backend** deployment
4. **Rollback database** migration (if needed)
5. **Verify functionality** with smoke tests
6. **Resume traffic**
7. **Post-mortem**: Analyze what went wrong

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test -- --coverage
      - run: npm run e2e

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Deployment Stages

1. **Commit & Push** to main branch
2. **CI Tests** run automatically
3. **Build** frontend and backend
4. **Deploy Staging** for QA testing (optional)
5. **Deploy Production** after approval
6. **Smoke Tests** run against production
7. **Monitor** for errors

---

## Troubleshooting

### Common Deployment Issues

#### Build Fails

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build

# Check for version mismatches
npm ls

# Verify Node.js version
node --version  # Should be 22.x
```

#### Environment Variables Not Loading

```bash
# Verify variables are set
echo $VITE_SUPABASE_URL

# Check for typos in variable names
# VITE_ prefix required for frontend
# No prefix for backend

# Restart server after changing .env
pm2 restart infiniterealms-api
```

#### Database Connection Fails

```bash
# Test connection
psql $DATABASE_URL

# Check firewall rules
# Ensure your IP is whitelisted in Supabase

# Verify connection string format
# postgresql://[user]:[password]@[host]:[port]/[database]
```

#### CORS Errors

```typescript
// Ensure backend CORS is configured
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
```

#### SSL Certificate Issues

```bash
# Renew certificate
sudo certbot renew

# Test certificate
curl https://yourdomain.com

# Check expiration
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Related Documentation

- [ARCHITECTURE.md](/home/user/ai-adventure-scribe-main/ARCHITECTURE.md) - System architecture
- [DEVELOPMENT.md](/home/user/ai-adventure-scribe-main/DEVELOPMENT.md) - Local development setup
- [MIGRATIONS.md](/home/user/ai-adventure-scribe-main/docs/MIGRATIONS.md) - Database migration guide
- [SECURITY.md](/home/user/ai-adventure-scribe-main/SECURITY.md) - Security guidelines
- [TROUBLESHOOTING.md](/home/user/ai-adventure-scribe-main/TROUBLESHOOTING.md) - Common issues and solutions

---

**Document Version:** 1.0
**Last Updated:** 2025-11-14
**Maintained By:** Development Team

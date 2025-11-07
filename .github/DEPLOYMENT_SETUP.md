# Deployment Setup Guide

This guide walks through setting up automated deployments for the Infinite Realms platform.

## Prerequisites

- GitHub repository with Actions enabled
- Deployment platform account (Vercel, Netlify, Railway, etc.)
- Supabase projects (staging and production)
- Domain name configured (optional)

## Step-by-Step Setup

### 1. Create Supabase Projects

#### Staging Environment
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create new project: `infinite-realms-staging`
3. Note down:
   - Project URL: `https://xxx.supabase.co`
   - Anon/Public key: Found in Settings → API
   - Service Role key: Found in Settings → API (keep secret!)

#### Production Environment
1. Create new project: `infinite-realms-production`
2. Note down same credentials as staging

### 2. Choose Deployment Platform

#### Option A: Vercel (Recommended for Frontend)

**Setup:**
1. Visit [Vercel Dashboard](https://vercel.com/dashboard)
2. Import GitHub repository
3. Configure build settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm ci`

4. Get deployment tokens:
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login and link project
   vercel login
   vercel link

   # Get tokens
   vercel project ls
   ```

5. Note down:
   - Vercel Token (from account settings)
   - Organization ID (from `.vercel/project.json`)
   - Project ID (from `.vercel/project.json`)

**Environment Variables on Vercel:**
Add these in Vercel Dashboard → Settings → Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEYS`
- `VITE_GOOGLE_GEMINI_API_KEY`
- `VITE_ENVIRONMENT` (staging/production)

#### Option B: Netlify

**Setup:**
1. Visit [Netlify Dashboard](https://app.netlify.com)
2. Create new site from Git
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

4. Get deployment token:
   - User Settings → Applications → Personal Access Tokens
   - Create new token with full access

5. Note down:
   - Auth Token
   - Site ID (from Site Settings → General)

**Update Workflows:**
Replace Vercel deployment steps with:
```yaml
- name: Deploy to Netlify
  uses: nwtgck/actions-netlify@v3.0
  with:
    publish-dir: './dist'
    production-deploy: true
    github-token: ${{ secrets.GITHUB_TOKEN }}
    deploy-message: "Deploy from GitHub Actions"
  env:
    NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
    NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

#### Option C: Railway (For Backend)

**Setup:**
1. Visit [Railway Dashboard](https://railway.app)
2. Create new project
3. Add service → GitHub repository
4. Configure:
   - Root directory: `server`
   - Build command: `npm run server:build`
   - Start command: `npm run server:start`

5. Get deployment token:
   - Account Settings → Tokens
   - Create new token

6. Note down:
   - Railway Token
   - Project ID
   - Service ID

**Environment Variables on Railway:**
- `DATABASE_URL` (PostgreSQL connection string)
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT` (Railway sets this automatically)

### 3. Configure GitHub Secrets

Navigate to: `GitHub Repository → Settings → Secrets and variables → Actions`

#### Required Secrets

**Staging:**
```
STAGING_SUPABASE_URL=https://xxx.supabase.co
STAGING_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STAGING_API_URL=https://api-staging.your-domain.com
STAGING_SITE_URL=https://staging.your-domain.com
```

**Production:**
```
PROD_SUPABASE_URL=https://yyy.supabase.co
PROD_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PROD_API_URL=https://api.infinite-realms.ai
PROD_DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

**Shared:**
```
VITE_GEMINI_API_KEYS=AIza...
VITE_GOOGLE_GEMINI_API_KEY=AIza...
VERCEL_TOKEN=xxx
VERCEL_ORG_ID=team_xxx
VERCEL_PROJECT_ID=prj_xxx
BACKEND_DEPLOY_TOKEN=xxx (Railway/Render token)
SLACK_WEBHOOK=https://hooks.slack.com/... (optional)
```

### 4. Configure GitHub Environments

Navigate to: `Repository → Settings → Environments`

#### Create Environments

**Staging Environment:**
- Name: `staging`
- Protection rules:
  - Required reviewers: 0 (optional: add reviewers)
- Environment secrets (if different from repo secrets):
  - Add staging-specific overrides

**Production Environment:**
- Name: `production`
- Protection rules:
  - ✅ Required reviewers: 1-2 (recommended)
  - ✅ Wait timer: 5 minutes
  - ✅ Deployment branches: `main` only
- Environment secrets:
  - Add production-specific secrets

**Repeat for backend environments:**
- `staging-backend`
- `production-backend`

### 5. Update Workflow Files

#### Modify `deploy-staging.yml`

Replace placeholder deployment step with actual platform commands:

**For Vercel:**
```yaml
- name: Deploy to Vercel
  id: deploy
  run: |
    npm install -g vercel
    DEPLOY_URL=$(vercel deploy --token=${{ secrets.VERCEL_TOKEN }} --yes)
    echo "url=$DEPLOY_URL" >> $GITHUB_OUTPUT
```

**For Netlify:**
```yaml
- name: Deploy to Netlify
  id: deploy
  uses: nwtgck/actions-netlify@v3.0
  with:
    publish-dir: './dist'
    production-branch: develop
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

#### Modify `deploy-production.yml`

Update production deployment for your platform (similar to staging).

### 6. Database Migration Strategy

#### Setup Drizzle Migrations

Ensure migrations are version controlled:
```bash
# Generate migration
npm run db:generate

# Review generated SQL
cat db/migrations/0001_*.sql

# Commit migration files
git add db/migrations/
git commit -m "feat: add user roles migration"
```

#### Update Deployment Workflow

Add migration step before backend deployment:
```yaml
- name: Run database migrations
  run: npm run db:migrate
  env:
    DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
```

### 7. Test Deployments

#### Test Staging Deployment

1. Create feature branch:
   ```bash
   git checkout -b test/deployment
   ```

2. Make a change and push:
   ```bash
   git add .
   git commit -m "test: deployment workflow"
   git push origin test/deployment
   ```

3. Verify in GitHub Actions:
   - Check workflow runs
   - Review logs
   - Test deployed staging URL

#### Test Production Deployment

1. Merge to main (or create tag):
   ```bash
   git checkout main
   git pull
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. Verify deployment:
   - Check production deployment workflow
   - Test production URL
   - Verify environment variables

### 8. DNS Configuration (Production)

#### Setup Custom Domain

**For Vercel:**
1. Add domain in Vercel Dashboard
2. Configure DNS records:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

**For Netlify:**
1. Add custom domain in Netlify
2. Configure DNS:
   ```
   Type: CNAME
   Name: @
   Value: your-site.netlify.app

   Type: CNAME
   Name: www
   Value: your-site.netlify.app
   ```

3. Wait for DNS propagation (up to 24 hours)
4. Enable HTTPS (automatic on Vercel/Netlify)

### 9. Monitoring & Alerts

#### Setup Health Checks

Add health endpoint to backend:
```typescript
// server/src/app.ts
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: process.env.npm_package_version,
    timestamp: new Date().toISOString()
  });
});
```

#### Configure Uptime Monitoring

**Options:**
- [UptimeRobot](https://uptimerobot.com) - Free tier available
- [Better Uptime](https://betteruptime.com)
- [Pingdom](https://www.pingdom.com)

Setup:
1. Monitor production URL
2. Set check interval: 5 minutes
3. Configure alerts (email, Slack)
4. Add status page (optional)

#### Error Tracking

**Recommended: Sentry**
1. Create Sentry project
2. Install SDK:
   ```bash
   npm install @sentry/react @sentry/vite-plugin
   ```

3. Configure in `src/main.tsx`:
   ```typescript
   import * as Sentry from "@sentry/react";

   Sentry.init({
     dsn: import.meta.env.VITE_SENTRY_DSN,
     environment: import.meta.env.VITE_ENVIRONMENT
   });
   ```

### 10. Rollback Procedures

#### Quick Rollback on Vercel
```bash
# List recent deployments
vercel list

# Rollback to previous deployment
vercel rollback [deployment-url]
```

#### Quick Rollback on Netlify
1. Go to Netlify Dashboard → Deploys
2. Find previous successful deployment
3. Click "Publish deploy"

#### Database Rollback
```bash
# Revert last migration (use with caution!)
npm run db:rollback

# Or restore from backup
# (Setup automated backups in Supabase dashboard)
```

### 11. Automated Backups

#### Supabase Database Backups
1. Go to Supabase Dashboard → Database → Backups
2. Enable automatic backups (Pro plan)
3. Configure backup frequency: Daily
4. Retention: 7 days minimum

#### Manual Backup Script
```bash
#!/bin/bash
# scripts/backup-db.sh

pg_dump $DATABASE_URL > "backups/backup-$(date +%Y%m%d-%H%M%S).sql"
```

Add to cron or GitHub Actions:
```yaml
# .github/workflows/backup.yml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
```

### 12. Security Checklist

Before going live:
- [ ] All secrets properly configured (no hardcoded values)
- [ ] Environment variables set correctly
- [ ] HTTPS enabled on all domains
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] SQL injection prevention (using Drizzle ORM)
- [ ] XSS prevention (React escapes by default)
- [ ] CSRF tokens implemented
- [ ] Security headers configured (Helmet.js)
- [ ] Database backups automated
- [ ] Monitoring and alerting setup
- [ ] Error tracking configured
- [ ] Secrets rotation plan in place

### 13. Performance Optimization

#### CDN Configuration
- Enable on Vercel/Netlify (automatic)
- Configure caching headers
- Optimize images (use next/image or similar)

#### Database Optimization
- Connection pooling configured
- Indexes on frequently queried columns
- Query optimization (use EXPLAIN ANALYZE)

### 14. Cost Monitoring

#### Track Usage
- Vercel/Netlify bandwidth
- Supabase database size
- Gemini API costs
- ElevenLabs API costs

#### Set Budgets
- Configure billing alerts
- Set usage quotas
- Monitor costs weekly

### 15. Documentation

Keep updated:
- [ ] Update README.md with production URL
- [ ] Document deployment process
- [ ] API documentation current
- [ ] Environment variables documented
- [ ] Backup procedures documented
- [ ] Incident response plan

## Troubleshooting

### Common Issues

**Issue: Deployment fails with missing env vars**
```
Solution: Check GitHub secrets and environment configuration
Verify: Settings → Secrets → [Environment]
```

**Issue: Database connection fails**
```
Solution: Verify DATABASE_URL format
Check: Connection pooling settings in Supabase
```

**Issue: CORS errors in production**
```
Solution: Update backend CORS configuration
Add production frontend URL to allowed origins
```

**Issue: Bundle size exceeds limits**
```
Solution: Review bundle-size.yml workflow output
Implement code splitting and lazy loading
```

## Next Steps

After successful deployment:
1. Monitor initial traffic and errors
2. Set up analytics (Google Analytics, Plausible)
3. Configure email notifications
4. Plan regular security audits
5. Schedule dependency updates
6. Document runbooks for common operations

## Support

For deployment issues:
- Check workflow logs in Actions tab
- Review platform-specific documentation
- Consult this setup guide
- Open issue with detailed logs

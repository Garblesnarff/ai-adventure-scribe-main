# GitHub Actions Workflows

This directory contains automated CI/CD workflows for the Infinite Realms platform.

## Workflows Overview

### 1. CI Pipeline (`ci.yml`)
**Trigger:** Push to any branch, Pull Requests
**Purpose:** Continuous Integration - lint, test, and security scanning

**Jobs:**
- **lint-and-tests**: ESLint, server tests, frontend tests with coverage
- **e2e-auth**: Playwright end-to-end authentication tests
- **security**: Gitleaks secret scanning, Trivy vulnerability scanning, npm audit

**Artifacts:**
- Coverage reports
- Gitleaks security reports
- Trivy vulnerability scan results

### 2. Bundle Size Monitor (`bundle-size.yml`)
**Trigger:** Pull Requests affecting source code
**Purpose:** Track and prevent bundle size regressions

**Features:**
- Analyzes production bundle sizes
- Posts detailed size reports as PR comments
- Fails if bundle exceeds 10MB threshold
- Runs Lighthouse CI for performance budgets

**Artifacts:**
- Bundle size reports
- Lighthouse performance results

**Performance Budgets:**
- Total bundle: < 10MB
- Initial chunk: < 2MB
- Vendor chunk: < 5MB
- See `budgets.json` for detailed limits

### 3. Deploy to Staging (`deploy-staging.yml`)
**Trigger:** Push to `develop` or `feature/*` branches
**Purpose:** Automated staging deployments for testing

**Jobs:**
- **build**: Lint, test, build frontend with staging env vars
- **deploy-backend**: Build and deploy backend services
- **smoke-tests**: Basic health checks after deployment

**Environment:** `staging`
**URL:** Configured via `STAGING_SITE_URL` secret

### 4. Deploy to Production (`deploy-production.yml`)
**Trigger:** Git tags matching `v*.*.*` (semver)
**Purpose:** Production deployments with safety checks

**Jobs:**
- **validate**: Ensures tag follows semver format
- **build**: Full test suite, production build with prod env vars
- **deploy-backend**: Database migrations, backend deployment
- **post-deploy**: Health checks, notifications, rollback on failure

**Environment:** `production`
**URL:** https://infinite-realms.ai

### 5. DAST Security Scan (`dast-nightly.yml`)
**Trigger:** Nightly cron (3 AM UTC), Manual
**Purpose:** Dynamic Application Security Testing with OWASP ZAP

**Features:**
- Baseline security scan of staging environment
- Detects common web vulnerabilities
- Generates detailed security reports

## Required Secrets

### Staging Environment
| Secret | Description | Example |
|--------|-------------|---------|
| `STAGING_SUPABASE_URL` | Staging Supabase project URL | `https://xxx.supabase.co` |
| `STAGING_SUPABASE_ANON_KEY` | Staging anon/public key | `eyJhbGciOi...` |
| `STAGING_API_URL` | Staging backend API URL | `https://api-staging.example.com` |
| `STAGING_SITE_URL` | Staging frontend URL | `https://staging.infinite-realms.ai` |
| `STAGING_URL` | For DAST scanning | Same as STAGING_SITE_URL |

### Production Environment
| Secret | Description | Example |
|--------|-------------|---------|
| `PROD_SUPABASE_URL` | Production Supabase URL | `https://xxx.supabase.co` |
| `PROD_SUPABASE_ANON_KEY` | Production anon key | `eyJhbGciOi...` |
| `PROD_API_URL` | Production API URL | `https://api.infinite-realms.ai` |
| `PROD_DATABASE_URL` | Direct database URL for migrations | `postgresql://...` |
| `PROD_BACKEND_DEPLOY_TOKEN` | Backend deployment token | Platform-specific |

### Shared Secrets
| Secret | Description | Required For |
|--------|-------------|--------------|
| `VITE_GEMINI_API_KEYS` | Google Gemini API keys (comma-separated) | All builds |
| `VITE_GOOGLE_GEMINI_API_KEY` | Primary Gemini key | All builds |
| `VERCEL_TOKEN` | Vercel deployment token | Deployments (if using Vercel) |
| `VERCEL_ORG_ID` | Vercel organization ID | Deployments (if using Vercel) |
| `VERCEL_PROJECT_ID` | Vercel project ID | Deployments (if using Vercel) |
| `BACKEND_DEPLOY_TOKEN` | Backend deployment auth | Backend deployments |
| `SLACK_WEBHOOK` | Slack notifications (optional) | Production notifications |

## Setup Instructions

### 1. Configure Repository Secrets
Navigate to: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

Add all required secrets listed above.

### 2. Configure Environments
Navigate to: `Settings` → `Environments`

Create environments:
- `staging` - For staging deployments
- `staging-backend` - For backend staging
- `production` - For production (add protection rules)
- `production-backend` - For backend production

**Recommended Production Protection Rules:**
- Required reviewers: 1-2 team members
- Wait timer: 5 minutes (prevents accidental deploys)
- Restrict to protected branches: `main` only

### 3. Enable Workflow Permissions
Navigate to: `Settings` → `Actions` → `General` → `Workflow permissions`

Enable:
- ✅ Read and write permissions
- ✅ Allow GitHub Actions to create pull requests

### 4. Install Lighthouse CI (Optional)
For local Lighthouse testing:
```bash
npm install -g @lhci/cli
lhci autorun
```

### 5. Configure Deployment Platform

#### Option A: Vercel
1. Create Vercel project
2. Link to GitHub repository
3. Add Vercel secrets (see table above)
4. Update workflow deployment commands

#### Option B: Netlify
1. Create Netlify site
2. Get site ID and auth token
3. Update workflows with Netlify CLI commands

#### Option C: Custom Server
1. Set up server infrastructure
2. Create deployment scripts
3. Add SSH keys or deployment tokens
4. Update workflow deployment steps

### 6. Test Workflows

**Test Bundle Size:**
```bash
# Create a PR and verify bundle size comment appears
git checkout -b test/bundle-size
# Make changes
git push origin test/bundle-size
```

**Test Staging Deployment:**
```bash
# Push to develop branch
git checkout develop
git push origin develop
# Verify deployment in Actions tab
```

**Test Production Deployment:**
```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
# Verify production deployment
```

## Performance Budgets

Configured in `budgets.json`:

**Resource Sizes:**
- Scripts: 600 KB
- Stylesheets: 50 KB
- Images: 200 KB
- Fonts: 100 KB
- Total: 1000 KB (1 MB)

**Performance Metrics:**
- First Contentful Paint (FCP): < 2000ms
- Largest Contentful Paint (LCP): < 2500ms
- Cumulative Layout Shift (CLS): < 0.1
- Total Blocking Time (TBT): < 300ms
- Speed Index (SI): < 3400ms
- Time to Interactive (TTI): < 3800ms

## Workflow Status Badges

Add these to your main `README.md`:

```markdown
![CI](https://github.com/YOUR_ORG/ai-adventure-scribe/workflows/CI/badge.svg)
![Deploy Staging](https://github.com/YOUR_ORG/ai-adventure-scribe/workflows/Deploy%20to%20Staging/badge.svg)
![Bundle Size](https://github.com/YOUR_ORG/ai-adventure-scribe/workflows/Bundle%20Size%20Monitor/badge.svg)
```

## Troubleshooting

### Bundle Size Workflow Fails
**Issue:** Bundle exceeds 10MB threshold
**Solution:**
1. Review bundle report in PR comment
2. Identify large chunks
3. Implement code splitting or lazy loading
4. Review Vite config's `manualChunks` strategy

### Deployment Fails
**Issue:** Missing environment variables
**Solution:**
1. Verify all secrets are configured
2. Check environment name matches workflow
3. Review workflow logs for specific errors

### Lighthouse CI Fails
**Issue:** Performance scores below threshold
**Solution:**
1. Review Lighthouse report artifacts
2. Optimize images, fonts, and scripts
3. Implement caching strategies
4. Consider CDN for static assets

### Security Scan Fails
**Issue:** Vulnerabilities detected
**Solution:**
1. Review Trivy/Gitleaks reports
2. Update vulnerable dependencies: `npm audit fix`
3. Remove accidentally committed secrets
4. Rotate compromised credentials

## CI/CD Pipeline Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Pull Request                             │
└──────────────────┬──────────────────────────────────────────────┘
                   │
    ┌──────────────┴──────────────┐
    │                             │
┌───▼────────┐           ┌────────▼─────┐
│  CI Tests  │           │ Bundle Size  │
│   (lint)   │           │   Monitor    │
│  (tests)   │           │              │
│ (security) │           │ - Size check │
└─────┬──────┘           │ - Lighthouse │
      │                  └──────┬───────┘
      │                         │
      │ ┌───────────────────────┘
      │ │
      │ │ (PR Comment with reports)
      │ │
      └─┴───────────────────────┐
                                │
                       ┌────────▼─────────┐
                       │  Merge to Main   │
                       └────────┬─────────┘
                                │
                       ┌────────▼─────────┐
                       │   Tag Release    │
                       │    (v1.0.0)      │
                       └────────┬─────────┘
                                │
           ┌────────────────────┴────────────────────┐
           │                                         │
    ┌──────▼──────┐                         ┌────────▼────────┐
    │   Build     │                         │ Deploy Backend  │
    │  Frontend   │                         │                 │
    │             │                         │ - Migrations    │
    │ - Tests     │                         │ - Deploy        │
    │ - Bundle    │                         └────────┬────────┘
    └──────┬──────┘                                  │
           │                                         │
           └──────────────┬──────────────────────────┘
                          │
                  ┌───────▼────────┐
                  │  Deploy Prod   │
                  │                │
                  │ - Health check │
                  │ - Smoke tests  │
                  │ - Notify       │
                  └────────────────┘
```

## Monitoring & Observability

After deployment, monitor:
- Deployment status in Actions tab
- Application health endpoints
- Performance metrics (if integrated with monitoring tools)
- Error tracking (Sentry, LogRocket, etc.)

## Future Enhancements

Planned improvements:
- [ ] Visual regression testing with Percy/Chromatic
- [ ] Automated rollback on failed health checks
- [ ] Canary deployments for gradual rollouts
- [ ] Database backup before migrations
- [ ] Integration with monitoring platforms
- [ ] Cost analysis for bundle size
- [ ] Automated changelog generation
- [ ] Slack/Discord deployment notifications

## Contributing

When modifying workflows:
1. Test changes in a feature branch first
2. Document any new secrets or configuration
3. Update this README with changes
4. Consider backward compatibility
5. Add comments to explain complex workflow logic

## Support

For workflow issues:
1. Check workflow logs in Actions tab
2. Review this documentation
3. Consult GitHub Actions documentation
4. Open an issue with workflow logs attached

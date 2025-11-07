# CI/CD Quick Start Guide

**Get your deployment pipeline running in 30 minutes.**

## Prerequisites Checklist

- [ ] GitHub repository with admin access
- [ ] Supabase project created (staging)
- [ ] Supabase project created (production)
- [ ] Deployment platform account (Vercel, Netlify, or Railway)
- [ ] Google Gemini API key

## Step 1: GitHub Secrets (10 minutes)

Navigate to: `Repository → Settings → Secrets and variables → Actions → New repository secret`

### Minimal Secrets to Get Started

**Add these 6 secrets first:**

```bash
# Staging
STAGING_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
STAGING_SUPABASE_ANON_KEY=eyJhbGciOi...
STAGING_SITE_URL=https://staging.your-domain.com

# API Keys
VITE_GEMINI_API_KEYS=AIza...
VITE_GOOGLE_GEMINI_API_KEY=AIza...

# Production (can be same as staging initially)
PROD_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
PROD_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## Step 2: GitHub Environments (5 minutes)

Navigate to: `Repository → Settings → Environments`

**Create 2 environments:**

1. **staging**
   - No protection rules needed (for now)

2. **production**
   - ✅ Required reviewers: Add yourself
   - ✅ Wait timer: 5 minutes

## Step 3: Test Bundle Size Workflow (5 minutes)

```bash
# Create test branch
git checkout -b test/ci-pipeline

# Make a small change
echo "// Test" >> src/main.tsx

# Commit and push
git commit -am "test: CI pipeline"
git push origin test/ci-pipeline

# Create PR
gh pr create --title "Test CI/CD Pipeline" --body "Testing workflows"
```

**Verify:**
- CI workflow runs ✅
- Bundle size workflow runs ✅
- PR comment appears with bundle report ✅

## Step 4: Choose Deployment Platform (5 minutes)

### Option A: Vercel (Fastest)

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your GitHub repo
4. Configure:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add environment variables from Vercel dashboard
6. Get Vercel tokens:
   ```bash
   npm i -g vercel
   vercel login
   vercel link
   # Get token from vercel.com/account/tokens
   ```

### Option B: Netlify (Alternative)

1. Go to [netlify.com](https://netlify.com)
2. "New site from Git"
3. Select GitHub repo
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Get auth token from User Settings → Applications

## Step 5: Add Deployment Secrets (5 minutes)

**For Vercel:**
```bash
VERCEL_TOKEN=your_token_here
VERCEL_ORG_ID=team_xxx (from .vercel/project.json)
VERCEL_PROJECT_ID=prj_xxx (from .vercel/project.json)
```

**For Netlify:**
```bash
NETLIFY_AUTH_TOKEN=your_token
NETLIFY_SITE_ID=your_site_id
```

## Step 6: Update Deployment Workflow (Optional)

**Only if you chose Netlify instead of Vercel:**

Edit `.github/workflows/deploy-staging.yml` and `.github/workflows/deploy-production.yml`

Replace the Vercel deployment step with:

```yaml
- name: Deploy to Netlify
  uses: nwtgck/actions-netlify@v3.0
  with:
    publish-dir: './dist'
    production-deploy: true
    github-token: ${{ secrets.GITHUB_TOKEN }}
  env:
    NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
    NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## Verification Checklist

- [ ] CI workflow passes on PRs
- [ ] Bundle size report appears on PRs
- [ ] Security scans complete
- [ ] Staging deployment configured
- [ ] Production environment protected
- [ ] All secrets added
- [ ] Deployment platform connected

## What You Get

### Automated on Every PR:
- ✅ Lint checks
- ✅ Unit tests
- ✅ Integration tests
- ✅ Security scanning
- ✅ Bundle size analysis
- ✅ Performance budgets
- ✅ PR comments with reports

### Automated on Merge to Develop:
- ✅ Staging deployment
- ✅ Smoke tests
- ✅ PR notification with URL

### Automated on Version Tag:
- ✅ Production deployment
- ✅ Database migrations
- ✅ Health checks
- ✅ Success notifications

## Common Issues & Fixes

### "Missing required secret"
**Fix:** Double-check secret names match exactly (case-sensitive)
```bash
# List all secrets
gh secret list
```

### "Build fails with module not found"
**Fix:** Clear npm cache and rebuild
```bash
npm ci
npm run build
```

### "Deployment webhook failed"
**Fix:** Verify deployment token has correct permissions
- Vercel: Token needs deployment permissions
- Netlify: Personal Access Token with full access

### "Bundle size exceeded threshold"
**Fix:** This is expected! Review the bundle report and optimize:
1. Check `vite.config.ts` chunk strategy
2. Implement lazy loading for large components
3. Review dependencies

## Next Steps

1. **Read Full Documentation**
   - `.github/workflows/README.md` - Complete workflow guide
   - `.github/DEPLOYMENT_SETUP.md` - Detailed setup

2. **Set Up Monitoring** (Optional but Recommended)
   - Sentry for error tracking
   - UptimeRobot for uptime monitoring
   - Google Analytics for usage

3. **Configure Production**
   - Custom domain
   - SSL certificate (auto with Vercel/Netlify)
   - Database backups
   - Environment-specific configs

4. **Team Onboarding**
   - Add team members to GitHub
   - Configure branch protection
   - Set up required reviewers
   - Document deployment process

## Getting Help

**Resources:**
- Workflow logs: `Actions` tab in GitHub
- Detailed docs: `.github/workflows/README.md`
- Deployment guide: `.github/DEPLOYMENT_SETUP.md`
- Troubleshooting: See README troubleshooting section

**Support:**
- Create issue with workflow logs
- Check GitHub Actions community
- Review platform-specific docs (Vercel, Netlify)

---

**Time Investment:**
- Initial setup: 30 minutes
- Time saved per deployment: 28 minutes
- Break-even: After 2 deployments

**ROI:**
- Deploy 10x per week = 4.7 hours saved
- Month = 18.7 hours saved
- Year = 224 hours saved

# CI/CD Pipeline Architecture

## Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DEVELOPER WORKFLOW                                  │
└────────────┬────────────────────────────────────────────────────────────────┘
             │
             │ git push origin feature/new-feature
             │
┌────────────▼────────────────────────────────────────────────────────────────┐
│                           PULL REQUEST CREATED                               │
└────────┬───────────────────────────────────────────┬────────────────────────┘
         │                                           │
         │                                           │
┌────────▼─────────┐                        ┌────────▼──────────┐
│   CI Workflow    │                        │  Bundle Size      │
│    (ci.yml)      │                        │  (bundle-size.yml)│
├──────────────────┤                        ├───────────────────┤
│                  │                        │                   │
│ 1. Lint Code     │                        │ 1. Build Bundle   │
│    └─ ESLint     │                        │    └─ vite build  │
│                  │                        │                   │
│ 2. Run Tests     │                        │ 2. Analyze Size   │
│    ├─ Server     │                        │    ├─ Per chunk   │
│    └─ Frontend   │                        │    ├─ Gzipped     │
│       (w/coverage)│                       │    └─ Total       │
│                  │                        │                   │
│ 3. E2E Tests     │                        │ 3. Run Lighthouse │
│    └─ Playwright │                        │    ├─ Performance │
│       (auth)     │                        │    ├─ A11y        │
│                  │                        │    ├─ Best Practices│
│ 4. Security      │                        │    └─ SEO         │
│    ├─ Gitleaks   │                        │                   │
│    ├─ Trivy      │                        │ 4. Check Budgets  │
│    └─ npm audit  │                        │    └─ Fail if >10MB│
│                  │                        │                   │
│ ✅ All Pass      │                        │ 5. PR Comment     │
│                  │                        │    └─ Size report │
└────────┬─────────┘                        └────────┬──────────┘
         │                                           │
         │                                           │
         └────────────────┬──────────────────────────┘
                          │
                 ✅ Checks Passed
                 📝 Bundle Report Posted
                          │
                          │
                 ┌────────▼─────────┐
                 │  CODE REVIEW     │
                 │  + APPROVAL      │
                 └────────┬─────────┘
                          │
                          │ Merge to develop
                          │
┌─────────────────────────▼──────────────────────────────────────────────────┐
│                        DEVELOP BRANCH (STAGING)                             │
└────────┬───────────────────────────────────────────────────────────────────┘
         │
         │ Auto-trigger on merge
         │
┌────────▼─────────────────────────────────────────────────────────────────┐
│               Staging Deployment (deploy-staging.yml)                     │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────┐      ┌──────────────────┐      ┌─────────────────┐  │
│  │  Build Job     │      │ Deploy Backend   │      │  Smoke Tests    │  │
│  ├────────────────┤      ├──────────────────┤      ├─────────────────┤  │
│  │                │      │                  │      │                 │  │
│  │ 1. Lint        │      │ 1. Build Server  │      │ 1. Health Check │  │
│  │ 2. Test        │──────▶│ 2. Deploy to    │──────▶│ 2. Basic Tests │  │
│  │ 3. Build       │      │    Railway/Render│      │ 3. Verify URLs  │  │
│  │ 4. Upload      │      │ 3. Verify Deploy │      │                 │  │
│  │                │      │                  │      │                 │  │
│  └────────────────┘      └──────────────────┘      └─────────────────┘  │
│                                                                           │
│  Environment: staging                                                     │
│  URL: https://staging.infinite-realms.ai                                 │
│                                                                           │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    │
                           ✅ Staging Deployed
                           📧 Team Notified
                           🔗 PR Comment with URL
                                    │
                                    │
                           ┌────────▼─────────┐
                           │   QA TESTING     │
                           │   ON STAGING     │
                           └────────┬─────────┘
                                    │
                                    │ Approved for production
                                    │
                           ┌────────▼─────────┐
                           │  Merge to main   │
                           │  + Create Tag    │
                           │   (v1.2.3)       │
                           └────────┬─────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                        PRODUCTION RELEASE (vX.Y.Z)                           │
└────────┬────────────────────────────────────────────────────────────────────┘
         │
         │ Tag push triggers production
         │
┌────────▼─────────────────────────────────────────────────────────────────┐
│            Production Deployment (deploy-production.yml)                  │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────┐                                                      │
│  │  Validate      │                                                      │
│  ├────────────────┤                                                      │
│  │                │                                                      │
│  │ • Check semver │                                                      │
│  │ • Verify tag   │                                                      │
│  │                │                                                      │
│  └────────┬───────┘                                                      │
│           │                                                              │
│  ┌────────▼───────┐      ┌──────────────────┐      ┌─────────────────┐ │
│  │  Build Job     │      │ Deploy Backend   │      │  Post-Deploy    │ │
│  ├────────────────┤      ├──────────────────┤      ├─────────────────┤ │
│  │                │      │                  │      │                 │ │
│  │ 1. Full Tests  │      │ 1. Run Migrations│      │ 1. Health Check │ │
│  │ 2. Coverage    │──────▶│ 2. Build Server  │──────▶│ 2. Smoke Tests │ │
│  │ 3. Build Prod  │      │ 3. Deploy        │      │ 3. Notify Team  │ │
│  │ 4. Metadata    │      │ 4. Verify        │      │                 │ │
│  │                │      │                  │      │ ❌ Rollback on  │ │
│  └────────────────┘      └──────────────────┘      │    Failure      │ │
│                                                     │                 │ │
│  Environment: production                           └─────────────────┘ │
│  URL: https://infinite-realms.ai                                        │
│  Protection: Required reviewers + 5min wait timer                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                           ✅ Production Live
                           📧 Slack Notification
                           📊 Monitoring Active


┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKGROUND PROCESSES                             │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐     ┌──────────────────────┐
│  Weekly (Monday 9AM) │     │  Nightly (3AM UTC)   │
├──────────────────────┤     ├──────────────────────┤
│ Dependency Updates   │     │   DAST Security      │
│ (dependency-update   │     │   (dast-nightly.yml) │
│         .yml)        │     │                      │
├──────────────────────┤     ├──────────────────────┤
│                      │     │                      │
│ 1. npm outdated      │     │ 1. OWASP ZAP Scan    │
│ 2. Security audit    │     │ 2. Vulnerability     │
│ 3. Auto-fix critical │     │    Detection         │
│ 4. Create PR         │     │ 3. Report Generation │
│ 5. Run tests         │     │ 4. Upload Results    │
│                      │     │                      │
│ Auto-PR if changes   │     │ Fail on HIGH/CRITICAL│
│                      │     │                      │
└──────────────────────┘     └──────────────────────┘
```

## Workflow Dependency Graph

```
Pull Request
├── CI Tests (parallel)
│   ├── Lint
│   ├── Server Tests
│   ├── Frontend Tests
│   ├── E2E Tests (depends on: lint-and-tests)
│   └── Security Scans (depends on: lint-and-tests)
└── Bundle Size (parallel)
    ├── Build Analysis
    └── Lighthouse CI (depends on: bundle-size)

Merge to Develop
└── Staging Deployment
    ├── Build (independent)
    ├── Deploy Backend (depends on: build)
    └── Smoke Tests (depends on: build + deploy-backend)

Tag vX.Y.Z
└── Production Deployment
    ├── Validate (independent)
    ├── Build (depends on: validate)
    ├── Deploy Backend (depends on: build)
    │   └── Database Migrations
    └── Post-Deploy (depends on: build + deploy-backend)
        ├── Health Checks
        ├── Smoke Tests
        └── Notifications

Schedule: Weekly
└── Dependency Updates
    ├── Outdated Scan
    ├── Security Audit
    └── Auto-PR Creation

Schedule: Nightly
└── DAST Security Scan
    └── OWASP ZAP
```

## Secret Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    GitHub Secrets Store                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Repository Secrets (Global)                                │
│  ├── VITE_GEMINI_API_KEYS                                   │
│  ├── VITE_GOOGLE_GEMINI_API_KEY                             │
│  ├── VERCEL_TOKEN                                            │
│  ├── VERCEL_ORG_ID                                           │
│  ├── VERCEL_PROJECT_ID                                       │
│  └── SLACK_WEBHOOK                                           │
│                                                              │
│  Environment: staging                                        │
│  ├── STAGING_SUPABASE_URL                                    │
│  ├── STAGING_SUPABASE_ANON_KEY                               │
│  ├── STAGING_API_URL                                         │
│  ├── STAGING_SITE_URL                                        │
│  └── STAGING_URL                                             │
│                                                              │
│  Environment: production                                     │
│  ├── PROD_SUPABASE_URL                                       │
│  ├── PROD_SUPABASE_ANON_KEY                                  │
│  ├── PROD_API_URL                                            │
│  ├── PROD_DATABASE_URL                                       │
│  └── PROD_BACKEND_DEPLOY_TOKEN                               │
│                                                              │
└──────────────┬───────────────────────────────────────────────┘
               │
               │ Injected as env vars during workflow execution
               │
       ┌───────┴────────┐
       │                │
┌──────▼────────┐  ┌────▼──────────┐
│  Build Step   │  │  Deploy Step  │
├───────────────┤  ├───────────────┤
│ VITE_* vars   │  │ Platform      │
│ available at  │  │ tokens used   │
│ build time    │  │ for deploy    │
└───────────────┘  └───────────────┘
```

## Artifact Flow

```
┌─────────────┐
│   CI Jobs   │
└──────┬──────┘
       │
       │ Generate artifacts
       │
       ├─────────────────────┬──────────────────┬────────────────┐
       │                     │                  │                │
┌──────▼──────┐     ┌────────▼────────┐  ┌─────▼──────┐  ┌────▼────────┐
│  Coverage   │     │  Security       │  │  Bundle    │  │  Lighthouse │
│  Reports    │     │  Scan Results   │  │  Report    │  │  Results    │
└──────┬──────┘     └────────┬────────┘  └─────┬──────┘  └────┬────────┘
       │                     │                  │               │
       │                     │                  │               │
       │ Upload (7 days)     │ Upload (7 days) │ Upload        │ Upload
       │                     │                  │ (7 days)      │ (7 days)
       │                     │                  │               │
┌──────▼─────────────────────▼──────────────────▼───────────────▼────────┐
│                     GitHub Actions Artifacts                            │
├─────────────────────────────────────────────────────────────────────────┤
│  • Downloadable from Actions tab                                       │
│  • Available for analysis                                              │
│  • Used by subsequent jobs                                             │
│  • Retention: 7-30 days based on environment                           │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  Build Jobs  │
└──────┬───────┘
       │
       │ Generate build artifacts
       │
       ├─────────────────────┬────────────────────┐
       │                     │                    │
┌──────▼──────┐     ┌────────▼────────┐   ┌──────▼────────┐
│  Frontend   │     │  Backend        │   │  Build        │
│  dist/      │     │  server/dist/   │   │  Metadata     │
└──────┬──────┘     └────────┬────────┘   └──────┬────────┘
       │                     │                    │
       │ Upload (staging: 7d)│ Upload            │ Upload
       │ Upload (prod: 30d)  │ (staging: 7d)     │ (prod: 30d)
       │                     │ (prod: 30d)        │
       │                     │                    │
┌──────▼─────────────────────▼────────────────────▼────────────┐
│               Deployment Platform                             │
│  (Vercel / Netlify / Railway)                                │
└───────────────────────────────────────────────────────────────┘
```

## Performance Budget Enforcement

```
┌──────────────────┐
│  Pull Request    │
│  Code Changes    │
└────────┬─────────┘
         │
┌────────▼──────────────────────────────────────────────┐
│         Bundle Size Workflow                          │
├───────────────────────────────────────────────────────┤
│                                                       │
│  1. Build production bundle                           │
│     vite build --mode production                      │
│                                                       │
│  2. Analyze bundle                                    │
│     ┌─────────────────────────────────────┐          │
│     │  Chunk Analysis                     │          │
│     ├─────────────────────────────────────┤          │
│     │  • main-[hash].js                   │          │
│     │  • react-vendor-[hash].js           │          │
│     │  • supabase-[hash].js               │          │
│     │  • radix-ui-[hash].js               │          │
│     │  • three-[hash].js                  │          │
│     │  • ... (other chunks)               │          │
│     └─────────────────────────────────────┘          │
│                                                       │
│  3. Check budgets.json                                │
│     ┌─────────────────────────────────────┐          │
│     │  Budget Thresholds                  │          │
│     ├─────────────────────────────────────┤          │
│     │  ✓ Total < 10 MB                    │          │
│     │  ✓ Initial chunk < 2 MB             │          │
│     │  ✓ Vendor chunk < 5 MB              │          │
│     │  ✓ Scripts < 600 KB                 │          │
│     │  ✓ Images < 200 KB                  │          │
│     └─────────────────────────────────────┘          │
│                                                       │
│  4. Run Lighthouse CI                                 │
│     ┌─────────────────────────────────────┐          │
│     │  Performance Checks                 │          │
│     ├─────────────────────────────────────┤          │
│     │  ✓ Performance > 85                 │          │
│     │  ✓ FCP < 2000ms                     │          │
│     │  ✓ LCP < 2500ms                     │          │
│     │  ✓ CLS < 0.1                        │          │
│     │  ✓ TBT < 300ms                      │          │
│     └─────────────────────────────────────┘          │
│                                                       │
└───────────────────────┬───────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         │                             │
    ✅ Pass                         ❌ Fail
         │                             │
┌────────▼────────┐         ┌──────────▼──────────┐
│  Post comment   │         │  Fail workflow      │
│  with report    │         │  Block merge        │
│                 │         │  Notify developer   │
│  Approve merge  │         │                     │
└─────────────────┘         └─────────────────────┘
```

## Environment Protection Flow

```
┌──────────────────────────────────────────────────────┐
│                  Production Deployment                │
└──────────────────┬───────────────────────────────────┘
                   │
          ┌────────▼────────┐
          │  Tag Created    │
          │   (v1.0.0)      │
          └────────┬────────┘
                   │
          ┌────────▼────────────────────────────┐
          │  Environment: production             │
          │  Protection Rules Active             │
          └────────┬────────────────────────────┘
                   │
                   ├─ Check 1: Required Reviewers
                   │  └─ 1-2 approvals needed
                   │
                   ├─ Check 2: Wait Timer
                   │  └─ 5 minute delay
                   │
                   └─ Check 3: Branch Restriction
                      └─ Only from main branch
                          │
              ┌───────────┴──────────┐
              │                      │
         ✅ Approved              ❌ Denied
              │                      │
    ┌─────────▼────────┐    ┌────────▼────────┐
    │  Deploy to Prod  │    │  Block Deployment│
    │                  │    │  Notify team     │
    │  1. Build        │    └──────────────────┘
    │  2. Migrate      │
    │  3. Deploy       │
    │  4. Verify       │
    └──────────────────┘
```

---

**Architecture Version:** 1.0
**Last Updated:** 2025-11-06
**Maintained By:** DevOps Team

# Development Guide

## Test Account Setup

For faster development and testing, this project includes a built-in test account system.

### Quick Setup

1. **Environment Variables**
   ```env
   # In your .env.local file
   VITE_ENVIRONMENT=development
   VITE_DEV_TEST_EMAIL=test@example.com
   VITE_DEV_TEST_PASSWORD=testpass123
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # AI Keys with automatic rotation
   VITE_GEMINI_API_KEYS=key1,key2,key3
   VITE_GOOGLE_GEMINI_API_KEY=key1
   ```

2. **Create Test Data**
   ```bash
   npm run seed:test-data
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```

### Development Features

#### Authentication Page (Development Mode Only)

When `VITE_ENVIRONMENT=development`, you'll see:

- 🟡 **DEV MODE** indicator
- **Quick Login** button - instantly sign in with test account
- **Fill Form** button - pre-fills login form with test credentials
- Test credentials displayed for reference

#### Test Account Details

- **Email**: `test@example.com`
- **Password**: `testpass123`
- **Auto-created data**:
  - Sample campaign with AI-generated description
  - Pre-made character ready for gameplay  
  - Active game session with dialogue history
  - Full user flow testing ready

#### Available Commands

```bash
# Development
npm run dev                # Start dev server with hot reload
npm run build             # Production build
npm run preview           # Preview production build

# Testing & Quality
npm run lint              # Run ESLint (simplified for MVP)
npm run mvp:build         # Lint + Build for deployment

# Test Data Management  
npm run seed:test-data    # Create/reset test account and sample data

# Server (if using backend)
npm run server:dev        # Start backend development server
```

### Development Workflow

1. **First Time Setup**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   npm install
   npm run seed:test-data
   npm run dev
   ```

2. **Daily Development**:
   ```bash
   npm run dev
   # Click "Quick Login" on auth page
   # Test with pre-loaded campaign/character
   ```

3. **Reset Test Data** (if needed):
   ```bash
   npm run seed:test-data
   ```

### Production vs Development

| Feature | Development | Production |
|---------|-------------|------------|
| Test Account UI | ✅ Visible | ❌ Hidden |
| Dev Mode Indicator | ✅ Shown | ❌ Hidden |
| Quick Login | ✅ Available | ❌ Not available |
| Sample Data | ✅ Auto-created | ❌ User-generated |

### AI Reliability Features

The app includes robust AI failover mechanisms:

- **Edge Functions First**: Uses Supabase Edge Functions for AI calls
- **Local Fallback**: Automatically falls back to local Gemini API if Edge Functions fail
- **Key Rotation**: Automatically rotates through multiple API keys on failures
- **Smart Recovery**: Disables failing keys temporarily, re-enables after cooldown
- **Error Tracking**: Monitors API key health and usage statistics

Debug AI status with: `console.log(AIService.getApiStats())`

### Security Notes

- Test account features only appear when `VITE_ENVIRONMENT=development`
- Test credentials are not exposed in production builds
- Service role key is only needed for seeding, not runtime
- Production deployment automatically hides all development helpers
- AI API keys are stored securely and never committed to git

### Troubleshooting

**Test account login fails?**
- Run `npm run seed:test-data` to ensure account exists
- Check Supabase dashboard for the user

**Sample data missing?**  
- Verify `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- Run seeding script with: `npm run seed:test-data`

**Dev mode not showing?**
- Check `VITE_ENVIRONMENT=development` in `.env.local`
- Restart dev server after env changes

---

## CI and Security Checks (Run Locally)

This repo includes CI gates for linting, unit/integration tests with coverage thresholds, security scanning, and auth/role end-to-end checks.

- Lint
  ```bash
  npm run lint
  ```

- Server tests (Express)
  ```bash
  npm run server:test
  ```

- Frontend/services tests with coverage (Vitest)
  ```bash
  npx vitest run --coverage
  ```
  Coverage thresholds are enforced in vitest.config.ts (80% for statements/branches/functions/lines).

- Auth/role E2E (Playwright API)
  ```bash
  # Install Playwright browsers (first run)
  npx playwright install --with-deps

  # Run E2E suite (starts the backend automatically per project)
  npm run e2e
  ```
  Notes:
  - Tests validate non-admin vs admin access to blog admin endpoints.
  - Admin path is enabled via BLOG_ADMIN_DEV_OVERRIDE=1 (non-production only) and a local JWT secret.

- Secrets scanning (Gitleaks)
  ```bash
  # Scan working tree and full git history
  npx gitleaks detect --redact --report-format json --report-path gitleaks.json --log-opts=--all
  ```

- Dependency and secrets scan (Trivy)
  ```bash
  # Using Docker (recommended)
  docker run --rm -v $PWD:/repo aquasec/trivy:latest fs --severity HIGH,CRITICAL --vuln-type os,library --scanners vuln,secret,config --exit-code 1 --format json --output trivy-results.json /repo
  ```

- npm audit (fail on high severity)
  ```bash
  npm audit --audit-level=high
  ```

Nightly DAST is configured via GitHub Actions (OWASP ZAP) to scan the staging endpoint. Set the STAGING_URL GitHub Secret in your repo settings to enable.

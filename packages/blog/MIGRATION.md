# Blog Repository Migration Guide

This guide outlines the steps needed to extract the blog from this monorepo workspace to its own standalone repository.

## Prerequisites

Before migrating:
- ✅ All blog code is in `/packages/blog/`
- ✅ Blog runs independently via `npm run dev`
- ✅ All tests pass
- ✅ Dependencies are properly isolated

## Migration Steps

### 1. Create New Repository

```bash
# On GitHub/GitLab/etc
# Create new repository: blog-infinite-realms (or your preferred name)

# Clone the new empty repository
git clone git@github.com:yourorg/blog-infinite-realms.git
cd blog-infinite-realms
```

### 2. Copy Blog Files

From the main repository:

```bash
# From main repo root
cp -r packages/blog/* /path/to/blog-infinite-realms/
cp packages/blog/.gitignore /path/to/blog-infinite-realms/ 2>/dev/null || true
```

### 3. Handle Shared Dependencies

You have three options for `shared-ui` and `shared-utils`:

#### Option A: Vendor the Code (Simplest)
Copy shared packages directly into the blog repo:

```bash
# In blog repo
mkdir -p src/shared-ui src/shared-utils
cp -r ../main-repo/packages/shared-ui/src/* src/shared-ui/
cp -r ../main-repo/packages/shared-utils/src/* src/shared-utils/

# Update imports in all files from:
# import { Button } from 'shared-ui'
# To:
# import { Button } from './shared-ui/components/button'
```

#### Option B: Publish Private Packages (Recommended for Scale)
Publish shared packages to private npm registry:

```bash
# In main repo
cd packages/shared-ui
npm publish --access restricted

cd packages/shared-utils
npm publish --access restricted

# In blog repo package.json
{
  "dependencies": {
    "@yourorg/shared-ui": "^0.1.0",
    "@yourorg/shared-utils": "^0.1.0"
  }
}
```

#### Option C: Git Submodules (Advanced)
Keep shared code in original repo, reference as submodules:

```bash
# In blog repo
git submodule add git@github.com:yourorg/main-repo.git shared
git submodule update --init --recursive

# Update package.json paths to reference submodule
```

**Recommendation**: Start with **Option A** (vendor), migrate to **Option B** later if needed.

### 4. Update Package Configuration

Edit `package.json`:

```json
{
  "name": "@yourorg/blog",
  "version": "1.0.0",
  "description": "Blog for Infinite Realms",
  "repository": {
    "type": "git",
    "url": "git@github.com:yourorg/blog-infinite-realms.git"
  },
  "dependencies": {
    // Remove workspace references:
    // "shared-ui": "*",     ← Remove
    // "shared-utils": "*",  ← Remove

    // Add direct dependencies (if vendored)
    // Or published packages (if using Option B)
  }
}
```

### 5. Update Import Statements

If you vendored the shared code, update all imports:

```bash
# Find all imports
grep -r "from 'shared-ui'" src/
grep -r "from 'shared-utils'" src/

# Update them to relative paths or new package names
```

### 6. Database Setup

#### Option A: Shared Database
Keep using the same Supabase project:

1. Copy `.env` file with Supabase credentials
2. Ensure RLS policies allow access
3. Document shared database dependency

#### Option B: Separate Database
Create new Supabase project for blog:

1. Create new Supabase project
2. Run migration from original repo:
   ```bash
   # Copy migration
   cp /path/to/main-repo/supabase/migrations/20251017_create_blog_cms.sql \
      ./database/migrations/

   # Run migration in new Supabase project
   supabase db push
   ```
3. Update `.env` with new Supabase credentials

### 7. Environment Variables

Create `.env` file:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Blog Settings
BLOG_MEDIA_BUCKET=blog-media
NODE_ENV=production

# Backend
PORT=8080
SERVER_URL=https://blog-api.yourdomain.com
```

Create `.env.example` for documentation:
```bash
cp .env .env.example
# Remove sensitive values from .env.example
```

### 8. Update Build Configuration

#### vite.config.ts
Remove workspace path aliases:

```typescript
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Remove references to ../shared-ui, etc.
    },
  },
});
```

#### tsconfig.json
Update path mappings:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
      // Remove ../shared-ui/* references
    }
  }
}
```

### 9. CI/CD Setup

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Blog

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build

      - name: Deploy
        # Your deployment steps
```

### 10. Documentation Updates

Update README.md to reflect standalone status:
- Remove references to parent monorepo
- Add standalone setup instructions
- Document deployment process
- List all environment variables

### 11. Git History (Optional)

To preserve git history for blog files:

```bash
# In new blog repo
# Import history from main repo using git subtree
git remote add main-repo /path/to/main-repo
git fetch main-repo
git checkout -b import-history
git read-tree --prefix=blog/ -u main-repo/feature/blog-workspace-separation:packages/blog
git commit -m "Import blog history from main repo"
git merge --allow-unrelated-histories import-history
```

### 12. Testing Checklist

Before going live:

- [ ] `npm install` works without errors
- [ ] `npm run dev` starts dev server
- [ ] `npm run build` produces production build
- [ ] `npm run server:dev` starts backend
- [ ] Database connections work
- [ ] Blog index page loads
- [ ] Individual post pages work
- [ ] Blog admin accessible
- [ ] Post editor functional
- [ ] Media upload works
- [ ] All tests pass (`npm run test`)
- [ ] Environment variables documented
- [ ] Deployment pipeline works

## Deployment Options

### Vercel (Frontend)
```bash
vercel --prod
```

### Railway (Full-stack)
```bash
railway up
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 8080
CMD ["npm", "run", "server:start"]
```

## Rollback Plan

If migration fails:

1. Keep original repo unchanged on `main` branch
2. Blog still accessible via main app routes
3. Fix issues in new blog repo
4. Re-attempt migration when ready

## Post-Migration

After successful migration:

1. Update main app to remove blog code
2. Add link from main app to new blog domain
3. Set up domain/subdomain for blog
4. Configure CORS if needed for API calls
5. Update monitoring/analytics
6. Archive feature branch: `feature/blog-workspace-separation`

## Support

For migration issues, refer to:
- Main repo: https://github.com/yourorg/main-repo
- Blog repo: https://github.com/yourorg/blog-repo
- Documentation: /docs/

---

**Created**: 2025-11-05
**Status**: Ready for migration after testing

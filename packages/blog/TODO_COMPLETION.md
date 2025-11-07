# Blog Workspace Separation - Completion Tasks

**Current Branch**: `feature/blog-workspace-separation`
**Status**: Structure complete, needs testing and refinement
**Estimated Time**: 2-4 hours

## 📋 Quick Context

The blog has been separated into `/packages/blog/` as an npm workspace. All files are moved and organized, dependencies installed, but the application hasn't been tested yet. The main challenge is fixing import statements and ensuring the blog runs independently.

## ✅ Already Completed

- ✅ Workspace structure created (packages/shared-ui, shared-utils, blog)
- ✅ All 34 blog files moved to packages/blog/
- ✅ 40+ UI components extracted to shared-ui
- ✅ 4 utilities extracted to shared-utils
- ✅ Package.json configs for all workspaces
- ✅ TypeScript, Vite, Tailwind configs created
- ✅ Blog routes removed from main App.tsx
- ✅ Dependencies installed (npm install successful)
- ✅ Backend utilities copied for blog independence
- ✅ Documentation written (README.md, MIGRATION.md)
- ✅ Changes committed to git

## 🎯 Remaining Tasks

### Phase 1: Initial Testing (30-45 mins)

#### Task 1.1: Create Blog Environment File
```bash
cd packages/blog
```

Create `.env` file with content:
```env
# Copy from root .env or create new
VITE_SUPABASE_URL=<from_root_env>
VITE_SUPABASE_ANON_KEY=<from_root_env>

# Blog specific
BLOG_MEDIA_BUCKET=blog-media
VITE_BLOG_ADMIN_DEV_OVERRIDE=true
BLOG_ADMIN_DEV_OVERRIDE=true
```

**Command**:
```bash
cp ../../.env .env  # Then edit as needed
```

#### Task 1.2: Attempt First Run
```bash
cd packages/blog
npm run dev
```

**Expected Result**: Server starts on port 3001, but may have errors.

**Expected Errors**:
1. Import errors for UI components
2. Import errors for utilities
3. AuthContext not found
4. Module resolution errors

**Action**: Document all errors, proceed to fix them in Phase 2.

---

### Phase 2: Fix Critical Imports (60-90 mins)

The blog files use old import paths via tsconfig path aliases. These need updating.

#### Task 2.1: Fix AuthContext Dependency

**Problem**: Blog relies on `src/contexts/AuthContext` from main app.

**Option A (Recommended)**: Copy AuthContext to blog package
```bash
cd packages/blog
mkdir -p src/contexts
cp ../../src/contexts/AuthContext.tsx src/contexts/
```

Then update imports in blog files that use AuthContext:
```typescript
// Change from:
import { useAuth } from '@/contexts/AuthContext'
// To:
import { useAuth } from './contexts/AuthContext'
```

**Files likely affected**:
- `src/pages/BlogAdmin.tsx`
- `src/pages/BlogEditor.tsx`
- `src/components/blog-admin/blog-posts-list.tsx`

**Option B**: Keep reference to main app's AuthContext (simpler but less independent)
- Leave as-is, relying on tsconfig path alias
- Document this dependency in README

**Choose Option A for true independence.**

#### Task 2.2: Verify Shared Package Imports Work

The tsconfig path aliases should already handle this, but verify:

**Test file**: Open any blog component, check if imports resolve:
```typescript
// These should work via path aliases:
import { Button } from '@/components/ui/button'  // Maps to ../shared-ui/src/components/button.tsx
import { createClient } from '@/integrations/supabase/client'  // Maps to ../shared-utils/src/supabase.ts
```

**If imports fail**:
1. Check `packages/blog/tsconfig.json` path mappings are correct
2. Check `packages/blog/vite.config.ts` alias configuration
3. Try restarting the dev server

#### Task 2.3: Fix Any Missing Imports

**Common issues**:
1. **QueryClient not imported**: Add to files that need it
2. **Toaster missing**: Blog may need to import from sonner
3. **CSS not loading**: Ensure `src/index.css` is imported in `src/main.tsx`

**Check these files**:
- `packages/blog/src/main.tsx` - Should import './index.css'
- Blog pages - Should have all necessary imports

---

### Phase 3: Test Blog Functionality (45-60 mins)

Once the dev server runs without errors:

#### Task 3.1: Test Public Routes

Open browser to `http://localhost:3001/`

**Checklist**:
- [ ] Blog index page loads
- [ ] Can see list of posts (if any exist in database)
- [ ] Search functionality works
- [ ] Category filtering works
- [ ] Individual post page loads (`http://localhost:3001/:slug`)
- [ ] Post content renders correctly
- [ ] Related posts show (if applicable)
- [ ] No console errors

**Expected Issues**:
- **No posts show**: Database may be empty or connection issue
  - Fix: Check Supabase connection, verify blog_posts table exists
- **Styling broken**: CSS not loading
  - Fix: Ensure Tailwind is processing, check postcss.config.js
- **Images don't load**: Path issues
  - Fix: Check public/blog-assets/ path resolution

#### Task 3.2: Test Admin Routes

Navigate to `http://localhost:3001/admin`

**Checklist**:
- [ ] Admin dashboard loads
- [ ] Can switch between tabs (Posts, Categories, Tags, Media)
- [ ] Posts list shows
- [ ] Can click "New Post"
- [ ] Editor loads (`/admin/posts/new`)
- [ ] Can type in editor
- [ ] Can select categories/tags
- [ ] Can upload media
- [ ] Can save draft
- [ ] Can publish post

**Expected Issues**:
- **Auth errors**: If AuthContext not resolved
  - Fix: Complete Task 2.1 properly
- **API errors**: Backend not running
  - Fix: Need to also run `npm run server:dev` in separate terminal
- **Permission errors**: Blog roles not set up
  - Fix: Check BLOG_ADMIN_DEV_OVERRIDE=true in .env

#### Task 3.3: Test Backend API

In a separate terminal:
```bash
cd packages/blog
npm run server:dev
```

**Expected Result**: Server starts, likely with errors.

**Expected Issues**:
1. **Import errors**: Backend files may have path issues
2. **Port conflicts**: If main app backend is running
3. **Database connection**: May need to configure

**Note**: The blog backend is more complex. It might be easier to keep using the main app's backend for now and just run the blog frontend independently. Document this decision.

**Alternative Approach**:
- Don't run blog backend separately yet
- Keep blog frontend using main app's backend API at `http://localhost:8888/v1/blog`
- Update blog's API service to point to main app backend

---

### Phase 4: Backend Integration Decision (30-45 mins)

**Decision Point**: Should blog backend run independently?

#### Option A: Independent Backend (More work, full independence)

**Steps**:
1. Create `packages/blog/server/src/index.ts` entry point:
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import blogRouter from './routes/blog';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use('/blog', blogRouter);

app.listen(PORT, () => {
  console.log(`Blog backend running on port ${PORT}`);
});

export default app;
```

2. Fix backend imports (routes may reference main app paths)
3. Create `packages/blog/server/tsconfig.json`
4. Test with `npm run server:dev`

#### Option B: Use Main App Backend (Easier, less independent)

**Steps**:
1. Keep blog frontend using main app API
2. Update `packages/blog/src/services/blog-service.ts`:
```typescript
// Point to main app backend
const API_BASE = 'http://localhost:8888/v1';
```
3. Document this dependency
4. Blog frontend is independent, backend stays with main app for now

**Recommendation**: Choose **Option B** for now, revisit Option A later if needed.

---

### Phase 5: Main App Testing (20-30 mins)

Ensure the main app still works without blog code:

#### Task 5.1: Run Main App
```bash
# From repo root
npm run dev
```

**Checklist**:
- [ ] Main app starts on port 3000
- [ ] No errors about missing blog files
- [ ] Landing page loads
- [ ] Protected routes work
- [ ] No broken imports
- [ ] UI components still work (they should use local src/components/ui/ for now)

**If errors occur**:
- Check for any remaining blog imports in main app
- Verify blog routes were removed from App.tsx
- Check for components that depended on blog code

#### Task 5.2: Update Main App to Use Shared UI (Optional)

This is optional but recommended for consistency:

**Goal**: Make main app use `packages/shared-ui` instead of local `src/components/ui/`

**Steps**:
1. Update `tsconfig.json` in root:
```json
{
  "compilerOptions": {
    "paths": {
      "@/components/ui/*": ["./packages/shared-ui/src/components/*"],
      "@/lib/utils": ["./packages/shared-ui/src/lib/utils"]
    }
  }
}
```

2. Update `vite.config.ts` in root:
```typescript
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
    "@/components/ui": path.resolve(__dirname, "./packages/shared-ui/src/components"),
  },
}
```

3. Test main app - should work identically

**Note**: This is a nice-to-have, not critical for blog separation.

---

### Phase 6: Testing & Validation (30-45 mins)

#### Task 6.1: Run All Tests

Main app tests:
```bash
# From root
npm run server:test
```

Blog tests:
```bash
cd packages/blog
npm run test
```

**Expected**: Some tests may fail due to import changes.

**Fix approach**:
- Update test imports to match new structure
- Mock workspace dependencies in tests
- Skip failing tests temporarily, document them

#### Task 6.2: Build Production Bundle

Main app:
```bash
npm run build
```

Blog:
```bash
cd packages/blog
npm run build
```

**Expected Result**: Both should build successfully.

**If build fails**:
- Check for any import errors not caught by dev mode
- Verify all dependencies are in package.json
- Check TypeScript errors

---

### Phase 7: Documentation & Cleanup (20-30 mins)

#### Task 7.1: Update WORKSPACE_SEPARATION_STATUS.md

Mark completed tasks, update status from "In Progress" to "Testing Complete" or "Ready for Merge"

#### Task 7.2: Document Known Issues

Add to `packages/blog/README.md` under "Known Issues" section:
- Any unresolved errors
- Dependencies on main app (if any)
- Temporary solutions used (like path aliases)

#### Task 7.3: Create Final Summary

Add section to `packages/blog/README.md`:

```markdown
## Current Status - [Date]

- ✅ Blog runs independently on port 3001
- ✅ Frontend fully functional
- ✅ Admin dashboard works
- ⚠️ Backend: [Using main app / Independent]
- ⚠️ Auth: [Using main app / Copied to blog]
- 🔴 Known issues: [List any remaining issues]
```

---

### Phase 8: Git Commit & Prepare for Merge (15-20 mins)

#### Task 8.1: Commit Fixes
```bash
git add -A
git commit -m "fix: complete blog workspace separation testing and fixes

- Fixed import paths for blog application
- Resolved AuthContext dependency via [solution chosen]
- Tested blog frontend on port 3001
- Verified main app still works
- [List other fixes made]

All blog features tested and working:
- Public blog index and post pages
- Admin dashboard
- Post editor
- Media upload
- [Other features]

Known issues:
- [List if any]

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### Task 8.2: Test Merge Feasibility

From main branch:
```bash
git checkout main
git merge --no-commit --no-ff feature/blog-workspace-separation
```

Check for conflicts, resolve if any, then:
```bash
git merge --abort  # Don't actually merge yet
git checkout feature/blog-workspace-separation
```

Document any merge conflicts for review.

---

## 🚨 Common Issues & Solutions

### Issue 1: "Cannot find module '@/components/ui/button'"

**Solution**: Path alias not working. Check:
1. `packages/blog/tsconfig.json` has correct paths mapping
2. `packages/blog/vite.config.ts` has correct alias
3. Restart dev server: `npm run dev`

### Issue 2: "Module not found: shared-ui"

**Solution**: Workspace not linked properly.
```bash
# From root
npm install
# Verify packages are linked:
ls -la node_modules/shared-ui  # Should be symlink
```

### Issue 3: "Supabase client error"

**Solution**: Environment variables not set.
```bash
# Check .env exists in packages/blog/
cat packages/blog/.env
# Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
```

### Issue 4: "AuthContext not found"

**Solution**: Complete Task 2.1 - copy AuthContext to blog package.

### Issue 5: "Port 3001 already in use"

**Solution**:
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
# Or change port in packages/blog/vite.config.ts
```

### Issue 6: Blog page blank/white screen

**Solution**: Check browser console for errors. Common causes:
1. Missing CSS import in main.tsx
2. React Router not configured correctly
3. API errors preventing render

### Issue 7: TypeScript errors in IDE but dev server works

**Solution**: IDE using wrong tsconfig.
- Restart TypeScript server in IDE
- Point IDE to `packages/blog/tsconfig.json` for blog files

---

## 📊 Success Criteria

Before marking as complete:

- [ ] Blog dev server runs without errors (`npm run dev` in packages/blog/)
- [ ] Blog index page loads and displays correctly
- [ ] Individual blog posts load
- [ ] Blog admin dashboard accessible
- [ ] Post editor works
- [ ] Can create/edit/publish posts
- [ ] Media upload functional
- [ ] Main app runs without errors
- [ ] Main app has no broken links to blog routes
- [ ] All critical tests pass
- [ ] Production build succeeds for both main app and blog
- [ ] Documentation is complete and accurate
- [ ] Changes committed to git

---

## 🎯 Final Deliverable

When complete, the repository should have:

1. **Working blog package** at `/packages/blog/` that runs independently
2. **Working main app** without blog code
3. **Shared packages** (shared-ui, shared-utils) used by blog
4. **Documentation** complete and accurate
5. **Git commit** on `feature/blog-workspace-separation` branch
6. **Status file** updated with completion notes

The blog should be ready to:
- Develop independently from main app
- Extract to separate repository (see MIGRATION.md)
- Deploy separately

---

## 💡 Tips for Claude Assistant

1. **Read error messages carefully** - They usually point to the exact issue
2. **Test incrementally** - Fix one error, test, fix next
3. **Check package.json** - Make sure dependencies are installed
4. **Verify file paths** - TypeScript errors often mean wrong paths
5. **Use git diff** - See what changed if something breaks
6. **Commit frequently** - After each successful fix
7. **Document as you go** - Update status files with findings

## 📞 Need Help?

If stuck:
1. Check `WORKSPACE_SEPARATION_STATUS.md` for context
2. Review `packages/blog/README.md` for setup info
3. Check `packages/blog/MIGRATION.md` for architecture details
4. Review git history: `git log --oneline feature/blog-workspace-separation`
5. Look at original blog files in main branch for reference

---

**Created**: 2025-11-05
**For**: Claude Code completion session
**Estimated completion time**: 2-4 hours total
**Priority**: Testing and import fixes (Phases 1-3)

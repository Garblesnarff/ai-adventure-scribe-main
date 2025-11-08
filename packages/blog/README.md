# Blog Package - Workspace Separation

This directory contains the blog application extracted from the main Infinite Realms application as part of the workspace separation effort.

## 🎯 Current Status

**Branch**: `feature/blog-workspace-separation`

**Completed**:
- ✅ Workspace structure created
- ✅ UI components extracted to `shared-ui` package
- ✅ Utilities extracted to `shared-utils` package
- ✅ All 23 blog frontend files moved to `/packages/blog/src`
- ✅ All 11 blog backend files moved to `/packages/blog/server`
- ✅ Package configurations created (package.json, tsconfig.json, vite.config.ts)
- ✅ Entry points created (index.html, main.tsx)
- ✅ Backend shared utilities copied for independence
- ✅ Blog routes removed from main App.tsx
- ✅ Dependencies installed successfully

**Pending**:
- ⚠️ Import statements still reference old paths (using tsconfig path aliases as temporary solution)
- ⚠️ Needs testing - blog may not run yet
- ⚠️ Database connection configuration needed
- ⚠️ Environment variables need to be set up
- ⚠️ Main app needs updating to use shared-ui package

## 📁 Structure

```
packages/blog/
├── src/                          # Frontend
│   ├── components/
│   │   └── blog-admin/          # Admin UI components
│   ├── pages/                   # Blog pages (Index, Post, Admin, Editor)
│   ├── hooks/                   # React Query hooks
│   ├── services/                # API services
│   ├── types/                   # TypeScript types
│   ├── main.tsx                 # App entry point
│   └── index.css                # Tailwind styles
├── server/                      # Backend
│   ├── src/
│   │   ├── routes/              # Express routes
│   │   ├── middleware/          # Auth middleware
│   │   ├── services/            # Blog service
│   │   ├── views/               # SSR views
│   │   ├── lib/                 # Supabase client
│   │   └── utils/               # Markdown utils
│   └── tests/                   # Backend tests
├── public/                      # Static assets
├── scripts/                     # Utility scripts
├── docs/                        # Documentation
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── vite.config.ts               # Vite build config
├── tailwind.config.ts           # Tailwind config
└── postcss.config.js            # PostCSS config
```

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- npm 7+ (for workspaces support)
- Supabase account and project

### Install Dependencies
From the repository root:
```bash
npm install
```

This will install dependencies for all workspaces (main app, shared-ui, shared-utils, and blog).

### Run Blog Development Server
```bash
cd packages/blog
npm run dev
```

The blog will run on `http://localhost:3001` (port 3001 to avoid conflict with main app on 3000).

### Run Blog Backend Server
```bash
cd packages/blog
npm run server:dev
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in `/packages/blog/`:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Blog specific
BLOG_MEDIA_BUCKET=blog-media
BLOG_ADMIN_DEV_OVERRIDE=true  # Dev mode only
VITE_BLOG_ADMIN_DEV_OVERRIDE=true
```

### Database

The blog uses the same Supabase database as the main app. The migration file is located at:
`/supabase/migrations/20251017_create_blog_cms.sql`

If setting up from scratch, you'll need to run this migration.

## 📦 Dependencies

### Shared Packages
- `shared-ui`: UI components (Button, Badge, Card, etc.)
- `shared-utils`: Utilities (Supabase client, logger, network utils)

### Blog-Specific
- React 18
- React Router
- TanStack Query
- Supabase client
- Express (backend)
- Marked (markdown rendering)
- And more (see package.json)

## 🚨 Known Issues

### Import Paths
Currently, blog files still use old import paths like:
```typescript
import { Button } from '@/components/ui/button'
```

These work via tsconfig.json path aliases that map to the new workspace locations:
```json
{
  "paths": {
    "@/components/ui/*": ["../shared-ui/src/components/*"]
  }
}
```

**For production**, these should be updated to:
```typescript
import { Button } from 'shared-ui/components/button'
```

### Authentication Context
The blog still relies on the main app's `AuthContext`. For true independence, this needs to be:
1. Copied into the blog package, OR
2. Extracted to a shared package, OR
3. Rewritten to use Supabase auth directly

### SSR Views
The server-side rendering views in `/server/src/views/blog/` may have import issues that need resolution.

## 🧪 Testing

Run tests:
```bash
cd packages/blog
npm run test
```

Build production:
```bash
cd packages/blog
npm run build
```

## 📝 Migration to Separate Repository

When ready to move the blog to its own repository:

1. **Copy the entire `/packages/blog/` directory** to new repo
2. **Include shared packages** either by:
   - Copying `shared-ui` and `shared-utils` packages
   - Converting to npm packages and publishing privately
   - Vendoring the specific components/utilities needed
3. **Update imports** to remove path aliases
4. **Set up CI/CD** for independent deployment
5. **Copy database migration** from `/supabase/migrations/20251017_create_blog_cms.sql`
6. **Configure environment** variables for production
7. **Set up separate Supabase** project or shared database access

## 🔗 Related Documentation

- `/packages/blog/docs/BLOG_EDITOR_IMPLEMENTATION_PLAN.md`
- `/packages/blog/docs/blog-storage-setup.md`
- `/server/docs/blog-api.md`

## 🚀 Next Steps

1. **Test the blog application** - Try running it and fix any import errors
2. **Update remaining imports** - Convert from path aliases to direct workspace references
3. **Verify database connectivity** - Ensure Supabase connection works
4. **Test all features**:
   - Public blog index
   - Individual post pages
   - Blog admin dashboard
   - Post editor
   - Media upload
5. **Update main app** to use shared-ui package
6. **Write comprehensive tests**
7. **Prepare for repository extraction**

## 📧 Support

For issues or questions about the blog separation, refer to the main project documentation or create an issue on GitHub.

---

**Generated**: 2025-11-05
**Branch**: feature/blog-workspace-separation
**Status**: Work in Progress - Needs Testing

# Database Layer - Drizzle ORM

This directory contains the Drizzle ORM setup for type-safe database queries.

## Overview

Drizzle ORM is being gradually integrated alongside Supabase to provide:
- **Type safety** at the database boundary
- **Better IDE autocomplete** for queries
- **Compile-time error checking** for database operations
- **Simplified query building** with TypeScript-first API

## Architecture

### Current State
- **Supabase Client**: Existing queries remain unchanged
- **Drizzle ORM**: New layer for type-safe queries (runs in parallel)
- **Database**: Same PostgreSQL database, accessed via different clients

### Migration Strategy
1. **Phase 1** (Current): Infrastructure setup - Drizzle runs alongside Supabase
2. **Phase 2**: New features use Drizzle, existing code unchanged
3. **Phase 3**: Gradually migrate critical paths to Drizzle
4. **Phase 4**: Full migration (if deemed beneficial)

## Directory Structure

```
db/
├── schema.ts          # Table definitions with TypeScript types
├── client.ts          # Drizzle client initialization
├── migrations/        # Generated migration files (auto-generated)
└── README.md          # This file
```

## Files

### schema.ts
Defines database tables using Drizzle's schema builder:
- `blogAuthors` - Author profiles
- `blogCategories` - Content categories
- `blogTags` - Flexible tagging
- `blogPosts` - Main content table
- `blogPostCategories` - Post-category relationships
- `blogPostTags` - Post-tag relationships

Each table exports TypeScript types:
- `BlogPost` - Type for SELECT queries
- `NewBlogPost` - Type for INSERT queries

### client.ts
Initializes the Drizzle client with PostgreSQL connection:
```typescript
import { db } from '@/db/client';
import { blogPosts } from '@/db/schema';
```

## Usage Examples

### Basic Query
```typescript
import { db } from '@/db/client';
import { blogPosts } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Type-safe SELECT
const publishedPosts = await db
  .select()
  .from(blogPosts)
  .where(eq(blogPosts.status, 'published'));
```

### Insert with Type Safety
```typescript
import { db } from '@/db/client';
import { blogPosts, type NewBlogPost } from '@/db/schema';

const newPost: NewBlogPost = {
  authorId: '123e4567-e89b-12d3-a456-426614174000',
  title: 'My First Post',
  slug: 'my-first-post',
  status: 'draft',
};

const [inserted] = await db.insert(blogPosts).values(newPost).returning();
```

### Relational Query
```typescript
import { db } from '@/db/client';
import { blogPosts, blogAuthors } from '@/db/schema';
import { eq } from 'drizzle-orm';

const postsWithAuthors = await db
  .select({
    post: blogPosts,
    author: blogAuthors,
  })
  .from(blogPosts)
  .leftJoin(blogAuthors, eq(blogPosts.authorId, blogAuthors.id));
```

## Environment Setup

Drizzle uses the `DATABASE_URL` environment variable:

```bash
# .env.local or server/.env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

You can derive this from your existing Supabase credentials:
- Get your project reference from `VITE_SUPABASE_URL`
- Use the database password from Supabase project settings

## Available Commands

```bash
# Generate TypeScript types from schema
npm run db:generate

# Run migrations
npm run db:migrate

# Push schema changes directly to database (dev only)
npm run db:push

# Open Drizzle Studio (visual database browser)
npm run db:studio
```

## Type Safety Benefits

### Before (Supabase Client)
```typescript
// Runtime errors possible, no autocomplete
const { data, error } = await supabase
  .from('blog_posts')
  .select('*')
  .eq('statuss', 'published'); // Typo not caught!
```

### After (Drizzle)
```typescript
// Compile-time type checking, full autocomplete
const posts = await db
  .select()
  .from(blogPosts)
  .where(eq(blogPosts.statuss, 'published')); // TypeScript error!
//                    ^^^^^^^ Property 'statuss' does not exist
```

## Migration Strategy

### When to Use Drizzle
- New features being built
- Code being actively refactored
- Areas where type safety is critical

### When to Keep Supabase
- Existing working code
- Low-priority maintenance code
- Areas using Supabase-specific features (RLS, realtime)

### Gradual Migration Example
```typescript
// Before: Supabase query
async function getBlogPost(slug: string) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single();
  return data;
}

// After: Drizzle query (during refactor)
async function getBlogPost(slug: string) {
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);
  return post;
}
```

## Drizzle vs Supabase

| Feature | Supabase Client | Drizzle ORM |
|---------|----------------|-------------|
| Type Safety | Runtime | Compile-time |
| RLS Support | Native | Via database |
| Realtime | Built-in | Not supported |
| Query Builder | String-based | Type-safe |
| Migrations | SQL files | Schema-driven |
| Learning Curve | Low | Medium |

## Best Practices

1. **Import types**: Use generated types for better TypeScript support
   ```typescript
   import { BlogPost, NewBlogPost } from '@/db/schema';
   ```

2. **Use transactions**: For multi-table operations
   ```typescript
   await db.transaction(async (tx) => {
     await tx.insert(blogPosts).values(newPost);
     await tx.insert(blogPostCategories).values({ postId, categoryId });
   });
   ```

3. **Prepare statements**: For frequently executed queries
   ```typescript
   const getPostBySlug = db
     .select()
     .from(blogPosts)
     .where(eq(blogPosts.slug, placeholder('slug')))
     .prepare('get_post_by_slug');
   ```

4. **Use returning()**: To get inserted/updated data
   ```typescript
   const [newPost] = await db
     .insert(blogPosts)
     .values(data)
     .returning();
   ```

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [PostgreSQL with Drizzle](https://orm.drizzle.team/docs/get-started-postgresql)
- [Drizzle Query Examples](https://orm.drizzle.team/docs/select)
- [Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview)

## Notes

- **No Schema Changes**: This setup does NOT modify existing database schema
- **Parallel Operation**: Drizzle and Supabase can be used simultaneously
- **No Breaking Changes**: Existing Supabase queries continue to work
- **Opt-in Adoption**: Teams can migrate at their own pace

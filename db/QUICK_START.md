# Drizzle ORM Quick Start

## Setup (One-time)

1. **Set DATABASE_URL** in `server/.env`:
   ```bash
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.cnalyhtalikwsopogula.supabase.co:5432/postgres
   ```

2. **Generate types**:
   ```bash
   npm run db:generate
   ```

## Basic Usage

### Query Data
```typescript
import { db } from '@/db/client';
import { blogPosts } from '@/db/schema';
import { eq } from 'drizzle-orm';

const posts = await db
  .select()
  .from(blogPosts)
  .where(eq(blogPosts.status, 'published'));
```

### Insert Data
```typescript
import { db } from '@/db/client';
import { blogPosts, type NewBlogPost } from '@/db/schema';

const newPost: NewBlogPost = {
  authorId: 'uuid',
  title: 'My Post',
  slug: 'my-post',
  status: 'draft'
};

const [created] = await db
  .insert(blogPosts)
  .values(newPost)
  .returning();
```

### Update Data
```typescript
import { db } from '@/db/client';
import { blogPosts } from '@/db/schema';
import { eq } from 'drizzle-orm';

const [updated] = await db
  .update(blogPosts)
  .set({ status: 'published', publishedAt: new Date() })
  .where(eq(blogPosts.id, postId))
  .returning();
```

### Delete Data
```typescript
import { db } from '@/db/client';
import { blogPosts } from '@/db/schema';
import { eq } from 'drizzle-orm';

await db
  .delete(blogPosts)
  .where(eq(blogPosts.id, postId));
```

### Join Tables
```typescript
import { db } from '@/db/client';
import { blogPosts, blogAuthors } from '@/db/schema';
import { eq } from 'drizzle-orm';

const postsWithAuthors = await db
  .select({
    postTitle: blogPosts.title,
    authorName: blogAuthors.displayName
  })
  .from(blogPosts)
  .leftJoin(blogAuthors, eq(blogPosts.authorId, blogAuthors.id));
```

## Commands

- `npm run db:generate` - Generate types from schema
- `npm run db:push` - Push schema to database (dev)
- `npm run db:studio` - Open visual database browser

## Type Safety

All queries are fully typed with autocomplete:

```typescript
// ✅ TypeScript catches errors
const posts = await db.select().from(blogPosts).where(
  eq(blogPosts.statuss, 'published')  // Error: Property 'statuss' does not exist
);

// ✅ Status field has enum autocomplete
const post: NewBlogPost = {
  status: 'published' // Autocomplete: draft|review|scheduled|published|archived
};
```

## More Examples

See `/db/example-queries.ts` for 10 comprehensive examples including:
- Transactions
- Aggregates
- Full-text search
- Complex joins

## Documentation

- Full guide: `/db/README.md`
- Setup details: `/db/SETUP_SUMMARY.md`
- Work unit report: `/WORK_UNIT_1.4_COMPLETE.md`

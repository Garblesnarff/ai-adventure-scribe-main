/**
 * Example Drizzle Queries
 *
 * This file demonstrates type-safe database queries using Drizzle ORM.
 * These are examples only - not meant to be executed directly.
 */

import { eq, and, desc, like, sql } from 'drizzle-orm';

import { db } from './client';
import { blogPosts, blogAuthors, blogCategories, blogPostCategories, type BlogPost, type NewBlogPost } from './schema';

/**
 * Example 1: Select all published blog posts
 */
export async function getPublishedPosts(): Promise<BlogPost[]> {
  return await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.status, 'published'))
    .orderBy(desc(blogPosts.publishedAt));
}

/**
 * Example 2: Get a single post by slug with author information
 */
export async function getPostBySlug(slug: string) {
  const result = await db
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      content: blogPosts.content,
      publishedAt: blogPosts.publishedAt,
      authorName: blogAuthors.displayName,
      authorSlug: blogAuthors.slug,
      authorAvatar: blogAuthors.avatarUrl,
    })
    .from(blogPosts)
    .leftJoin(blogAuthors, eq(blogPosts.authorId, blogAuthors.id))
    .where(eq(blogPosts.slug, slug))
    .limit(1);

  return result[0];
}

/**
 * Example 3: Create a new blog post (type-safe insert)
 */
export async function createBlogPost(data: NewBlogPost) {
  const [newPost] = await db
    .insert(blogPosts)
    .values(data)
    .returning();

  return newPost;
}

/**
 * Example 4: Update post status
 */
export async function updatePostStatus(postId: string, status: 'draft' | 'review' | 'scheduled' | 'published' | 'archived') {
  const [updated] = await db
    .update(blogPosts)
    .set({
      status,
      updatedAt: new Date(),
      // Auto-set publishedAt when status changes to 'published'
      ...(status === 'published' && { publishedAt: new Date() }),
    })
    .where(eq(blogPosts.id, postId))
    .returning();

  return updated;
}

/**
 * Example 5: Search posts by title or content
 */
export async function searchPosts(query: string): Promise<BlogPost[]> {
  const searchPattern = `%${query}%`;

  return await db
    .select()
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.status, 'published'),
        sql`${blogPosts.title} ILIKE ${searchPattern} OR ${blogPosts.content} ILIKE ${searchPattern}`
      )
    )
    .orderBy(desc(blogPosts.publishedAt));
}

/**
 * Example 6: Get posts with their categories (via join table)
 */
export async function getPostsWithCategories() {
  // This demonstrates a more complex query with multiple joins
  return await db
    .select({
      postId: blogPosts.id,
      postTitle: blogPosts.title,
      postSlug: blogPosts.slug,
      categoryName: blogCategories.name,
      categorySlug: blogCategories.slug,
    })
    .from(blogPosts)
    .leftJoin(sql`blog_post_categories`, sql`blog_post_categories.post_id = ${blogPosts.id}`)
    .leftJoin(blogCategories, sql`${blogCategories.id} = blog_post_categories.category_id`)
    .where(eq(blogPosts.status, 'published'));
}

/**
 * Example 7: Transaction - Create post and assign categories
 */
export async function createPostWithCategories(
  postData: NewBlogPost,
  categoryIds: string[]
) {
  return await db.transaction(async (tx) => {
    // Insert the post
    const [newPost] = await tx
      .insert(blogPosts)
      .values(postData)
      .returning();

    if (!newPost) throw new Error('Failed to create post');

    // Insert category relationships
    if (categoryIds.length > 0) {
      await tx
        .insert(blogPostCategories)
        .values(
          categoryIds.map((categoryId) => ({
            postId: newPost.id,
            categoryId,
          }))
        );
    }

    return newPost;
  });
}

/**
 * Example 8: Aggregate query - Count posts by status
 */
export async function getPostCountByStatus() {
  return await db
    .select({
      status: blogPosts.status,
      count: sql<number>`count(*)::int`,
    })
    .from(blogPosts)
    .groupBy(blogPosts.status);
}

/**
 * Example 9: Get recent posts by author
 */
export async function getRecentPostsByAuthor(authorId: string, limit = 5) {
  return await db
    .select()
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.authorId, authorId),
        eq(blogPosts.status, 'published')
      )
    )
    .orderBy(desc(blogPosts.publishedAt))
    .limit(limit);
}

/**
 * Example 10: Soft delete (archive) a post
 */
export async function archivePost(postId: string) {
  const [archived] = await db
    .update(blogPosts)
    .set({
      status: 'archived',
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, postId))
    .returning();

  return archived;
}

/**
 * Type Safety Demonstration
 *
 * These examples will fail at compile time (not runtime):
 */

// ❌ TypeScript Error: Property 'statuss' does not exist
// const posts = await db.select().from(blogPosts).where(eq(blogPosts.statuss, 'published'));

// ❌ TypeScript Error: Type '"invalid-status"' is not assignable to parameter
// const posts = await db.select().from(blogPosts).where(eq(blogPosts.status, 'invalid-status'));

// ❌ TypeScript Error: Property 'nonExistentField' does not exist
// const newPost: NewBlogPost = { nonExistentField: 'value' };

// ✅ TypeScript Success: Full autocomplete and type checking
// const posts: BlogPost[] = await db.select().from(blogPosts).where(eq(blogPosts.status, 'published'));

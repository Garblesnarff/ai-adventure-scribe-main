/**
 * Blog CMS Schema
 *
 * Database tables for blog content management system.
 * Includes authors, categories, tags, and posts with many-to-many relationships.
 */
import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
/**
 * Blog Authors Table
 * Stores author profiles with optional user_id link to auth.users
 */
export const blogAuthors = pgTable('blog_authors', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id'), // References auth.users(id) but not enforced in Drizzle
    displayName: text('display_name').notNull(),
    slug: text('slug').notNull().unique(),
    shortBio: text('short_bio'),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    websiteUrl: text('website_url'),
    twitterHandle: text('twitter_handle'),
    linkedinUrl: text('linkedin_url'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
}, (table) => ({
    userIdIdx: index('idx_blog_authors_user_id').on(table.userId),
}));
/**
 * Blog Categories Table
 * Hierarchical grouping for blog posts with SEO metadata
 */
export const blogCategories = pgTable('blog_categories', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
});
/**
 * Blog Tags Table
 * Flexible tagging system for blog posts
 */
export const blogTags = pgTable('blog_tags', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
});
/**
 * Blog Posts Table
 * Main content table with workflow status and SEO fields
 */
export const blogPosts = pgTable('blog_posts', {
    id: uuid('id').primaryKey().defaultRandom(),
    authorId: uuid('author_id').notNull().references(() => blogAuthors.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    summary: text('summary'),
    content: text('content'),
    featuredImageUrl: text('featured_image_url'),
    heroImageAlt: text('hero_image_alt'),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    seoKeywords: text('seo_keywords').array().default([]).notNull(),
    canonicalUrl: text('canonical_url'),
    status: text('status', { enum: ['draft', 'review', 'scheduled', 'published', 'archived'] })
        .default('draft')
        .notNull(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true, mode: 'date' }),
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'date' }),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
}, (table) => ({
    authorIdIdx: index('idx_blog_posts_author_id').on(table.authorId),
    statusIdx: index('idx_blog_posts_status').on(table.status),
    publishedAtIdx: index('idx_blog_posts_published_at').on(table.publishedAt),
}));
/**
 * Blog Post Categories Join Table
 * Maps posts to categories (many-to-many)
 */
export const blogPostCategories = pgTable('blog_post_categories', {
    postId: uuid('post_id').notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').notNull().references(() => blogCategories.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true, mode: 'date' }).defaultNow(),
}, (table) => ({
    postIdIdx: index('idx_blog_post_categories_post_id').on(table.postId),
    categoryIdIdx: index('idx_blog_post_categories_category_id').on(table.categoryId),
}));
/**
 * Blog Post Tags Join Table
 * Maps posts to tags (many-to-many)
 */
export const blogPostTags = pgTable('blog_post_tags', {
    postId: uuid('post_id').notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id').notNull().references(() => blogTags.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true, mode: 'date' }).defaultNow(),
}, (table) => ({
    postIdIdx: index('idx_blog_post_tags_post_id').on(table.postId),
    tagIdIdx: index('idx_blog_post_tags_tag_id').on(table.tagId),
}));

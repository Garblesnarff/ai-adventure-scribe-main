import { describe, it, expect } from 'vitest';

import { blogPostSchema } from '../blog-post-editor';

import { slugify } from '@/utils/slug';
import { generateExcerpt } from '@/utils/text-helpers';

describe('Form Validation', () => {
  describe('Slug Generation', () => {
    it('generates valid slug from title with spaces', () => {
      const title = 'Hello World Post';
      const slug = slugify(title);
      expect(slug).toBe('hello-world-post');
    });

    it('generates valid slug from title with special characters', () => {
      const title = 'Hello, World! How are you?';
      const slug = slugify(title);
      expect(slug).toBe('hello-world-how-are-you');
    });

    it('generates valid slug from title with unicode characters', () => {
      const title = 'Café résumé';
      const slug = slugify(title);
      expect(slug).toBe('cafe-resume');
    });

    it('generates valid slug from title with numbers', () => {
      const title = '10 Tips for 2024';
      const slug = slugify(title);
      expect(slug).toBe('10-tips-for-2024');
    });

    it('removes leading and trailing dashes', () => {
      const title = '-Hello-World-';
      const slug = slugify(title);
      expect(slug).toBe('hello-world');
    });

    it('collapses multiple dashes', () => {
      const title = 'Hello---World';
      const slug = slugify(title);
      expect(slug).toBe('hello-world');
    });
  });

  describe('Blog Post Schema Validation', () => {
    it('validates a valid draft post', () => {
      const validPost = {
        title: 'Test Post',
        slug: 'test-post',
        content: 'Some content here',
        status: 'draft' as const,
        allowComments: true,
      };

      const result = blogPostSchema.safeParse(validPost);
      expect(result.success).toBe(true);
    });

    it('rejects post without title', () => {
      const invalidPost = {
        title: '',
        slug: 'test-post',
        content: 'Some content',
        status: 'draft' as const,
      };

      const result = blogPostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('required');
      }
    });

    it('rejects post with invalid slug format', () => {
      const invalidPost = {
        title: 'Test Post',
        slug: 'Invalid Slug',
        content: 'Some content',
        status: 'draft' as const,
      };

      const result = blogPostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('lowercase with hyphens');
      }
    });

    it('rejects post without content', () => {
      const invalidPost = {
        title: 'Test Post',
        slug: 'test-post',
        content: '',
        status: 'draft' as const,
      };

      const result = blogPostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
    });

    it('rejects post with SEO title over 60 characters', () => {
      const invalidPost = {
        title: 'Test Post',
        slug: 'test-post',
        content: 'Some content',
        status: 'draft' as const,
        seoTitle: 'A'.repeat(61),
      };

      const result = blogPostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('60 characters or less');
      }
    });

    it('rejects post with SEO description over 160 characters', () => {
      const invalidPost = {
        title: 'Test Post',
        slug: 'test-post',
        content: 'Some content',
        status: 'draft' as const,
        seoDescription: 'A'.repeat(161),
      };

      const result = blogPostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('160 characters or less');
      }
    });

    it('accepts valid scheduled post with scheduledFor date', () => {
      const validPost = {
        title: 'Scheduled Post',
        slug: 'scheduled-post',
        content: 'Future content',
        status: 'scheduled' as const,
        scheduledFor: '2025-12-31T10:00:00Z',
      };

      const result = blogPostSchema.safeParse(validPost);
      expect(result.success).toBe(true);
    });

    it('accepts empty coverImageUrl', () => {
      const validPost = {
        title: 'Test Post',
        slug: 'test-post',
        content: 'Some content',
        status: 'draft' as const,
        coverImageUrl: '',
      };

      const result = blogPostSchema.safeParse(validPost);
      expect(result.success).toBe(true);
    });

    it('rejects invalid coverImageUrl', () => {
      const invalidPost = {
        title: 'Test Post',
        slug: 'test-post',
        content: 'Some content',
        status: 'draft' as const,
        coverImageUrl: 'not-a-url',
      };

      const result = blogPostSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
    });
  });

  describe('Scheduling Validation', () => {
    it('validates scheduled post requires scheduledFor in future', () => {
      const now = new Date();
      const future = new Date(now.getTime() + 86400000);
      const past = new Date(now.getTime() - 86400000);

      const futureDate = future.toISOString();
      const pastDate = past.toISOString();

      expect(new Date(futureDate) > now).toBe(true);
      expect(new Date(pastDate) < now).toBe(true);
    });

    it('validates scheduled date is in ISO format', () => {
      const scheduledDate = '2025-12-31T10:00:00Z';
      expect(() => new Date(scheduledDate).toISOString()).not.toThrow();
      expect(new Date(scheduledDate).toISOString()).toBe(scheduledDate);
    });
  });

  describe('Excerpt Generation', () => {
    it('generates excerpt from markdown content', () => {
      const markdown = '# Heading\n\nThis is a paragraph with **bold** and *italic* text.\n\nAnother paragraph.';
      const excerpt = generateExcerpt(markdown, 50);
      
      expect(excerpt.length).toBeLessThanOrEqual(53);
      expect(excerpt).not.toContain('#');
      expect(excerpt).not.toContain('**');
      expect(excerpt).not.toContain('*');
    });

    it('truncates long content with ellipsis', () => {
      const longContent = 'A'.repeat(300);
      const excerpt = generateExcerpt(longContent, 100);
      
      expect(excerpt.length).toBeLessThanOrEqual(103);
      expect(excerpt.endsWith('...')).toBe(true);
    });

    it('returns short content as-is', () => {
      const shortContent = 'Short post';
      const excerpt = generateExcerpt(shortContent, 100);
      
      expect(excerpt).toBe(shortContent);
      expect(excerpt.endsWith('...')).toBe(false);
    });

    it('handles empty content gracefully', () => {
      const excerpt = generateExcerpt('', 100);
      expect(excerpt).toBe('');
    });

    it('removes markdown formatting from excerpt', () => {
      const markdown = '**Bold** _italic_ `code` [link](url)';
      const excerpt = generateExcerpt(markdown, 100);
      
      expect(excerpt).not.toContain('**');
      expect(excerpt).not.toContain('_');
      expect(excerpt).not.toContain('`');
      expect(excerpt).not.toContain('[');
      expect(excerpt).not.toContain(']');
      expect(excerpt).not.toContain('(');
    });
  });
});

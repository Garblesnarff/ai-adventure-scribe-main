import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import type { BlogPost } from '../src/services/blog-service.js';

const mockFetchPublishedBlogPosts = vi.fn<[], Promise<BlogPost[]>>();
const mockFetchBlogPostBySlug = vi.fn<[string], Promise<BlogPost | null>>();

vi.mock('../src/services/blog-service.js', () => ({
  fetchPublishedBlogPosts: mockFetchPublishedBlogPosts,
  fetchBlogPostBySlug: mockFetchBlogPostBySlug,
}));

const app = createApp();

const basePost: BlogPost = {
  id: '1',
  slug: 'infinite-realms-update',
  title: 'Infinite Realms Update',
  markdown: '# Infinite Realms',
  html: '<h1>Infinite Realms</h1><p>New adventures await.</p>',
  excerpt: 'New adventures await.',
  summary: 'New adventures await.',
  publishedAt: '2024-09-10T12:00:00.000Z',
  updatedAt: '2024-09-12T12:00:00.000Z',
  coverImageUrl: 'https://example.com/images/cover.jpg',
  coverImageAlt: 'Adventure scene',
  authorName: 'Aurora the Chronicler',
  tags: ['release', 'ai'],
  categories: ['Updates', 'Features'],
  readingTimeMinutes: 5,
  estimatedWordCount: 1000,
};

beforeEach(() => {
  process.env.SITE_URL = 'https://example.com';
  mockFetchPublishedBlogPosts.mockReset();
  mockFetchBlogPostBySlug.mockReset();
  mockFetchPublishedBlogPosts.mockResolvedValue([]);
  mockFetchBlogPostBySlug.mockResolvedValue(null);
});

describe('Blog SSR routes', () => {
  it('renders the blog index with SEO metadata', async () => {
    mockFetchPublishedBlogPosts.mockResolvedValueOnce([basePost]);

    const response = await request(app).get('/blog');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('<title>Infinite Realms Blog - Chronicles from the Infinite Realms</title>');
    expect(response.text).toContain('application/ld+json');
    expect(response.text).toContain('data-blog-posts');
    expect(response.text).toContain('Show more stories');
    expect(response.text).toContain('__BLOG_DATA__');
    expect(response.text).toContain('Cinzel');
  });

  it('renders an individual blog post with article metadata', async () => {
    mockFetchBlogPostBySlug.mockResolvedValueOnce(basePost);
    mockFetchPublishedBlogPosts.mockResolvedValueOnce([basePost]);

    const response = await request(app).get('/blog/infinite-realms-update');

    expect(response.status).toBe(200);
    expect(response.text).toContain('<title>Infinite Realms Update | Infinite Realms</title>');
    expect(response.text).toContain('article:published_time');
    expect(response.text).toContain('article:section');
    expect(response.text).toContain('SoftwareApplication');
    expect(response.text).toContain('Continue Your Quest');
  });

  it('returns a 404 when the post is missing', async () => {
    mockFetchBlogPostBySlug.mockResolvedValueOnce(null);
    mockFetchPublishedBlogPosts.mockResolvedValueOnce([]);

    const response = await request(app).get('/blog/not-here');

    expect(response.status).toBe(404);
  });
});

describe('SEO feeds', () => {
  it('generates a sitemap using published posts', async () => {
    mockFetchPublishedBlogPosts.mockResolvedValueOnce([basePost]);

    const response = await request(app).get('/sitemap.xml');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.text).toContain('<loc>https://example.com/blog/infinite-realms-update</loc>');
    expect(response.text).toContain('<loc>https://example.com/blog</loc>');
  });

  it('returns an RSS feed with encoded HTML content and categories', async () => {
    mockFetchPublishedBlogPosts.mockResolvedValueOnce([basePost]);

    const response = await request(app).get('/rss.xml');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/rss+xml');
    expect(response.text).toContain('<title>Infinite Realms Update</title>');
    expect(response.text).toContain('<content:encoded><![CDATA[<h1>Infinite Realms</h1>');
    expect(response.text).toContain('<category>Updates</category>');
    expect(response.text).toContain('<category>release</category>');
    expect(response.text).toContain('<language>en-us</language>');
  });

  it('exposes a robots.txt that references the sitemap', async () => {
    const response = await request(app).get('/robots.txt');

    expect(response.status).toBe(200);
    expect(response.text).toContain('User-agent: *');
    expect(response.text).toContain('Sitemap: https://example.com/sitemap.xml');
  });
});

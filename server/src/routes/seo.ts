import { Router } from 'express';
import { createRateLimiter } from '../middleware/rate-limit.js';
import { BlogService } from '../services/blog-service.js';
import { getSiteConfig } from '../config/site.js';

type BlogPosts = Awaited<ReturnType<typeof BlogService.fetchPublishedBlogPosts>>;

export function seoRouter() {
  const router = Router();

  router.get('/sitemap.xml', async (_req, res) => {
    try {
      const site = getSiteConfig();
      const posts = await BlogService.fetchPublishedBlogPosts();
      const urls = buildSitemap(site.url, posts);
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      res.send(urls);
    } catch (error) {
      console.error('Failed to generate sitemap', error);
      res.status(500).send('Unable to generate sitemap');
    }
  });

  router.get('/rss.xml', async (_req, res) => {
    try {
      const site = getSiteConfig();
      const posts = await BlogService.fetchPublishedBlogPosts();
      const rss = buildRssFeed(site.url, site.name, site.description, posts);
      res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=43200');
      res.send(rss);
    } catch (error) {
      console.error('Failed to generate RSS feed', error);
      res.status(500).send('Unable to generate RSS feed');
    }
  });

  router.get('/robots.txt', (_req, res) => {
    const site = getSiteConfig();
    const body = [`User-agent: *`, 'Allow: /', `Sitemap: ${site.url}/sitemap.xml`, `Host: ${site.url}`].join('\n');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.send(body);
  });

  return router;
}

function buildSitemap(siteUrl: string, posts: BlogPosts) {
  const urls: string[] = [];
  const baseEntries = ['/', '/blog', '/rss.xml'];
  baseEntries.forEach((path) => {
    urls.push(renderSitemapUrl(`${siteUrl}${path === '/' ? '' : path}`, undefined));
  });

  posts.forEach((post) => {
    urls.push(renderSitemapUrl(`${siteUrl}/blog/${post.slug}`, post.updatedAt ?? post.publishedAt));
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
}

function renderSitemapUrl(loc: string, lastMod?: string) {
  const lastmodTag = lastMod ? `<lastmod>${escapeXml(new Date(lastMod).toISOString())}</lastmod>` : '';
  return `<url><loc>${escapeXml(loc)}</loc>${lastmodTag}</url>`;
}

function buildRssFeed(siteUrl: string, siteName: string, siteDescription: string, posts: BlogPosts) {
  const items = posts.map((post) => {
    const link = `${siteUrl}/blog/${post.slug}`;
    const description = post.summary ?? post.excerpt ?? '';
    return `<item>
<title>${escapeXml(post.title)}</title>
<link>${escapeXml(link)}</link>
<guid>${escapeXml(link)}</guid>
<pubDate>${escapeXml(new Date(post.publishedAt).toUTCString())}</pubDate>
<description>${escapeCdata(description)}</description>
<content:encoded><![CDATA[${post.html}]]></content:encoded>
</item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)} Blog</title>
    <link>${escapeXml(`${siteUrl}/blog`)}</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>en-us</language>
    <generator>Infinite Realms SSR</generator>
    <atom:link href="${escapeXml(`${siteUrl}/rss.xml`)}" rel="self" type="application/rss+xml" />
    ${items.join('\n    ')}
  </channel>
</rss>`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeCdata(value: string) {
  return value.replace(/]]>/g, ']]]]><![CDATA[>');
}

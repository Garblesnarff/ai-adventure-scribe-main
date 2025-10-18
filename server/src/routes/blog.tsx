import { Router } from 'express';
import { fetchBlogPostBySlug, fetchPublishedBlogPosts } from '../services/blog-service.js';
import { getSiteConfig } from '../config/site.js';
import { resolveAssetsForEntries } from '../lib/manifest.js';
import { BlogIndexPage } from '../views/blog/index.js';
import { BlogPostPage } from '../views/blog/post.js';
import { streamReactResponse } from '../utils/react-stream.js';

export function blogRouter() {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const [posts, assets] = await Promise.all([
        fetchPublishedBlogPosts(),
        resolveAssetsForEntries(['index.html', 'src/main.tsx']),
      ]);
      const site = getSiteConfig();

      streamReactResponse(res, <BlogIndexPage site={site} assets={assets} posts={posts} />, {
        headers: createCacheHeaders({ maxAge: 120, staleWhileRevalidate: 600 }),
      });
    } catch (error) {
      console.error('Failed to render blog index', error);
      res.status(500).send('Failed to render blog index');
    }
  });

  router.get('/:slug', async (req, res) => {
    const { slug } = req.params;

    try {
      const [post, allPosts, assets] = await Promise.all([
        fetchBlogPostBySlug(slug),
        fetchPublishedBlogPosts(),
        resolveAssetsForEntries(['index.html', 'src/main.tsx']),
      ]);

      if (!post) {
        res.status(404).send('Post not found');
        return;
      }

      const site = getSiteConfig();
      const relatedPosts = allPosts.filter((candidate) => candidate.slug !== slug).slice(0, 6);

      streamReactResponse(res, <BlogPostPage site={site} assets={assets} post={post} relatedPosts={relatedPosts} />, {
        headers: createCacheHeaders({ maxAge: 300, staleWhileRevalidate: 900 }),
      });
    } catch (error) {
      console.error('Failed to render blog post', error);
      res.status(500).send('Failed to render blog post');
    }
  });

  return router;
}

function createCacheHeaders({ maxAge, staleWhileRevalidate }: { maxAge: number; staleWhileRevalidate: number }) {
  return {
    'Cache-Control': `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
  };
}

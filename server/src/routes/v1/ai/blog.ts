import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseService } from '../../../lib/supabase';
import { requireAiBlogAuth } from '../../../middleware/ai-blog-auth';

const aiBlogPostSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().optional(),
  coverImageUrl: z.string().url().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  authorAgent: z.string().min(1, 'authorAgent is required'),
  status: z.enum(['draft', 'published']).default('draft'),
  publishedAt: z.string().datetime().optional(),
});

export default function aiBlogRouter() {
  const router = Router();

  router.post('/create-post', requireAiBlogAuth, async (req: Request, res: Response) => {
    const parsed = aiBlogPostSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request payload',
        details: parsed.error.flatten(),
      });
    }

    const {
      title,
      slug,
      content,
      excerpt,
      coverImageUrl,
      seoTitle,
      seoDescription,
      categories = [],
      tags = [],
      authorAgent,
      status,
      publishedAt,
    } = parsed.data;

    try {
      // 1. Get AI Author ID
      const { data: author, error: authorError } = await supabaseService
        .from('blog_ai_authors')
        .select('id')
        .eq('agent_type', authorAgent)
        .single();

      if (authorError || !author) {
        return res.status(404).json({ error: 'AI author agent not found.' });
      }

      // 2. Create the blog post
      const { data: post, error: postError } = await supabaseService
        .from('blog_posts')
        .insert({
          title,
          slug,
          content,
          excerpt: excerpt || content.slice(0, 200),
          cover_image_url: coverImageUrl,
          seo_title: seoTitle || title,
          seo_description: seoDescription || excerpt,
          status,
          published_at: status === 'published' ? publishedAt || new Date().toISOString() : null,
          author_id: author.id,
        })
        .select('id, slug')
        .single();

      if (postError) {
        if (postError.code === '23505') { // unique constraint violation
          return res.status(409).json({ error: 'Slug already exists.' });
        }
        throw postError;
      }

      // 3. Handle categories and tags (simplified for now)
      // In a real implementation, you'd look up IDs or create new ones.
      // For this implementation, we'll assume they exist.

      const { data: dbCategories } = await supabaseService.from('blog_categories').select('id, name').in('name', categories);
      const { data: dbTags } = await supabaseService.from('blog_tags').select('id, name').in('name', tags);

      if(dbCategories && dbCategories.length > 0) {
          const postCategories = dbCategories.map(cat => ({ post_id: post.id, category_id: cat.id }));
          await supabaseService.from('blog_post_categories').insert(postCategories);
      }

      if(dbTags && dbTags.length > 0) {
          const postTags = dbTags.map(tag => ({ post_id: post.id, tag_id: tag.id }));
          await supabaseService.from('blog_post_tags').insert(postTags);
      }


      res.status(201).json({
        id: post.id,
        slug: post.slug,
        url: `/blog/${post.slug}`,
        status,
        message: 'Blog post created successfully.',
      });
    } catch (error) {
      console.error('Error creating AI blog post:', error);
      res.status(500).json({ error: 'Failed to create blog post.' });
    }
  });

  return router;
}

import { Request, Response, NextFunction } from 'express';
import { getBlogRole } from './blog-author.js';

declare global {
  namespace Express {
    interface Request {
      blogRole?: 'viewer' | 'author' | 'admin';
    }
  }
}

export async function requireBlogAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Development/testing override: allow bypassing Supabase role check
  const devOverrideEnabled = (process.env.BLOG_ADMIN_DEV_OVERRIDE === 'true' || process.env.BLOG_ADMIN_DEV_OVERRIDE === '1')
    && process.env.NODE_ENV !== 'production';
  if (devOverrideEnabled) {
    req.blogRole = 'admin';
    return next();
  }

  try {
    const role = await getBlogRole(userId);
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Blog admin access required' });
    }

    req.blogRole = role;
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify blog admin access' });
  }
}

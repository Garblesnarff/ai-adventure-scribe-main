import { Request, Response, NextFunction } from 'express';
import { supabaseService } from '../../../src/infrastructure/database/index.js';

declare global {
  namespace Express {
    interface Request {
      blogRole?: 'viewer' | 'author' | 'admin';
    }
  }
}

export type BlogRole = 'viewer' | 'author' | 'admin';

function normalizeRole(role: unknown): BlogRole | null {
  if (typeof role !== 'string') return null;
  const normalized = role.toLowerCase();
  if (normalized === 'admin' || normalized === 'author' || normalized === 'viewer') {
    return normalized;
  }
  return null;
}

export async function getBlogRole(userId: string): Promise<BlogRole> {
  try {
    const { data: profileData } = await supabaseService
      .from('user_profiles')
      .select('blog_role')
      .eq('user_id', userId)
      .maybeSingle();

    const profileRole = normalizeRole(profileData?.blog_role);
    if (profileRole) {
      return profileRole;
    }

    const { data: authorData } = await supabaseService
      .from('blog_authors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (authorData) {
      return 'author';
    }

    return 'viewer';
  } catch {
    return 'viewer';
  }
}

export async function requireBlogAuthor(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const role = await getBlogRole(userId);
    if (role === 'viewer') {
      return res.status(403).json({ error: 'Blog author or admin access required' });
    }

    req.blogRole = role;
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify blog author access' });
  }
}

export async function canManagePost(postId: string, userId: string): Promise<boolean> {
  try {
    const { data: result, error } = await supabaseService.rpc('can_manage_blog_post', {
      p_post_id: postId,
      p_user_id: userId,
    });
    if (error) {
      throw error;
    }
    return result === true;
  } catch {
    return false;
  }
}

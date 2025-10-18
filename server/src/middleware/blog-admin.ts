import { Request, Response, NextFunction } from 'express';
import { supabaseService } from '../lib/supabase.js';

declare global {
  namespace Express {
    interface Request {
      blogAdminRoles?: string[];
    }
  }
}

function extractBlogRoles(meta: Record<string, unknown> | null | undefined): string[] {
  if (!meta) return [];

  const roleLike = meta.blogRole ?? meta.blog_role ?? null;
  const rolesLike = meta.blogRoles ?? meta.blog_roles ?? null;
  const collected: string[] = [];

  if (typeof roleLike === 'string') {
    collected.push(roleLike.toLowerCase());
  }

  if (Array.isArray(rolesLike)) {
    for (const value of rolesLike) {
      if (typeof value === 'string') {
        collected.push(value.toLowerCase());
      }
    }
  } else if (typeof rolesLike === 'string') {
    collected.push(rolesLike.toLowerCase());
  }

  const booleanFlag = meta.blogAdmin ?? meta.blog_admin;
  if (booleanFlag === true) {
    collected.push('admin');
  }

  return Array.from(new Set(collected));
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
    req.blogAdminRoles = ['admin'];
    return next();
  }

  try {
    const { data, error } = await supabaseService.auth.admin.getUserById(userId);
    if (error || !data?.user) {
      return res.status(403).json({ error: 'Blog admin access required' });
    }

    const user = data.user as unknown as {
      id: string;
      app_metadata?: Record<string, unknown> | null;
      user_metadata?: Record<string, unknown> | null;
    };

    const roles = [
      ...extractBlogRoles(user.app_metadata),
      ...extractBlogRoles(user.user_metadata),
    ];

    const hasAdminRole = roles.some((role) => role === 'admin' || role === 'owner');
    if (!hasAdminRole) {
      return res.status(403).json({ error: 'Blog admin access required' });
    }

    req.blogAdminRoles = Array.from(new Set(roles));
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify blog admin access' });
  }
}

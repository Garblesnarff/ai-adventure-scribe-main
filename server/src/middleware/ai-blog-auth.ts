import { Request, Response, NextFunction } from 'express';
import { supabaseService } from '../lib/supabase';

export const requireAiBlogAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing API token.' });
  }

  try {
    const { data: author, error } = await supabaseService
      .from('blog_ai_authors')
      .select('id')
      .eq('api_token', token)
      .single();

    if (error || !author) {
      return res.status(403).json({ error: 'Forbidden: Invalid API token.' });
    }

    // You could attach the author to the request object if needed
    // (req as any).aiAuthor = author;

    next();
  } catch (error) {
    console.error('Error in AI blog auth middleware:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

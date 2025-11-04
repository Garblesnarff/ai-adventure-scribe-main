import { Request, Response, NextFunction } from 'express';

const ADMIN_PLANS = new Set(['enterprise', 'admin']);

function parseList(value: string | undefined) {
  return (value || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

const ADMIN_EMAILS = new Set(parseList(process.env.ADMIN_EMAILS));
const ADMIN_USER_IDS = new Set(parseList(process.env.ADMIN_USER_IDS));

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const plan = req.user?.plan?.toLowerCase();
  const email = req.user?.email?.toLowerCase();
  const userId = req.user?.userId?.toLowerCase();

  const allowedByPlan = plan ? ADMIN_PLANS.has(plan) : false;
  const allowedByEmail = email ? ADMIN_EMAILS.has(email) : false;
  const allowedById = userId ? ADMIN_USER_IDS.has(userId) : false;

  if (allowedByPlan || allowedByEmail || allowedById) {
    return next();
  }

  return res.status(403).json({ error: 'Admin access required' });
}

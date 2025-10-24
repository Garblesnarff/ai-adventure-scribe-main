import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

if (process.env.NODE_ENV === 'test') {
  delete process.env.DATABASE_URL;
  process.env.BLOG_ADMIN_DEV_OVERRIDE = process.env.BLOG_ADMIN_DEV_OVERRIDE ?? '1';
  process.env.STRIPE_WEBHOOK_SKIP_VERIFY = 'true';
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.GOOGLE_GEMINI_API_KEY;
}

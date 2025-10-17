import { Express } from 'express';
import authRouter from './v1/auth.js';
import campaignRouter from './v1/campaigns.js';
import characterRouter from './v1/characters.js';
import sessionRouter from './v1/sessions.js';
import aiRouter from './v1/ai.js';
import stripeRouter, { billingWebhookRouter } from './v1/billing.js';
import spellRouter from './v1/spells.js';
import personalityRouter from './v1/personality.js';
import llmRouter from './v1/llm.js';
import imagesRouter from './v1/images.js';
import blogRouter from './v1/blog.js';

export function registerRoutes(app: Express) {
  app.use('/v1/auth', authRouter());
  app.use('/v1/campaigns', campaignRouter());
  app.use('/v1/characters', characterRouter());
  app.use('/v1/sessions', sessionRouter());
  app.use('/v1/ai', aiRouter());
  app.use('/v1/llm', llmRouter());
  app.use('/v1/images', imagesRouter());
  app.use('/v1/billing', stripeRouter());
  app.use('/v1/billing', billingWebhookRouter());
  app.use('/v1/spells', spellRouter());
  app.use('/v1/personality', personalityRouter);
  app.use('/v1/blog', blogRouter());
}


import { Express } from 'express';
import { Pool } from 'pg';
import authRouter from './v1/auth';
import campaignRouter from './v1/campaigns';
import characterRouter from './v1/characters';
import sessionRouter from './v1/sessions';
import aiRouter from './v1/ai';
import stripeRouter, { billingWebhookRouter } from './v1/billing';

export function registerRoutes(app: Express, db: Pool) {
  app.use('/v1/auth', authRouter(db));
  app.use('/v1/campaigns', campaignRouter(db));
  app.use('/v1/characters', characterRouter(db));
  app.use('/v1/sessions', sessionRouter(db));
  app.use('/v1/ai', aiRouter(db));
  app.use('/v1/billing', stripeRouter(db));
  app.use('/v1/billing', billingWebhookRouter(db));
}


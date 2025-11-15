import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { specs } from '../docs/openapi-config.js';
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
import encountersRouter from './v1/encounters.js';
import blogRouter from './v1/blog.js';
import observabilityRouter from './v1/observability.js';
import adminRouter from './v1/admin.js';
import combatRouter from './v1/combat.js';
import restRouter from './v1/rest.js';
import inventoryRouter from './v1/inventory.js';
import spellSlotsRouter from './v1/spell-slots.js';
import progressionRouter from './v1/progression.js';
import classFeaturesRouter from './v1/class-features.js';
import { errorHandler } from '../middleware/error-handler.js';

export function registerRoutes(app: Express) {
  // API Documentation (Swagger UI)
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'AI Adventure Scribe API Docs',
    customfavIcon: '/favicon.ico',
  }));

  // Register all API routes
  app.use('/v1/auth', authRouter());
  app.use('/v1/campaigns', campaignRouter());
  app.use('/v1/characters', characterRouter());
  app.use('/v1/sessions', sessionRouter());
  app.use('/v1/ai', aiRouter());
  app.use('/v1/llm', llmRouter());
  app.use('/v1/images', imagesRouter());
  app.use('/v1/encounters', encountersRouter());
  app.use('/v1/blog', blogRouter());
  app.use('/v1/billing', stripeRouter());
  app.use('/v1/billing', billingWebhookRouter());
  app.use('/v1/spells', spellRouter());
  app.use('/v1/personality', personalityRouter);
  app.use('/v1/observability', observabilityRouter());
  app.use('/v1/admin', adminRouter());
  app.use('/v1/combat', combatRouter());
  app.use('/v1/rest', restRouter());
  app.use('/v1/characters', inventoryRouter());
  app.use('/v1', spellSlotsRouter());
  app.use('/v1/progression', progressionRouter());
  app.use('/v1', classFeaturesRouter());

  // Register error handler LAST - must be after all routes
  app.use(errorHandler);
}

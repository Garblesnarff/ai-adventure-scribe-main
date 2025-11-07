import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { db } from '../../../../db/client.js';
import { campaigns, Campaign } from '../../../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Transform campaign from camelCase (Drizzle) to snake_case (API response)
 */
function transformCampaignToResponse(campaign: Campaign) {
  return {
    id: campaign.id,
    user_id: campaign.userId,
    name: campaign.name,
    description: campaign.description,
    genre: campaign.genre,
    difficulty_level: campaign.difficultyLevel,
    campaign_length: campaign.campaignLength,
    tone: campaign.tone,
    era: campaign.era,
    location: campaign.location,
    atmosphere: campaign.atmosphere,
    setting_details: campaign.settingDetails,
    thematic_elements: campaign.thematicElements,
    status: campaign.status,
    background_image: campaign.backgroundImage,
    art_style: campaign.artStyle,
    style_config: campaign.styleConfig,
    rules_config: campaign.rulesConfig,
    created_at: campaign.createdAt,
    updated_at: campaign.updatedAt,
  };
}

export default function campaignRouter() {
  const router = Router();

  router.use(requireAuth);

  router.get('/', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    try {
      // Only select minimal fields needed for campaign list view
      // Excludes heavy JSONB fields (settingDetails, thematicElements, styleConfig, rulesConfig)
      const campaignList = await db
        .select({
          id: campaigns.id,
          name: campaigns.name,
          description: campaigns.description,
          genre: campaigns.genre,
          difficultyLevel: campaigns.difficultyLevel,
          campaignLength: campaigns.campaignLength,
          tone: campaigns.tone,
          status: campaigns.status,
          backgroundImage: campaigns.backgroundImage,
          artStyle: campaigns.artStyle,
          createdAt: campaigns.createdAt,
          updatedAt: campaigns.updatedAt,
        })
        .from(campaigns)
        .where(eq(campaigns.userId, userId))
        .orderBy(desc(campaigns.createdAt));

      // Transform to match Supabase response format (snake_case)
      const result = campaignList.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        genre: c.genre,
        difficulty_level: c.difficultyLevel,
        campaign_length: c.campaignLength,
        tone: c.tone,
        status: c.status,
        background_image: c.backgroundImage,
        art_style: c.artStyle,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      }));

      return res.json(result);
    } catch (e) {
      console.error('[CAMPAIGNS_LIST] Error:', e);
      return res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const {
      name,
      description,
      genre,
      difficulty_level,
      campaign_length,
      tone,
      setting,
      thematic_elements,
      status,
      background_image,
    } = req.body;
    try {
      const [campaign] = await db
        .insert(campaigns)
        .values({
          userId,
          name,
          description: description || null,
          genre: genre || null,
          difficultyLevel: difficulty_level || null,
          campaignLength: campaign_length || null,
          tone: tone || null,
          era: setting?.era || null,
          location: setting?.location || null,
          atmosphere: setting?.atmosphere || null,
          settingDetails: setting || null,
          thematicElements: thematic_elements || null,
          status: status || 'active',
          backgroundImage: background_image || null,
        })
        .returning();

      if (!campaign) {
        return res.status(500).json({ error: 'Failed to create campaign' });
      }

      return res.status(201).json(transformCampaignToResponse(campaign));
    } catch (e) {
      console.error('[CAMPAIGNS_CREATE] Error:', e);
      return res.status(500).json({ error: 'Failed to create campaign' });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    try {
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(and(
          eq(campaigns.id, id),
          eq(campaigns.userId, userId)
        ))
        .limit(1);

      if (!campaign) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.json(transformCampaignToResponse(campaign));
    } catch (e) {
      console.error('[CAMPAIGNS_GET] Error:', e);
      return res.status(500).json({ error: 'Failed to fetch campaign' });
    }
  });

  router.put('/:id', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params.id;
    const {
      name,
      description,
      genre,
      difficulty_level,
      campaign_length,
      tone,
      setting,
      thematic_elements,
      status,
      background_image,
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    try {
      const [campaign] = await db
        .update(campaigns)
        .set({
          name,
          description: description || null,
          genre: genre || null,
          difficultyLevel: difficulty_level || null,
          campaignLength: campaign_length || null,
          tone: tone || null,
          era: setting?.era || null,
          location: setting?.location || null,
          atmosphere: setting?.atmosphere || null,
          settingDetails: setting || null,
          thematicElements: thematic_elements || null,
          status: status || 'active',
          backgroundImage: background_image || null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(campaigns.id, id),
          eq(campaigns.userId, userId)
        ))
        .returning();

      if (!campaign) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.json(transformCampaignToResponse(campaign));
    } catch (e) {
      console.error('[CAMPAIGNS_UPDATE] Error:', e);
      return res.status(500).json({ error: 'Failed to update campaign' });
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    try {
      const [deletedCampaign] = await db
        .delete(campaigns)
        .where(and(
          eq(campaigns.id, id),
          eq(campaigns.userId, userId)
        ))
        .returning({ id: campaigns.id });

      if (!deletedCampaign) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.json({ ok: true });
    } catch (e) {
      console.error('[CAMPAIGNS_DELETE] Error:', e);
      return res.status(500).json({ error: 'Failed to delete campaign' });
    }
  });

  return router;
}


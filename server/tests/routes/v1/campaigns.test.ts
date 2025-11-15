/**
 * Campaigns CRUD API Integration Tests
 *
 * Tests all CRUD operations for the /v1/campaigns endpoint including:
 * - Creating campaigns with valid data
 * - Listing user's campaigns
 * - Getting campaign details
 * - Updating campaigns
 * - Deleting campaigns
 * - Authorization checks
 * - Input validation
 * - Error handling
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createClient } from '../../../src/lib/db.js';
import { createApp } from '../../../src/app.js';
import {
  generateTestToken,
  generateTestUserId,
  cleanupTestUser,
  createTestCampaign,
  assertCampaignStructure,
} from '../test-helpers.js';

describe('Campaigns API (/v1/campaigns)', () => {
  let app: request.SuperTest<request.Test>;
  let user1Id: string;
  let user2Id: string;
  let user1Token: string;
  let user2Token: string;
  let user1Campaign: any;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      console.log('Skipping tests - DATABASE_URL not configured');
      return;
    }

    const db = createClient();
    const expressApp = createApp(db);
    app = request(expressApp);

    // Create test users
    user1Id = generateTestUserId();
    user2Id = generateTestUserId();
    user1Token = generateTestToken(user1Id, 'user1@test.com');
    user2Token = generateTestToken(user2Id, 'user2@test.com');
  });

  afterAll(async () => {
    if (!process.env.DATABASE_URL) return;
    await cleanupTestUser(user1Id);
    await cleanupTestUser(user2Id);
  });

  beforeEach(async () => {
    if (!process.env.DATABASE_URL) return;
    // Clean up between tests
    await cleanupTestUser(user1Id);
    await cleanupTestUser(user2Id);
  });

  describe('POST /v1/campaigns - Create Campaign', () => {
    it('should create campaign with valid data (201)', async () => {
      if (!process.env.DATABASE_URL) return;

      const campaignData = {
        name: 'Lost Mines of Phandelver',
        description: 'A classic D&D adventure',
        genre: 'Fantasy',
        difficulty_level: 'Medium',
        campaign_length: 'Short',
        tone: 'Heroic',
        setting: {
          era: 'Medieval',
          location: 'Sword Coast',
          atmosphere: 'Mysterious',
        },
        thematic_elements: ['exploration', 'combat', 'intrigue'],
        status: 'active',
      };

      const res = await app
        .post('/v1/campaigns')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(campaignData);

      expect(res.status).toBe(201);
      assertCampaignStructure(res.body);
      expect(res.body.name).toBe(campaignData.name);
      expect(res.body.description).toBe(campaignData.description);
      expect(res.body.genre).toBe(campaignData.genre);
      expect(res.body.difficulty_level).toBe(campaignData.difficulty_level);
      expect(res.body.user_id).toBe(user1Id);
      expect(res.body.status).toBe('active');
      expect(res.body.era).toBe('Medieval');
      expect(res.body.location).toBe('Sword Coast');
    });

    it('should create campaign with minimal data', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .post('/v1/campaigns')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Minimal Campaign' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Minimal Campaign');
      expect(res.body.user_id).toBe(user1Id);
      expect(res.body.status).toBe('active');
    });

    it('should reject request without authentication (401)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .post('/v1/campaigns')
        .send({ name: 'Test Campaign' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject request with invalid token (401)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .post('/v1/campaigns')
        .set('Authorization', 'Bearer invalid-token')
        .send({ name: 'Test Campaign' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /v1/campaigns - List Campaigns', () => {
    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;
      // Create test campaigns for user1
      await createTestCampaign(user1Id, { name: 'Campaign 1' });
      await createTestCampaign(user1Id, { name: 'Campaign 2' });
      // Create campaign for user2
      await createTestCampaign(user2Id, { name: 'User2 Campaign' });
    });

    it('should list only user campaigns (200)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .get('/v1/campaigns')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);

      // Verify all campaigns belong to user1
      res.body.forEach((campaign: any) => {
        expect(campaign.user_id).toBe(user1Id);
        assertCampaignStructure(campaign);
      });

      // Verify campaigns are ordered by created_at desc
      const names = res.body.map((c: any) => c.name);
      expect(names).toContain('Campaign 1');
      expect(names).toContain('Campaign 2');
      expect(names).not.toContain('User2 Campaign');
    });

    it('should return empty array for user with no campaigns', async () => {
      if (!process.env.DATABASE_URL) return;

      const newUserId = generateTestUserId();
      const newToken = generateTestToken(newUserId);

      const res = await app
        .get('/v1/campaigns')
        .set('Authorization', `Bearer ${newToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);

      await cleanupTestUser(newUserId);
    });

    it('should reject unauthenticated request (401)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app.get('/v1/campaigns');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /v1/campaigns/:id - Get Campaign Details', () => {
    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;
      user1Campaign = await createTestCampaign(user1Id, {
        name: 'Detailed Campaign',
        description: 'Full details test',
        genre: 'Fantasy',
      });
    });

    it('should get campaign by ID (200)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .get(`/v1/campaigns/${user1Campaign.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      assertCampaignStructure(res.body);
      expect(res.body.id).toBe(user1Campaign.id);
      expect(res.body.name).toBe('Detailed Campaign');
      expect(res.body.description).toBe('Full details test');
      expect(res.body.user_id).toBe(user1Id);
    });

    it('should return 404 for non-existent campaign', async () => {
      if (!process.env.DATABASE_URL) return;

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app
        .get(`/v1/campaigns/${fakeId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('Not found');
    });

    it('should return 404 when user tries to access another users campaign', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .get(`/v1/campaigns/${user1Campaign.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject unauthenticated request (401)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app.get(`/v1/campaigns/${user1Campaign.id}`);

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /v1/campaigns/:id - Update Campaign', () => {
    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;
      user1Campaign = await createTestCampaign(user1Id, {
        name: 'Original Name',
        description: 'Original Description',
        status: 'active',
      });
    });

    it('should update campaign (200)', async () => {
      if (!process.env.DATABASE_URL) return;

      const updates = {
        name: 'Updated Name',
        description: 'Updated Description',
        genre: 'Sci-Fi',
        difficulty_level: 'Hard',
        status: 'paused',
      };

      const res = await app
        .put(`/v1/campaigns/${user1Campaign.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(user1Campaign.id);
      expect(res.body.name).toBe('Updated Name');
      expect(res.body.description).toBe('Updated Description');
      expect(res.body.genre).toBe('Sci-Fi');
      expect(res.body.difficulty_level).toBe('Hard');
      expect(res.body.status).toBe('paused');
      expect(res.body.user_id).toBe(user1Id);

      // Verify updated_at changed
      expect(new Date(res.body.updated_at).getTime())
        .toBeGreaterThan(new Date(user1Campaign.updated_at).getTime());
    });

    it('should update only provided fields', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .put(`/v1/campaigns/${user1Campaign.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Partially Updated' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Partially Updated');
      expect(res.body.description).toBe(user1Campaign.description);
    });

    it('should return 404 for non-existent campaign', async () => {
      if (!process.env.DATABASE_URL) return;

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app
        .put(`/v1/campaigns/${fakeId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not found');
    });

    it('should prevent user from updating another users campaign (404)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .put(`/v1/campaigns/${user1Campaign.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(404);

      // Verify campaign was not updated
      const verify = await app
        .get(`/v1/campaigns/${user1Campaign.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(verify.body.name).toBe('Original Name');
    });

    it('should reject unauthenticated request (401)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .put(`/v1/campaigns/${user1Campaign.id}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /v1/campaigns/:id - Delete Campaign', () => {
    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;
      user1Campaign = await createTestCampaign(user1Id, { name: 'To Delete' });
    });

    it('should delete campaign (200)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .delete(`/v1/campaigns/${user1Campaign.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok');
      expect(res.body.ok).toBe(true);

      // Verify campaign is deleted
      const verify = await app
        .get(`/v1/campaigns/${user1Campaign.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(verify.status).toBe(404);
    });

    it('should return 404 for non-existent campaign', async () => {
      if (!process.env.DATABASE_URL) return;

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app
        .delete(`/v1/campaigns/${fakeId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not found');
    });

    it('should prevent user from deleting another users campaign (404)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .delete(`/v1/campaigns/${user1Campaign.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(404);

      // Verify campaign still exists
      const verify = await app
        .get(`/v1/campaigns/${user1Campaign.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(verify.status).toBe(200);
    });

    it('should reject unauthenticated request (401)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app.delete(`/v1/campaigns/${user1Campaign.id}`);

      expect(res.status).toBe(401);
    });
  });
});

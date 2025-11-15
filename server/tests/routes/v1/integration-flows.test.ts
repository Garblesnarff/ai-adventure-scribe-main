/**
 * Integration Flows Tests
 *
 * Tests complex multi-resource workflows and interactions:
 * - Full flow: Create campaign → Create character → Start session → Complete session
 * - Cascade deletes: Delete campaign → verify sessions cleaned up
 * - Cross-resource validation: Can't create session with mismatched campaign/character
 * - Data consistency across operations
 * - Error handling in complex scenarios
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createClient } from '../../../src/lib/db.js';
import { createApp } from '../../../src/app.js';
import { supabaseService } from '../../../src/lib/supabase.js';
import {
  generateTestToken,
  generateTestUserId,
  cleanupTestUser,
  createTestCampaign,
  createTestCharacter,
} from '../test-helpers.js';

describe('Integration Flows', () => {
  let app: request.SuperTest<request.Test>;
  let userId: string;
  let userToken: string;
  let user2Id: string;
  let user2Token: string;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      console.log('Skipping tests - DATABASE_URL not configured');
      return;
    }

    const db = createClient();
    const expressApp = createApp(db);
    app = request(expressApp);

    userId = generateTestUserId();
    userToken = generateTestToken(userId, 'user@test.com');
    user2Id = generateTestUserId();
    user2Token = generateTestToken(user2Id, 'user2@test.com');
  });

  afterAll(async () => {
    if (!process.env.DATABASE_URL) return;
    await cleanupTestUser(userId);
    await cleanupTestUser(user2Id);
  });

  beforeEach(async () => {
    if (!process.env.DATABASE_URL) return;
    await cleanupTestUser(userId);
    await cleanupTestUser(user2Id);
  });

  describe('Complete Game Flow', () => {
    it('should complete full workflow: campaign → character → session → complete', async () => {
      if (!process.env.DATABASE_URL) return;

      // Step 1: Create campaign
      const campaignRes = await app
        .post('/v1/campaigns')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Epic Adventure',
          description: 'A legendary quest',
          genre: 'Fantasy',
          difficulty_level: 'Hard',
        });

      expect(campaignRes.status).toBe(201);
      const campaign = campaignRes.body;

      // Step 2: Create character for the campaign
      const characterRes = await app
        .post('/v1/characters')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Aragorn',
          race: 'Human',
          class: 'Ranger',
          level: 10,
          campaign_id: campaign.id,
        });

      expect(characterRes.status).toBe(201);
      const character = characterRes.body;
      expect(character.campaign_id).toBe(campaign.id);

      // Step 3: Start a game session
      const sessionRes = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          campaign_id: campaign.id,
          character_id: character.id,
          session_number: 1,
        });

      expect(sessionRes.status).toBe(201);
      const session = sessionRes.body;
      expect(session.status).toBe('active');
      expect(session.campaign_id).toBe(campaign.id);
      expect(session.character_id).toBe(character.id);

      // Step 4: Complete the session
      const completeRes = await app
        .post(`/v1/sessions/${session.id}/complete`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          summary: 'The party defeated the dragon and saved the village!',
        });

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.status).toBe('completed');
      expect(completeRes.body.summary).toBe('The party defeated the dragon and saved the village!');
      expect(completeRes.body.end_time).toBeDefined();

      // Step 5: Verify all resources exist and are linked correctly
      const campaignCheck = await app
        .get(`/v1/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(campaignCheck.status).toBe(200);

      const characterCheck = await app
        .get(`/v1/characters/${character.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(characterCheck.status).toBe(200);
      expect(characterCheck.body.campaign_id).toBe(campaign.id);

      const sessionCheck = await app
        .get(`/v1/sessions/${session.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(sessionCheck.status).toBe(200);
      expect(sessionCheck.body.status).toBe('completed');
    });

    it('should create multiple sessions for same campaign', async () => {
      if (!process.env.DATABASE_URL) return;

      const campaign = await createTestCampaign(userId, { name: 'Multi-Session Campaign' });
      const character = await createTestCharacter(userId, {
        name: 'Hero',
        race: 'Human',
        class: 'Fighter',
        campaign_id: campaign.id,
      });

      // Create session 1
      const session1Res = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          campaign_id: campaign.id,
          character_id: character.id,
          session_number: 1,
        });

      expect(session1Res.status).toBe(201);

      // Complete session 1
      await app
        .post(`/v1/sessions/${session1Res.body.id}/complete`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ summary: 'Session 1 complete' });

      // Create session 2
      const session2Res = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          campaign_id: campaign.id,
          character_id: character.id,
          session_number: 2,
        });

      expect(session2Res.status).toBe(201);
      expect(session2Res.body.session_number).toBe(2);

      // Verify both sessions exist
      const session1Check = await app
        .get(`/v1/sessions/${session1Res.body.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(session1Check.status).toBe(200);
      expect(session1Check.body.status).toBe('completed');

      const session2Check = await app
        .get(`/v1/sessions/${session2Res.body.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(session2Check.status).toBe(200);
      expect(session2Check.body.status).toBe('active');
    });
  });

  describe('Cascade Deletes and Data Integrity', () => {
    it('should handle character deletion when associated with sessions', async () => {
      if (!process.env.DATABASE_URL) return;

      const campaign = await createTestCampaign(userId, { name: 'Test Campaign' });
      const character = await createTestCharacter(userId, {
        name: 'Test Character',
        race: 'Human',
        class: 'Fighter',
      });

      // Create session with character
      const sessionRes = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          campaign_id: campaign.id,
          character_id: character.id,
          session_number: 1,
        });

      expect(sessionRes.status).toBe(201);
      const sessionId = sessionRes.body.id;

      // Delete character
      const deleteRes = await app
        .delete(`/v1/characters/${character.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(deleteRes.status).toBe(200);

      // Verify session still exists but character_id is null (due to ON DELETE SET NULL)
      const sessionCheck = await app
        .get(`/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(sessionCheck.status).toBe(200);
      expect(sessionCheck.body.character_id).toBeNull();
      expect(sessionCheck.body.campaign_id).toBe(campaign.id);
    });

    it('should cascade delete sessions when campaign is deleted', async () => {
      if (!process.env.DATABASE_URL) return;

      const campaign = await createTestCampaign(userId, { name: 'Test Campaign' });
      const character = await createTestCharacter(userId, {
        name: 'Test Character',
        race: 'Elf',
        class: 'Wizard',
      });

      // Create session
      const sessionRes = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          campaign_id: campaign.id,
          character_id: character.id,
          session_number: 1,
        });

      expect(sessionRes.status).toBe(201);
      const sessionId = sessionRes.body.id;

      // Delete campaign
      const deleteRes = await app
        .delete(`/v1/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(deleteRes.status).toBe(200);

      // Verify session is deleted (cascade delete)
      const { data: sessionCheck } = await supabaseService
        .from('game_sessions')
        .select('id')
        .eq('id', sessionId)
        .single();

      expect(sessionCheck).toBeNull();
    });

    it('should update campaign and verify linked resources remain intact', async () => {
      if (!process.env.DATABASE_URL) return;

      const campaign = await createTestCampaign(userId, { name: 'Original Name' });
      const character = await createTestCharacter(userId, {
        name: 'Character',
        race: 'Human',
        class: 'Fighter',
        campaign_id: campaign.id,
      });

      // Update campaign
      const updateRes = await app
        .put(`/v1/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name' });

      expect(updateRes.status).toBe(200);

      // Verify character still linked to campaign
      const characterCheck = await app
        .get(`/v1/characters/${character.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(characterCheck.status).toBe(200);
      expect(characterCheck.body.campaign_id).toBe(campaign.id);
    });
  });

  describe('Cross-Resource Validation', () => {
    it('should prevent creating session with character from different users campaign', async () => {
      if (!process.env.DATABASE_URL) return;

      const user1Campaign = await createTestCampaign(userId, { name: 'User1 Campaign' });
      const user2Character = await createTestCharacter(user2Id, {
        name: 'User2 Character',
        race: 'Elf',
        class: 'Wizard',
      });

      // User1 tries to create session with User2's character
      const res = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          campaign_id: user1Campaign.id,
          character_id: user2Character.id,
          session_number: 1,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Character');
    });

    it('should prevent creating session with campaign from different user', async () => {
      if (!process.env.DATABASE_URL) return;

      const user2Campaign = await createTestCampaign(user2Id, { name: 'User2 Campaign' });
      const user1Character = await createTestCharacter(userId, {
        name: 'User1 Character',
        race: 'Human',
        class: 'Fighter',
      });

      // User1 tries to create session with User2's campaign
      const res = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          campaign_id: user2Campaign.id,
          character_id: user1Character.id,
          session_number: 1,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Campaign');
    });

    it('should allow listing characters across campaigns', async () => {
      if (!process.env.DATABASE_URL) return;

      const campaign1 = await createTestCampaign(userId, { name: 'Campaign 1' });
      const campaign2 = await createTestCampaign(userId, { name: 'Campaign 2' });

      await createTestCharacter(userId, {
        name: 'Character 1',
        race: 'Human',
        class: 'Fighter',
        campaign_id: campaign1.id,
      });

      await createTestCharacter(userId, {
        name: 'Character 2',
        race: 'Elf',
        class: 'Wizard',
        campaign_id: campaign2.id,
      });

      await createTestCharacter(userId, {
        name: 'Character 3',
        race: 'Dwarf',
        class: 'Cleric',
        campaign_id: null,
      });

      const res = await app
        .get('/v1/characters')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(3);

      const char1 = res.body.find((c: any) => c.name === 'Character 1');
      const char2 = res.body.find((c: any) => c.name === 'Character 2');
      const char3 = res.body.find((c: any) => c.name === 'Character 3');

      expect(char1.campaign_id).toBe(campaign1.id);
      expect(char2.campaign_id).toBe(campaign2.id);
      expect(char3.campaign_id).toBeNull();
    });
  });

  describe('Character Leveling and Progression Flow', () => {
    it('should track character progression across multiple sessions', async () => {
      if (!process.env.DATABASE_URL) return;

      const campaign = await createTestCampaign(userId, { name: 'Progression Campaign' });

      // Create level 1 character
      const characterRes = await app
        .post('/v1/characters')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Hero',
          race: 'Human',
          class: 'Fighter',
          level: 1,
          experience_points: 0,
          campaign_id: campaign.id,
        });

      expect(characterRes.status).toBe(201);
      const characterId = characterRes.body.id;

      // Session 1: Complete and level up
      const session1 = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          campaign_id: campaign.id,
          character_id: characterId,
          session_number: 1,
        });

      await app
        .post(`/v1/sessions/${session1.body.id}/complete`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ summary: 'Completed first quest' });

      // Update character after session
      const updateRes1 = await app
        .put(`/v1/characters/${characterId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          level: 2,
          experience_points: 300,
        });

      expect(updateRes1.status).toBe(200);
      expect(updateRes1.body.level).toBe(2);
      expect(updateRes1.body.experience_points).toBe(300);

      // Session 2: Another level up
      const session2 = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          campaign_id: campaign.id,
          character_id: characterId,
          session_number: 2,
        });

      await app
        .post(`/v1/sessions/${session2.body.id}/complete`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ summary: 'Defeated boss' });

      const updateRes2 = await app
        .put(`/v1/characters/${characterId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          level: 3,
          experience_points: 900,
        });

      expect(updateRes2.status).toBe(200);
      expect(updateRes2.body.level).toBe(3);
      expect(updateRes2.body.experience_points).toBe(900);

      // Verify final state
      const finalCheck = await app
        .get(`/v1/characters/${characterId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(finalCheck.status).toBe(200);
      expect(finalCheck.body.level).toBe(3);
      expect(finalCheck.body.experience_points).toBe(900);
    });
  });

  describe('Multiple Users and Isolation', () => {
    it('should maintain complete isolation between users', async () => {
      if (!process.env.DATABASE_URL) return;

      // User 1 creates resources
      const user1Campaign = await createTestCampaign(userId, { name: 'User1 Campaign' });
      const user1Character = await createTestCharacter(userId, {
        name: 'User1 Character',
        race: 'Human',
        class: 'Fighter',
      });

      const user1SessionRes = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          campaign_id: user1Campaign.id,
          character_id: user1Character.id,
          session_number: 1,
        });

      expect(user1SessionRes.status).toBe(201);

      // User 2 creates resources
      const user2Campaign = await createTestCampaign(user2Id, { name: 'User2 Campaign' });
      const user2Character = await createTestCharacter(user2Id, {
        name: 'User2 Character',
        race: 'Elf',
        class: 'Wizard',
      });

      // User 1 should only see their own campaigns
      const user1Campaigns = await app
        .get('/v1/campaigns')
        .set('Authorization', `Bearer ${userToken}`);

      expect(user1Campaigns.body.length).toBe(1);
      expect(user1Campaigns.body[0].id).toBe(user1Campaign.id);

      // User 2 should only see their own campaigns
      const user2Campaigns = await app
        .get('/v1/campaigns')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(user2Campaigns.body.length).toBe(1);
      expect(user2Campaigns.body[0].id).toBe(user2Campaign.id);

      // User 1 should only see their own characters
      const user1Characters = await app
        .get('/v1/characters')
        .set('Authorization', `Bearer ${userToken}`);

      expect(user1Characters.body.length).toBe(1);
      expect(user1Characters.body[0].id).toBe(user1Character.id);

      // User 2 should only see their own characters
      const user2Characters = await app
        .get('/v1/characters')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(user2Characters.body.length).toBe(1);
      expect(user2Characters.body[0].id).toBe(user2Character.id);

      // User 2 cannot access User 1's resources
      const accessCampaign = await app
        .get(`/v1/campaigns/${user1Campaign.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(accessCampaign.status).toBe(404);

      const accessCharacter = await app
        .get(`/v1/characters/${user1Character.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(accessCharacter.status).toBe(404);

      const accessSession = await app
        .get(`/v1/sessions/${user1SessionRes.body.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(accessSession.status).toBe(403);
    });
  });

  describe('Error Recovery and Consistency', () => {
    it('should handle partial failures gracefully', async () => {
      if (!process.env.DATABASE_URL) return;

      const campaign = await createTestCampaign(userId, { name: 'Test Campaign' });

      // Create character successfully
      const characterRes = await app
        .post('/v1/characters')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Test Character',
          race: 'Human',
          class: 'Fighter',
          campaign_id: campaign.id,
        });

      expect(characterRes.status).toBe(201);

      // Try to create session with invalid campaign ID (should fail)
      const invalidSessionRes = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          campaign_id: '00000000-0000-0000-0000-000000000000',
          character_id: characterRes.body.id,
        });

      expect(invalidSessionRes.status).toBe(403);

      // Verify campaign and character still exist and are valid
      const campaignCheck = await app
        .get(`/v1/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(campaignCheck.status).toBe(200);

      const characterCheck = await app
        .get(`/v1/characters/${characterRes.body.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(characterCheck.status).toBe(200);
      expect(characterCheck.body.campaign_id).toBe(campaign.id);
    });
  });
});

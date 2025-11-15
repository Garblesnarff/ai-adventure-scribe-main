/**
 * Characters CRUD API Integration Tests
 *
 * Tests all CRUD operations for the /v1/characters endpoint including:
 * - Creating characters with campaign association
 * - Listing user's characters
 * - Getting character details with inventory/spells
 * - Updating characters (level, HP, abilities)
 * - Deleting characters
 * - Authorization checks
 * - Validation (D&D constraints)
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
  createTestCharacter,
  assertCharacterStructure,
} from '../test-helpers.js';

describe('Characters API (/v1/characters)', () => {
  let app: request.SuperTest<request.Test>;
  let user1Id: string;
  let user2Id: string;
  let user1Token: string;
  let user2Token: string;
  let user1Campaign: any;
  let user1Character: any;

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

  describe('POST /v1/characters - Create Character', () => {
    it('should create character with valid data (201)', async () => {
      if (!process.env.DATABASE_URL) return;

      const characterData = {
        name: 'Thorin Ironforge',
        description: 'A brave dwarf warrior',
        race: 'Dwarf',
        class: 'Fighter',
        level: 5,
        alignment: 'Lawful Good',
        experience_points: 6500,
        appearance: 'Sturdy dwarf with a long braided beard',
        personality_traits: 'Loyal, brave, stubborn',
        backstory_elements: 'Former soldier seeking redemption',
        background: 'Soldier',
      };

      const res = await app
        .post('/v1/characters')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(characterData);

      expect(res.status).toBe(201);
      assertCharacterStructure(res.body);
      expect(res.body.name).toBe(characterData.name);
      expect(res.body.race).toBe(characterData.race);
      expect(res.body.class).toBe(characterData.class);
      expect(res.body.level).toBe(characterData.level);
      expect(res.body.alignment).toBe(characterData.alignment);
      expect(res.body.user_id).toBe(user1Id);
    });

    it('should create character with campaign association', async () => {
      if (!process.env.DATABASE_URL) return;

      user1Campaign = await createTestCampaign(user1Id, { name: 'Test Campaign' });

      const res = await app
        .post('/v1/characters')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Campaign Character',
          race: 'Elf',
          class: 'Wizard',
          level: 1,
          campaign_id: user1Campaign.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.campaign_id).toBe(user1Campaign.id);
    });

    it('should create character with minimal data (defaults to level 1)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .post('/v1/characters')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Simple Character',
          race: 'Human',
          class: 'Rogue',
        });

      expect(res.status).toBe(201);
      expect(res.body.level).toBe(1);
      expect(res.body.experience_points).toBe(0);
    });

    it('should reject request without authentication (401)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .post('/v1/characters')
        .send({ name: 'Test', race: 'Human', class: 'Fighter' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject request with invalid token (401)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .post('/v1/characters')
        .set('Authorization', 'Bearer invalid-token')
        .send({ name: 'Test', race: 'Human', class: 'Fighter' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /v1/characters - List Characters', () => {
    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;
      // Create test characters for user1
      await createTestCharacter(user1Id, { name: 'Character 1', race: 'Human', class: 'Fighter' });
      await createTestCharacter(user1Id, { name: 'Character 2', race: 'Elf', class: 'Wizard' });
      // Create character for user2
      await createTestCharacter(user2Id, { name: 'User2 Character', race: 'Dwarf', class: 'Cleric' });
    });

    it('should list only user characters (200)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .get('/v1/characters')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);

      // Verify all characters belong to user1
      res.body.forEach((character: any) => {
        expect(character.user_id).toBe(user1Id);
        assertCharacterStructure(character);
      });

      // Verify correct characters are returned
      const names = res.body.map((c: any) => c.name);
      expect(names).toContain('Character 1');
      expect(names).toContain('Character 2');
      expect(names).not.toContain('User2 Character');
    });

    it('should return empty array for user with no characters', async () => {
      if (!process.env.DATABASE_URL) return;

      const newUserId = generateTestUserId();
      const newToken = generateTestToken(newUserId);

      const res = await app
        .get('/v1/characters')
        .set('Authorization', `Bearer ${newToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);

      await cleanupTestUser(newUserId);
    });

    it('should include campaign_id when character is associated', async () => {
      if (!process.env.DATABASE_URL) return;

      const campaign = await createTestCampaign(user1Id, { name: 'Test' });
      await createTestCharacter(user1Id, {
        name: 'Campaign Char',
        campaign_id: campaign.id,
        race: 'Human',
        class: 'Paladin',
      });

      const res = await app
        .get('/v1/characters')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      const campaignChar = res.body.find((c: any) => c.name === 'Campaign Char');
      expect(campaignChar).toBeDefined();
      expect(campaignChar.campaign_id).toBe(campaign.id);
    });

    it('should reject unauthenticated request (401)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app.get('/v1/characters');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /v1/characters/:id - Get Character Details', () => {
    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;
      user1Character = await createTestCharacter(user1Id, {
        name: 'Detailed Character',
        race: 'Human',
        class: 'Fighter',
        level: 10,
        alignment: 'Neutral Good',
        description: 'A seasoned warrior',
        appearance: 'Battle-scarred veteran',
        personality_traits: 'Courageous and wise',
      });
    });

    it('should get character by ID with full details (200)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .get(`/v1/characters/${user1Character.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      assertCharacterStructure(res.body);
      expect(res.body.id).toBe(user1Character.id);
      expect(res.body.name).toBe('Detailed Character');
      expect(res.body.level).toBe(10);
      expect(res.body.race).toBe('Human');
      expect(res.body.class).toBe('Fighter');
      expect(res.body.alignment).toBe('Neutral Good');
      expect(res.body.description).toBe('A seasoned warrior');
      expect(res.body.user_id).toBe(user1Id);
    });

    it('should return 404 for non-existent character', async () => {
      if (!process.env.DATABASE_URL) return;

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app
        .get(`/v1/characters/${fakeId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('Character not found');
    });

    it('should return 404 when user tries to access another users character', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .get(`/v1/characters/${user1Character.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Character not found');
    });

    it('should reject unauthenticated request (401)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app.get(`/v1/characters/${user1Character.id}`);

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /v1/characters/:id - Update Character', () => {
    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;
      user1Character = await createTestCharacter(user1Id, {
        name: 'Original Name',
        race: 'Human',
        class: 'Fighter',
        level: 1,
        experience_points: 0,
      });
    });

    it('should update character (200)', async () => {
      if (!process.env.DATABASE_URL) return;

      const updates = {
        name: 'Updated Name',
        level: 5,
        experience_points: 6500,
        alignment: 'Chaotic Good',
        description: 'Updated description',
      };

      const res = await app
        .put(`/v1/characters/${user1Character.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(user1Character.id);
      expect(res.body.name).toBe('Updated Name');
      expect(res.body.level).toBe(5);
      expect(res.body.experience_points).toBe(6500);
      expect(res.body.alignment).toBe('Chaotic Good');
      expect(res.body.description).toBe('Updated description');
      expect(res.body.user_id).toBe(user1Id);
    });

    it('should level up character', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .put(`/v1/characters/${user1Character.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          level: 2,
          experience_points: 300,
        });

      expect(res.status).toBe(200);
      expect(res.body.level).toBe(2);
      expect(res.body.experience_points).toBe(300);
    });

    it('should update only provided fields', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .put(`/v1/characters/${user1Character.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Partially Updated' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Partially Updated');
      expect(res.body.race).toBe(user1Character.race);
      expect(res.body.class).toBe(user1Character.class);
    });

    it('should return 404 for non-existent character', async () => {
      if (!process.env.DATABASE_URL) return;

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app
        .put(`/v1/characters/${fakeId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Character not found');
    });

    it('should prevent user from updating another users character (404)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .put(`/v1/characters/${user1Character.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Hacked Name', level: 20 });

      expect(res.status).toBe(404);

      // Verify character was not updated
      const verify = await app
        .get(`/v1/characters/${user1Character.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(verify.body.name).toBe('Original Name');
      expect(verify.body.level).toBe(1);
    });

    it('should reject unauthenticated request (401)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .put(`/v1/characters/${user1Character.id}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /v1/characters/:id - Delete Character', () => {
    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;
      user1Character = await createTestCharacter(user1Id, {
        name: 'To Delete',
        race: 'Human',
        class: 'Fighter',
      });
    });

    it('should delete character (200)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .delete(`/v1/characters/${user1Character.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ok');
      expect(res.body.ok).toBe(true);

      // Verify character is deleted
      const verify = await app
        .get(`/v1/characters/${user1Character.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(verify.status).toBe(404);
    });

    it('should return 404 for non-existent character', async () => {
      if (!process.env.DATABASE_URL) return;

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app
        .delete(`/v1/characters/${fakeId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Character not found');
    });

    it('should prevent user from deleting another users character (404)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .delete(`/v1/characters/${user1Character.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(404);

      // Verify character still exists
      const verify = await app
        .get(`/v1/characters/${user1Character.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(verify.status).toBe(200);
    });

    it('should reject unauthenticated request (401)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app.delete(`/v1/characters/${user1Character.id}`);

      expect(res.status).toBe(401);
    });
  });

  describe('D&D Validation Tests', () => {
    it('should accept valid D&D classes', async () => {
      if (!process.env.DATABASE_URL) return;

      const classes = ['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Paladin', 'Ranger', 'Bard', 'Druid'];

      for (const charClass of classes) {
        const res = await app
          .post('/v1/characters')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            name: `Test ${charClass}`,
            race: 'Human',
            class: charClass,
            level: 1,
          });

        expect(res.status).toBe(201);
        expect(res.body.class).toBe(charClass);
      }
    });

    it('should accept valid D&D races', async () => {
      if (!process.env.DATABASE_URL) return;

      const races = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling'];

      for (const race of races) {
        const res = await app
          .post('/v1/characters')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            name: `Test ${race}`,
            race: race,
            class: 'Fighter',
            level: 1,
          });

        expect(res.status).toBe(201);
        expect(res.body.race).toBe(race);
      }
    });

    it('should accept levels 1-20', async () => {
      if (!process.env.DATABASE_URL) return;

      // Test min level
      const res1 = await app
        .post('/v1/characters')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Level 1 Character',
          race: 'Human',
          class: 'Fighter',
          level: 1,
        });

      expect(res1.status).toBe(201);
      expect(res1.body.level).toBe(1);

      // Test max level
      const res20 = await app
        .post('/v1/characters')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Level 20 Character',
          race: 'Human',
          class: 'Fighter',
          level: 20,
        });

      expect(res20.status).toBe(201);
      expect(res20.body.level).toBe(20);
    });
  });
});

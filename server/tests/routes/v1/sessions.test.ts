/**
 * Sessions CRUD API Integration Tests
 *
 * Tests all CRUD operations for the /v1/sessions endpoint including:
 * - Creating sessions with valid campaign + character
 * - Rejecting sessions with unowned campaign (403)
 * - Rejecting sessions with unowned character (403)
 * - Getting session details
 * - Completing sessions (status update)
 * - Authorization checks
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
  createTestSession,
  assertSessionStructure,
} from '../test-helpers.js';

describe('Sessions API (/v1/sessions)', () => {
  let app: request.SuperTest<request.Test>;
  let user1Id: string;
  let user2Id: string;
  let user1Token: string;
  let user2Token: string;
  let user1Campaign: any;
  let user2Campaign: any;
  let user1Character: any;
  let user2Character: any;
  let user1Session: any;

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

    // Create test campaigns and characters
    user1Campaign = await createTestCampaign(user1Id, { name: 'User1 Campaign' });
    user2Campaign = await createTestCampaign(user2Id, { name: 'User2 Campaign' });
    user1Character = await createTestCharacter(user1Id, {
      name: 'User1 Character',
      race: 'Human',
      class: 'Fighter',
    });
    user2Character = await createTestCharacter(user2Id, {
      name: 'User2 Character',
      race: 'Elf',
      class: 'Wizard',
    });
  });

  describe('POST /v1/sessions - Create Session', () => {
    it('should create session with valid campaign and character (201)', async () => {
      if (!process.env.DATABASE_URL) return;

      const sessionData = {
        campaign_id: user1Campaign.id,
        character_id: user1Character.id,
        session_number: 1,
      };

      const res = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(sessionData);

      expect(res.status).toBe(201);
      assertSessionStructure(res.body);
      expect(res.body.campaign_id).toBe(user1Campaign.id);
      expect(res.body.character_id).toBe(user1Character.id);
      expect(res.body.session_number).toBe(1);
      expect(res.body.status).toBe('active');
      expect(res.body.start_time).toBeDefined();
    });

    it('should create session with only campaign', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          campaign_id: user1Campaign.id,
          session_number: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.campaign_id).toBe(user1Campaign.id);
      expect(res.body.character_id).toBeNull();
    });

    it('should create session with only character', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          character_id: user1Character.id,
          session_number: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.character_id).toBe(user1Character.id);
      expect(res.body.campaign_id).toBeNull();
    });

    it('should reject session with unowned campaign (403)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          campaign_id: user2Campaign.id,
          character_id: user1Character.id,
          session_number: 1,
        });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('Campaign');
    });

    it('should reject session with unowned character (403)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          campaign_id: user1Campaign.id,
          character_id: user2Character.id,
          session_number: 1,
        });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('Character');
    });

    it('should reject session with both unowned campaign and character (403)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          campaign_id: user2Campaign.id,
          character_id: user2Character.id,
          session_number: 1,
        });

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });

    it('should default to session_number 1 when not provided', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          campaign_id: user1Campaign.id,
          character_id: user1Character.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.session_number).toBe(1);
    });

    it('should reject request without authentication (401)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .post('/v1/sessions')
        .send({
          campaign_id: user1Campaign.id,
          character_id: user1Character.id,
        });

      expect(res.status).toBe(401);
    });

    it('should reject session with non-existent campaign (403)', async () => {
      if (!process.env.DATABASE_URL) return;

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          campaign_id: fakeId,
          character_id: user1Character.id,
        });

      expect(res.status).toBe(403);
    });

    it('should reject session with non-existent character (403)', async () => {
      if (!process.env.DATABASE_URL) return;

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app
        .post('/v1/sessions')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          campaign_id: user1Campaign.id,
          character_id: fakeId,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /v1/sessions/:id - Get Session Details', () => {
    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;
      user1Session = await createTestSession(user1Campaign.id, user1Character.id, {
        session_number: 1,
        status: 'active',
      });
    });

    it('should get session details (200)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .get(`/v1/sessions/${user1Session.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      assertSessionStructure(res.body);
      expect(res.body.id).toBe(user1Session.id);
      expect(res.body.campaign_id).toBe(user1Campaign.id);
      expect(res.body.character_id).toBe(user1Character.id);
      expect(res.body.status).toBe('active');
      expect(res.body.session_number).toBe(1);
    });

    it('should return 404 for non-existent session', async () => {
      if (!process.env.DATABASE_URL) return;

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app
        .get(`/v1/sessions/${fakeId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('Not found');
    });

    it('should return 403 when user tries to access another users session', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .get(`/v1/sessions/${user1Session.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Access denied');
    });

    it('should allow access via campaign ownership', async () => {
      if (!process.env.DATABASE_URL) return;

      // Create session with only campaign
      const session = await createTestSession(user1Campaign.id, null as any, {
        session_number: 2,
      });

      const res = await app
        .get(`/v1/sessions/${session.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(session.id);
    });

    it('should allow access via character ownership', async () => {
      if (!process.env.DATABASE_URL) return;

      // Create session with only character
      const session = await createTestSession(null as any, user1Character.id, {
        session_number: 2,
      });

      const res = await app
        .get(`/v1/sessions/${session.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(session.id);
    });

    it('should reject unauthenticated request (401)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app.get(`/v1/sessions/${user1Session.id}`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /v1/sessions/:id/complete - Complete Session', () => {
    beforeEach(async () => {
      if (!process.env.DATABASE_URL) return;
      user1Session = await createTestSession(user1Campaign.id, user1Character.id, {
        session_number: 1,
        status: 'active',
      });
    });

    it('should complete session with status update (200)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .post(`/v1/sessions/${user1Session.id}/complete`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ summary: 'Epic battle with dragons!' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.end_time).toBeDefined();
      expect(res.body.summary).toBe('Epic battle with dragons!');

      // Verify end_time is after start_time
      expect(new Date(res.body.end_time).getTime())
        .toBeGreaterThan(new Date(res.body.start_time).getTime());
    });

    it('should complete session without summary', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .post(`/v1/sessions/${user1Session.id}/complete`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.end_time).toBeDefined();
    });

    it('should return 404 for non-existent session', async () => {
      if (!process.env.DATABASE_URL) return;

      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await app
        .post(`/v1/sessions/${fakeId}/complete`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not found');
    });

    it('should return 403 when user tries to complete another users session', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .post(`/v1/sessions/${user1Session.id}/complete`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ summary: 'Hacked summary' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Access denied');

      // Verify session status not changed
      const verify = await app
        .get(`/v1/sessions/${user1Session.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(verify.body.status).toBe('active');
    });

    it('should reject unauthenticated request (401)', async () => {
      if (!process.env.DATABASE_URL) return;

      const res = await app
        .post(`/v1/sessions/${user1Session.id}/complete`)
        .send({});

      expect(res.status).toBe(401);
    });

    it('should allow completing already completed session', async () => {
      if (!process.env.DATABASE_URL) return;

      // Complete once
      await app
        .post(`/v1/sessions/${user1Session.id}/complete`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ summary: 'First completion' });

      // Complete again with different summary
      const res = await app
        .post(`/v1/sessions/${user1Session.id}/complete`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ summary: 'Updated completion' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.summary).toBe('Updated completion');
    });
  });

  describe('Session Authorization Edge Cases', () => {
    it('should verify ownership through campaign when character is null', async () => {
      if (!process.env.DATABASE_URL) return;

      const session = await createTestSession(user1Campaign.id, null as any, {
        session_number: 1,
      });

      // User1 should access via campaign
      const res1 = await app
        .get(`/v1/sessions/${session.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res1.status).toBe(200);

      // User2 should be denied
      const res2 = await app
        .get(`/v1/sessions/${session.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res2.status).toBe(403);
    });

    it('should verify ownership through character when campaign is null', async () => {
      if (!process.env.DATABASE_URL) return;

      const session = await createTestSession(null as any, user1Character.id, {
        session_number: 1,
      });

      // User1 should access via character
      const res1 = await app
        .get(`/v1/sessions/${session.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res1.status).toBe(200);

      // User2 should be denied
      const res2 = await app
        .get(`/v1/sessions/${session.id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res2.status).toBe(403);
    });

    it('should verify ownership when both campaign and character belong to user', async () => {
      if (!process.env.DATABASE_URL) return;

      const session = await createTestSession(user1Campaign.id, user1Character.id, {
        session_number: 1,
      });

      const res = await app
        .get(`/v1/sessions/${session.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.campaign_id).toBe(user1Campaign.id);
      expect(res.body.character_id).toBe(user1Character.id);
    });
  });
});

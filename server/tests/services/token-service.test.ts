/**
 * Token Service Tests
 *
 * Tests for Foundry VTT token management operations including:
 * - Creating tokens with valid data
 * - Retrieving token details
 * - Updating token properties
 * - Moving tokens (position updates)
 * - Deleting tokens
 * - Listing tokens for a scene
 * - Linking tokens to characters
 * - Authorization checks
 * - Broadcast callbacks for WebSocket updates
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenService } from '../../src/services/token-service.js';
import {
  createTestCampaign,
  createTestScene,
  createTestCharacter,
  createTestToken,
  cleanupFoundryTestData,
  TEST_USER_ID,
  TEST_USER_ID_2,
} from '../factories/foundry-factories.js';
import { db } from '../../../db/client.js';
import { tokens, characterTokens } from '../../../db/schema/index.js';
import { eq } from 'drizzle-orm';

describe('TokenService', () => {
  let testCampaign: any;
  let testCampaign2: any;
  let testScene: any;
  let testScene2: any;
  let testCharacter: any;

  beforeEach(async () => {
    if (!process.env.DATABASE_URL) return;
    await cleanupFoundryTestData();

    testCampaign = await createTestCampaign(TEST_USER_ID, { name: 'Test Campaign 1' });
    testCampaign2 = await createTestCampaign(TEST_USER_ID_2, { name: 'Test Campaign 2' });
    testScene = await createTestScene(TEST_USER_ID, testCampaign.id, { name: 'Test Scene 1' });
    testScene2 = await createTestScene(TEST_USER_ID_2, testCampaign2.id, { name: 'Test Scene 2' });
    testCharacter = await createTestCharacter(TEST_USER_ID, testCampaign.id, { name: 'Test Character' });
  });

  afterEach(async () => {
    if (!process.env.DATABASE_URL) return;
    await cleanupFoundryTestData();
  });

  describe('createToken', () => {
    it('should create token with valid data', async () => {
      if (!process.env.DATABASE_URL) return;

      const tokenData = {
        sceneId: testScene.id,
        name: 'Fighter Token',
        tokenType: 'character',
        positionX: 10,
        positionY: 15,
        imageUrl: 'https://example.com/token.png',
        sizeWidth: 1,
        sizeHeight: 1,
        gridSize: 'medium',
        visionEnabled: true,
        visionRange: 60,
        emitsLight: false,
      };

      const token = await TokenService.createToken(testScene.id, TEST_USER_ID, tokenData);

      expect(token).toBeDefined();
      expect(token.id).toBeDefined();
      expect(token.name).toBe('Fighter Token');
      expect(token.tokenType).toBe('character');
      expect(token.positionX).toBe('10.00');
      expect(token.positionY).toBe('15.00');
      expect(token.sceneId).toBe(testScene.id);
      expect(token.createdBy).toBe(TEST_USER_ID);
      expect(token.visionEnabled).toBe(true);
      expect(token.visionRange).toBe('60.00');
      expect(token.gridSize).toBe('medium');
    });

    it('should create token with minimal data using defaults', async () => {
      if (!process.env.DATABASE_URL) return;

      const tokenData = {
        sceneId: testScene.id,
        name: 'Minimal Token',
        tokenType: 'npc',
        positionX: 0,
        positionY: 0,
      };

      const token = await TokenService.createToken(testScene.id, TEST_USER_ID, tokenData);

      expect(token).toBeDefined();
      expect(token.name).toBe('Minimal Token');
      expect(token.sizeWidth).toBe('1.0');
      expect(token.sizeHeight).toBe('1.0');
      expect(token.gridSize).toBe('medium');
      expect(token.visionEnabled).toBe(false);
      expect(token.emitsLight).toBe(false);
    });

    it('should link token to character when actorId is provided', async () => {
      if (!process.env.DATABASE_URL) return;

      const tokenData = {
        sceneId: testScene.id,
        actorId: testCharacter.id,
        name: 'Character Token',
        tokenType: 'character',
        positionX: 5,
        positionY: 5,
      };

      const token = await TokenService.createToken(testScene.id, TEST_USER_ID, tokenData);

      expect(token.actorId).toBe(testCharacter.id);

      // Verify character-token link was created
      const link = await db.query.characterTokens.findFirst({
        where: eq(characterTokens.tokenId, token.id),
      });

      expect(link).toBeDefined();
      expect(link?.characterId).toBe(testCharacter.id);
    });

    it('should throw error if scene not found', async () => {
      if (!process.env.DATABASE_URL) return;

      const tokenData = {
        sceneId: '00000000-0000-0000-0000-000000000000',
        name: 'Invalid Token',
        tokenType: 'character',
        positionX: 0,
        positionY: 0,
      };

      await expect(
        TokenService.createToken('00000000-0000-0000-0000-000000000000', TEST_USER_ID, tokenData)
      ).rejects.toThrow();
    });

    it('should throw error if user does not have access to scene', async () => {
      if (!process.env.DATABASE_URL) return;

      const tokenData = {
        sceneId: testScene2.id, // owned by TEST_USER_ID_2
        name: 'Unauthorized Token',
        tokenType: 'character',
        positionX: 0,
        positionY: 0,
      };

      await expect(
        TokenService.createToken(testScene2.id, TEST_USER_ID, tokenData)
      ).rejects.toThrow();
    });
  });

  describe('getTokenById', () => {
    it('should return token details', async () => {
      if (!process.env.DATABASE_URL) return;

      const createdToken = await createTestToken(testScene.id, TEST_USER_ID, {
        name: 'Retrievable Token',
        positionX: '10',
        positionY: '20',
      });

      const token = await TokenService.getTokenById(createdToken.id, TEST_USER_ID);

      expect(token).toBeDefined();
      expect(token?.id).toBe(createdToken.id);
      expect(token?.name).toBe('Retrievable Token');
      expect(token?.positionX).toBe('10');
      expect(token?.positionY).toBe('20');
    });

    it('should return null for non-existent token', async () => {
      if (!process.env.DATABASE_URL) return;

      const token = await TokenService.getTokenById('00000000-0000-0000-0000-000000000000', TEST_USER_ID);

      expect(token).toBeNull();
    });

    it('should throw error when user tries to access token in another users scene', async () => {
      if (!process.env.DATABASE_URL) return;

      const token = await createTestToken(testScene.id, TEST_USER_ID, {
        name: 'User 1 Token',
      });

      await expect(TokenService.getTokenById(token.id, TEST_USER_ID_2)).rejects.toThrow();
    });
  });

  describe('updateToken', () => {
    it('should update token properties', async () => {
      if (!process.env.DATABASE_URL) return;

      const token = await createTestToken(testScene.id, TEST_USER_ID, {
        name: 'Original Name',
        positionX: '0',
        positionY: '0',
      });

      const updated = await TokenService.updateToken(token.id, TEST_USER_ID, {
        name: 'Updated Name',
        positionX: '5.50',
        positionY: '7.25',
        visionEnabled: true,
        visionRange: '30',
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.positionX).toBe('5.50');
      expect(updated?.positionY).toBe('7.25');
      expect(updated?.visionEnabled).toBe(true);
      expect(updated?.visionRange).toBe('30');
    });

    it('should call broadcast callback when provided', async () => {
      if (!process.env.DATABASE_URL) return;

      const token = await createTestToken(testScene.id, TEST_USER_ID, {
        name: 'Broadcast Token',
      });

      const broadcastMock = vi.fn();

      await TokenService.updateToken(
        token.id,
        TEST_USER_ID,
        { name: 'Updated via Broadcast' },
        broadcastMock
      );

      expect(broadcastMock).toHaveBeenCalledTimes(1);
      expect(broadcastMock).toHaveBeenCalledWith(testScene.id, expect.objectContaining({
        id: token.id,
        name: 'Updated via Broadcast',
      }));
    });

    it('should return null if token not found', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await TokenService.updateToken(
        '00000000-0000-0000-0000-000000000000',
        TEST_USER_ID,
        { name: 'Updated' }
      );

      expect(result).toBeNull();
    });

    it('should throw error if user does not have access to scene', async () => {
      if (!process.env.DATABASE_URL) return;

      const token = await createTestToken(testScene.id, TEST_USER_ID, {
        name: 'User 1 Token',
      });

      await expect(
        TokenService.updateToken(token.id, TEST_USER_ID_2, { name: 'Hacked' })
      ).rejects.toThrow();
    });
  });

  describe('moveToken', () => {
    it('should update token position', async () => {
      if (!process.env.DATABASE_URL) return;

      const token = await createTestToken(testScene.id, TEST_USER_ID, {
        name: 'Movable Token',
        positionX: '0',
        positionY: '0',
      });

      const moved = await TokenService.moveToken(token.id, TEST_USER_ID, 15.5, 22.75);

      expect(moved).toBeDefined();
      expect(moved?.positionX).toBe('15.50');
      expect(moved?.positionY).toBe('22.75');
    });

    it('should call broadcast callback when provided', async () => {
      if (!process.env.DATABASE_URL) return;

      const token = await createTestToken(testScene.id, TEST_USER_ID, {
        name: 'Moving Token',
        positionX: '0',
        positionY: '0',
      });

      const broadcastMock = vi.fn();

      await TokenService.moveToken(token.id, TEST_USER_ID, 10, 20, broadcastMock);

      expect(broadcastMock).toHaveBeenCalledTimes(1);
      expect(broadcastMock).toHaveBeenCalledWith(testScene.id, expect.objectContaining({
        id: token.id,
        positionX: '10.00',
        positionY: '20.00',
      }));
    });
  });

  describe('deleteToken', () => {
    it('should delete token', async () => {
      if (!process.env.DATABASE_URL) return;

      const token = await createTestToken(testScene.id, TEST_USER_ID, {
        name: 'Token to Delete',
      });

      const result = await TokenService.deleteToken(token.id, TEST_USER_ID);

      expect(result).toBe(true);

      // Verify token is deleted
      const deletedToken = await db.query.tokens.findFirst({
        where: eq(tokens.id, token.id),
      });
      expect(deletedToken).toBeUndefined();
    });

    it('should return false if token not found', async () => {
      if (!process.env.DATABASE_URL) return;

      const result = await TokenService.deleteToken('00000000-0000-0000-0000-000000000000', TEST_USER_ID);

      expect(result).toBe(false);
    });

    it('should throw error if user does not have access to scene', async () => {
      if (!process.env.DATABASE_URL) return;

      const token = await createTestToken(testScene.id, TEST_USER_ID, {
        name: 'User 1 Token',
      });

      await expect(TokenService.deleteToken(token.id, TEST_USER_ID_2)).rejects.toThrow();
    });
  });

  describe('listTokensForScene', () => {
    it('should return all tokens in a scene', async () => {
      if (!process.env.DATABASE_URL) return;

      await createTestToken(testScene.id, TEST_USER_ID, { name: 'Token 1' });
      await createTestToken(testScene.id, TEST_USER_ID, { name: 'Token 2' });
      await createTestToken(testScene.id, TEST_USER_ID, { name: 'Token 3' });

      const tokenList = await TokenService.listTokensForScene(testScene.id, TEST_USER_ID);

      expect(tokenList.length).toBe(3);
      expect(tokenList.every((t) => t.sceneId === testScene.id)).toBe(true);

      const names = tokenList.map((t) => t.name);
      expect(names).toContain('Token 1');
      expect(names).toContain('Token 2');
      expect(names).toContain('Token 3');
    });

    it('should return empty array for scene with no tokens', async () => {
      if (!process.env.DATABASE_URL) return;

      const tokenList = await TokenService.listTokensForScene(testScene.id, TEST_USER_ID);

      expect(tokenList.length).toBe(0);
    });

    it('should throw error if user does not have access to scene', async () => {
      if (!process.env.DATABASE_URL) return;

      await expect(
        TokenService.listTokensForScene(testScene2.id, TEST_USER_ID)
      ).rejects.toThrow();
    });
  });

  describe('linkTokenToCharacter', () => {
    it('should link token to character', async () => {
      if (!process.env.DATABASE_URL) return;

      const token = await createTestToken(testScene.id, TEST_USER_ID, {
        name: 'Unlinkable Token',
        actorId: null,
      });

      const result = await TokenService.linkToCharacter(token.id, testCharacter.id, TEST_USER_ID);

      expect(result).toBe(true);

      // Verify token's actorId is updated
      const updatedToken = await db.query.tokens.findFirst({
        where: eq(tokens.id, token.id),
      });
      expect(updatedToken?.actorId).toBe(testCharacter.id);

      // Verify character-token link was created
      const link = await db.query.characterTokens.findFirst({
        where: eq(characterTokens.tokenId, token.id),
      });
      expect(link).toBeDefined();
      expect(link?.characterId).toBe(testCharacter.id);
    });

    it('should throw error if token not found', async () => {
      if (!process.env.DATABASE_URL) return;

      await expect(
        TokenService.linkToCharacter('00000000-0000-0000-0000-000000000000', testCharacter.id, TEST_USER_ID)
      ).rejects.toThrow();
    });

    it('should throw error if character not found', async () => {
      if (!process.env.DATABASE_URL) return;

      const token = await createTestToken(testScene.id, TEST_USER_ID, {
        name: 'Token',
      });

      await expect(
        TokenService.linkToCharacter(token.id, '00000000-0000-0000-0000-000000000000', TEST_USER_ID)
      ).rejects.toThrow();
    });

    it('should throw error if user does not own character', async () => {
      if (!process.env.DATABASE_URL) return;

      const token = await createTestToken(testScene.id, TEST_USER_ID, {
        name: 'Token',
      });

      const character2 = await createTestCharacter(TEST_USER_ID_2, testCampaign2.id, {
        name: 'User 2 Character',
      });

      await expect(
        TokenService.linkToCharacter(token.id, character2.id, TEST_USER_ID)
      ).rejects.toThrow();
    });
  });

  describe('authorization', () => {
    it('should prevent users from modifying other users tokens', async () => {
      if (!process.env.DATABASE_URL) return;

      const token = await createTestToken(testScene.id, TEST_USER_ID, {
        name: 'User 1 Token',
        positionX: '0',
        positionY: '0',
      });

      // User 2 should not be able to get User 1's token
      await expect(TokenService.getTokenById(token.id, TEST_USER_ID_2)).rejects.toThrow();

      // User 2 should not be able to update User 1's token
      await expect(
        TokenService.updateToken(token.id, TEST_USER_ID_2, { name: 'Hacked' })
      ).rejects.toThrow();

      // User 2 should not be able to move User 1's token
      await expect(
        TokenService.moveToken(token.id, TEST_USER_ID_2, 10, 10)
      ).rejects.toThrow();

      // User 2 should not be able to delete User 1's token
      await expect(TokenService.deleteToken(token.id, TEST_USER_ID_2)).rejects.toThrow();

      // Verify token still exists and is unchanged
      const verifyToken = await TokenService.getTokenById(token.id, TEST_USER_ID);
      expect(verifyToken?.name).toBe('User 1 Token');
      expect(verifyToken?.positionX).toBe('0');
      expect(verifyToken?.positionY).toBe('0');
    });
  });

  describe('broadcast callback', () => {
    it('should call onBroadcast when updating token', async () => {
      if (!process.env.DATABASE_URL) return;

      const token = await createTestToken(testScene.id, TEST_USER_ID, {
        name: 'Broadcast Test Token',
      });

      const broadcastMock = vi.fn();

      await TokenService.updateToken(
        token.id,
        TEST_USER_ID,
        { name: 'Updated Name' },
        broadcastMock
      );

      expect(broadcastMock).toHaveBeenCalledTimes(1);
      expect(broadcastMock.mock.calls[0][0]).toBe(testScene.id);
      expect(broadcastMock.mock.calls[0][1]).toMatchObject({
        id: token.id,
        name: 'Updated Name',
      });
    });

    it('should call onBroadcast when moving token', async () => {
      if (!process.env.DATABASE_URL) return;

      const token = await createTestToken(testScene.id, TEST_USER_ID, {
        name: 'Move Broadcast Token',
        positionX: '0',
        positionY: '0',
      });

      const broadcastMock = vi.fn();

      await TokenService.moveToken(token.id, TEST_USER_ID, 25, 30, broadcastMock);

      expect(broadcastMock).toHaveBeenCalledTimes(1);
      expect(broadcastMock.mock.calls[0][0]).toBe(testScene.id);
      expect(broadcastMock.mock.calls[0][1]).toMatchObject({
        id: token.id,
        positionX: '25.00',
        positionY: '30.00',
      });
    });

    it('should not throw if broadcast callback is not provided', async () => {
      if (!process.env.DATABASE_URL) return;

      const token = await createTestToken(testScene.id, TEST_USER_ID, {
        name: 'No Broadcast Token',
      });

      await expect(
        TokenService.updateToken(token.id, TEST_USER_ID, { name: 'Updated' })
      ).resolves.toBeDefined();

      await expect(
        TokenService.moveToken(token.id, TEST_USER_ID, 10, 10)
      ).resolves.toBeDefined();
    });
  });

  describe('updateVision', () => {
    it('should update token vision configuration', async () => {
      if (!process.env.DATABASE_URL) return;

      const token = await createTestToken(testScene.id, TEST_USER_ID, {
        name: 'Vision Token',
      });

      const updated = await TokenService.updateVision(token.id, TEST_USER_ID, {
        visionEnabled: true,
        visionRange: 60,
        visionAngle: 360,
        nightVision: true,
        darkvisionRange: 60,
      });

      expect(updated).toBeDefined();
      expect(updated?.visionEnabled).toBe(true);
      expect(updated?.visionRange).toBe('60.00');
      expect(updated?.visionAngle).toBe('360.00');
      expect(updated?.nightVision).toBe(true);
      expect(updated?.darkvisionRange).toBe('60.00');
    });
  });

  describe('updateLight', () => {
    it('should update token light configuration', async () => {
      if (!process.env.DATABASE_URL) return;

      const token = await createTestToken(testScene.id, TEST_USER_ID, {
        name: 'Light Token',
      });

      const updated = await TokenService.updateLight(token.id, TEST_USER_ID, {
        emitsLight: true,
        lightRange: 30,
        lightAngle: 360,
        lightColor: '#ffaa00',
        lightIntensity: 0.8,
        dimLightRange: 20,
        brightLightRange: 30,
      });

      expect(updated).toBeDefined();
      expect(updated?.emitsLight).toBe(true);
      expect(updated?.lightRange).toBe('30.00');
      expect(updated?.lightAngle).toBe('360.00');
      expect(updated?.lightColor).toBe('#ffaa00');
      expect(updated?.lightIntensity).toBe('0.80');
      expect(updated?.dimLightRange).toBe('20.00');
      expect(updated?.brightLightRange).toBe('30.00');
    });
  });
});

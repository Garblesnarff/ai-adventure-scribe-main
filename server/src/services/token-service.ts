/**
 * Token Service
 *
 * Handles token management operations using Drizzle ORM.
 * Provides type-safe database queries for token CRUD, character linking,
 * vision/light configuration, and authorization checks.
 *
 * @module server/services/token-service
 */

import { db } from '../../../db/client.js';
import {
  tokens,
  tokenConfigurations,
  characterTokens,
  scenes,
  campaigns,
  characters,
  type Token,
  type NewToken,
  type TokenConfiguration,
  type NewTokenConfiguration,
} from '../../../db/schema/index.js';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

/**
 * Token creation data interface
 */
export interface CreateTokenData {
  sceneId: string;
  actorId?: string; // character ID
  name: string;
  tokenType: string;
  positionX: number;
  positionY: number;
  imageUrl?: string;
  sizeWidth?: number;
  sizeHeight?: number;
  gridSize?: string;
  visionEnabled?: boolean;
  visionRange?: number;
  emitsLight?: boolean;
  lightRange?: number;
  lightColor?: string;
}

/**
 * Token vision configuration interface
 */
export interface TokenVisionConfig {
  visionEnabled?: boolean;
  visionRange?: number;
  visionAngle?: number;
  nightVision?: boolean;
  darkvisionRange?: number;
}

/**
 * Token light configuration interface
 */
export interface TokenLightConfig {
  emitsLight?: boolean;
  lightRange?: number;
  lightAngle?: number;
  lightColor?: string;
  lightIntensity?: number;
  dimLightRange?: number;
  brightLightRange?: number;
}

export class TokenService {
  /**
   * Verify user has access to a scene (through campaign ownership)
   */
  private static async verifySceneAccess(sceneId: string, userId: string): Promise<boolean> {
    const scene = await db.query.scenes.findFirst({
      where: eq(scenes.id, sceneId),
      with: {
        campaign: true,
      },
    });

    if (!scene) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Scene not found' });
    }

    // User must own the campaign
    if (scene.campaign.userId !== userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied to this scene' });
    }

    return true;
  }

  /**
   * Verify user owns a character
   */
  private static async verifyCharacterOwnership(characterId: string, userId: string): Promise<boolean> {
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, characterId),
    });

    if (!character) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Character not found' });
    }

    if (character.userId !== userId && character.ownerId !== userId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied to this character' });
    }

    return true;
  }

  /**
   * List all tokens for a scene
   */
  static async listTokensForScene(sceneId: string, userId: string): Promise<Token[]> {
    // Verify scene access
    await this.verifySceneAccess(sceneId, userId);

    const sceneTokens = await db.query.tokens.findMany({
      where: eq(tokens.sceneId, sceneId),
      orderBy: [desc(tokens.createdAt)],
    });

    return sceneTokens;
  }

  /**
   * Get a single token by ID with full configuration
   */
  static async getTokenById(tokenId: string, userId: string): Promise<Token | null> {
    const token = await db.query.tokens.findFirst({
      where: eq(tokens.id, tokenId),
    });

    if (!token) return null;

    // Verify scene access
    await this.verifySceneAccess(token.sceneId, userId);

    return token;
  }

  /**
   * Create a new token
   */
  static async createToken(
    sceneId: string,
    userId: string,
    data: CreateTokenData
  ): Promise<Token> {
    // Verify scene access
    await this.verifySceneAccess(sceneId, userId);

    // If actorId is provided, verify character ownership
    if (data.actorId) {
      await this.verifyCharacterOwnership(data.actorId, userId);
    }

    // Create token
    const [token] = await db
      .insert(tokens)
      .values({
        sceneId: data.sceneId,
        actorId: data.actorId || null,
        createdBy: userId,
        name: data.name,
        tokenType: data.tokenType,
        positionX: String(data.positionX),
        positionY: String(data.positionY),
        imageUrl: data.imageUrl || null,
        sizeWidth: data.sizeWidth ? String(data.sizeWidth) : '1.0',
        sizeHeight: data.sizeHeight ? String(data.sizeHeight) : '1.0',
        gridSize: data.gridSize || 'medium',
        visionEnabled: data.visionEnabled || false,
        visionRange: data.visionRange ? String(data.visionRange) : null,
        emitsLight: data.emitsLight || false,
        lightRange: data.lightRange ? String(data.lightRange) : null,
        lightColor: data.lightColor || null,
      })
      .returning();

    if (!token) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create token' });
    }

    // If actorId is provided, create character-token link
    if (data.actorId) {
      await db.insert(characterTokens).values({
        characterId: data.actorId,
        tokenId: token.id,
      });
    }

    return token;
  }

  /**
   * Update an existing token
   */
  static async updateToken(
    tokenId: string,
    userId: string,
    updates: Partial<NewToken>,
    onBroadcast?: (sceneId: string, token: Token) => void
  ): Promise<Token | null> {
    // Get existing token
    const existingToken = await this.getTokenById(tokenId, userId);
    if (!existingToken) return null;

    // Update token
    const [updated] = await db
      .update(tokens)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(tokens.id, tokenId))
      .returning();

    // Broadcast update via WebSocket if callback provided
    if (updated && onBroadcast) {
      onBroadcast(updated.sceneId, updated);
    }

    return updated || null;
  }

  /**
   * Delete a token
   */
  static async deleteToken(tokenId: string, userId: string): Promise<boolean> {
    // Get existing token to verify access
    const existingToken = await this.getTokenById(tokenId, userId);
    if (!existingToken) return false;

    const result = await db
      .delete(tokens)
      .where(eq(tokens.id, tokenId))
      .returning({ id: tokens.id });

    return result.length > 0;
  }

  /**
   * Move a token (update position)
   */
  static async moveToken(
    tokenId: string,
    userId: string,
    newX: number,
    newY: number,
    onBroadcast?: (sceneId: string, token: Token) => void
  ): Promise<Token | null> {
    return this.updateToken(tokenId, userId, {
      positionX: String(newX),
      positionY: String(newY),
    }, onBroadcast);
  }

  /**
   * Link a token to a character
   */
  static async linkToCharacter(
    tokenId: string,
    characterId: string,
    userId: string
  ): Promise<boolean> {
    // Verify token access
    const token = await this.getTokenById(tokenId, userId);
    if (!token) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Token not found' });
    }

    // Verify character ownership
    await this.verifyCharacterOwnership(characterId, userId);

    // Update token's actorId
    await db.update(tokens).set({ actorId: characterId }).where(eq(tokens.id, tokenId));

    // Create or update character-token link
    try {
      await db.insert(characterTokens).values({
        characterId,
        tokenId,
      });
    } catch {
      // Link may already exist, that's ok
    }

    return true;
  }

  /**
   * Unlink a token from a character
   */
  static async unlinkFromCharacter(
    tokenId: string,
    characterId: string,
    userId: string
  ): Promise<boolean> {
    // Verify token access
    const token = await this.getTokenById(tokenId, userId);
    if (!token) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Token not found' });
    }

    // Verify character ownership
    await this.verifyCharacterOwnership(characterId, userId);

    // Remove character-token link
    await db
      .delete(characterTokens)
      .where(
        and(eq(characterTokens.characterId, characterId), eq(characterTokens.tokenId, tokenId))
      );

    // Clear actorId if it matches
    if (token.actorId === characterId) {
      await db.update(tokens).set({ actorId: null }).where(eq(tokens.id, tokenId));
    }

    return true;
  }

  /**
   * Get all tokens for a character
   */
  static async getTokensForCharacter(characterId: string, userId: string): Promise<Token[]> {
    // Verify character ownership
    await this.verifyCharacterOwnership(characterId, userId);

    // Get all token IDs linked to this character
    const links = await db.query.characterTokens.findMany({
      where: eq(characterTokens.characterId, characterId),
    });

    if (links.length === 0) return [];

    const tokenIds = links.map((link: any) => link.tokenId);

    // Get all tokens
    const characterTokensList = await db.query.tokens.findMany({
      where: inArray(tokens.id, tokenIds),
    });

    return characterTokensList;
  }

  /**
   * Update token vision configuration
   */
  static async updateVision(
    tokenId: string,
    userId: string,
    visionConfig: TokenVisionConfig
  ): Promise<Token | null> {
    const updates: Partial<NewToken> = {};

    if (visionConfig.visionEnabled !== undefined) {
      updates.visionEnabled = visionConfig.visionEnabled;
    }
    if (visionConfig.visionRange !== undefined) {
      updates.visionRange = String(visionConfig.visionRange);
    }
    if (visionConfig.visionAngle !== undefined) {
      updates.visionAngle = String(visionConfig.visionAngle);
    }
    if (visionConfig.nightVision !== undefined) {
      updates.nightVision = visionConfig.nightVision;
    }
    if (visionConfig.darkvisionRange !== undefined) {
      updates.darkvisionRange = String(visionConfig.darkvisionRange);
    }

    return this.updateToken(tokenId, userId, updates);
  }

  /**
   * Update token light configuration
   */
  static async updateLight(
    tokenId: string,
    userId: string,
    lightConfig: TokenLightConfig
  ): Promise<Token | null> {
    const updates: Partial<NewToken> = {};

    if (lightConfig.emitsLight !== undefined) {
      updates.emitsLight = lightConfig.emitsLight;
    }
    if (lightConfig.lightRange !== undefined) {
      updates.lightRange = String(lightConfig.lightRange);
    }
    if (lightConfig.lightAngle !== undefined) {
      updates.lightAngle = String(lightConfig.lightAngle);
    }
    if (lightConfig.lightColor !== undefined) {
      updates.lightColor = lightConfig.lightColor;
    }
    if (lightConfig.lightIntensity !== undefined) {
      updates.lightIntensity = String(lightConfig.lightIntensity);
    }
    if (lightConfig.dimLightRange !== undefined) {
      updates.dimLightRange = String(lightConfig.dimLightRange);
    }
    if (lightConfig.brightLightRange !== undefined) {
      updates.brightLightRange = String(lightConfig.brightLightRange);
    }

    return this.updateToken(tokenId, userId, updates);
  }

  /**
   * Get default token configuration for a character
   */
  static async getDefaultTokenConfig(characterId: string): Promise<TokenConfiguration | null> {
    const config = await db.query.tokenConfigurations.findFirst({
      where: eq(tokenConfigurations.characterId, characterId),
    });

    return config || null;
  }

  /**
   * Update default token configuration for a character
   */
  static async updateDefaultTokenConfig(
    characterId: string,
    userId: string,
    config: Partial<NewTokenConfiguration>
  ): Promise<TokenConfiguration> {
    // Verify character ownership
    await this.verifyCharacterOwnership(characterId, userId);

    // Check if config exists
    const existing = await this.getDefaultTokenConfig(characterId);

    if (existing) {
      // Update existing config
      const [updated] = await db
        .update(tokenConfigurations)
        .set({
          ...config,
          updatedAt: new Date(),
        })
        .where(eq(tokenConfigurations.id, existing.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update token configuration',
        });
      }

      return updated;
    } else {
      // Create new config
      const [created] = await db
        .insert(tokenConfigurations)
        .values({
          characterId,
          ...config,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create token configuration',
        });
      }

      return created;
    }
  }

  /**
   * Apply default configuration to a token
   */
  static async applyDefaultConfig(tokenId: string, userId: string): Promise<Token | null> {
    // Get token
    const token = await this.getTokenById(tokenId, userId);
    if (!token) return null;

    // Get linked character
    if (!token.actorId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Token is not linked to a character',
      });
    }

    // Get default config
    const config = await this.getDefaultTokenConfig(token.actorId);
    if (!config) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No default token configuration found for this character',
      });
    }

    // Apply config to token
    return this.updateToken(tokenId, userId, {
      imageUrl: config.imageUrl,
      avatarUrl: config.avatarUrl,
      sizeWidth: config.sizeWidth ?? undefined,
      sizeHeight: config.sizeHeight ?? undefined,
      gridSize: config.gridSize ?? undefined,
      tintColor: config.tintColor,
      scale: config.scale,
      opacity: config.opacity,
      borderColor: config.borderColor,
      borderWidth: config.borderWidth,
      showNameplate: config.showNameplate,
      nameplatePosition: config.nameplatePosition,
      visionEnabled: config.visionEnabled,
      visionRange: config.visionRange,
      visionAngle: config.visionAngle,
      nightVision: config.nightVision,
      darkvisionRange: config.darkvisionRange,
      emitsLight: config.emitsLight,
      lightRange: config.lightRange,
      lightAngle: config.lightAngle,
      lightColor: config.lightColor,
      lightIntensity: config.lightIntensity,
      dimLightRange: config.dimLightRange,
      brightLightRange: config.brightLightRange,
      movementSpeed: config.movementSpeed,
      hasFlying: config.hasFlying,
      hasSwimming: config.hasSwimming,
    });
  }
}

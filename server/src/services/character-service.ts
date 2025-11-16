/**
 * Character Service
 *
 * Handles complex character management operations using Drizzle ORM.
 * Provides type-safe database queries for character creation, updates,
 * and retrieval with proper authorization checks.
 *
 * @module server/services/character-service
 */

import { db } from '../../../db/client.js';
import {
  characters,
  characterStats,
  campaigns,
  characterPermissions,
  type Character,
  type NewCharacter,
  type CharacterPermission,
  type NewCharacterPermission,
  type PermissionLevel
} from '../../../db/schema/index.js';
import { eq, and, desc, or } from 'drizzle-orm';
import { InternalServerError } from '../lib/errors.js';
import { TRPCError } from '@trpc/server';

export class CharacterService {
  /**
   * List all characters for a user
   */
  static async listForUser(userId: string): Promise<Character[]> {
    const chars = await db.query.characters.findMany({
      where: eq(characters.userId, userId),
      orderBy: [desc(characters.createdAt)],
      columns: {
        id: true,
        name: true,
        race: true,
        class: true,
        level: true,
        imageUrl: true,
        avatarUrl: true,
        campaignId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return chars as Character[];
  }

  /**
   * Get a single character by ID with authorization check
   */
  static async getById(characterId: string, userId: string): Promise<Character | null> {
    const character = await db.query.characters.findFirst({
      where: and(
        eq(characters.id, characterId),
        eq(characters.userId, userId)
      ),
      with: {
        stats: true,
      },
    });

    return character || null;
  }

  /**
   * Get character with campaign details
   */
  static async getWithCampaign(characterId: string, userId: string) {
    const character = await db.query.characters.findFirst({
      where: and(
        eq(characters.id, characterId),
        eq(characters.userId, userId)
      ),
      with: {
        campaign: {
          columns: {
            id: true,
            name: true,
            description: true,
            backgroundImage: true,
          },
        },
        stats: true,
      },
    });

    return character || null;
  }

  /**
   * Create a new character
   */
  static async create(userId: string, data: Partial<NewCharacter>): Promise<Character> {
    const [character] = await db
      .insert(characters)
      .values({
        userId,
        name: data.name || 'Unnamed Character',
        description: data.description || null,
        race: data.race || null,
        class: data.class || null,
        level: data.level || 1,
        alignment: data.alignment || null,
        experiencePoints: data.experiencePoints || 0,
        imageUrl: data.imageUrl || null,
        appearance: data.appearance || null,
        personalityTraits: data.personalityTraits || null,
        backstoryElements: data.backstoryElements || null,
        background: data.background || null,
      })
      .returning();

    if (!character) throw new InternalServerError('Failed to create character');
    return character;
  }

  /**
   * Update an existing character
   */
  static async update(
    characterId: string,
    userId: string,
    data: Partial<NewCharacter>
  ): Promise<Character | null> {
    const [updated] = await db
      .update(characters)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(characters.id, characterId),
        eq(characters.userId, userId)
      ))
      .returning();

    return updated || null;
  }

  /**
   * Delete a character
   */
  static async delete(characterId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(characters)
      .where(and(
        eq(characters.id, characterId),
        eq(characters.userId, userId)
      ))
      .returning({ id: characters.id });

    return result.length > 0;
  }

  /**
   * Update character spells (comma-separated text fields)
   */
  static async updateSpells(
    characterId: string,
    userId: string,
    spellData: {
      cantrips?: string[];
      knownSpells?: string[];
      preparedSpells?: string[];
      ritualSpells?: string[];
    }
  ): Promise<Character | null> {
    const updates: Partial<NewCharacter> = {};

    if (spellData.cantrips !== undefined) {
      updates.cantrips = spellData.cantrips.join(',');
    }
    if (spellData.knownSpells !== undefined) {
      updates.knownSpells = spellData.knownSpells.join(',');
    }
    if (spellData.preparedSpells !== undefined) {
      updates.preparedSpells = spellData.preparedSpells.join(',');
    }
    if (spellData.ritualSpells !== undefined) {
      updates.ritualSpells = spellData.ritualSpells.join(',');
    }

    return this.update(characterId, userId, updates);
  }

  /**
   * Parse comma-separated spell string to array
   */
  static parseSpells(spellString: string | null): string[] {
    if (!spellString || spellString.trim() === '') return [];
    return spellString.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * Check if user has permission to access character
   */
  static async checkPermission(
    characterId: string,
    userId: string,
    requiredLevel?: 'viewer' | 'editor' | 'owner'
  ): Promise<{ hasAccess: boolean; permission?: CharacterPermission; isOwner: boolean }> {
    // Check if user is the owner
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, characterId),
      columns: { userId: true, ownerId: true },
    });

    if (!character) {
      return { hasAccess: false, isOwner: false };
    }

    const isOwner = character.userId === userId || character.ownerId === userId;

    if (isOwner) {
      return { hasAccess: true, isOwner: true };
    }

    // Check for explicit permission
    const permission = await db.query.characterPermissions.findFirst({
      where: and(
        eq(characterPermissions.characterId, characterId),
        eq(characterPermissions.userId, userId)
      ),
    });

    if (!permission) {
      return { hasAccess: false, isOwner: false };
    }

    // If a specific permission level is required, check it
    if (requiredLevel) {
      const permissionLevels = { viewer: 1, editor: 2, owner: 3 };
      const hasRequiredLevel =
        permissionLevels[permission.permissionLevel] >= permissionLevels[requiredLevel];

      return {
        hasAccess: hasRequiredLevel,
        permission,
        isOwner: false,
      };
    }

    return { hasAccess: true, permission, isOwner: false };
  }

  /**
   * Share a character with another user
   */
  static async shareCharacter(
    characterId: string,
    userId: string,
    targetUserId: string,
    permission: PermissionLevel
  ): Promise<CharacterPermission> {
    // Verify ownership
    const { isOwner } = await this.checkPermission(characterId, userId);
    if (!isOwner) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the character owner can share this character',
      });
    }

    // Check if permission already exists
    const existing = await db.query.characterPermissions.findFirst({
      where: and(
        eq(characterPermissions.characterId, characterId),
        eq(characterPermissions.userId, targetUserId)
      ),
    });

    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Permission already exists for this user',
      });
    }

    // Create permission
    const [newPermission] = await db
      .insert(characterPermissions)
      .values({
        characterId,
        userId: targetUserId,
        permissionLevel: permission,
        canControlToken: permission === 'editor' || permission === 'owner',
        canEditSheet: permission === 'editor' || permission === 'owner',
        grantedBy: userId,
      })
      .returning();

    if (!newPermission) {
      throw new InternalServerError('Failed to create permission');
    }

    return newPermission;
  }

  /**
   * Update permission for a user
   */
  static async updatePermission(
    characterId: string,
    userId: string,
    targetUserId: string,
    permission: PermissionLevel
  ): Promise<CharacterPermission> {
    // Verify ownership
    const { isOwner } = await this.checkPermission(characterId, userId);
    if (!isOwner) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the character owner can modify permissions',
      });
    }

    const [updated] = await db
      .update(characterPermissions)
      .set({
        permissionLevel: permission,
        canControlToken: permission === 'editor' || permission === 'owner',
        canEditSheet: permission === 'editor' || permission === 'owner',
      })
      .where(
        and(
          eq(characterPermissions.characterId, characterId),
          eq(characterPermissions.userId, targetUserId)
        )
      )
      .returning();

    if (!updated) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Permission not found',
      });
    }

    return updated;
  }

  /**
   * Revoke permission from a user
   */
  static async revokePermission(
    characterId: string,
    userId: string,
    targetUserId: string
  ): Promise<boolean> {
    // Verify ownership
    const { isOwner } = await this.checkPermission(characterId, userId);
    if (!isOwner) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the character owner can revoke permissions',
      });
    }

    const result = await db
      .delete(characterPermissions)
      .where(
        and(
          eq(characterPermissions.characterId, characterId),
          eq(characterPermissions.userId, targetUserId)
        )
      )
      .returning({ id: characterPermissions.id });

    return result.length > 0;
  }

  /**
   * List all characters shared with a user
   */
  static async listSharedCharacters(userId: string): Promise<Array<Character & { permission: CharacterPermission }>> {
    const permissions = await db.query.characterPermissions.findMany({
      where: eq(characterPermissions.userId, userId),
      with: {
        character: {
          columns: {
            id: true,
            name: true,
            race: true,
            class: true,
            level: true,
            imageUrl: true,
            avatarUrl: true,
            campaignId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return permissions.map((p: any) => ({
      ...p.character,
      permission: {
        id: p.id,
        characterId: p.characterId,
        userId: p.userId,
        permissionLevel: p.permissionLevel,
        canControlToken: p.canControlToken,
        canEditSheet: p.canEditSheet,
        grantedAt: p.grantedAt,
        grantedBy: p.grantedBy,
      },
    }));
  }

  /**
   * List all permissions for a character
   */
  static async listPermissions(
    characterId: string,
    userId: string
  ): Promise<CharacterPermission[]> {
    // Verify ownership
    const { isOwner } = await this.checkPermission(characterId, userId);
    if (!isOwner) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only the character owner can view permissions',
      });
    }

    return await db.query.characterPermissions.findMany({
      where: eq(characterPermissions.characterId, characterId),
    });
  }

  /**
   * Export character to JSON
   */
  static async exportCharacter(characterId: string, userId: string): Promise<any> {
    // Verify access
    const { hasAccess } = await this.checkPermission(characterId, userId);
    if (!hasAccess) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this character',
      });
    }

    const character = await db.query.characters.findFirst({
      where: eq(characters.id, characterId),
      with: {
        stats: true,
      },
    });

    if (!character) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Character not found',
      });
    }

    // Strip sensitive data
    const exportData = {
      version: '1.0',
      character: {
        name: character.name,
        description: character.description,
        race: character.race,
        class: character.class,
        level: character.level,
        alignment: character.alignment,
        experiencePoints: character.experiencePoints,
        background: character.background,
        imageUrl: character.imageUrl,
        avatarUrl: character.avatarUrl,
        backgroundImage: character.backgroundImage,
        appearance: character.appearance,
        personalityTraits: character.personalityTraits,
        personalityNotes: character.personalityNotes,
        backstoryElements: character.backstoryElements,
        cantrips: character.cantrips,
        knownSpells: character.knownSpells,
        preparedSpells: character.preparedSpells,
        ritualSpells: character.ritualSpells,
        visionTypes: character.visionTypes,
        obscurement: character.obscurement,
        isHidden: character.isHidden,
      },
      stats: character.stats ? {
        strength: character.stats.strength,
        dexterity: character.stats.dexterity,
        constitution: character.stats.constitution,
        intelligence: character.stats.intelligence,
        wisdom: character.stats.wisdom,
        charisma: character.stats.charisma,
      } : null,
      exportedAt: new Date().toISOString(),
    };

    return exportData;
  }

  /**
   * Import character from JSON
   */
  static async importCharacter(userId: string, characterData: any): Promise<Character> {
    // Validate structure
    if (!characterData.version) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid character data: missing version',
      });
    }

    if (!characterData.character) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid character data: missing character object',
      });
    }

    const charData = characterData.character;

    // Validate required fields
    if (!charData.name) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid character data: missing name',
      });
    }

    // Create character
    const [character] = await db
      .insert(characters)
      .values({
        userId,
        name: charData.name,
        description: charData.description || null,
        race: charData.race || null,
        class: charData.class || null,
        level: charData.level || 1,
        alignment: charData.alignment || null,
        experiencePoints: charData.experiencePoints || 0,
        background: charData.background || null,
        imageUrl: charData.imageUrl || null,
        avatarUrl: charData.avatarUrl || null,
        backgroundImage: charData.backgroundImage || null,
        appearance: charData.appearance || null,
        personalityTraits: charData.personalityTraits || null,
        personalityNotes: charData.personalityNotes || null,
        backstoryElements: charData.backstoryElements || null,
        cantrips: charData.cantrips || null,
        knownSpells: charData.knownSpells || null,
        preparedSpells: charData.preparedSpells || null,
        ritualSpells: charData.ritualSpells || null,
        visionTypes: charData.visionTypes || null,
        obscurement: charData.obscurement || null,
        isHidden: charData.isHidden || false,
      })
      .returning();

    if (!character) {
      throw new InternalServerError('Failed to import character');
    }

    // Create stats if provided
    if (characterData.stats) {
      await db.insert(characterStats).values({
        characterId: character.id,
        strength: characterData.stats.strength || 10,
        dexterity: characterData.stats.dexterity || 10,
        constitution: characterData.stats.constitution || 10,
        intelligence: characterData.stats.intelligence || 10,
        wisdom: characterData.stats.wisdom || 10,
        charisma: characterData.stats.charisma || 10,
      });
    }

    return character;
  }
}

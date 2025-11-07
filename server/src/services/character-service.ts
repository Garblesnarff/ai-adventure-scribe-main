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
import { characters, characterStats, campaigns, type Character, type NewCharacter } from '../../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

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

    return chars;
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
            title: true,
            description: true,
            imageUrl: true,
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
}

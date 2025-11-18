/**
 * Rest Service
 *
 * Implements D&D 5E rest mechanics including short rests, long rests, and hit dice management.
 * Follows PHB pg. 186 rules for resting and recovery.
 *
 * @module server/services/rest-service
 */

import { db } from '../../../db/client.js';
import {
  restEvents,
  characterHitDice,
  characters,
  characterStats,
  type RestEvent,
  type CharacterHitDice,
} from '../../../db/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';
import type {
  RestType,
  ShortRestResult,
  LongRestResult,
  SpendHitDiceResult,
  RestorableResource,
  HitDieType,
  HIT_DICE_BY_CLASS,
} from '../types/rest.js';
import { NotFoundError, ValidationError, BusinessLogicError } from '../lib/errors.js';

/**
 * Hit dice by class mapping
 */
const HIT_DICE_MAP: Record<string, HitDieType> = {
  'Barbarian': 'd12',
  'Fighter': 'd10',
  'Paladin': 'd10',
  'Ranger': 'd10',
  'Bard': 'd8',
  'Cleric': 'd8',
  'Druid': 'd8',
  'Monk': 'd8',
  'Rogue': 'd8',
  'Warlock': 'd8',
  'Sorcerer': 'd6',
  'Wizard': 'd6',
};

/**
 * Rest Service
 */
export class RestService {
  /**
   * Calculate Constitution modifier from ability score
   */
  private static calculateConModifier(constitution: number): number {
    return Math.floor((constitution - 10) / 2);
  }

  /**
   * Roll a hit die
   */
  private static rollHitDie(dieType: HitDieType): number {
    const dieSize = parseInt(dieType.substring(1));
    return Math.floor(Math.random() * dieSize) + 1;
  }

  /**
   * Get hit die type for a class
   */
  static getHitDieType(className: string): HitDieType {
    return HIT_DICE_MAP[className] || 'd8';
  }

  /**
   * Initialize hit dice for a character based on their class and level
   */
  static async initializeHitDice(
    characterId: string,
    className: string,
    level: number
  ): Promise<CharacterHitDice> {
    const dieType = this.getHitDieType(className);

    // Check if hit dice already exist for this character/class
    const existing = await db.query.characterHitDice.findFirst({
      where: and(
        eq(characterHitDice.characterId, characterId),
        eq(characterHitDice.className, className)
      ),
    });

    if (existing) {
      // Update total dice to match level
      const [updated] = await db
        .update(characterHitDice)
        .set({
          totalDice: level,
          updatedAt: new Date(),
        })
        .where(eq(characterHitDice.id, existing.id))
        .returning();

      if (!updated) {
        throw new Error('Failed to update hit dice');
      }

      return updated;
    }

    // Create new hit dice record
    const [hitDice] = await db
      .insert(characterHitDice)
      .values({
        characterId,
        className,
        dieType,
        totalDice: level,
        usedDice: 0,
      })
      .returning();

    if (!hitDice) {
      throw new Error('Failed to create hit dice');
    }

    return hitDice;
  }

  /**
   * Get all hit dice for a character
   */
  static async getHitDice(characterId: string): Promise<CharacterHitDice[]> {
    const hitDice = await db.query.characterHitDice.findMany({
      where: eq(characterHitDice.characterId, characterId),
    });

    return hitDice;
  }

  /**
   * Get available (unspent) hit dice count
   */
  static async getAvailableHitDiceCount(characterId: string): Promise<number> {
    const allHitDice = await this.getHitDice(characterId);
    return allHitDice.reduce((sum, hd) => sum + (hd.totalDice - hd.usedDice), 0);
  }

  /**
   * Spend hit dice to recover HP
   * PHB pg. 186: Roll hit die + CON modifier (minimum 1 HP per die)
   */
  static async spendHitDice(
    characterId: string,
    count: number,
    preRolledValues?: number[]
  ): Promise<SpendHitDiceResult> {
    if (count < 0) {
      throw new ValidationError('Cannot spend negative hit dice', { count });
    }

    if (count === 0) {
      return {
        hpRestored: 0,
        hitDiceSpent: 0,
        rolls: [],
        hitDiceRemaining: await this.getHitDice(characterId),
      };
    }

    // Get character and stats
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, characterId),
      with: {
        stats: true,
      },
    });

    if (!character) {
      throw new NotFoundError('Character', characterId);
    }

    if (!character.stats) {
      throw new BusinessLogicError('Character has no stats', { characterId });
    }

    const conModifier = this.calculateConModifier(character.stats.constitution);

    // Get all hit dice
    const allHitDice = await this.getHitDice(characterId);
    const availableCount = allHitDice.reduce(
      (sum, hd) => sum + (hd.totalDice - hd.usedDice),
      0
    );

    if (count > availableCount) {
      throw new BusinessLogicError(
        `Cannot spend ${count} hit dice. Only ${availableCount} available.`,
        { requested: count, available: availableCount }
      );
    }

    // Spend hit dice (prefer largest dice first)
    const sortedHitDice = [...allHitDice].sort((a, b) => {
      const aSize = parseInt(a.dieType.substring(1));
      const bSize = parseInt(b.dieType.substring(1));
      return bSize - aSize;
    });

    let remaining = count;
    let totalHpRestored = 0;
    const rolls: number[] = [];

    for (const hitDie of sortedHitDice) {
      if (remaining === 0) break;

      const available = hitDie.totalDice - hitDie.usedDice;
      const toSpend = Math.min(remaining, available);

      if (toSpend > 0) {
        // Roll hit dice
        for (let i = 0; i < toSpend; i++) {
          const roll = preRolledValues?.[rolls.length] ?? this.rollHitDie(hitDie.dieType as HitDieType);
          rolls.push(roll);
          // Minimum 1 HP per die
          const hpGained = Math.max(1, roll + conModifier);
          totalHpRestored += hpGained;
        }

        // Update used dice
        await db
          .update(characterHitDice)
          .set({
            usedDice: hitDie.usedDice + toSpend,
            updatedAt: new Date(),
          })
          .where(eq(characterHitDice.id, hitDie.id));

        remaining -= toSpend;
      }
    }

    return {
      hpRestored: totalHpRestored,
      hitDiceSpent: count,
      rolls,
      hitDiceRemaining: await this.getHitDice(characterId),
    };
  }

  /**
   * Restore hit dice (used during long rest)
   * PHB pg. 186: Restore up to half total hit dice (minimum 1)
   */
  static async restoreHitDice(
    characterId: string,
    count?: number
  ): Promise<number> {
    const allHitDice = await this.getHitDice(characterId);

    if (allHitDice.length === 0) {
      return 0;
    }

    // Calculate how many to restore
    const totalDice = allHitDice.reduce((sum, hd) => sum + hd.totalDice, 0);
    const usedDice = allHitDice.reduce((sum, hd) => sum + hd.usedDice, 0);
    const maxRestore = Math.max(1, Math.floor(totalDice / 2));
    const toRestore = count !== undefined ? Math.min(count, usedDice, maxRestore) : Math.min(usedDice, maxRestore);

    if (toRestore === 0) {
      return 0;
    }

    // Restore hit dice (prefer largest dice first)
    const sortedHitDice = [...allHitDice]
      .filter(hd => hd.usedDice > 0)
      .sort((a, b) => {
        const aSize = parseInt(a.dieType.substring(1));
        const bSize = parseInt(b.dieType.substring(1));
        return bSize - aSize;
      });

    let remaining = toRestore;

    for (const hitDie of sortedHitDice) {
      if (remaining === 0) break;

      const canRestore = Math.min(remaining, hitDie.usedDice);

      if (canRestore > 0) {
        await db
          .update(characterHitDice)
          .set({
            usedDice: hitDie.usedDice - canRestore,
            updatedAt: new Date(),
          })
          .where(eq(characterHitDice.id, hitDie.id));

        remaining -= canRestore;
      }
    }

    return toRestore;
  }

  /**
   * Get restorable resources for a rest type
   */
  static async getRestorableResources(
    characterId: string,
    restType: RestType
  ): Promise<RestorableResource[]> {
    const resources: RestorableResource[] = [];

    // Note: This is a simplified version. Full implementation would check
    // character class features, spell slots, etc.

    if (restType === 'short') {
      // Short rest restores some class features
      resources.push({
        resourceType: 'class_feature',
        resourceName: 'Short Rest Features',
        amountRestored: 'Various (Fighter Second Wind, Warlock Spell Slots, Monk Ki, etc.)',
      });
    } else if (restType === 'long') {
      // Long rest restores all HP, all spell slots, and half hit dice
      resources.push({
        resourceType: 'hp',
        resourceName: 'Hit Points',
        amountRestored: 'Full',
      });

      resources.push({
        resourceType: 'spell_slot',
        resourceName: 'All Spell Slots',
        amountRestored: 'All',
      });

      resources.push({
        resourceType: 'hit_dice',
        resourceName: 'Hit Dice',
        amountRestored: 'Half (minimum 1)',
      });

      resources.push({
        resourceType: 'class_feature',
        resourceName: 'All Class Features',
        amountRestored: 'All',
      });
    }

    return resources;
  }

  /**
   * Take a short rest
   * PHB pg. 186: 1 hour rest, can spend hit dice to recover HP
   */
  static async takeShortRest(
    characterId: string,
    hitDiceToSpend: number = 0,
    sessionId?: string,
    notes?: string
  ): Promise<ShortRestResult> {
    // Get character
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, characterId),
    });

    if (!character) {
      throw new NotFoundError('Character', characterId);
    }

    // Spend hit dice if requested
    let hpRestored = 0;
    let hitDiceSpent = 0;

    if (hitDiceToSpend > 0) {
      const result = await this.spendHitDice(characterId, hitDiceToSpend);
      hpRestored = result.hpRestored;
      hitDiceSpent = result.hitDiceSpent;
    }

    // Get restorable resources
    const resourcesRestored = await this.getRestorableResources(characterId, 'short');

    // Create rest event
    const [restEvent] = await db
      .insert(restEvents)
      .values({
        characterId,
        sessionId: sessionId || null,
        restType: 'short',
        startedAt: new Date(),
        completedAt: new Date(),
        hpRestored,
        hitDiceSpent,
        resourcesRestored: JSON.stringify(resourcesRestored),
        interrupted: false,
        notes: notes || null,
      })
      .returning();

    if (!restEvent) {
      throw new Error('Failed to create rest event');
    }

    return {
      characterId,
      restType: 'short',
      hpRestored,
      hitDiceSpent,
      hitDiceRemaining: await this.getHitDice(characterId),
      resourcesRestored,
      restEventId: restEvent.id,
    };
  }

  /**
   * Take a long rest
   * PHB pg. 186: 8 hours rest, restore all HP, spell slots, and half hit dice
   */
  static async takeLongRest(
    characterId: string,
    sessionId?: string,
    notes?: string
  ): Promise<LongRestResult> {
    // Get character
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, characterId),
      with: {
        stats: true,
      },
    });

    if (!character) {
      throw new NotFoundError('Character', characterId);
    }

    // Note: HP restoration would be handled by updating character's current HP
    // This is a placeholder that calculates the theoretical HP restored
    // In a full implementation, this would integrate with HP tracking system
    const hpRestored = 0; // Would be: maxHP - currentHP

    // Restore hit dice (half total, minimum 1)
    const hitDiceRestored = await this.restoreHitDice(characterId);

    // Get restorable resources
    const resourcesRestored = await this.getRestorableResources(characterId, 'long');

    // Create rest event
    const [restEvent] = await db
      .insert(restEvents)
      .values({
        characterId,
        sessionId: sessionId || null,
        restType: 'long',
        startedAt: new Date(),
        completedAt: new Date(),
        hpRestored,
        hitDiceSpent: 0,
        resourcesRestored: JSON.stringify(resourcesRestored),
        interrupted: false,
        notes: notes || null,
      })
      .returning();

    if (!restEvent) {
      throw new Error('Failed to create rest event');
    }

    return {
      characterId,
      restType: 'long',
      hpRestored,
      hitDiceRestored,
      hitDiceRemaining: await this.getHitDice(characterId),
      resourcesRestored,
      restEventId: restEvent.id,
    };
  }

  /**
   * Get rest history for a character
   */
  static async getRestHistory(
    characterId: string,
    sessionId?: string,
    limit: number = 50
  ): Promise<RestEvent[]> {
    const conditions = [eq(restEvents.characterId, characterId)];

    if (sessionId) {
      conditions.push(eq(restEvents.sessionId, sessionId));
    }

    const history = await db.query.restEvents.findMany({
      where: conditions.length > 1 ? and(...conditions) : conditions[0],
      orderBy: [desc(restEvents.startedAt)],
      limit,
    });

    return history;
  }

  /**
   * Calculate hit dice for a class at a given level
   */
  static calculateHitDiceForClass(className: string, level: number): {
    dieType: HitDieType;
    count: number;
  } {
    const dieType = this.getHitDieType(className);
    return {
      dieType,
      count: level,
    };
  }
}

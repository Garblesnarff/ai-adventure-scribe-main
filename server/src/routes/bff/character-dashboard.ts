/**
 * BFF Character Dashboard Route
 * 
 * Provides comprehensive character data aggregated and optimized for React components.
 * Includes stats, inventory, spells, combat readiness, and progress metrics.
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../../middleware/auth';
import {
  BFFCharacterDashboard,
  BFFCharacterDashboardRequest,
  BFFCharacterDashboardResponse,
  BFFCharacterData,
  BFFCharacterStats,
  BFFInventoryItem,
  BFFSpellData,
  BFFActiveEffect,
  BFFCombatReadiness,
  BFFProgressMetrics,
  BFFAbilityScores,
  BFFHitPoints,
  BFFSpellSlots
} from '../../bff/types';
import {
  bffCachingMiddleware,
  bffPerformanceMiddleware,
  reactResponseShapingMiddleware,
  requestCoalescingMiddleware
} from '../../bff/middleware/bff-middleware';

export default function characterDashboardRouter(db: Pool) {
  const router = Router();

  router.use(requireAuth);
  router.use(bffPerformanceMiddleware);
  router.use(requestCoalescingMiddleware);
  router.use(reactResponseShapingMiddleware);

  /**
   * GET /bff/character-dashboard/:characterId
   * 
   * Returns complete character dashboard data optimized for React components
   */
  router.get('/:characterId',
    bffCachingMiddleware({
      ttl: 300, // 5 minute cache
      key: 'character-dashboard',
      strategy: 'memory',
      invalidationTriggers: ['character_update', 'level_up', 'inventory_change']
    }),
    async (req: Request, res: Response) => {
      const { characterId } = req.params;
      const userId = (req as any).user!.userId;
      const { campaignId, includeDetailedStats } = req.query;

      console.log(`🧙 BFF: Loading character dashboard for ${characterId}`);

      const client = await db.connect();
      try {
        // Get character basic data
        const characterQuery = `
          SELECT 
            c.*,
            cs.strength, cs.dexterity, cs.constitution, 
            cs.intelligence, cs.wisdom, cs.charisma,
            cs.hit_points_current, cs.hit_points_max, cs.armor_class,
            cs.proficiency_bonus, cs.walking_speed
          FROM characters c
          LEFT JOIN character_stats cs ON c.id = cs.character_id
          WHERE c.id = $1 AND c.user_id = $2
        `;

        const characterResult = await client.query(characterQuery, [characterId, userId]);
        
        if (characterResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Character not found'
          } as BFFCharacterDashboardResponse);
        }

        const char = characterResult.rows[0];

        // Build ability scores with modifiers
        const abilityScores: BFFAbilityScores = {
          strength: {
            value: char.strength || 10,
            modifier: Math.floor(((char.strength || 10) - 10) / 2),
            saveProficient: false // TODO: Get from proficiencies table
          },
          dexterity: {
            value: char.dexterity || 10,
            modifier: Math.floor(((char.dexterity || 10) - 10) / 2),
            saveProficient: false
          },
          constitution: {
            value: char.constitution || 10,
            modifier: Math.floor(((char.constitution || 10) - 10) / 2),
            saveProficient: false
          },
          intelligence: {
            value: char.intelligence || 10,
            modifier: Math.floor(((char.intelligence || 10) - 10) / 2),
            saveProficient: false
          },
          wisdom: {
            value: char.wisdom || 10,
            modifier: Math.floor(((char.wisdom || 10) - 10) / 2),
            saveProficient: false
          },
          charisma: {
            value: char.charisma || 10,
            modifier: Math.floor(((char.charisma || 10) - 10) / 2),
            saveProficient: false
          }
        };

        const hitPoints: BFFHitPoints = {
          current: char.hit_points_current || char.hit_points_max || 8,
          maximum: char.hit_points_max || 8,
          temporary: 0, // TODO: Track temporary HP
          hitDice: [
            {
              die: `d${char.class === 'Wizard' ? 6 : char.class === 'Fighter' ? 10 : 8}`,
              current: char.level || 1,
              maximum: char.level || 1
            }
          ]
        };

        const characterData: BFFCharacterData = {
          id: char.id,
          name: char.name,
          level: char.level || 1,
          class: char.class || 'Adventurer',
          race: char.race || 'Human',
          background: char.background || 'Folk Hero',
          hitPoints,
          armorClass: char.armor_class || (10 + abilityScores.dexterity.modifier),
          speed: char.walking_speed || 30,
          proficiencyBonus: char.proficiency_bonus || Math.ceil((char.level || 1) / 4) + 1,
          alignment: char.alignment || 'Neutral Good',
          portraitUrl: char.portrait_url
        };

        const characterStats: BFFCharacterStats = {
          abilityScores,
          savingThrows: {
            strength: { modifier: abilityScores.strength.modifier, proficient: false },
            dexterity: { modifier: abilityScores.dexterity.modifier, proficient: false },
            constitution: { modifier: abilityScores.constitution.modifier, proficient: false },
            intelligence: { modifier: abilityScores.intelligence.modifier, proficient: false },
            wisdom: { modifier: abilityScores.wisdom.modifier, proficient: false },
            charisma: { modifier: abilityScores.charisma.modifier, proficient: false }
          },
          skills: {
            // TODO: Calculate skill bonuses based on proficiencies
            'Acrobatics': { modifier: abilityScores.dexterity.modifier, proficient: false, expertise: false },
            'Athletics': { modifier: abilityScores.strength.modifier, proficient: false, expertise: false },
            'Perception': { modifier: abilityScores.wisdom.modifier, proficient: true, expertise: false },
            'Investigation': { modifier: abilityScores.intelligence.modifier, proficient: false, expertise: false }
          },
          resistances: [],
          immunities: [],
          vulnerabilities: [],
          senses: ['Normal vision'],
          languages: ['Common']
        };

        // Get inventory (mock data for now)
        const inventory: BFFInventoryItem[] = [
          {
            id: 'sword_001',
            name: 'Longsword',
            type: 'weapon',
            quantity: 1,
            weight: 3,
            description: 'A versatile martial weapon',
            rarity: 'common',
            equipped: true,
            properties: ['Versatile (1d10)'],
            value: { amount: 15, currency: 'gp' }
          },
          {
            id: 'armor_001',
            name: 'Chain Mail',
            type: 'armor',
            quantity: 1,
            weight: 55,
            description: 'Made of interlocking metal rings',
            rarity: 'common',
            equipped: true,
            properties: ['AC 16', 'Stealth Disadvantage'],
            value: { amount: 75, currency: 'gp' }
          }
        ];

        // Get spells (mock data for now)
        const spells: BFFSpellData[] = char.class === 'Wizard' || char.class === 'Cleric' ? [
          {
            id: 'fireball',
            name: 'Fireball',
            level: 3,
            school: 'Evocation',
            castingTime: '1 action',
            range: '150 feet',
            components: ['V', 'S', 'M'],
            duration: 'Instantaneous',
            description: 'A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame.',
            prepared: true,
            ritual: false,
            concentration: false
          },
          {
            id: 'cure_wounds',
            name: 'Cure Wounds',
            level: 1,
            school: 'Evocation',
            castingTime: '1 action',
            range: 'Touch',
            components: ['V', 'S'],
            duration: 'Instantaneous',
            description: 'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier.',
            prepared: true,
            ritual: false,
            concentration: false
          }
        ] : [];

        // Active effects (mock data)
        const activeEffects: BFFActiveEffect[] = [];

        // Spell slots
        const spellSlots: BFFSpellSlots = {};
        if (char.class === 'Wizard' || char.class === 'Cleric') {
          const level = char.level || 1;
          if (level >= 1) spellSlots[1] = { current: Math.min(level + 1, 4), maximum: Math.min(level + 1, 4) };
          if (level >= 3) spellSlots[2] = { current: Math.min(Math.floor(level / 2), 3), maximum: Math.min(Math.floor(level / 2), 3) };
          if (level >= 5) spellSlots[3] = { current: Math.min(Math.floor((level - 2) / 2), 3), maximum: Math.min(Math.floor((level - 2) / 2), 3) };
        }

        const combatReadiness: BFFCombatReadiness = {
          initiative: abilityScores.dexterity.modifier,
          armorClass: characterData.armorClass,
          hitPoints: characterData.hitPoints,
          spellSlots,
          actions: [
            {
              name: 'Attack',
              type: 'attack',
              description: 'Make a weapon attack',
              available: true
            },
            {
              name: 'Cast Spell',
              type: 'spell',
              description: 'Cast a prepared spell',
              available: spells.length > 0
            }
          ],
          reactions: [
            {
              name: 'Opportunity Attack',
              type: 'attack',
              description: 'Attack when enemy leaves reach',
              available: true
            }
          ],
          bonusActions: []
        };

        // Get progress metrics
        const progressQuery = `
          SELECT 
            COUNT(*) as total_sessions,
            COALESCE(SUM(CASE WHEN EXISTS(
              SELECT 1 FROM messages m 
              WHERE m.session_id = gs.id 
              AND m.metadata::jsonb ? 'combatDetection'
              AND (m.metadata::jsonb->'combatDetection'->>'isCombat')::boolean = true
            ) THEN 1 ELSE 0 END), 0) as total_combats
          FROM game_sessions gs
          WHERE gs.character_id = $1
        `;

        const progressResult = await client.query(progressQuery, [characterId]);
        const progressData = progressResult.rows[0];

        const progressMetrics: BFFProgressMetrics = {
          experience: {
            current: char.experience_points || 0,
            nextLevel: getExperienceForLevel((char.level || 1) + 1)
          },
          sessionStats: {
            messagesThisSession: 0, // TODO: Track current session
            combatRoundsThisSession: 0,
            diceRolledThisSession: 0
          },
          campaignProgress: {
            totalSessions: parseInt(progressData.total_sessions) || 0,
            totalCombats: parseInt(progressData.total_combats) || 0,
            levelsGained: (char.level || 1) - 1
          }
        };

        const dashboardData: BFFCharacterDashboard = {
          character: characterData,
          stats: characterStats,
          inventory,
          spells,
          activeEffects,
          combatReadiness,
          progressMetrics
        };

        const response: BFFCharacterDashboardResponse = {
          success: true,
          data: dashboardData
        };

        console.log(`✅ BFF: Character dashboard loaded for ${characterId}`);
        res.json(response);

      } catch (error) {
        console.error('❌ BFF Character dashboard error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to load character dashboard'
        } as BFFCharacterDashboardResponse);
      } finally {
        client.release();
      }
    }
  );

  /**
   * PUT /bff/character-dashboard/:characterId
   * 
   * Update character data with real-time synchronization
   */
  router.put('/:characterId', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const userId = (req as any).user!.userId;
    const updates = req.body;

    console.log(`🔄 BFF: Updating character ${characterId}`);

    const client = await db.connect();
    try {
      // Handle different types of updates
      if (updates.hitPoints) {
        const updateHPQuery = `
          UPDATE character_stats 
          SET hit_points_current = $1, updated_at = NOW()
          WHERE character_id = $2
          RETURNING *
        `;
        
        await client.query(updateHPQuery, [updates.hitPoints.current, characterId]);
      }

      if (updates.experience) {
        const updateExpQuery = `
          UPDATE characters 
          SET experience_points = $1, updated_at = NOW()
          WHERE id = $2 AND user_id = $3
          RETURNING *
        `;
        
        await client.query(updateExpQuery, [updates.experience, characterId, userId]);
      }

      if (updates.level) {
        const updateLevelQuery = `
          UPDATE characters 
          SET level = $1, updated_at = NOW()
          WHERE id = $2 AND user_id = $3
          RETURNING *
        `;
        
        await client.query(updateLevelQuery, [updates.level, characterId, userId]);
      }

      // TODO: Broadcast update via WebSocket to connected sessions
      
      console.log(`✅ BFF: Character ${characterId} updated`);
      res.json({ success: true, message: 'Character updated successfully' });

    } catch (error) {
      console.error('❌ BFF Character update error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update character'
      });
    } finally {
      client.release();
    }
  });

  /**
   * GET /bff/character-dashboard/:characterId/quick-stats
   * 
   * Returns essential character stats for quick loading (React Suspense friendly)
   */
  router.get('/:characterId/quick-stats', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const userId = (req as any).user!.userId;

    const client = await db.connect();
    try {
      const quickStatsQuery = `
        SELECT 
          c.id, c.name, c.level, c.class, c.race,
          cs.hit_points_current, cs.hit_points_max, cs.armor_class
        FROM characters c
        LEFT JOIN character_stats cs ON c.id = cs.character_id
        WHERE c.id = $1 AND c.user_id = $2
      `;

      const result = await client.query(quickStatsQuery, [characterId, userId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Character not found' });
      }

      const char = result.rows[0];
      const quickStats = {
        id: char.id,
        name: char.name,
        level: char.level,
        class: char.class,
        race: char.race,
        hitPoints: {
          current: char.hit_points_current,
          maximum: char.hit_points_max
        },
        armorClass: char.armor_class
      };

      res.json({ success: true, data: quickStats });

    } catch (error) {
      console.error('❌ BFF Quick stats error:', error);
      res.status(500).json({ success: false, error: 'Failed to load quick stats' });
    } finally {
      client.release();
    }
  });

  return router;
}

// Utility function to calculate experience needed for a level
function getExperienceForLevel(level: number): number {
  const experienceTable = [
    0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000,
    100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
  ];
  
  return experienceTable[Math.min(level - 1, experienceTable.length - 1)] || experienceTable[experienceTable.length - 1];
}
/**
 * Rules Engine API Routes
 *
 * RESTful API endpoints for game rules resolution across multiple game systems.
 * Provides a unified interface for resolving actions (attacks, checks, saves, etc.)
 * regardless of the underlying game system.
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { planRateLimit } from '../../middleware/rate-limit.js';
import {
  resolveActionForSystem,
  isGameSystemSupported,
  getSupportedGameSystems,
} from '../../rules/index.js';
import type { RulesActionRequest } from '../../rules/state.js';

export default function rulesRouter() {
  const router = Router();

  /**
   * @openapi
   * /v1/rules/systems:
   *   get:
   *     summary: Get supported game systems
   *     description: Returns a list of all game systems supported by the rules engine
   *     tags:
   *       - Rules Engine
   *     responses:
   *       200:
   *         description: List of supported game systems
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 systems:
   *                   type: array
   *                   items:
   *                     type: string
   *                   example: ["dnd5e", "ose_classic", "ose_advanced", "cairn", "knave"]
   */
  router.get('/systems', (req: Request, res: Response) => {
    try {
      const systems = getSupportedGameSystems();
      return res.json({ systems });
    } catch (e) {
      console.error('Get supported systems error:', e);
      return res.status(500).json({ error: 'Failed to get supported systems' });
    }
  });

  /**
   * @openapi
   * /v1/rules/resolve:
   *   post:
   *     summary: Resolve a rules action
   *     description: Resolves a game action (attack, ability check, saving throw, etc.) using the specified game system's rules
   *     tags:
   *       - Rules Engine
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - gameSystem
   *               - action
   *               - encounter
   *               - actors
   *             properties:
   *               gameSystem:
   *                 type: string
   *                 enum: [dnd5e, ose_classic, ose_advanced, cairn, knave]
   *                 description: The game system to use for resolution
   *               seed:
   *                 type: string
   *                 description: Optional seed for deterministic random number generation
   *               encounter:
   *                 type: object
   *                 description: The current encounter context
   *                 properties:
   *                   id:
   *                     type: string
   *                   round:
   *                     type: number
   *               actors:
   *                 type: object
   *                 description: Map of actor IDs to actor data
   *               actorId:
   *                 type: string
   *                 description: ID of the actor performing the action
   *               targetId:
   *                 type: string
   *                 description: ID of the target actor (for attacks, etc.)
   *               action:
   *                 type: string
   *                 enum: [attack, abilityCheck, savingThrow, contestedCheck, initiative, opportunityAttack, deathSave, concentrationCheck, rest, expendSpellSlot]
   *                 description: The type of action to resolve
   *               payload:
   *                 type: object
   *                 description: Action-specific payload data
   *           examples:
   *             dnd5eAttack:
   *               summary: D&D 5E attack resolution
   *               value:
   *                 gameSystem: "dnd5e"
   *                 seed: "test-seed-123"
   *                 encounter:
   *                   id: "enc-1"
   *                   round: 1
   *                 actors:
   *                   fighter:
   *                     id: "fighter"
   *                     name: "Brave Fighter"
   *                     level: 5
   *                     class: "Fighter"
   *                     size: "medium"
   *                     abilities:
   *                       str: 16
   *                       dex: 14
   *                       con: 14
   *                       int: 10
   *                       wis: 10
   *                       cha: 10
   *                     ac:
   *                       base: 18
   *                     maxHp: 45
   *                     currentHp: 45
   *                     speed: 30
   *                     weapons:
   *                       - name: "Longsword"
   *                         ability: "str"
   *                         proficient: true
   *                         damageDice: "1d8"
   *                         damageType: "slashing"
   *                   orc:
   *                     id: "orc"
   *                     name: "Orc Warrior"
   *                     level: 2
   *                     size: "medium"
   *                     abilities:
   *                       str: 16
   *                       dex: 12
   *                       con: 16
   *                       int: 7
   *                       wis: 11
   *                       cha: 10
   *                     ac:
   *                       base: 13
   *                     maxHp: 15
   *                     currentHp: 15
   *                     speed: 30
   *                 actorId: "fighter"
   *                 targetId: "orc"
   *                 action: "attack"
   *                 payload:
   *                   weapon:
   *                     name: "Longsword"
   *                     ability: "str"
   *                     proficient: true
   *                     damageDice: "1d8"
   *                     damageType: "slashing"
   *                   targetAC: 13
   *             knaveAbilityCheck:
   *               summary: Knave ability check
   *               value:
   *                 gameSystem: "knave"
   *                 encounter:
   *                   id: "enc-1"
   *                   round: 1
   *                 actors:
   *                   thief:
   *                     id: "thief"
   *                     name: "Sneaky Thief"
   *                     level: 3
   *                     size: "medium"
   *                     abilities:
   *                       str: 10
   *                       dex: 16
   *                       con: 12
   *                       int: 14
   *                       wis: 10
   *                       cha: 12
   *                     ac:
   *                       base: 14
   *                     maxHp: 18
   *                     currentHp: 18
   *                     speed: 30
   *                 actorId: "thief"
   *                 action: "abilityCheck"
   *                 payload:
   *                   ability: "dex"
   *                   dc: 15
   *     responses:
   *       200:
   *         description: Action resolved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               description: The result varies based on action type (AttackOutcome, CheckOutcome, InitiativeOutcome, etc.)
   *       400:
   *         description: Invalid request (missing required fields, unsupported game system, etc.)
   *       500:
   *         description: Server error during resolution
   */
  router.post('/resolve', requireAuth, planRateLimit('default'), async (req: Request, res: Response) => {
    try {
      const { gameSystem, ...actionRequest } = req.body as { gameSystem: string } & RulesActionRequest;

      // Validate game system
      if (!gameSystem) {
        return res.status(400).json({
          error: 'gameSystem is required',
          supportedSystems: getSupportedGameSystems(),
        });
      }

      if (!isGameSystemSupported(gameSystem)) {
        return res.status(400).json({
          error: `Unsupported game system: ${gameSystem}`,
          supportedSystems: getSupportedGameSystems(),
        });
      }

      // Validate required fields
      if (!actionRequest.action) {
        return res.status(400).json({ error: 'action is required' });
      }

      if (!actionRequest.encounter) {
        return res.status(400).json({ error: 'encounter is required' });
      }

      if (!actionRequest.actors) {
        return res.status(400).json({ error: 'actors is required' });
      }

      // Resolve the action
      const result = resolveActionForSystem(gameSystem, actionRequest);

      return res.json({
        success: true,
        gameSystem,
        action: actionRequest.action,
        result,
      });
    } catch (e) {
      console.error('Resolve action error:', e);
      const message = e instanceof Error ? e.message : 'Failed to resolve action';
      return res.status(500).json({
        error: message,
        success: false,
      });
    }
  });

  return router;
}

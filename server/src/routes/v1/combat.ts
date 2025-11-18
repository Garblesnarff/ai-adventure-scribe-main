/**
 * Combat Routes
 *
 * RESTful API endpoints for D&D 5E combat initiative and turn order management
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { planRateLimit } from '../../middleware/rate-limit.js';
import { CombatInitiativeService } from '../../services/combat-initiative-service.js';
import { CombatHPService } from '../../services/combat-hp-service.js';
import { CombatAttackService } from '../../services/combat-attack-service.js';
import { ConditionsService } from '../../services/conditions-service.js';
import { supabaseService } from '../../lib/supabase.js';
import type {
  CreateParticipantInput,
  AttackRollInput,
  SpellAttackInput,
  CreateWeaponAttackInput,
  ApplyConditionRequest,
  AttemptSaveRequest,
} from '../../types/combat.js';

export default function combatRouter() {
  const router = Router();
  router.use(requireAuth);
  router.use(planRateLimit('default'));

  /**
   * @openapi
   * /v1/sessions/{sessionId}/combat/start:
   *   post:
   *     summary: Start a new combat encounter
   *     description: Initiates a new combat encounter for a game session with specified participants
   *     tags:
   *       - Combat
   *     parameters:
   *       - in: path
   *         name: sessionId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Game session ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - participants
   *             properties:
   *               participants:
   *                 type: array
   *                 description: List of combatants participating in the encounter
   *                 items:
   *                   type: object
   *                   required:
   *                     - name
   *                     - initiativeModifier
   *                   properties:
   *                     name:
   *                       type: string
   *                     characterId:
   *                       type: string
   *                       format: uuid
   *                     npcId:
   *                       type: string
   *                       format: uuid
   *                     initiativeModifier:
   *                       type: integer
   *                     hpCurrent:
   *                       type: integer
   *                     hpMax:
   *                       type: integer
   *               surpriseRound:
   *                 type: boolean
   *                 default: false
   *                 description: Whether this combat starts with a surprise round
   *           examples:
   *             standardCombat:
   *               summary: Standard combat with party and enemies
   *               value:
   *                 participants:
   *                   - name: "Gandalf"
   *                     characterId: "char-123"
   *                     initiativeModifier: 2
   *                     hpCurrent: 45
   *                     hpMax: 45
   *                   - name: "Orc Warrior"
   *                     npcId: "npc-456"
   *                     initiativeModifier: 0
   *                     hpCurrent: 30
   *                     hpMax: 30
   *                 surpriseRound: false
   *     responses:
   *       201:
   *         description: Combat started successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/CombatState'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  router.post('/sessions/:sessionId/start', async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const { participants, surpriseRound } = req.body as {
      participants: CreateParticipantInput[];
      surpriseRound?: boolean;
    };
    const userId = req.user!.userId;

    try {
      // Validate sessionId
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }

      // Verify user owns the session
      const { data: session, error: sessionErr } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', sessionId)
        .single();

      if (sessionErr || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      const campaignOwner = (session as any).campaigns?.user_id;
      const characterOwner = (session as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate participants
      if (!participants || !Array.isArray(participants) || participants.length === 0) {
        return res.status(400).json({ error: 'Participants array is required and must not be empty' });
      }

      // Start combat
      const combatState = await CombatInitiativeService.startCombat(
        sessionId,
        participants,
        surpriseRound || false
      );

      return res.status(201).json(combatState);
    } catch (e) {
      console.error('Start combat error:', e);
      return res.status(500).json({ error: 'Failed to start combat encounter' });
    }
  });

  /**
   * @openapi
   * /v1/combat/{encounterId}/roll-initiative:
   *   post:
   *     summary: Roll initiative for a participant
   *     description: Sets or updates the initiative roll for a combat participant
   *     tags:
   *       - Combat
   *     parameters:
   *       - in: path
   *         name: encounterId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - participantId
   *             properties:
   *               participantId:
   *                 type: string
   *                 format: uuid
   *               roll:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 20
   *               modifier:
   *                 type: integer
   *           examples:
   *             manualRoll:
   *               summary: Manual initiative roll
   *               value:
   *                 participantId: "participant-123"
   *                 roll: 15
   *                 modifier: 2
   *     responses:
   *       200:
   *         description: Initiative rolled successfully
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  router.post('/:encounterId/roll-initiative', async (req: Request, res: Response) => {
    const { encounterId } = req.params;
    const { participantId, roll, modifier } = req.body as {
      participantId: string;
      roll?: number;
      modifier?: number;
    };
    const userId = req.user!.userId;

    try {
      // Validate encounterId
      if (!encounterId) {
        return res.status(400).json({ error: 'encounterId is required' });
      }

      // Get encounter and verify ownership
      const encounter = await CombatInitiativeService.getEncounterById(encounterId);
      if (!encounter) {
        return res.status(404).json({ error: 'Encounter not found' });
      }

      // Verify user owns the session
      const { data: session, error: sessionErr } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', encounter.sessionId)
        .single();

      if (sessionErr || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      const campaignOwner = (session as any).campaigns?.user_id;
      const characterOwner = (session as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate input
      if (!participantId) {
        return res.status(400).json({ error: 'participantId is required' });
      }

      if (roll !== undefined && (roll < 1 || roll > 20)) {
        return res.status(400).json({ error: 'roll must be between 1 and 20' });
      }

      // Roll initiative
      const result = await CombatInitiativeService.rollInitiative(
        encounterId,
        participantId,
        roll,
        modifier
      );

      return res.json(result);
    } catch (e) {
      console.error('Roll initiative error:', e);
      return res.status(500).json({ error: 'Failed to roll initiative' });
    }
  });

  /**
   * @openapi
   * /v1/combat/{encounterId}/next-turn:
   *   post:
   *     summary: Advance to the next turn
   *     description: Progresses combat to the next participant's turn or starts a new round
   *     tags:
   *       - Combat
   *     parameters:
   *       - in: path
   *         name: encounterId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Turn advanced successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/CombatState'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  router.post('/:encounterId/next-turn', async (req: Request, res: Response) => {
    const { encounterId } = req.params;
    const userId = req.user!.userId;

    try {
      // Validate encounterId
      if (!encounterId) {
        return res.status(400).json({ error: 'encounterId is required' });
      }

      // Get encounter and verify ownership
      const encounter = await CombatInitiativeService.getEncounterById(encounterId);
      if (!encounter) {
        return res.status(404).json({ error: 'Encounter not found' });
      }

      // Verify user owns the session
      const { data: session, error: sessionErr } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', encounter.sessionId)
        .single();

      if (sessionErr || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      const campaignOwner = (session as any).campaigns?.user_id;
      const characterOwner = (session as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Advance turn
      const result = await CombatInitiativeService.advanceTurn(encounterId);

      return res.json(result);
    } catch (e) {
      console.error('Advance turn error:', e);
      const message = e instanceof Error ? e.message : 'Failed to advance turn';
      return res.status(500).json({ error: message });
    }
  });

  /**
   * @openapi
   * /v1/combat/{encounterId}/reorder:
   *   patch:
   *     summary: Manually adjust initiative order
   *     description: Allows the DM to manually change a participant's initiative value
   *     tags:
   *       - Combat
   *     parameters:
   *       - in: path
   *         name: encounterId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - participantId
   *               - newInitiative
   *             properties:
   *               participantId:
   *                 type: string
   *                 format: uuid
   *               newInitiative:
   *                 type: number
   *           example:
   *             participantId: "participant-123"
   *             newInitiative: 18
   *     responses:
   *       200:
   *         description: Initiative reordered successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/CombatState'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  router.patch('/:encounterId/reorder', async (req: Request, res: Response) => {
    const { encounterId } = req.params;
    const { participantId, newInitiative } = req.body as {
      participantId: string;
      newInitiative: number;
    };
    const userId = req.user!.userId;

    try {
      // Validate encounterId
      if (!encounterId) {
        return res.status(400).json({ error: 'encounterId is required' });
      }

      // Get encounter and verify ownership
      const encounter = await CombatInitiativeService.getEncounterById(encounterId);
      if (!encounter) {
        return res.status(404).json({ error: 'Encounter not found' });
      }

      // Verify user owns the session
      const { data: session, error: sessionErr } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', encounter.sessionId)
        .single();

      if (sessionErr || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      const campaignOwner = (session as any).campaigns?.user_id;
      const characterOwner = (session as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate input
      if (!participantId || newInitiative === undefined) {
        return res.status(400).json({ error: 'participantId and newInitiative are required' });
      }

      // Reorder initiative
      await CombatInitiativeService.reorderInitiative(encounterId, participantId, newInitiative);

      // Get updated combat state
      const combatState = await CombatInitiativeService.getCombatState(encounterId);

      return res.json(combatState);
    } catch (e) {
      console.error('Reorder initiative error:', e);
      return res.status(500).json({ error: 'Failed to reorder initiative' });
    }
  });

  /**
   * @openapi
   * /v1/combat/{encounterId}/end:
   *   post:
   *     summary: End a combat encounter
   *     description: Marks the encounter as complete and performs cleanup
   *     tags:
   *       - Combat
   *     parameters:
   *       - in: path
   *         name: encounterId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     responses:
   *       200:
   *         description: Combat ended successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: string
   *                   format: uuid
   *                 status:
   *                   type: string
   *                   enum: [completed]
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  router.post('/:encounterId/end', async (req: Request, res: Response) => {
    const { encounterId } = req.params;
    const userId = req.user!.userId;

    try {
      // Validate encounterId
      if (!encounterId) {
        return res.status(400).json({ error: 'encounterId is required' });
      }

      // Get encounter and verify ownership
      const encounter = await CombatInitiativeService.getEncounterById(encounterId);
      if (!encounter) {
        return res.status(404).json({ error: 'Encounter not found' });
      }

      // Verify user owns the session
      const { data: session, error: sessionErr } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', encounter.sessionId)
        .single();

      if (sessionErr || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      const campaignOwner = (session as any).campaigns?.user_id;
      const characterOwner = (session as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // End combat
      const updatedEncounter = await CombatInitiativeService.endCombat(encounterId);

      return res.json(updatedEncounter);
    } catch (e) {
      console.error('End combat error:', e);
      return res.status(500).json({ error: 'Failed to end combat encounter' });
    }
  });

  /**
   * @openapi
   * /v1/combat/{encounterId}/status:
   *   get:
   *     summary: Get current combat state
   *     description: Retrieves the complete state of an active combat encounter including all participants, turn order, and current round
   *     tags:
   *       - Combat
   *     parameters:
   *       - in: path
   *         name: encounterId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Combat encounter ID
   *     responses:
   *       200:
   *         description: Combat state retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/CombatState'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  router.get('/:encounterId/status', async (req: Request, res: Response) => {
    const { encounterId } = req.params;
    const userId = req.user!.userId;

    try {
      // Validate encounterId
      if (!encounterId) {
        return res.status(400).json({ error: 'encounterId is required' });
      }

      // Get encounter and verify ownership
      const encounter = await CombatInitiativeService.getEncounterById(encounterId);
      if (!encounter) {
        return res.status(404).json({ error: 'Encounter not found' });
      }

      // Verify user owns the session
      const { data: session, error: sessionErr } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', encounter.sessionId)
        .single();

      if (sessionErr || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      const campaignOwner = (session as any).campaigns?.user_id;
      const characterOwner = (session as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get combat state
      const combatState = await CombatInitiativeService.getCombatState(encounterId);

      return res.json(combatState);
    } catch (e) {
      console.error('Get combat status error:', e);
      return res.status(500).json({ error: 'Failed to get combat status' });
    }
  });

  // ==========================================
  // Attack & Damage Resolution Endpoints
  // Work Unit 1.4a
  // ==========================================

  /**
   * @openapi
   * /v1/combat/{encounterId}/attack:
   *   post:
   *     summary: Resolve an attack against a target
   *     description: Processes a weapon or melee attack, applying damage with resistance/vulnerability calculations
   *     tags:
   *       - Combat
   *     parameters:
   *       - in: path
   *         name: encounterId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - attackerId
   *               - targetId
   *               - attackRoll
   *               - attackType
   *             properties:
   *               attackerId:
   *                 type: string
   *                 format: uuid
   *               targetId:
   *                 type: string
   *                 format: uuid
   *               attackRoll:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 20
   *               attackBonus:
   *                 type: integer
   *               weaponId:
   *                 type: string
   *                 format: uuid
   *               attackType:
   *                 type: string
   *                 enum: [melee, ranged, spell]
   *               isCritical:
   *                 type: boolean
   *               damageRoll:
   *                 type: integer
   *           examples:
   *             meleeAttack:
   *               summary: Basic melee attack
   *               value:
   *                 attackerId: "char-123"
   *                 targetId: "npc-456"
   *                 attackRoll: 18
   *                 attackBonus: 5
   *                 weaponId: "weapon-789"
   *                 attackType: "melee"
   *             criticalHit:
   *               summary: Critical hit
   *               value:
   *                 attackerId: "char-123"
   *                 targetId: "npc-456"
   *                 attackRoll: 20
   *                 attackType: "melee"
   *                 isCritical: true
   *     responses:
   *       200:
   *         description: Attack resolved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AttackResult'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  router.post('/:encounterId/attack', async (req: Request, res: Response) => {
    const { encounterId } = req.params;
    const attackInput = req.body as AttackRollInput;
    const userId = req.user!.userId;

    try {
      // Validate encounterId
      if (!encounterId) {
        return res.status(400).json({ error: 'encounterId is required' });
      }

      // Get encounter and verify ownership
      const encounter = await CombatInitiativeService.getEncounterById(encounterId);
      if (!encounter) {
        return res.status(404).json({ error: 'Encounter not found' });
      }

      // Verify user owns the session
      const { data: session, error: sessionErr } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', encounter.sessionId)
        .single();

      if (sessionErr || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      const campaignOwner = (session as any).campaigns?.user_id;
      const characterOwner = (session as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate input
      if (!attackInput.attackerId || !attackInput.targetId || attackInput.attackRoll === undefined) {
        return res.status(400).json({
          error: 'attackerId, targetId, and attackRoll are required',
        });
      }

      if (attackInput.attackRoll < 1 || attackInput.attackRoll > 20) {
        return res.status(400).json({
          error: 'attackRoll must be between 1 and 20',
        });
      }

      // Resolve attack
      const attackService = new CombatAttackService();
      const result = await attackService.resolveAttack(encounterId, attackInput);

      return res.json(result);
    } catch (e) {
      console.error('Resolve attack error:', e);
      const message = e instanceof Error ? e.message : 'Failed to resolve attack';
      return res.status(500).json({ error: message });
    }
  });

  /**
   * @openapi
   * /v1/combat/{encounterId}/spell-attack:
   *   post:
   *     summary: Resolve a spell attack against targets
   *     description: Processes spell attacks against one or more targets with saving throws and damage
   *     tags:
   *       - Combat
   *     parameters:
   *       - in: path
   *         name: encounterId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - casterId
   *               - targetIds
   *               - spellName
   *             properties:
   *               casterId:
   *                 type: string
   *                 format: uuid
   *               targetIds:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: uuid
   *               spellName:
   *                 type: string
   *               spellLevel:
   *                 type: integer
   *               saveDC:
   *                 type: integer
   *               saveAbility:
   *                 type: string
   *           example:
   *             casterId: "char-123"
   *             targetIds: ["npc-456", "npc-789"]
   *             spellName: "Fireball"
   *             saveDC: 15
   *             saveAbility: "dex"
   *     responses:
   *       200:
   *         description: Spell attack resolved successfully
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  router.post('/:encounterId/spell-attack', async (req: Request, res: Response) => {
    const { encounterId } = req.params;
    const spellInput = req.body as SpellAttackInput;
    const userId = req.user!.userId;

    try {
      // Validate encounterId
      if (!encounterId) {
        return res.status(400).json({ error: 'encounterId is required' });
      }

      // Get encounter and verify ownership
      const encounter = await CombatInitiativeService.getEncounterById(encounterId);
      if (!encounter) {
        return res.status(404).json({ error: 'Encounter not found' });
      }

      // Verify user owns the session
      const { data: session, error: sessionErr } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', encounter.sessionId)
        .single();

      if (sessionErr || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      const campaignOwner = (session as any).campaigns?.user_id;
      const characterOwner = (session as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate input
      if (!spellInput.casterId || !spellInput.targetIds || !Array.isArray(spellInput.targetIds)) {
        return res.status(400).json({
          error: 'casterId and targetIds (array) are required',
        });
      }

      if (!spellInput.spellName) {
        return res.status(400).json({
          error: 'spellName is required',
        });
      }

      // Resolve spell attack
      const attackService = new CombatAttackService();
      const result = await attackService.resolveSpellAttack(encounterId, spellInput);

      return res.json(result);
    } catch (e) {
      console.error('Resolve spell attack error:', e);
      const message = e instanceof Error ? e.message : 'Failed to resolve spell attack';
      return res.status(500).json({ error: message });
    }
  });

  /**
   * GET /v1/characters/:characterId/attacks
   * Get all weapon attacks for a character
   */
  router.get('/characters/:characterId/attacks', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const userId = req.user!.userId;

    try {
      // Validate characterId
      if (!characterId) {
        return res.status(400).json({ error: 'characterId is required' });
      }

      // Verify user owns the character
      const { data: character, error: charErr } = await supabaseService
        .from('characters')
        .select('user_id')
        .eq('id', characterId)
        .single();

      if (charErr || !character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      if (character.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get weapons
      const attackService = new CombatAttackService();
      const attacks = await attackService.getCharacterWeapons(characterId);

      return res.json({ attacks });
    } catch (e) {
      console.error('Get character attacks error:', e);
      return res.status(500).json({ error: 'Failed to get character attacks' });
    }
  });

  /**
   * POST /v1/characters/:characterId/attacks
   * Create a new weapon attack for a character
   */
  router.post('/characters/:characterId/attacks', async (req: Request, res: Response) => {
    const { characterId } = req.params;
    const weaponInput = req.body as Omit<CreateWeaponAttackInput, 'characterId'>;
    const userId = req.user!.userId;

    try {
      // Validate characterId
      if (!characterId) {
        return res.status(400).json({ error: 'characterId is required' });
      }

      // Verify user owns the character
      const { data: character, error: charErr } = await supabaseService
        .from('characters')
        .select('user_id')
        .eq('id', characterId)
        .single();

      if (charErr || !character) {
        return res.status(404).json({ error: 'Character not found' });
      }

      if (character.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate input
      if (!weaponInput.name || !weaponInput.damageDice || !weaponInput.damageType) {
        return res.status(400).json({
          error: 'name, damageDice, and damageType are required',
        });
      }

      if (weaponInput.attackBonus === undefined) {
        return res.status(400).json({
          error: 'attackBonus is required',
        });
      }

      // Create weapon
      const attackService = new CombatAttackService();
      const attack = await attackService.createWeaponAttack({
        characterId,
        ...weaponInput,
      });

      return res.status(201).json({ attack });
    } catch (e) {
      console.error('Create weapon attack error:', e);
      const message = e instanceof Error ? e.message : 'Failed to create weapon attack';
      return res.status(500).json({ error: message });
    }
  });

  // ============================================================================
  // HP & DAMAGE TRACKING ROUTES
  // Work Unit 1.2a
  // ============================================================================

  /**
   * POST /v1/combat/:encounterId/damage
   * Apply damage to a participant
   */
  router.post('/:encounterId/damage', async (req: Request, res: Response) => {
    const { encounterId } = req.params;
    const {
      participantId,
      damageAmount,
      damageType,
      sourceParticipantId,
      sourceDescription,
      ignoreResistances,
      ignoreImmunities,
    } = req.body;
    const userId = req.user!.userId;

    try {
      // Validate encounterId
      if (!encounterId) {
        return res.status(400).json({ error: 'encounterId is required' });
      }

      // Get encounter and verify ownership
      const encounter = await CombatInitiativeService.getEncounterById(encounterId);
      if (!encounter) {
        return res.status(404).json({ error: 'Encounter not found' });
      }

      // Verify user owns the session
      const { data: session, error: sessionErr } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', encounter.sessionId)
        .single();

      if (sessionErr || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      const campaignOwner = (session as any).campaigns?.user_id;
      const characterOwner = (session as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate input
      if (!participantId) {
        return res.status(400).json({ error: 'participantId is required' });
      }

      if (damageAmount === undefined || damageAmount < 0) {
        return res.status(400).json({ error: 'damageAmount must be non-negative' });
      }

      // Apply damage
      const result = await CombatHPService.applyDamage(participantId, {
        damageAmount,
        damageType,
        sourceParticipantId,
        sourceDescription,
        ignoreResistances,
        ignoreImmunities,
      });

      return res.json(result);
    } catch (e) {
      console.error('Apply damage error:', e);
      const message = e instanceof Error ? e.message : 'Failed to apply damage';
      return res.status(500).json({ error: message });
    }
  });

  /**
   * POST /v1/combat/:encounterId/heal
   * Heal a participant
   */
  router.post('/:encounterId/heal', async (req: Request, res: Response) => {
    const { encounterId } = req.params;
    const { participantId, healingAmount, sourceDescription } = req.body;
    const userId = req.user!.userId;

    try {
      // Validate encounterId
      if (!encounterId) {
        return res.status(400).json({ error: 'encounterId is required' });
      }

      // Get encounter and verify ownership
      const encounter = await CombatInitiativeService.getEncounterById(encounterId);
      if (!encounter) {
        return res.status(404).json({ error: 'Encounter not found' });
      }

      // Verify user owns the session
      const { data: session, error: sessionErr } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', encounter.sessionId)
        .single();

      if (sessionErr || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      const campaignOwner = (session as any).campaigns?.user_id;
      const characterOwner = (session as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate input
      if (!participantId) {
        return res.status(400).json({ error: 'participantId is required' });
      }

      if (healingAmount === undefined || healingAmount < 0) {
        return res.status(400).json({ error: 'healingAmount must be non-negative' });
      }

      // Heal participant
      const result = await CombatHPService.healDamage(
        participantId,
        healingAmount,
        sourceDescription
      );

      return res.json(result);
    } catch (e) {
      console.error('Heal damage error:', e);
      const message = e instanceof Error ? e.message : 'Failed to heal damage';
      return res.status(500).json({ error: message });
    }
  });

  /**
   * POST /v1/combat/:encounterId/temp-hp
   * Set temporary HP for a participant
   */
  router.post('/:encounterId/temp-hp', async (req: Request, res: Response) => {
    const { encounterId } = req.params;
    const { participantId, tempHp } = req.body;
    const userId = req.user!.userId;

    try {
      // Validate encounterId
      if (!encounterId) {
        return res.status(400).json({ error: 'encounterId is required' });
      }

      // Get encounter and verify ownership
      const encounter = await CombatInitiativeService.getEncounterById(encounterId);
      if (!encounter) {
        return res.status(404).json({ error: 'Encounter not found' });
      }

      // Verify user owns the session
      const { data: session, error: sessionErr } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', encounter.sessionId)
        .single();

      if (sessionErr || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      const campaignOwner = (session as any).campaigns?.user_id;
      const characterOwner = (session as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate input
      if (!participantId) {
        return res.status(400).json({ error: 'participantId is required' });
      }

      if (tempHp === undefined || tempHp < 0) {
        return res.status(400).json({ error: 'tempHp must be non-negative' });
      }

      // Set temp HP
      const result = await CombatHPService.setTempHP(participantId, tempHp);

      return res.json(result);
    } catch (e) {
      console.error('Set temp HP error:', e);
      const message = e instanceof Error ? e.message : 'Failed to set temp HP';
      return res.status(500).json({ error: message });
    }
  });

  /**
   * POST /v1/combat/:encounterId/death-save
   * Roll a death save for an unconscious participant
   */
  router.post('/:encounterId/death-save', async (req: Request, res: Response) => {
    const { encounterId } = req.params;
    const { participantId, roll } = req.body;
    const userId = req.user!.userId;

    try {
      // Validate encounterId
      if (!encounterId) {
        return res.status(400).json({ error: 'encounterId is required' });
      }

      // Get encounter and verify ownership
      const encounter = await CombatInitiativeService.getEncounterById(encounterId);
      if (!encounter) {
        return res.status(404).json({ error: 'Encounter not found' });
      }

      // Verify user owns the session
      const { data: session, error: sessionErr } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', encounter.sessionId)
        .single();

      if (sessionErr || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      const campaignOwner = (session as any).campaigns?.user_id;
      const characterOwner = (session as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate input
      if (!participantId) {
        return res.status(400).json({ error: 'participantId is required' });
      }

      if (roll === undefined || roll < 1 || roll > 20) {
        return res.status(400).json({ error: 'roll must be between 1 and 20' });
      }

      // Roll death save
      const result = await CombatHPService.rollDeathSave(participantId, roll);

      return res.json(result);
    } catch (e) {
      console.error('Death save error:', e);
      const message = e instanceof Error ? e.message : 'Failed to roll death save';
      return res.status(500).json({ error: message });
    }
  });

  /**
   * GET /v1/combat/:encounterId/damage-log
   * Get damage log for an encounter
   */
  router.get('/:encounterId/damage-log', async (req: Request, res: Response) => {
    const { encounterId } = req.params;
    const { participantId, round } = req.query;
    const userId = req.user!.userId;

    try {
      // Validate encounterId
      if (!encounterId) {
        return res.status(400).json({ error: 'encounterId is required' });
      }

      // Get encounter and verify ownership
      const encounter = await CombatInitiativeService.getEncounterById(encounterId);
      if (!encounter) {
        return res.status(404).json({ error: 'Encounter not found' });
      }

      // Verify user owns the session
      const { data: session, error: sessionErr } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', encounter.sessionId)
        .single();

      if (sessionErr || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      const campaignOwner = (session as any).campaigns?.user_id;
      const characterOwner = (session as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get damage log
      const roundNum = round !== undefined ? parseInt(round as string, 10) : undefined;
      const damageLog = await CombatHPService.getDamageLog(
        encounterId,
        participantId as string | undefined,
        roundNum
      );

      return res.json(damageLog);
    } catch (e) {
      console.error('Get damage log error:', e);
      return res.status(500).json({ error: 'Failed to get damage log' });
    }
  });

  // ==========================================
  // Conditions System Endpoints
  // Work Unit 1.3a
  // ==========================================

  /**
   * POST /v1/combat/:encounterId/conditions/apply
   * Apply a condition to a combat participant
   */
  router.post('/:encounterId/conditions/apply', async (req: Request, res: Response) => {
    const { encounterId } = req.params;
    const conditionRequest = req.body as ApplyConditionRequest;
    const userId = req.user!.userId;

    try {
      // Validate encounterId
      if (!encounterId) {
        return res.status(400).json({ error: 'encounterId is required' });
      }

      // Get encounter and verify ownership
      const encounter = await CombatInitiativeService.getEncounterById(encounterId);
      if (!encounter) {
        return res.status(404).json({ error: 'Encounter not found' });
      }

      // Verify user owns the session
      const { data: session, error: sessionErr } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', encounter.sessionId)
        .single();

      if (sessionErr || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      const campaignOwner = (session as any).campaigns?.user_id;
      const characterOwner = (session as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate input
      if (!conditionRequest.participantId || !conditionRequest.conditionName || !conditionRequest.durationType) {
        return res.status(400).json({
          error: 'participantId, conditionName, and durationType are required',
        });
      }

      // Apply condition
      const result = await ConditionsService.applyCondition(
        conditionRequest.participantId,
        conditionRequest.conditionName,
        conditionRequest.durationType,
        conditionRequest.durationValue,
        conditionRequest.saveDc,
        conditionRequest.saveAbility,
        conditionRequest.source,
        encounter.currentRound
      );

      return res.status(201).json({
        success: true,
        condition: result.condition,
        warnings: result.warnings,
      });
    } catch (e) {
      console.error('Apply condition error:', e);
      const message = e instanceof Error ? e.message : 'Failed to apply condition';
      return res.status(500).json({ error: message });
    }
  });

  /**
   * DELETE /v1/combat/:encounterId/conditions/:conditionId
   * Remove a condition from a participant
   */
  router.delete('/:encounterId/conditions/:conditionId', async (req: Request, res: Response) => {
    const { encounterId, conditionId } = req.params;
    const userId = req.user!.userId;

    try {
      // Validate parameters
      if (!encounterId) {
        return res.status(400).json({ error: 'encounterId is required' });
      }
      if (!conditionId) {
        return res.status(400).json({ error: 'conditionId is required' });
      }

      // Get encounter and verify ownership
      const encounter = await CombatInitiativeService.getEncounterById(encounterId);
      if (!encounter) {
        return res.status(404).json({ error: 'Encounter not found' });
      }

      // Verify user owns the session
      const { data: session, error: sessionErr } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', encounter.sessionId)
        .single();

      if (sessionErr || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      const campaignOwner = (session as any).campaigns?.user_id;
      const characterOwner = (session as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Remove condition
      const removed = await ConditionsService.removeCondition(conditionId);

      if (!removed) {
        return res.status(404).json({ error: 'Condition not found' });
      }

      return res.json({ success: true, message: 'Condition removed' });
    } catch (e) {
      console.error('Remove condition error:', e);
      const message = e instanceof Error ? e.message : 'Failed to remove condition';
      return res.status(500).json({ error: message });
    }
  });

  /**
   * POST /v1/combat/:encounterId/conditions/:conditionId/save
   * Attempt a saving throw against a condition
   */
  router.post('/:encounterId/conditions/:conditionId/save', async (req: Request, res: Response) => {
    const { encounterId, conditionId } = req.params;
    const { saveRoll } = req.body as AttemptSaveRequest;
    const userId = req.user!.userId;

    try {
      // Validate parameters
      if (!encounterId) {
        return res.status(400).json({ error: 'encounterId is required' });
      }
      if (!conditionId) {
        return res.status(400).json({ error: 'conditionId is required' });
      }

      // Get encounter and verify ownership
      const encounter = await CombatInitiativeService.getEncounterById(encounterId);
      if (!encounter) {
        return res.status(404).json({ error: 'Encounter not found' });
      }

      // Verify user owns the session
      const { data: session, error: sessionErr } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', encounter.sessionId)
        .single();

      if (sessionErr || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      const campaignOwner = (session as any).campaigns?.user_id;
      const characterOwner = (session as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Validate input
      if (saveRoll === undefined || saveRoll < 1 || saveRoll > 20) {
        return res.status(400).json({ error: 'saveRoll must be between 1 and 20' });
      }

      // Attempt save
      const result = await ConditionsService.attemptSave(conditionId, saveRoll);

      return res.json({
        success: true,
        saved: result.saved,
        conditionRemoved: result.conditionRemoved,
        message: result.message,
      });
    } catch (e) {
      console.error('Attempt save error:', e);
      const message = e instanceof Error ? e.message : 'Failed to attempt save';
      return res.status(500).json({ error: message });
    }
  });

  /**
   * GET /v1/combat/:encounterId/conditions/active
   * Get all active conditions in an encounter
   */
  router.get('/:encounterId/conditions/active', async (req: Request, res: Response) => {
    const { encounterId } = req.params;
    const userId = req.user!.userId;

    try {
      // Validate encounterId
      if (!encounterId) {
        return res.status(400).json({ error: 'encounterId is required' });
      }

      // Get encounter and verify ownership
      const encounter = await CombatInitiativeService.getEncounterById(encounterId);
      if (!encounter) {
        return res.status(404).json({ error: 'Encounter not found' });
      }

      // Verify user owns the session
      const { data: session, error: sessionErr } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', encounter.sessionId)
        .single();

      if (sessionErr || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      const campaignOwner = (session as any).campaigns?.user_id;
      const characterOwner = (session as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get all participants in this encounter
      const combatState = await CombatInitiativeService.getCombatState(encounterId);
      const participantConditions: Record<string, any> = {};

      // Get conditions for each participant
      for (const participant of combatState.participants) {
        const conditions = await ConditionsService.getActiveConditions(participant.id);
        const effects = await ConditionsService.getMechanicalEffects(participant.id);

        participantConditions[participant.id] = {
          participantName: participant.name,
          conditions,
          aggregatedEffects: effects,
        };
      }

      return res.json({
        encounterId,
        currentRound: encounter.currentRound,
        participantConditions,
      });
    } catch (e) {
      console.error('Get active conditions error:', e);
      const message = e instanceof Error ? e.message : 'Failed to get active conditions';
      return res.status(500).json({ error: message });
    }
  });

  /**
   * GET /v1/conditions/library
   * Get all available conditions from the library
   */
  router.get('/conditions/library', async (req: Request, res: Response) => {
    try {
      const conditions = await ConditionsService.getConditionsLibrary();
      return res.json({ conditions });
    } catch (e) {
      console.error('Get conditions library error:', e);
      return res.status(500).json({ error: 'Failed to get conditions library' });
    }
  });

  /**
   * GET /v1/combat/participants/:participantId/conditions
   * Get active conditions for a specific participant
   */
  router.get('/participants/:participantId/conditions', async (req: Request, res: Response) => {
    const { participantId } = req.params;
    const userId = req.user!.userId;

    try {
      // Validate participantId
      if (!participantId) {
        return res.status(400).json({ error: 'participantId is required' });
      }

      // Get participant and verify access through encounter
      const { data: participant } = await supabaseService
        .from('combat_participants')
        .select('*, combat_encounters!combat_participants_encounter_id_fkey(*)')
        .eq('id', participantId)
        .single();

      if (!participant) {
        return res.status(404).json({ error: 'Participant not found' });
      }

      const encounter = (participant as any).combat_encounters;

      // Verify user owns the session
      const { data: session, error: sessionErr } = await supabaseService
        .from('game_sessions')
        .select('*, campaigns!game_sessions_campaign_id_fkey(user_id), characters!game_sessions_character_id_fkey(user_id)')
        .eq('id', encounter.session_id)
        .single();

      if (sessionErr || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      const campaignOwner = (session as any).campaigns?.user_id;
      const characterOwner = (session as any).characters?.user_id;

      if (campaignOwner !== userId && characterOwner !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get conditions and effects
      const conditions = await ConditionsService.getActiveConditions(participantId);
      const effects = await ConditionsService.getMechanicalEffects(participantId);

      return res.json({
        participantId,
        conditions,
        aggregatedEffects: effects,
      });
    } catch (e) {
      console.error('Get participant conditions error:', e);
      const message = e instanceof Error ? e.message : 'Failed to get participant conditions';
      return res.status(500).json({ error: message });
    }
  });

  return router;
}

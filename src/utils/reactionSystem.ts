/**
 * Reaction System for D&D 5e Combat
 * 
 * Handles opportunity attacks, counterspell, and other reaction-based mechanics
 */

import { 
  ReactionOpportunity, 
  ReactionTrigger, 
  ActionType, 
  CombatParticipant,
  CombatEncounter,
  CombatAction
} from '@/types/combat';

/**
 * Create a reaction opportunity
 */
export function createReactionOpportunity(
  participantId: string,
  trigger: ReactionTrigger,
  triggerDescription: string,
  availableReactions: ActionType[],
  triggeredBy?: string
): ReactionOpportunity {
  return {
    id: `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    participantId,
    trigger,
    triggerDescription,
    availableReactions,
    triggeredBy,
    expiresAtEndOfTurn: true
  };
}

/**
 * Check for opportunity attack triggers when a creature moves
 */
export function checkOpportunityAttacks(
  movingParticipant: CombatParticipant,
  encounter: CombatEncounter,
  fromPosition: string,
  toPosition: string
): ReactionOpportunity[] {
  const opportunities: ReactionOpportunity[] = [];
  
  // Simple position-based check (in a real implementation, you'd have a proper positioning system)
  const nearbyEnemies = encounter.participants.filter(p => 
    p.id !== movingParticipant.id && 
    p.participantType !== movingParticipant.participantType &&
    p.currentHitPoints > 0 &&
    !p.reactionTaken &&
    isWithinReach(p, movingParticipant, fromPosition)
  );
  
  for (const enemy of nearbyEnemies) {
    // Check if they can make opportunity attacks
    if (canMakeOpportunityAttack(enemy, movingParticipant)) {
      opportunities.push(createReactionOpportunity(
        enemy.id,
        'creature_leaves_reach',
        `${movingParticipant.name} is leaving your reach`,
        ['opportunity_attack'],
        movingParticipant.id
      ));
    }
  }
  
  return opportunities;
}

/**
 * Check for counterspell opportunities when a spell is cast
 */
export function checkCounterspellOpportunities(
  caster: CombatParticipant,
  encounter: CombatEncounter,
  spellLevel: number
): ReactionOpportunity[] {
  const opportunities: ReactionOpportunity[] = [];
  
  // Find potential counterspellers within range
  const potentialCounterspellers = encounter.participants.filter(p => 
    p.id !== caster.id &&
    p.currentHitPoints > 0 &&
    !p.reactionTaken &&
    canCastCounterspell(p) &&
    isWithinCounterspellRange(p, caster)
  );
  
  for (const counterspeller of potentialCounterspellers) {
    opportunities.push(createReactionOpportunity(
      counterspeller.id,
      'spell_cast_in_range',
      `${caster.name} is casting a spell within your range`,
      ['counterspell'],
      caster.id
    ));
  }
  
  return opportunities;
}

/**
 * Check for deflect missiles opportunities when a ranged attack hits
 */
export function checkDeflectMissilesOpportunities(
  attacker: CombatParticipant,
  target: CombatParticipant,
  isRangedWeaponAttack: boolean
): ReactionOpportunity[] {
  const opportunities: ReactionOpportunity[] = [];
  
  if (isRangedWeaponAttack && canDeflectMissiles(target) && !target.reactionTaken) {
    opportunities.push(createReactionOpportunity(
      target.id,
      'ranged_attack_hits',
      `You are hit by a ranged weapon attack`,
      ['deflect_missiles'],
      attacker.id
    ));
  }
  
  return opportunities;
}

/**
 * Check for uncanny dodge opportunities when damage is taken
 */
export function checkUncannyDodgeOpportunities(
  attacker: CombatParticipant,
  target: CombatParticipant,
  canSeeAttacker: boolean = true
): ReactionOpportunity[] {
  const opportunities: ReactionOpportunity[] = [];
  
  if (canSeeAttacker && hasUncannyDodge(target) && !target.reactionTaken) {
    opportunities.push(createReactionOpportunity(
      target.id,
      'damage_taken',
      `You are hit by an attack you can see`,
      ['uncanny_dodge'],
      attacker.id
    ));
  }
  
  return opportunities;
}

/**
 * Check if a participant can make opportunity attacks
 */
function canMakeOpportunityAttack(
  participant: CombatParticipant, 
  target: CombatParticipant
): boolean {
  // Can't make opportunity attacks if incapacitated
  const incapacitatingConditions = ['stunned', 'paralyzed', 'unconscious', 'petrified'];
  const isIncapacitated = participant.conditions.some(c => 
    incapacitatingConditions.includes(c.name)
  );
  
  if (isIncapacitated) return false;
  
  // Target must be leaving reach, not teleporting or being moved involuntarily
  return true;
}

/**
 * Check if a participant can cast counterspell
 */
function canCastCounterspell(participant: CombatParticipant): boolean {
  // Check if they have counterspell available and spell slots
  if (!participant.spellSlots) return false;
  
  // Need at least a 3rd level spell slot for counterspell
  for (let level = 3; level <= 9; level++) {
    if (participant.spellSlots[level]?.current > 0) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a participant can use deflect missiles
 */
function canDeflectMissiles(participant: CombatParticipant): boolean {
  return participant.classFeatures?.some(f => f.name === 'deflect_missiles') || false;
}

/**
 * Check if a participant has uncanny dodge
 */
function hasUncannyDodge(participant: CombatParticipant): boolean {
  return participant.classFeatures?.some(f => f.name === 'uncanny_dodge') || false;
}

/**
 * Simple range check (in a real implementation, you'd have proper positioning)
 */
function isWithinReach(
  participant: CombatParticipant, 
  target: CombatParticipant, 
  position: string
): boolean {
  // Simplified - assume all melee combatants are within reach unless specified otherwise
  return position !== 'far' && position !== 'distant';
}

/**
 * Check if within counterspell range (60 feet)
 */
function isWithinCounterspellRange(
  caster: CombatParticipant, 
  target: CombatParticipant
): boolean {
  // Simplified - assume most combat happens within counterspell range
  return true;
}

/**
 * Process a reaction response
 */
export function processReactionResponse(
  opportunity: ReactionOpportunity,
  selectedReaction: ActionType,
  encounter: CombatEncounter
): Partial<CombatAction> {
  const participant = encounter.participants.find(p => p.id === opportunity.participantId);
  const trigger = encounter.participants.find(p => p.id === opportunity.triggeredBy);
  
  if (!participant || !trigger) {
    throw new Error('Invalid reaction participants');
  }
  
  switch (selectedReaction) {
    case 'opportunity_attack':
      return {
        participantId: opportunity.participantId,
        targetParticipantId: opportunity.triggeredBy,
        actionType: 'opportunity_attack',
        description: `${participant.name} makes an opportunity attack against ${trigger.name}`,
        round: encounter.currentRound,
        turnOrder: 0 // Reactions happen outside normal turn order
      };
      
    case 'counterspell':
      return {
        participantId: opportunity.participantId,
        targetParticipantId: opportunity.triggeredBy,
        actionType: 'counterspell',
        description: `${participant.name} attempts to counterspell ${trigger.name}'s spell`,
        round: encounter.currentRound,
        turnOrder: 0
      };
      
    case 'deflect_missiles':
      return {
        participantId: opportunity.participantId,
        actionType: 'deflect_missiles',
        description: `${participant.name} deflects the incoming missile`,
        round: encounter.currentRound,
        turnOrder: 0
      };
      
    case 'uncanny_dodge':
      return {
        participantId: opportunity.participantId,
        actionType: 'uncanny_dodge',
        description: `${participant.name} uses uncanny dodge to halve the damage`,
        round: encounter.currentRound,
        turnOrder: 0
      };
      
    default:
      throw new Error(`Unsupported reaction type: ${selectedReaction}`);
  }
}

/**
 * Clear expired reaction opportunities
 */
export function clearExpiredReactions(
  opportunities: ReactionOpportunity[],
  currentParticipantId?: string
): ReactionOpportunity[] {
  // Remove opportunities that expire at end of turn
  return opportunities.filter(opp => {
    if (opp.expiresAtEndOfTurn && opp.participantId !== currentParticipantId) {
      return false;
    }
    return true;
  });
}

/**
 * Check if participant has any available reactions
 */
export function hasAvailableReactions(participant: CombatParticipant): boolean {
  return !participant.reactionTaken && participant.currentHitPoints > 0;
}
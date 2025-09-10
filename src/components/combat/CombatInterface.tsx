/**
 * Combat Interface Component
 * 
 * Main combat UI that integrates all combat components.
 * Shows initiative tracker, enemy cards, and combat controls.
 * Manages combat mode and participant selection.
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Sword, 
  Shield, 
  Users, 
  X, 
  Play, 
  Pause, 
  RefreshCw,
  AlertTriangle 
} from 'lucide-react';
import { useCombat } from '@/contexts/CombatContext';
import { useCombatAIIntegration } from '@/hooks/use-combat-ai-integration';
import { useGameSession } from '@/hooks/use-game-session';
import { useCharacter } from '@/contexts/CharacterContext';
import InitiativeTracker from './InitiativeTracker';
import EnemyCard from './EnemyCard';
import DiceRoller from '@/components/ui/dice-roller';
import { ActionType, ReactionOpportunity } from '@/types/combat';
import { rollDice, rollAttack, rollDamage, calculateDamage } from '@/utils/diceUtils';
import { getRacialTraits, canUseRacialTrait, useRacialTrait } from '@/utils/racialTraits';
import { getClassFeatures, canUseClassFeature, useClassFeature, getSneakAttackDice, getRageDamageBonus } from '@/utils/classFeatures';
import { 
  createReactionOpportunity, 
  checkOpportunityAttacks, 
  checkCounterspellOpportunities,
  processReactionResponse 
} from '@/utils/reactionSystem';
import { 
  canUseTwoWeaponFighting,
  makeMainHandAttack,
  makeOffHandAttack,
  canMakeOffHandAttack,
  createDefaultLightWeapons,
  equipMainHandWeapon,
  equipOffHandWeapon
} from '@/utils/twoWeaponFighting';
import {
  rollDeathSave,
  applyDeathSaveResult,
  needsDeathSaves,
  dealDamageWithDeathRules,
  healParticipant,
  isDying,
  isDead
} from '@/utils/deathSaves';
import {
  isConcentrating,
  rollConcentrationSave,
  handleDamageAndConcentration,
  getConcentrationStatusDescription
} from '@/utils/concentrationUtils';
import {
  getExhaustionLevel,
  hasDisadvantageOnAttacksAndSaves,
  hasSpeedHalved,
  getExhaustionDescription
} from '@/utils/exhaustionUtils';
import {
  canBeTargeted,
  getEffectiveAC,
  getCoverDescription
} from '@/utils/coverUtils';
import {
  canSeeForAttack,
  getVisionDescription
} from '@/utils/visionUtils';
import {
  hasFightingStyle,
  getFightingStyleACBonus,
  getFightingStyleAttackBonus,
  getFightingStyleDamageBonus,
  applyGreatWeaponFighting,
  getTotalAC
} from '@/utils/fightingStyles';

const CombatInterface: React.FC = () => {
  const { 
    state, 
    startCombat, 
    endCombat, 
    nextTurn, 
    rollInitiative, 
    takeAction,
    addParticipant 
  } = useCombat();

  const { sessionId } = useGameSession();
  const { state: characterState } = useCharacter();
  const { validateCombatAction } = useCombatAIIntegration({
    sessionId,
    characterId: characterState.character?.id,
    campaignId: undefined // Will be passed from parent component
  });

  const { activeEncounter, isInCombat, showInitiativeTracker, showCombatLog } = state;
  
  const [selectedEnemy, setSelectedEnemy] = useState<string | null>(null);
  const [showCombatMode, setShowCombatMode] = useState(false);
  const [isStartingCombat, setIsStartingCombat] = useState(false);
  const [actionValidation, setActionValidation] = useState<{
    isValid: boolean;
    suggestions: string[];
    errors: string[];
  } | null>(null);
  const [reactionOpportunities, setReactionOpportunities] = useState<ReactionOpportunity[]>([]);
  const [showAdvantageModal, setShowAdvantageModal] = useState(false);
  const [pendingAttack, setPendingAttack] = useState<{
    participantId: string;
    targetId?: string;
    actionType: ActionType;
    hasAdvantage?: boolean;
    hasDisadvantage?: boolean;
  } | null>(null);

  // Get player characters and potential enemies
  const playerParticipants = activeEncounter?.participants.filter(p => p.participantType === 'player') || [];
  const enemyParticipants = activeEncounter?.participants.filter(p => p.participantType === 'monster') || [];
  
  // Handle starting combat
  const handleStartCombat = async () => {
    if (!isStartingCombat && playerParticipants.length > 0) {
      setIsStartingCombat(true);
      
      // Create basic combat encounter with current participants
      const combatParticipants = [
        ...playerParticipants,
        ...enemyParticipants
      ].map(p => ({
        id: p.id,
        participantType: p.participantType,
        name: p.name,
        characterId: p.characterId,
        initiative: 0, // Will be rolled automatically
        armorClass: p.armorClass,
        maxHitPoints: p.maxHitPoints,
        currentHitPoints: p.currentHitPoints,
        temporaryHitPoints: p.temporaryHitPoints,
        position: p.position,
        conditions: p.conditions,
        deathSaves: p.deathSaves || { successes: 0, failures: 0, isStable: false },
        actionTaken: false,
        bonusActionTaken: false,
        reactionTaken: false,
        movementUsed: 0,
        monsterData: p.monsterData,
        spellSlots: p.spellSlots,
        activeConcentration: p.activeConcentration,
      }));

      await startCombat('current-session', combatParticipants);
      setShowCombatMode(true);
      setIsStartingCombat(false);
    }
  };

  // Handle ending combat
  const handleEndCombat = async () => {
    await endCombat();
    setShowCombatMode(false);
    setSelectedEnemy(null);
  };

  // Validate and execute combat action
  const handleCombatAction = async (
    actionType: ActionType,
    participantId: string,
    targetId?: string,
    additionalData?: any
  ) => {
    if (!activeEncounter) return;

    const participant = activeEncounter.participants.find(p => p.id === participantId);
    if (!participant) return;

    // Create action for validation
    const action = {
      participantId,
      targetParticipantId: targetId,
      actionType,
      description: `${participant.name} attempts to ${actionType}`,
      ...additionalData
    };

    // Validate action with AI rules interpreter
    try {
      const validation = await validateCombatAction(action, participant);
      setActionValidation(validation);

      if (!validation.isValid) {
        // Show validation errors to user
        console.warn('Invalid combat action:', validation.errors);
        return;
      }

      // Execute valid action
      await takeAction(action);
      setActionValidation(null);

    } catch (error) {
      console.error('Error validating combat action:', error);
      // Proceed with action if validation fails
      await takeAction(action);
    }
  };

  // Handle enemy attack with AI integration
  const handleEnemyAttack = async (attack: any) => {
    if (!selectedEnemy || !activeEncounter) return;

    const enemy = activeEncounter.participants.find(p => p.id === selectedEnemy);
    if (!enemy) return;

    await handleCombatAction(
      'attack',
      selectedEnemy,
      activeEncounter.currentTurnParticipantId || '',
      {
        attackRoll: {
          total: Math.floor(Math.random() * 20) + 1 + (attack.attackBonus || 0),
          rolls: [Math.floor(Math.random() * 20) + 1],
          modifier: attack.attackBonus || 0
        },
        damageRolls: attack.damageRoll ? [{
          total: 0, // Will be calculated
          rolls: [],
          modifier: 0
        }] : [],
        damageType: attack.damageType,
        description: `${enemy.name} uses ${attack.name}`
      }
    );
    
    // Auto-advance turn after enemy action
    setTimeout(() => {
      nextTurn();
    }, 1500);
  };

  // Add a new enemy
  const addEnemy = () => {
    // For now, add a generic goblin as example
    const newEnemy = {
      id: `enemy-${Date.now()}`,
      participantType: 'monster',
      name: 'Goblin',
      characterId: null,
      initiative: 0,
      armorClass: 15,
      maxHitPoints: 7,
      currentHitPoints: 7,
      temporaryHitPoints: 0,
      position: { x: 0, y: 0 },
      conditions: [],
      deathSaves: { successes: 0, failures: 0 },
      actionTaken: false,
      bonusActionTaken: false,
      reactionTaken: false,
      movementUsed: 0,
      monsterData: {
        type: 'goblinoid',
        challengeRating: '1/4',
        alignment: 'lawful evil',
        specialAbilities: ['Nimble Escape'],
        attacks: [
          {
            name: 'Scimitar',
            attackBonus: 4,
            damageRoll: '1d6+2',
            damageType: 'slashing'
          },
          {
            name: 'Shortbow',
            attackBonus: 4,
            damageRoll: '1d6+2',
            damageType: 'piercing'
          }
        ]
      },
      spellSlots: undefined,
      activeConcentration: null
    };

    addParticipant(newEnemy);
  };

  // Handle enhanced attack with advantage/disadvantage
  const handleEnhancedAttack = async (
    participantId: string,
    targetId?: string,
    actionType: ActionType = 'attack',
    hasAdvantage: boolean = false,
    hasDisadvantage: boolean = false
  ) => {
    if (!activeEncounter) return;

    const participant = activeEncounter.participants.find(p => p.id === participantId);
    if (!participant) return;

    // Roll attack with advantage/disadvantage
    const attackBonus = 5; // This would come from character stats
    const attackRoll = rollAttack(attackBonus, { 
      advantage: hasAdvantage, 
      disadvantage: hasDisadvantage,
      halflingLucky: participant.racialTraits?.some(t => t.name === 'lucky') || false
    });

    // Check for critical hit
    const isCritical = attackRoll.critical || false;
    
    // Calculate base damage
    let damageRolls = rollDamage('1d8+3', isCritical);
    let totalDamage = damageRolls.reduce((sum, roll) => sum + roll.total, 0);

    // Add Sneak Attack damage if applicable
    if (participant.characterClass === 'rogue' && actionType === 'attack') {
      const sneakAttackDice = getSneakAttackDice(participant.level || 1);
      const sneakAttackDamage = rollDamage(`${sneakAttackDice}d6`, isCritical);
      damageRolls = [...damageRolls, ...sneakAttackDamage];
      totalDamage += sneakAttackDamage.reduce((sum, roll) => sum + roll.total, 0);
    }

    // Add Rage damage for Barbarian
    if (participant.isRaging && participant.characterClass === 'barbarian') {
      const rageDamage = getRageDamageBonus(participant.level || 1);
      totalDamage += rageDamage;
    }

    // Apply Divine Smite if this is a Paladin's attack
    if (participant.characterClass === 'paladin' && actionType === 'divine_smite' && participant.spellSlots) {
      const smiteLevel = 1; // Would be chosen by player
      if (participant.spellSlots[smiteLevel]?.current > 0) {
        const smiteDamage = rollDamage(`${1 + smiteLevel}d8`, isCritical);
        damageRolls = [...damageRolls, ...smiteDamage];
        totalDamage += smiteDamage.reduce((sum, roll) => sum + roll.total, 0);
      }
    }

    const action = {
      participantId,
      targetParticipantId: targetId,
      actionType,
      description: `${participant.name} attacks${hasAdvantage ? ' with advantage' : hasDisadvantage ? ' with disadvantage' : ''}${isCritical ? ' - CRITICAL HIT!' : ''}`,
      attackRoll: {
        dieType: attackRoll.dieType,
        count: attackRoll.count,
        modifier: attackRoll.modifier,
        results: attackRoll.results,
        total: attackRoll.total,
        advantage: attackRoll.advantage,
        disadvantage: attackRoll.disadvantage,
        critical: attackRoll.critical,
        naturalRoll: attackRoll.naturalRoll
      },
      damageRolls: damageRolls.map(roll => ({
        dieType: roll.dieType,
        count: roll.count,
        modifier: roll.modifier,
        results: roll.results,
        total: roll.total
      })),
      hit: attackRoll.total >= 15, // Would check against target AC
      damageDealt: totalDamage,
      damageType: 'slashing'
    };

    await handleCombatAction(actionType, participantId, targetId, action);
  };

  // Handle racial trait usage
  const handleRacialTraitUse = async (participantId: string, traitName: string) => {
    if (!activeEncounter) return;

    const participant = activeEncounter.participants.find(p => p.id === participantId);
    if (!participant || !participant.racialTraits) return;

    const trait = participant.racialTraits.find(t => t.name === traitName);
    if (!trait || !canUseRacialTrait(trait)) return;

    let description = '';
    switch (trait.name) {
      case 'breath_weapon':
        description = `${participant.name} uses their breath weapon`;
        // Would trigger saving throw for targets
        break;
      case 'relentless_endurance':
        description = `${participant.name} drops to 1 hit point instead of 0`;
        break;
      default:
        description = `${participant.name} uses ${trait.name}`;
    }

    const action = {
      participantId,
      actionType: 'use_racial_trait' as ActionType,
      description,
      traitUsed: trait.name
    };

    await handleCombatAction('bonus_action', participantId, undefined, action);
  };

  // Handle class feature usage
  const handleClassFeatureUse = async (participantId: string, featureName: string) => {
    if (!activeEncounter) return;

    const participant = activeEncounter.participants.find(p => p.id === participantId);
    if (!participant || !participant.classFeatures || !participant.resources) return;

    const feature = participant.classFeatures.find(f => f.name === featureName);
    if (!feature || !canUseClassFeature(feature, participant.resources)) return;

    let description = '';
    switch (feature.name) {
      case 'rage':
        description = `${participant.name} enters a rage`;
        // Would set isRaging flag and apply resistances
        break;
      case 'action_surge':
        description = `${participant.name} uses Action Surge for an additional action`;
        break;
      case 'second_wind':
        const healing = rollDice(10, 1, participant.level || 1);
        description = `${participant.name} uses Second Wind to heal ${healing.total} hit points`;
        break;
      default:
        description = `${participant.name} uses ${feature.name}`;
    }

    const action = {
      participantId,
      actionType: feature.type === 'bonus_action' ? 'bonus_action' : 'use_class_feature' as ActionType,
      description,
      featureUsed: feature.name
    };

    await handleCombatAction(feature.type as ActionType, participantId, undefined, action);
  };

  // Handle reaction opportunities
  const handleReactionOpportunity = async (opportunity: ReactionOpportunity, selectedReaction: ActionType) => {
    if (!activeEncounter) return;

    try {
      const reactionAction = processReactionResponse(opportunity, selectedReaction, activeEncounter);
      await takeAction(reactionAction);
      
      // Remove the opportunity after use
      setReactionOpportunities(prev => prev.filter(opp => opp.id !== opportunity.id));
    } catch (error) {
      console.error('Error processing reaction:', error);
    }
  };

  // Handle death saving throw
  const handleDeathSave = async (participantId: string) => {
    if (!activeEncounter) return;

    const participant = activeEncounter.participants.find(p => p.id === participantId);
    if (!participant || !needsDeathSaves(participant)) return;

    const deathSaveResult = rollDeathSave(participant);
    const updatedParticipant = applyDeathSaveResult(participant, deathSaveResult);

    const action = {
      participantId,
      actionType: 'death_save' as ActionType,
      description: deathSaveResult.description,
      deathSaveResult: {
        roll: deathSaveResult.roll,
        result: deathSaveResult.result,
        successes: deathSaveResult.newDeathSaves.successes,
        failures: deathSaveResult.newDeathSaves.failures,
        isStable: deathSaveResult.isStable,
        isDead: deathSaveResult.isDead
      }
    };

    await takeAction(action);
  };

  // Handle concentration save
  const handleConcentrationSave = async (participantId: string, dc: number) => {
    if (!activeEncounter) return;

    const participant = activeEncounter.participants.find(p => p.id === participantId);
    if (!participant || !isConcentrating(participant)) return;

    const concentrationResult = rollConcentrationSave(participant, dc);

    const action = {
      participantId,
      actionType: 'concentration_save' as ActionType,
      description: concentrationResult.description,
      concentrationResult: {
        succeeded: concentrationResult.succeeded,
        roll: concentrationResult.roll?.total || 0,
        dc,
        spellLost: !concentrationResult.succeeded
      }
    };

    await takeAction(action);
  };

  // Handle two-weapon fighting attacks
  const handleTwoWeaponAttack = async (participantId: string, targetId?: string) => {
    if (!activeEncounter) return;

    const participant = activeEncounter.participants.find(p => p.id === participantId);
    if (!participant) return;

    // Equip default weapons if none equipped (for testing)
    let updatedParticipant = participant;
    if (!participant.mainHandWeapon || !participant.offHandWeapon) {
      const weapons = createDefaultLightWeapons();
      updatedParticipant = equipMainHandWeapon(participant, weapons.scimitar);
      updatedParticipant = equipOffHandWeapon(updatedParticipant, weapons.shortsword);
    }

    if (!canUseTwoWeaponFighting(updatedParticipant)) {
      console.warn('Cannot use two-weapon fighting');
      return;
    }

    // Main hand attack (action)
    const mainHandAttack = makeMainHandAttack(updatedParticipant, targetId || selectedEnemy || '');
    await takeAction(mainHandAttack);

    // Off-hand attack (bonus action) - if bonus action available
    if (canMakeOffHandAttack(updatedParticipant)) {
      const offHandAttack = makeOffHandAttack(updatedParticipant, targetId || selectedEnemy || '');
      await takeAction(offHandAttack);
    }
  };

  // Handle damage with all the new systems
  const handleEnhancedDamage = async (participantId: string, damage: number, damageType: string) => {
    if (!activeEncounter) return;

    const participant = activeEncounter.participants.find(p => p.id === participantId);
    if (!participant) return;

    // Apply damage with death rules
    const damageResult = dealDamageWithDeathRules(participant, damage);
    
    // Handle concentration if taking damage
    let concentrationResult = null;
    if (isConcentrating(participant) && damage > 0) {
      const conResult = handleDamageAndConcentration(participant, damage);
      concentrationResult = conResult;
    }

    const action = {
      participantId,
      actionType: 'damage_dealt' as ActionType,
      description: `${participant.name} takes ${damage} ${damageType} damage`,
      damageDealt: damage,
      damageType,
      effects: {
        unconscious: damageResult.unconscious,
        instantDeath: damageResult.instantDeath,
        concentrationLost: concentrationResult?.concentrationLost || false,
        newHitPoints: damageResult.participant.currentHitPoints
      }
    };

    await takeAction(action);
  };

  // Handle healing
  const handleHealing = async (participantId: string, healingAmount: number) => {
    if (!activeEncounter) return;

    const participant = activeEncounter.participants.find(p => p.id === participantId);
    if (!participant) return;

    const healingResult = healParticipant(participant, healingAmount);

    const action = {
      participantId,
      actionType: 'heal' as ActionType,
      description: healingResult.description,
      healingAmount,
      effects: {
        revivedFromUnconscious: healingResult.revivedFromUnconscious,
        newHitPoints: healingResult.participant.currentHitPoints
      }
    };

    await takeAction(action);
  };

  if (!showCombatMode) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sword className="w-5 h-5" />
            Combat Ready
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">
              Prepare for battle! Your party is ready to engage enemies.
            </div>
            
            {playerParticipants.length === 0 ? (
              <div className="text-destructive mb-4">
                No player characters found. Please ensure your character is selected.
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                <p className="text-sm text-muted-foreground">
                  Party: {playerParticipants.map(p => p.name).join(', ')}
                </p>
                {enemyParticipants.length > 0 && (
                  <p className="text-sm text-destructive">
                    Enemies: {enemyParticipants.map(p => p.name).join(', ')}
                  </p>
                )}
              </div>
            )}
            
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={addEnemy}
                variant="outline"
                size="sm"
              >
                <Users className="w-4 h-4 mr-2" />
                Add Enemy
              </Button>
              <Button 
                onClick={handleStartCombat}
                disabled={isStartingCombat || playerParticipants.length === 0}
              >
                {isStartingCombat ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Begin Combat
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Combat Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <CardTitle className="text-xl">COMBAT IN PROGRESS</CardTitle>
            <Badge variant="destructive" className="text-sm">
              Round {activeEncounter?.currentRound || 1}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowInitiativeTracker(!showInitiativeTracker)}
            >
              {showInitiativeTracker ? 'Hide' : 'Show'} Tracker
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleEndCombat}
            >
              <X className="w-4 h-4 mr-2" />
              End Combat
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Initiative Tracker */}
        {showInitiativeTracker && (
          <div className="lg:col-span-1">
            <InitiativeTracker />
          </div>
        )}

        {/* Main Combat Area */}
        <div className={`lg:col-span-${showInitiativeTracker ? '3' : '4'}`}>
          <div className="space-y-6">
            {/* Current Turn Info */}
            {activeEncounter?.currentTurnParticipantId && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                      <span className="font-semibold">
                        {activeEncounter.participants.find(p => p.id === activeEncounter.currentTurnParticipantId)?.name}'s Turn
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={nextTurn}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Next Turn
                    </Button>
                  </div>
                  
                  {/* Quick Actions */}
                  <Separator className="my-3" />
                  
                  {/* Action Validation Display */}
                  {actionValidation && !actionValidation.isValid && (
                    <div className="mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                      <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                        <AlertTriangle className="w-4 h-4" />
                        Action Invalid
                      </div>
                      <ul className="text-xs text-destructive/80 mt-1 ml-6">
                        {actionValidation.errors.map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {actionValidation && actionValidation.suggestions.length > 0 && (
                    <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
                      <div className="text-amber-800 text-sm font-medium">Tactical Suggestions</div>
                      <ul className="text-xs text-amber-700 mt-1">
                        {actionValidation.suggestions.map((suggestion, i) => (
                          <li key={i}>• {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Basic Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <DiceRoller 
                        dice="1d20" 
                        label="Initiative" 
                        modifier={0}
                        onRoll={(result) => rollInitiative(activeEncounter.currentTurnParticipantId!)}
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEnhancedAttack(activeEncounter.currentTurnParticipantId!, selectedEnemy || undefined)}
                      >
                        Attack
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEnhancedAttack(activeEncounter.currentTurnParticipantId!, selectedEnemy || undefined, 'attack', true, false)}
                      >
                        Attack (Advantage)
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCombatAction('grapple', activeEncounter.currentTurnParticipantId!, selectedEnemy)}
                      >
                        Grapple
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCombatAction('shove', activeEncounter.currentTurnParticipantId!, selectedEnemy)}
                      >
                        Shove
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleTwoWeaponAttack(activeEncounter.currentTurnParticipantId!, selectedEnemy)}
                      >
                        Two-Weapon Attack
                      </Button>
                    </div>

                    {/* Movement & Utility */}
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCombatAction('dash', activeEncounter.currentTurnParticipantId!)}
                      >
                        Dash
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCombatAction('dodge', activeEncounter.currentTurnParticipantId!)}
                      >
                        Dodge
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCombatAction('help', activeEncounter.currentTurnParticipantId!)}
                      >
                        Help
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCombatAction('hide', activeEncounter.currentTurnParticipantId!)}
                      >
                        Hide
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCombatAction('ready', activeEncounter.currentTurnParticipantId!)}
                      >
                        Ready Action
                      </Button>
                    </div>

                    {/* Spellcasting */}
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCombatAction('cast_spell', activeEncounter.currentTurnParticipantId!)}
                      >
                        Cast Spell
                      </Button>
                    </div>

                    {/* Class Features */}
                    {activeEncounter?.currentTurnParticipantId && (() => {
                      const currentParticipant = activeEncounter.participants.find(p => p.id === activeEncounter.currentTurnParticipantId);
                      if (!currentParticipant?.classFeatures) return null;

                      return (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Class Features:</div>
                          <div className="flex gap-2 flex-wrap">
                            {currentParticipant.classFeatures
                              .filter(feature => feature.type !== 'passive' && canUseClassFeature(feature, currentParticipant.resources || {}))
                              .map(feature => (
                                <Button
                                  key={feature.name}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleClassFeatureUse(currentParticipant.id, feature.name)}
                                  className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                                >
                                  {feature.name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  {feature.currentUses !== undefined && (
                                    <span className="ml-1 text-xs">({feature.currentUses}/{feature.maxUses})</span>
                                  )}
                                </Button>
                              ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Racial Traits */}
                    {activeEncounter?.currentTurnParticipantId && (() => {
                      const currentParticipant = activeEncounter.participants.find(p => p.id === activeEncounter.currentTurnParticipantId);
                      if (!currentParticipant?.racialTraits) return null;

                      const activeTraits = currentParticipant.racialTraits.filter(trait => 
                        trait.type === 'active' && canUseRacialTrait(trait)
                      );

                      if (activeTraits.length === 0) return null;

                      return (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Racial Traits:</div>
                          <div className="flex gap-2 flex-wrap">
                            {activeTraits.map(trait => (
                              <Button
                                key={trait.name}
                                variant="outline"
                                size="sm"
                                onClick={() => handleRacialTraitUse(currentParticipant.id, trait.name)}
                                className="bg-green-50 hover:bg-green-100 border-green-200"
                              >
                                {trait.name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                {trait.currentUses !== undefined && (
                                  <span className="ml-1 text-xs">({trait.currentUses}/{trait.maxUses})</span>
                                )}
                              </Button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Status Effects and Conditions */}
                    {activeEncounter?.currentTurnParticipantId && (() => {
                      const currentParticipant = activeEncounter.participants.find(p => p.id === activeEncounter.currentTurnParticipantId);
                      if (!currentParticipant) return null;

                      const exhaustionLevel = getExhaustionLevel(currentParticipant.conditions);
                      const isConc = isConcentrating(currentParticipant);
                      const isDyingStatus = isDying(currentParticipant);
                      const isDeadStatus = isDead(currentParticipant);

                      if (exhaustionLevel === 0 && !isConc && !isDyingStatus && !isDeadStatus && 
                          (!currentParticipant.cover || currentParticipant.cover.type === 'none')) {
                        return null;
                      }

                      return (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Status:</div>
                          <div className="flex gap-2 flex-wrap">
                            {exhaustionLevel > 0 && (
                              <Badge variant="destructive">
                                Exhaustion {exhaustionLevel} - {getExhaustionDescription(exhaustionLevel)}
                              </Badge>
                            )}
                            
                            {isConc && (
                              <Badge variant="outline" className="border-blue-500 text-blue-700">
                                {getConcentrationStatusDescription(currentParticipant)}
                              </Badge>
                            )}
                            
                            {isDyingStatus && (
                              <div className="flex gap-2">
                                <Badge variant="destructive">
                                  Dying ({currentParticipant.deathSaves.successes}/3 successes, {currentParticipant.deathSaves.failures}/3 failures)
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeathSave(currentParticipant.id)}
                                >
                                  Roll Death Save
                                </Button>
                              </div>
                            )}
                            
                            {isDeadStatus && (
                              <Badge variant="destructive">Dead</Badge>
                            )}
                            
                            {currentParticipant.cover && currentParticipant.cover.type !== 'none' && (
                              <Badge variant="outline" className="border-gray-500">
                                {getCoverDescription(currentParticipant.cover.type)}
                              </Badge>
                            )}

                            {currentParticipant.conditions.filter(c => c.name !== 'exhaustion').map(condition => (
                              <Badge 
                                key={condition.name} 
                                variant="outline" 
                                className="border-orange-500 text-orange-700"
                              >
                                {condition.name.charAt(0).toUpperCase() + condition.name.slice(1)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Fighting Style Information */}
                    {activeEncounter?.currentTurnParticipantId && (() => {
                      const currentParticipant = activeEncounter.participants.find(p => p.id === activeEncounter.currentTurnParticipantId);
                      if (!currentParticipant?.fightingStyles || currentParticipant.fightingStyles.length === 0) return null;

                      return (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Fighting Styles:</div>
                          <div className="flex gap-2 flex-wrap">
                            {currentParticipant.fightingStyles.map(style => (
                              <Badge 
                                key={style.name} 
                                variant="outline" 
                                className="border-purple-500 text-purple-700"
                              >
                                {style.name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total AC: {getTotalAC(currentParticipant)}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Vision Information */}
                    {activeEncounter?.currentTurnParticipantId && (() => {
                      const currentParticipant = activeEncounter.participants.find(p => p.id === activeEncounter.currentTurnParticipantId);
                      if (!currentParticipant?.visionTypes || currentParticipant.visionTypes.length <= 1) return null;

                      return (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Vision:</div>
                          <div className="text-xs text-muted-foreground">
                            {getVisionDescription(currentParticipant).join(', ')}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reaction Opportunities */}
            {reactionOpportunities.length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Reaction Opportunities
                  </CardTitle>
                  <p className="text-sm text-amber-700">
                    Choose a reaction or dismiss to continue
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reactionOpportunities.map(opportunity => {
                    const participant = activeEncounter?.participants.find(p => p.id === opportunity.participantId);
                    if (!participant) return null;

                    return (
                      <div key={opportunity.id} className="p-3 bg-white rounded-lg border border-amber-200">
                        <div className="text-sm font-medium text-amber-900 mb-2">
                          {participant.name}: {opportunity.triggerDescription}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {opportunity.availableReactions.map(reaction => (
                            <Button
                              key={reaction}
                              size="sm"
                              onClick={() => handleReactionOpportunity(opportunity, reaction)}
                              className="bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300"
                            >
                              {reaction.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Button>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReactionOpportunities(prev => prev.filter(opp => opp.id !== opportunity.id))}
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Enemy Cards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Enemies
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Click enemies to target them for attacks
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {enemyParticipants.map((enemy) => (
                    <div 
                      key={enemy.id}
                      className={`cursor-pointer transition-all ${
                        selectedEnemy === enemy.id 
                          ? 'ring-2 ring-red-500 ring-opacity-50' 
                          : 'hover:ring-1 hover:ring-red-200'
                      }`}
                      onClick={() => setSelectedEnemy(selectedEnemy === enemy.id ? null : enemy.id)}
                    >
                      <EnemyCard 
                        enemyId={enemy.id}
                        onAttack={handleEnemyAttack}
                      />
                    </div>
                  ))}
                  
                  {enemyParticipants.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>No enemies in combat</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={addEnemy}
                        className="mt-2"
                      >
                        Add Enemy
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Combat Log */}
            {showCombatLog && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    Combat Log
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {activeEncounter?.actions.slice(-10).reverse().map((action, index) => (
                      <div key={index} className="text-sm p-2 bg-muted/50 rounded-md">
                        <div className="font-medium">{action.description}</div>
                        
                        {action.attackRoll && (
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                              <span>Attack: {action.attackRoll.total}</span>
                              {action.attackRoll.advantage && <Badge variant="outline" className="text-green-600">Advantage</Badge>}
                              {action.attackRoll.disadvantage && <Badge variant="outline" className="text-red-600">Disadvantage</Badge>}
                              {action.attackRoll.critical && <Badge variant="destructive">CRITICAL!</Badge>}
                            </div>
                            <div>
                              Rolled: {action.attackRoll.results?.join(', ')} 
                              {action.attackRoll.modifier !== 0 && ` + ${action.attackRoll.modifier}`}
                            </div>
                          </div>
                        )}
                        
                        {action.damageRolls && action.damageRolls.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Damage Rolls: {action.damageRolls.map(roll => 
                              `${roll.results?.join(', ')}${roll.modifier ? ` + ${roll.modifier}` : ''} = ${roll.total}`
                            ).join(' | ')}
                          </div>
                        )}
                        
                        {action.damageDealt && action.damageDealt > 0 && (
                          <div className="text-xs text-destructive font-medium">
                            Total Damage: {action.damageDealt} {action.damageType}
                          </div>
                        )}
                        
                        {action.conditionsApplied && action.conditionsApplied.length > 0 && (
                          <div className="text-xs text-blue-600">
                            Conditions: {action.conditionsApplied.map(c => c.name).join(', ')}
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground mt-1">
                          {action.timestamp ? new Date(action.timestamp).toLocaleTimeString() : 'Just now'}
                        </div>
                      </div>
                    ))}
                    {activeEncounter?.actions.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        Combat log will appear here...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CombatInterface;

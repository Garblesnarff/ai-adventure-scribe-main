/**
 * Combat Interface Component
 *
 * Main combat UI that integrates all combat components.
 * Shows initiative tracker, enemy cards, and combat controls.
 * Manages combat mode and participant selection.
 */

import {
  Sword,
  Shield,
  Users,
  X,
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  Flame,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';

import ActionPanel from './ActionPanel';
import DeathSaveManager from './DeathSaveManager';
import EnemyCard from './EnemyCard';
import HPTracker from './HPTracker';
import InitiativeTracker from './InitiativeTracker';
import ReactionOpportunityPanel from './ReactionOpportunityPanel';

import type { ActionType, ReactionOpportunity } from '@/types/combat';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import DiceRoller from '@/components/ui/dice-roller';
import { Separator } from '@/components/ui/separator';
import { useCharacter } from '@/contexts/CharacterContext';
import { useCombat } from '@/contexts/CombatContext';
import { useCombatAIIntegration } from '@/hooks/use-combat-ai-integration';
import { useGameSession } from '@/hooks/use-game-session';

import logger from '@/lib/logger';

import { calculateAttackDamage } from '@/utils/attackUtils';
import {
  getClassFeatures,
  canUseClassFeature,
  useClassFeature,
  getSneakAttackDice,
  getRageDamageBonus,
} from '@/utils/classFeatures';
import { rollDeathSave, needsDeathSaves } from '@/utils/combat/deathSaves';
import { rollDice, rollAttack, rollDamage, calculateDamage } from '@/utils/diceUtils';
import {
  createDefaultLightWeapons,
  equipMainHandWeapon,
  equipOffHandWeapon,
} from '@/utils/equipmentUtils';
import { getRacialTraits, canUseRacialTrait, useRacialTrait } from '@/utils/racialTraits';
import {
  createReactionOpportunity,
  checkOpportunityAttacks,
  checkCounterspellOpportunities,
  processReactionResponse,
} from '@/utils/reactionSystem';
import { checkConcentration } from '@/utils/spell-management';
import {
  canUseTwoWeaponFighting,
  makeMainHandAttack,
  makeOffHandAttack,
  canMakeOffHandAttack,
} from '@/utils/twoWeaponFighting';

interface CombatInterfaceProps {
  isDM?: boolean;
}

const CombatInterface: React.FC<CombatInterfaceProps> = ({ isDM = false }) => {
  const {
    state,
    startCombat,
    endCombat,
    nextTurn,
    rollInitiative,
    takeAction,
    addParticipant,
    updateParticipant,
  } = useCombat();

  const { sessionId } = useGameSession();
  const { state: characterState } = useCharacter();
  const { validateCombatAction } = useCombatAIIntegration({
    sessionId,
    characterId: characterState.character?.id,
    campaignId: undefined, // Will be passed from parent component
  });

  const {
    activeEncounter,
    isInCombat,
    showInitiativeTracker = false,
    showCombatLog = false,
  } = state;

  const [localShowInitiativeTracker, setLocalShowInitiativeTracker] =
    useState(showInitiativeTracker);

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
  const playerParticipants =
    activeEncounter?.participants.filter((p) => p.participantType === 'player') || [];
  const enemyParticipants =
    activeEncounter?.participants.filter((p) => (p.participantType as string) === 'monster') || [];
  const playerCharacterId = characterState.character?.id;
  const isPlayersTurn = Boolean(
    activeEncounter?.currentTurnParticipantId &&
      activeEncounter.participants.find((p) => p.id === activeEncounter.currentTurnParticipantId)
        ?.characterId === playerCharacterId,
  );

  // Handle starting combat
  const handleStartCombat = async () => {
    if (!isStartingCombat && playerParticipants.length > 0) {
      setIsStartingCombat(true);

      // Create basic combat encounter with current participants
      const combatParticipants = [...playerParticipants, ...enemyParticipants].map((p) => ({
        id: p.id,
        participantType: p.participantType,
        name: p.name,
        characterId: p.characterId,
        initiative: 0, // Will be rolled automatically
        armorClass: p.armorClass,
        maxHitPoints: p.maxHitPoints,
        currentHitPoints: p.currentHitPoints,
        temporaryHitPoints: p.temporaryHitPoints || 0,
        position: (p as any).position || { x: 0, y: 0 },
        conditions: p.conditions || [],
        deathSaves: p.deathSaves || { successes: 0, failures: 0, isStable: false },
        actionTaken: false,
        bonusActionTaken: false,
        reactionTaken: false,
        movementUsed: 0,
        monsterData: (p as any).monsterData,
        spellSlots: p.spellSlots,
        activeConcentration: p.activeConcentration,
        abilityScores: (p as any).abilityScores || {},
        isUnconscious: false,
        isDead: false,
        isStable: false,
        visionTypes: (p as any).visionTypes || ['normal'],
        fightingStyles: (p as any).fightingStyles || [],
        racialTraits: (p as any).racialTraits || [],
        classFeatures: (p as any).classFeatures || [],
        resources: (p as any).resources || {},
        characterClass: (p as any).characterClass || '',
        isRaging: false,
        cover: (p as any).cover || { type: 'none' },
      })) as any[];

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
    additionalData?: any,
  ) => {
    if (!activeEncounter) return;

    const participant = activeEncounter.participants.find((p) => p.id === participantId);
    if (!participant) return;

    // Create action for validation
    const action = {
      participantId,
      targetParticipantId: targetId,
      actionType,
      description: `${participant.name} attempts to ${actionType}`,
      ...additionalData,
    };

    // Validate action with AI rules interpreter
    try {
      const validation = await validateCombatAction(action, participant);
      setActionValidation(validation);

      if (!validation.isValid) {
        // Show validation errors to user
        logger.warn('Invalid combat action:', validation.errors);
        return;
      }

      // Execute valid action
      await takeAction(action);
      setActionValidation(null);
    } catch (error) {
      logger.error('Error validating combat action:', error);
      // Proceed with action if validation fails
      await takeAction(action);
    }
  };

  // Handle enemy attack with AI integration
  const handleEnemyAttack = async (attack: any) => {
    if (!selectedEnemy || !activeEncounter) return;

    const enemy = activeEncounter.participants.find((p) => p.id === selectedEnemy);
    if (!enemy) return;

    await handleCombatAction(
      'attack',
      selectedEnemy,
      activeEncounter.currentTurnParticipantId || '',
      {
        attackRoll: {
          total: Math.floor(Math.random() * 20) + 1 + (attack.attackBonus || 0),
          rolls: [Math.floor(Math.random() * 20) + 1],
          modifier: attack.attackBonus || 0,
        },
        damageRolls: attack.damageRoll
          ? [
              {
                total: 0, // Will be calculated
                rolls: [],
                modifier: 0,
              },
            ]
          : [],
        damageType: attack.damageType,
        description: `${enemy.name} uses ${attack.name}`,
      },
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
      participantType: 'monster' as any,
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
            damageType: 'slashing',
          },
          {
            name: 'Shortbow',
            attackBonus: 4,
            damageRoll: '1d6+2',
            damageType: 'piercing',
          },
        ],
      },
      spellSlots: undefined,
      activeConcentration: null,
      abilityScores: {},
      isUnconscious: false,
      isDead: false,
      isStable: false,
      visionTypes: ['normal'],
      fightingStyles: [],
      racialTraits: [],
      classFeatures: [],
      resources: {},
      characterClass: '',
      isRaging: false,
      cover: { type: 'none' },
    } as any;

    addParticipant(newEnemy);
  };

  // Handle enhanced attack with optional Divine Smite
  const handleEnhancedAttack = async (
    participantId: string,
    targetId?: string,
    actionType: ActionType = 'attack',
    hasAdvantage: boolean = false,
    hasDisadvantage: boolean = false,
    divineSmiteSlotLevel?: number, // For Paladin's Divine Smite
  ) => {
    if (!activeEncounter) return;

    const participant = activeEncounter.participants.find((p) => p.id === participantId);
    if (!participant) return;

    // Roll attack with advantage/disadvantage
    const attackBonus = 5; // This would come from character stats
    const attackRoll = rollAttack(attackBonus, {
      advantage: hasAdvantage,
      disadvantage: hasDisadvantage,
      halflingLucky: participant.racialTraits?.some((t) => t.name === 'lucky') || false,
    });

    // Check for critical hit
    const isCritical = attackRoll.critical || false;

    // Calculate base damage with sneak attack and divine smite
    const damageResult = calculateAttackDamage(
      { name: 'Longsword', damage: '1d8+3', damageType: 'slashing', properties: {} },
      participant,
      false,
      isCritical,
      undefined,
      activeEncounter,
      divineSmiteSlotLevel,
    );

    let damageRolls = [damageResult.baseDamageRoll];
    let totalDamage = damageResult.baseDamageRoll.reduce((sum, roll) => sum + (roll.total || 0), 0);

    // Add sneak attack damage if applicable
    if (damageResult.sneakAttackRoll) {
      damageRolls = [...damageRolls, ...damageResult.sneakAttackRoll];
      totalDamage += damageResult.sneakAttackRoll.reduce((sum, roll) => sum + (roll.total || 0), 0);
    }

    // Add divine smite damage if applicable
    if (damageResult.divineSmiteRoll) {
      damageRolls = [...damageRolls, ...damageResult.divineSmiteRoll];
      totalDamage += damageResult.divineSmiteRoll.reduce((sum, roll) => sum + (roll.total || 0), 0);
    }

    // Add Rage damage for Barbarian
    if (participant.isRaging && participant.characterClass === 'barbarian') {
      const rageDamage = getRageDamageBonus(participant.level || 1);
      totalDamage += rageDamage;
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
        naturalRoll: attackRoll.naturalRoll,
      },
      damageRolls: damageRolls.map((roll) => ({
        dieType: roll.dieType,
        count: roll.count,
        modifier: roll.modifier,
        results: roll.results,
        total: roll.total,
      })),
      hit: attackRoll.total >= 15, // Would check against target AC
      damageDealt: totalDamage,
      damageType: 'slashing',
    };

    await handleCombatAction(actionType, participantId, targetId, action);
  };

  // Handle racial trait usage
  const handleRacialTraitUse = async (participantId: string, traitName: string) => {
    if (!activeEncounter) return;

    const participant = activeEncounter.participants.find((p) => p.id === participantId);
    if (!participant || !participant.racialTraits) return;

    const trait = participant.racialTraits.find((t) => t.name === traitName);
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
      traitUsed: trait.name,
    };

    await handleCombatAction('bonus_action', participantId, undefined, action);
  };

  // Handle class features
  const handleClassFeature = async (participantId: string, featureName: string) => {
    if (!activeEncounter) return;

    const participant = activeEncounter.participants.find((p) => p.id === participantId);
    if (!participant || !participant.classFeatures || !participant.resources) return;

    const feature = participant.classFeatures.find((f) => f.name === featureName);
    if (!feature || !canUseClassFeature(feature, participant.resources)) return;

    let description = '';
    let actionType: ActionType = 'use_class_feature' as ActionType;

    switch (feature.name) {
      case 'rage':
        // If already raging, deactivate rage
        if (participant.isRaging) {
          description = `${participant.name} stops raging`;
          actionType = 'end_rage' as ActionType;
        } else {
          description = `${participant.name} enters a rage`;
          actionType = 'use_class_feature' as ActionType;
        }
        break;
      case 'action_surge':
        description = `${participant.name} uses Action Surge for an additional action`;
        actionType = 'action_surge' as ActionType;
        break;
      case 'second_wind': {
        const healing = rollDice(10, 1, participant.level || 1);
        description = `${participant.name} uses Second Wind to heal ${healing.total} hit points`;
        actionType = 'second_wind' as ActionType;
        break;
      }
      default:
        description = `${participant.name} uses ${feature.name}`;
    }

    const action = {
      participantId,
      actionType,
      description,
      featureUsed: feature.name,
    };

    await handleCombatAction(actionType, participantId, undefined, action);
  };

  // Handle reaction opportunities
  const handleReactionOpportunity = async (
    opportunity: ReactionOpportunity,
    selectedReaction: ActionType,
  ) => {
    if (!activeEncounter) return;

    try {
      const reactionAction = processReactionResponse(
        opportunity,
        selectedReaction,
        activeEncounter,
      );
      await takeAction(reactionAction);

      // Mark participant as having used their reaction
      const participant = activeEncounter.participants.find(
        (p) => p.id === opportunity.participantId,
      );
      if (participant) {
        updateParticipant(opportunity.participantId, { reactionTaken: true });
      }

      // Remove the opportunity after use
      setReactionOpportunities((prev) => prev.filter((opp) => opp.id !== opportunity.id));
    } catch (error) {
      logger.error('Error processing reaction:', error);
    }
  };

  // Handle death saving throw
  const handleDeathSave = async (participantId: string) => {
    if (!activeEncounter) return;

    const participant = activeEncounter.participants.find((p) => p.id === participantId);
    if (!participant || !needsDeathSaves(participant)) return;

    const { updatedParticipant, roll } = rollDeathSave(participant);

    // Update participant state
    updateParticipant(participantId, {
      deathSaves: updatedParticipant.deathSaves,
      isStable: updatedParticipant.isStable,
      isDead: updatedParticipant.isDead,
      currentHitPoints: updatedParticipant.currentHitPoints,
      isUnconscious: updatedParticipant.isUnconscious,
    });

    const description = `${participant.name} death save: ${roll.total} ${roll.total >= 10 ? '(Success)' : '(Failure)'} (${updatedParticipant.deathSaves.successes}/3, ${updatedParticipant.deathSaves.failures}/3)`;

    const action = {
      participantId,
      actionType: 'death_save' as ActionType,
      description,
      deathSaveResult: {
        roll: roll.total,
        result: roll.total >= 10 ? 'success' : 'failure',
        successes: updatedParticipant.deathSaves.successes,
        failures: updatedParticipant.deathSaves.failures,
        isStable: updatedParticipant.isStable,
        isDead: updatedParticipant.isDead,
        isCritical: roll.critical,
      },
    };

    await takeAction(action);
  };

  // Handle concentration save
  const handleConcentrationSave = async (participantId: string, dc: number) => {
    if (!activeEncounter) return;

    const participant = activeEncounter.participants.find((p) => p.id === participantId);
    if (!participant || !(participant as any).activeConcentration) return;

    // Inline concentration save logic
    const conMod = (participant as any).abilityScores?.constitution?.modifier || 0;
    const proficiencyBonus = Math.floor((participant.level || 1) / 4) + 2;
    const saveBonus = conMod + proficiencyBonus; // Assuming proficiency in Con saves
    const rollResult = Math.floor(Math.random() * 20) + 1 + saveBonus;
    const succeeded = rollResult >= dc;
    const description = `${participant.name} makes concentration save: ${rollResult} ${succeeded ? '(Success)' : '(Failure)'}`;

    const action = {
      participantId,
      actionType: 'concentration_save' as ActionType,
      description,
      concentrationResult: {
        succeeded,
        roll: rollResult,
        dc,
        spellLost: !succeeded,
      },
    };

    if (!succeeded) {
      // Drop concentration
      participant.activeConcentration = null;
    }

    await takeAction(action);
  };

  // Handle two-weapon fighting attacks
  const handleTwoWeaponAttack = async (participantId: string, targetId?: string) => {
    if (!activeEncounter) return;

    const participant = activeEncounter.participants.find((p) => p.id === participantId);
    if (!participant) return;

    // Equip default weapons if none equipped (for testing)
    let updatedParticipant = participant;
    if (!participant.mainHandWeapon || !participant.offHandWeapon) {
      const weapons = createDefaultLightWeapons();
      updatedParticipant = equipMainHandWeapon(participant, weapons.scimitar);
      updatedParticipant = equipOffHandWeapon(updatedParticipant, weapons.shortsword);
    }

    if (!canUseTwoWeaponFighting(updatedParticipant)) {
      logger.warn('Cannot use two-weapon fighting');
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

  // Handle applying direct damage
  const handleApplyDamage = async (
    participantId: string,
    damageAmount: number,
    damageType: string,
  ) => {
    if (!activeEncounter) return;
    const participant = activeEncounter.participants.find((p) => p.id === participantId);
    if (!participant) return;

    const newHP = Math.max(0, (participant.currentHitPoints || 0) - damageAmount);
    const isUnconscious = newHP <= 0;

    let concentrationLost = false;
    if (participant.activeConcentration && damageAmount > 0) {
      concentrationLost = !checkConcentration(participant as any, damageAmount);
    }

    const updatedProps: Partial<CombatParticipant> = {
      currentHitPoints: newHP,
      isUnconscious,
    };

    if (concentrationLost) {
      updatedProps.activeConcentration = null;
    }

    if (isUnconscious && (participant.currentHitPoints || 0) > 0) {
      updatedProps.isStable = false;
      updatedProps.deathSaves = { successes: 0, failures: 0 };
    }

    updateParticipant(participantId, updatedProps);

    const action = {
      participantId,
      actionType: 'damage_dealt' as ActionType,
      description: `${participant.name} takes ${damageAmount} ${damageType} damage.`,
      damageDealt: damageAmount,
      damageType: damageType as any,
      effects: {
        newHitPoints: newHP,
        unconscious: isUnconscious,
        concentrationLost,
      },
    };
    await takeAction(action);
  };

  // Handle healing
  const handleHealing = async (participantId: string, healingAmount: number) => {
    if (!activeEncounter) return;

    const participant = activeEncounter.participants.find((p) => p.id === participantId);
    if (!participant) return;

    // Simple healing logic
    const maxHP = participant.maxHitPoints || 1;
    const newHP = Math.min(maxHP, (participant.currentHitPoints || 0) + healingAmount);
    const wasUnconscious = (participant.currentHitPoints || 0) <= 0;
    const revived = wasUnconscious && newHP > 0;

    // Update participant
    updateParticipant(participantId, {
      currentHitPoints: newHP,
      isUnconscious: (newHP <= 0) as any,
    } as any);

    const description = `${participant.name} heals ${healingAmount} hit points${revived ? ' and regains consciousness' : ''}`;

    const action = {
      participantId,
      actionType: 'heal' as ActionType,
      description,
      healingAmount,
      effects: {
        revivedFromUnconscious: revived,
        newHitPoints: newHP,
      },
    };

    await takeAction(action);
  };

  // Show the pre-combat card only if combat hasn't started
  if (!isInCombat && !showCombatMode) {
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
                  Party: {playerParticipants.map((p) => p.name).join(', ')}
                </p>
                {enemyParticipants.length > 0 && (
                  <p className="text-sm text-destructive">
                    Enemies: {enemyParticipants.map((p) => p.name).join(', ')}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-center">
              {isDM ? (
                <>
                  <Button onClick={addEnemy} variant="outline" size="sm">
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
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  The DM will begin combat when ready.
                </div>
              )}
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
              onClick={() => setLocalShowInitiativeTracker(!localShowInitiativeTracker)}
            >
              {localShowInitiativeTracker ? 'Hide' : 'Show'} Tracker
            </Button>
            {isDM && (
              <Button variant="destructive" size="sm" onClick={handleEndCombat}>
                <X className="w-4 h-4 mr-2" />
                End Combat
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Initiative Tracker */}
        {localShowInitiativeTracker && (
          <div className="lg:col-span-1">
            <InitiativeTracker />
          </div>
        )}

        {/* Main Combat Area */}
        <div className={`lg:col-span-${localShowInitiativeTracker ? '3' : '4'}`}>
          <div className="space-y-6">
            {activeEncounter?.currentTurnParticipantId && (isDM || isPlayersTurn) && (
              <ActionPanel
                activeEncounter={activeEncounter}
                currentParticipantId={activeEncounter.currentTurnParticipantId}
                selectedEnemyId={selectedEnemy}
                actionValidation={actionValidation}
                onCombatAction={handleCombatAction}
                onNextTurn={nextTurn}
                onRollInitiative={rollInitiative}
                onTwoWeaponAttack={handleTwoWeaponAttack}
                onEnhancedAttack={handleEnhancedAttack}
                onClassFeatureUse={handleClassFeature}
                onRacialTraitUse={handleRacialTraitUse}
                onDeathSave={handleDeathSave}
                showNextTurnButton={isDM}
              />
            )}

            <ReactionOpportunityPanel
              opportunities={reactionOpportunities}
              onReactionSelected={handleReactionOpportunity}
              onOpportunityDismissed={(opportunityId) =>
                setReactionOpportunities((prev) => prev.filter((opp) => opp.id !== opportunityId))
              }
            />

            {/* Player Character Trackers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Party Status
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playerParticipants.map((participant) => (
                  <HPTracker
                    key={participant.id}
                    participant={participant}
                    onDamage={handleApplyDamage}
                    onHeal={handleHealing}
                    isInteractive={Boolean(
                      isDM ||
                        (participant.characterId && participant.characterId === playerCharacterId),
                    )}
                  />
                ))}
              </CardContent>
            </Card>

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
                        onAttack={isDM ? handleEnemyAttack : undefined}
                      />
                    </div>
                  ))}

                  {enemyParticipants.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>No enemies in combat</p>
                      {isDM && (
                        <Button variant="outline" size="sm" onClick={addEnemy} className="mt-2">
                          Add Enemy
                        </Button>
                      )}
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
                    {activeEncounter?.actions
                      .slice(-10)
                      .reverse()
                      .map((action, index) => (
                        <div key={index} className="text-sm p-2 bg-muted/50 rounded-md">
                          <div className="font-medium">{action.description}</div>

                          {action.attackRoll && (
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div className="flex items-center gap-2">
                                <span>Attack: {action.attackRoll.total}</span>
                                {action.attackRoll.advantage && (
                                  <Badge variant="outline" className="text-green-600">
                                    Advantage
                                  </Badge>
                                )}
                                {action.attackRoll.disadvantage && (
                                  <Badge variant="outline" className="text-red-600">
                                    Disadvantage
                                  </Badge>
                                )}
                                {action.attackRoll.critical && (
                                  <Badge variant="destructive">CRITICAL!</Badge>
                                )}
                              </div>
                              <div>
                                Rolled: {action.attackRoll.results?.join(', ')}
                                {action.attackRoll.modifier !== 0 &&
                                  ` + ${action.attackRoll.modifier}`}
                              </div>
                            </div>
                          )}

                          {action.damageRolls && action.damageRolls.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Damage Rolls:{' '}
                              {action.damageRolls
                                .map(
                                  (roll) =>
                                    `${roll.results?.join(', ')}${roll.modifier ? ` + ${roll.modifier}` : ''} = ${roll.total}`,
                                )
                                .join(' | ')}
                            </div>
                          )}

                          {action.damageDealt && action.damageDealt > 0 && (
                            <div className="text-xs text-destructive font-medium">
                              Total Damage: {action.damageDealt} {action.damageType}
                            </div>
                          )}

                          {action.conditionsApplied && action.conditionsApplied.length > 0 && (
                            <div className="text-xs text-blue-600">
                              Conditions: {action.conditionsApplied.map((c) => c.name).join(', ')}
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground mt-1">
                            {action.timestamp
                              ? new Date(action.timestamp).toLocaleTimeString()
                              : 'Just now'}
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

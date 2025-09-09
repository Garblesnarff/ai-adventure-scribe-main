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
  RefreshCw 
} from 'lucide-react';
import { useCombat } from '@/contexts/CombatContext';
import InitiativeTracker from './InitiativeTracker';
import EnemyCard from './EnemyCard';
import DiceRoller from '@/components/ui/dice-roller';

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

  const { activeEncounter, isInCombat, showInitiativeTracker, showCombatLog } = state;
  
  const [selectedEnemy, setSelectedEnemy] = useState<string | null>(null);
  const [showCombatMode, setShowCombatMode] = useState(false);
  const [isStartingCombat, setIsStartingCombat] = useState(false);

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
        deathSaves: p.deathSaves,
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

  // Handle enemy attack
  const handleEnemyAttack = (attack: any) => {
    if (!selectedEnemy || !activeEncounter) return;

    // Create attack action
    const action = {
      participantId: selectedEnemy,
      targetParticipantId: activeEncounter.currentTurnParticipantId || '',
      actionType: 'attack',
      description: `${activeEncounter.participants.find(p => p.id === selectedEnemy)?.name} uses ${attack.name}`,
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
      hit: false,
      damageDealt: 0,
      damageType: attack.damageType,
      timestamp: new Date()
    };

    // Resolve attack
    takeAction(action);
    
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
                  <div className="flex gap-2 flex-wrap">
                    <DiceRoller 
                      dice="1d20" 
                      label="Initiative" 
                      modifier={0}
                      onRoll={(result) => rollInitiative(activeEncounter.currentTurnParticipantId!)}
                    />
                    <Button variant="outline" size="sm">
                      Move
                    </Button>
                    <Button variant="outline" size="sm">
                      Bonus Action
                    </Button>
                    <Button variant="outline" size="sm">
                      Ready Action
                    </Button>
                  </div>
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
                          <div className="text-xs text-muted-foreground">
                            Attack: {action.attackRoll.total} ({action.attackRoll.rolls.join(', ')})
                          </div>
                        )}
                        {action.damageDealt > 0 && (
                          <div className="text-xs text-destructive">
                            Damage: {action.damageDealt} {action.damageType}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {new Date(action.timestamp).toLocaleTimeString()}
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

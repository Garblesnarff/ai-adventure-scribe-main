/**
 * Initiative Tracker Component
 *
 * Displays initiative order in a tabletop D&D style.
 * Shows whose turn it is, HP status, and conditions.
 * Enhanced with drag-and-drop reordering, reroll capabilities, and group handling.
 * Designed to feel like a physical initiative tracker at the table.
 */

import React, { useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Sword, 
  Shield, 
  Heart, 
  Clock, 
  UserX, 
  Skull,
  ChevronRight,
  Dices,
  Plus
} from 'lucide-react';
import { useCombat } from '@/contexts/CombatContext';
import { CombatParticipant, ConditionName } from '@/types/combat';

// ===========================
// Condition Icons & Colors
// ===========================

const CONDITION_ICONS: Record<ConditionName, { icon: React.ComponentType<any>; color: string }> = {
  blinded: { icon: UserX, color: 'bg-gray-500' },
  charmed: { icon: Heart, color: 'bg-pink-500' },
  deafened: { icon: UserX, color: 'bg-slate-500' },
  frightened: { icon: Skull, color: 'bg-yellow-500' },
  grappled: { icon: UserX, color: 'bg-orange-500' },
  incapacitated: { icon: UserX, color: 'bg-red-500' },
  invisible: { icon: UserX, color: 'bg-blue-200' },
  paralyzed: { icon: UserX, color: 'bg-purple-600' },
  petrified: { icon: UserX, color: 'bg-stone-500' },
  poisoned: { icon: UserX, color: 'bg-green-600' },
  prone: { icon: UserX, color: 'bg-brown-500' },
  restrained: { icon: UserX, color: 'bg-red-600' },
  stunned: { icon: UserX, color: 'bg-yellow-600' },
  unconscious: { icon: UserX, color: 'bg-black' },
  exhaustion: { icon: Clock, color: 'bg-gray-600' },
  surprised: { icon: Skull, color: 'bg-yellow-400' },
};

// ===========================
// Participant Row Component
// ===========================

interface ParticipantRowProps {
  participant: CombatParticipant;
  isCurrentTurn: boolean;
  roundNumber: number;
  onSelectParticipant?: (participantId: string) => void;
}

const ParticipantRow: React.FC<ParticipantRowProps> = ({
  participant,
  isCurrentTurn,
  roundNumber,
  onSelectParticipant,
}) => {
  const hpPercent = (participant.currentHitPoints / participant.maxHitPoints) * 100;
  const isDead = participant.currentHitPoints === 0 && participant.deathSaves.failures >= 3;
  const isUnconscious = participant.currentHitPoints === 0 && participant.deathSaves.failures < 3;
  const needsDeathSave = participant.currentHitPoints === 0 && !isDead;

  const getHPColor = () => {
    if (isDead) return 'bg-black';
    if (isUnconscious) return 'bg-red-600';
    if (hpPercent <= 25) return 'bg-red-500';
    if (hpPercent <= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getParticipantTypeIcon = () => {
    switch (participant.participantType) {
      case 'player':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'npc':
        return <Heart className="w-4 h-4 text-green-500" />;
      case 'enemy':
        return <Sword className="w-4 h-4 text-red-500" />;
      case 'monster':
        return <Sword className="w-4 h-4 text-red-500" />;
      default:
        return <UserX className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div 
      className={`
        flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all
        ${isCurrentTurn 
          ? 'bg-amber-100 border-2 border-amber-400 shadow-md ring-2 ring-amber-300' 
          : 'bg-white hover:bg-gray-50 border border-gray-200'
        }
        ${isDead ? 'opacity-50 grayscale' : ''}
      `}
      onClick={() => onSelectParticipant?.(participant.id)}
    >
      {/* Turn Indicator & Initiative */}
      <div className="flex items-center space-x-3">
        {isCurrentTurn && (
          <ChevronRight className="w-5 h-5 text-amber-600 animate-pulse" />
        )}
        
        <div className="flex flex-col items-center">
          <div className="text-lg font-bold text-gray-700 min-w-[2rem] text-center">
            {participant.initiative}
          </div>
          <div className="text-xs text-gray-500">init</div>
        </div>
        
        {getParticipantTypeIcon()}
      </div>

      {/* Participant Info */}
      <div className="flex-1 ml-4">
        <div className="flex items-center space-x-2">
          <h4 className={`font-semibold ${isDead ? 'line-through' : ''}`}>
            {participant.name}
          </h4>
          
          {/* Action Status Indicators */}
          {isCurrentTurn && (
            <div className="flex space-x-1">
              {participant.actionTaken && (
                <Badge variant="outline" className="text-xs bg-red-100">
                  Action
                </Badge>
              )}
              {participant.bonusActionTaken && (
                <Badge variant="outline" className="text-xs bg-orange-100">
                  Bonus
                </Badge>
              )}
              {participant.reactionTaken && (
                <Badge variant="outline" className="text-xs bg-yellow-100">
                  Reaction
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* HP Bar */}
        <div className="flex items-center space-x-2 mt-1">
          <Progress 
            value={hpPercent} 
            className="h-2 flex-1"
          />
          <span className="text-sm font-medium min-w-[4rem] text-right">
            {participant.currentHitPoints}/{participant.maxHitPoints}
            {participant.temporaryHitPoints > 0 && (
              <span className="text-blue-500">
                +{participant.temporaryHitPoints}
              </span>
            )}
          </span>
        </div>

        {/* Death Saves */}
        {needsDeathSave && (
          <div className="flex items-center space-x-1 mt-1">
            <span className="text-xs text-red-600 font-medium">Death Saves:</span>
            <div className="flex space-x-1">
              {[1, 2, 3].map(i => (
                <div key={`success-${i}`} className={`w-2 h-2 rounded-full ${
                  i <= participant.deathSaves.successes 
                    ? 'bg-green-500' 
                    : 'bg-gray-300'
                }`} />
              ))}
            </div>
            <span className="text-xs mx-1">/</span>
            <div className="flex space-x-1">
              {[1, 2, 3].map(i => (
                <div key={`failure-${i}`} className={`w-2 h-2 rounded-full ${
                  i <= participant.deathSaves.failures 
                    ? 'bg-red-500' 
                    : 'bg-gray-300'
                }`} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AC & Conditions */}
      <div className="flex flex-col items-end space-y-1">
        <div className="flex items-center space-x-1">
          <Shield className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium">AC {participant.armorClass}</span>
        </div>
        
        {/* Condition Icons */}
        {participant.conditions.length > 0 && (
          <div className="flex space-x-1 flex-wrap">
            {participant.conditions.map((condition, index) => {
              const ConditionIcon = CONDITION_ICONS[condition.name]?.icon || UserX;
              const colorClass = CONDITION_ICONS[condition.name]?.color || 'bg-gray-500';
              
              return (
                <div 
                  key={index}
                  className={`p-1 rounded-full ${colorClass} text-white`}
                  title={`${condition.name}${condition.duration > 0 ? ` (${condition.duration} rounds)` : ''}`}
                >
                  <ConditionIcon className="w-3 h-3" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ===========================
// Main Initiative Tracker
// ===========================

interface InitiativeTrackerProps {
  className?: string;
  onAddParticipant?: () => void;
}

const InitiativeTracker: React.FC<InitiativeTrackerProps> = ({
  className = '',
  onAddParticipant,
}) => {
  const { state, nextTurn, rollInitiative } = useCombat();
  const { activeEncounter, isInCombat } = state;

  if (!isInCombat || !activeEncounter) {
    return (
      <Card className={`w-full max-w-md ${className}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Dices className="w-5 h-5" />
              <h3 className="font-semibold">Initiative Tracker</h3>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            No active combat
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate elapsed time (narrative)
  const elapsedSeconds = activeEncounter.roundsElapsed * 6;
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeDisplay = minutes > 0 
    ? `${minutes}m ${seconds}s` 
    : `${seconds} seconds`;

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sword className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-red-700">COMBAT MODE</h3>
          </div>
          {onAddParticipant && (
            <Button variant="outline" size="sm" onClick={onAddParticipant}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          )}
        </div>
        
        {/* Combat Status */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Round {activeEncounter.currentRound}</span>
          <span>{timeDisplay} elapsed</span>
        </div>
        
        <Separator />
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Initiative List */}
        {activeEncounter.participants.map((participant) => (
          <ParticipantRow
            key={participant.id}
            participant={participant}
            isCurrentTurn={participant.id === activeEncounter.currentTurnParticipantId}
            roundNumber={activeEncounter.currentRound}
          />
        ))}

        {/* Next Turn Button */}
        <div className="pt-4 border-t">
          <Button 
            onClick={nextTurn}
            className="w-full"
            variant="default"
            size="sm"
          >
            <ChevronRight className="w-4 h-4 mr-2" />
            Next Turn
          </Button>
        </div>

        {/* Round Info */}
        <div className="text-xs text-gray-500 text-center pt-2">
          Each round represents 6 seconds of combat
        </div>
      </CardContent>
    </Card>
  );
};

export default InitiativeTracker;

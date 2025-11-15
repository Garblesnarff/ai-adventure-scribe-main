/**
 * Initiative Tracker Component
 *
 * Displays initiative order in a tabletop D&D style.
 * Shows whose turn it is, HP status, and conditions.
 * Enhanced with drag-and-drop reordering, reroll capabilities, and group handling.
 * Designed to feel like a physical initiative tracker at the table.
 */

import { Sword, Shield, Heart, Clock, UserX, Skull, ChevronRight, Dices, Plus } from 'lucide-react';
import React from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import type { CombatParticipant, ConditionName } from '@/types/combat';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useCombat } from '@/contexts/CombatContext';
import { cn } from '@/lib/utils';

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
  const hpPercent =
    participant.maxHitPoints > 0
      ? (participant.currentHitPoints / participant.maxHitPoints) * 100
      : 0;
  const isDead = participant.currentHitPoints === 0 && participant.deathSaves.failures >= 3;
  const isUnconscious = participant.currentHitPoints === 0 && participant.deathSaves.failures < 3;
  const needsDeathSave = participant.currentHitPoints === 0 && !isDead;

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

  const rowClasses = cn(
    'flex items-center justify-between rounded-lg border p-3 transition-all cursor-pointer shadow-sm',
    isCurrentTurn
      ? 'border-amber-300/70 bg-amber-50 dark:bg-amber-900/30 ring-1 ring-amber-200'
      : 'border-border bg-card hover:bg-muted/60',
    isDead && 'opacity-60 grayscale',
  );

  return (
    <div className={rowClasses} onClick={() => onSelectParticipant?.(participant.id)}>
      {/* Turn Indicator & Initiative */}
      <div className="flex items-center space-x-3">
        {isCurrentTurn && <ChevronRight className="w-5 h-5 text-amber-600 animate-pulse" />}

        <div className="flex flex-col items-center">
          <div className="text-lg font-bold text-gray-700 min-w-[2rem] text-center">
            {participant.initiative}
          </div>
          <div className="text-xs text-gray-500">init</div>
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {getParticipantTypeIcon()}
        </div>
      </div>

      {/* Participant Info */}
      <div className="flex-1 ml-4">
        <div className="flex items-center gap-2">
          <h4 className={`font-semibold ${isDead ? 'line-through' : ''}`}>{participant.name}</h4>

          {/* Action Status Indicators */}
          {isCurrentTurn && (
            <div className="flex flex-wrap gap-1">
              {participant.actionTaken && (
                <Badge
                  variant="secondary"
                  className="text-[0.65rem] font-medium uppercase tracking-wide bg-amber-100 text-amber-800"
                >
                  Action
                </Badge>
              )}
              {participant.bonusActionTaken && (
                <Badge
                  variant="secondary"
                  className="text-[0.65rem] font-medium uppercase tracking-wide bg-orange-100 text-orange-800"
                >
                  Bonus
                </Badge>
              )}
              {participant.reactionTaken && (
                <Badge
                  variant="secondary"
                  className="text-[0.65rem] font-medium uppercase tracking-wide bg-yellow-100 text-yellow-800"
                >
                  Reaction
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* HP Bar */}
        <div className="mt-2 flex items-center gap-2">
          <Progress value={hpPercent} className="h-2 flex-1" />
          <span className="min-w-[4rem] text-right text-sm font-medium">
            {participant.currentHitPoints}/{participant.maxHitPoints}
            {participant.temporaryHitPoints > 0 && (
              <span className="text-blue-500">+{participant.temporaryHitPoints}</span>
            )}
          </span>
        </div>

        {/* Death Saves */}
        {needsDeathSave && (
          <div className="flex items-center space-x-1 mt-1">
            <span className="text-xs text-red-600 font-medium">Death Saves:</span>
            <div className="flex space-x-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={`success-${i}`}
                  className={`w-2 h-2 rounded-full ${
                    i <= participant.deathSaves.successes ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs mx-1">/</span>
            <div className="flex space-x-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={`failure-${i}`}
                  className={`w-2 h-2 rounded-full ${
                    i <= participant.deathSaves.failures ? 'bg-red-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AC & Conditions */}
      <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span>AC {participant.armorClass}</span>
        </div>

        {/* Condition Icons */}
        {participant.conditions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {participant.conditions.map((condition, index) => {
              const ConditionIcon = CONDITION_ICONS[condition.name]?.icon || UserX;
              const colorClass = CONDITION_ICONS[condition.name]?.color || 'bg-gray-500';

              return (
                <div
                  key={index}
                  className={`rounded-full p-1 text-white ${colorClass}`}
                  title={`${condition.name}${condition.duration > 0 ? ` (${condition.duration} rounds)` : ''}`}
                >
                  <ConditionIcon className="h-3 w-3" />
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
      <Card className={cn('w-full', className)}>
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Dices className="w-5 h-5" />
              <h3 className="font-semibold">Initiative Tracker</h3>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No active combat
        </CardContent>
      </Card>
    );
  }

  // Calculate elapsed time (narrative)
  const elapsedSeconds = activeEncounter.roundsElapsed * 6;
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds} seconds`;

  return (
    <Card className={cn('flex h-full w-full flex-col', className)}>
      <CardHeader className="sticky top-0 z-10 space-y-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold tracking-tight">Initiative Order</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-[0.65rem] uppercase tracking-wide">
                Round {activeEncounter.currentRound}
              </Badge>
              <span>{timeDisplay} elapsed</span>
            </div>
          </div>
          {onAddParticipant && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onAddParticipant}
              aria-label="Add participant"
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={rollInitiative}
            className="flex-1 min-w-[140px] sm:flex-none"
          >
            <Dices className="mr-2 h-4 w-4" />
            Roll Initiative
          </Button>
          <Button size="sm" onClick={nextTurn} className="flex-1 min-w-[140px]">
            <ChevronRight className="mr-2 h-4 w-4" />
            Next Turn
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-3">
          {activeEncounter.participants.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
              No combatants in the initiative order.
            </div>
          ) : (
            <div className="space-y-3">
              {activeEncounter.participants.map((participant) => (
                <ParticipantRow
                  key={participant.id}
                  participant={participant}
                  isCurrentTurn={participant.id === activeEncounter.currentTurnParticipantId}
                  roundNumber={activeEncounter.currentRound}
                />
              ))}
            </div>
          )}

          <p className="pt-2 text-center text-xs text-muted-foreground">
            Each round represents roughly six seconds of combat.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default InitiativeTracker;

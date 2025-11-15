import { Users, Sword, Heart, Zap, Clock } from 'lucide-react';
import React from 'react';

import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { ScrollArea } from '../ui/scroll-area';

import { useCombat } from '@/contexts/CombatContext';

/**
 * CombatSummary - Compact combat overview for game sidebar
 * Shows initiative order, current turn, participant HP, and recent actions
 *
 * Dependencies:
 * - CombatContext for combat state and actions
 * - ui/card, ui/button, ui/scroll-area, ui/progress for styling
 *
 * Usage: Render in combat tab; updates live during combat
 */
export const CombatSummary: React.FC = () => {
  const { state, nextTurn, endCombat } = useCombat();
  const { activeEncounter, isInCombat } = state;

  if (!isInCombat || !activeEncounter) {
    return (
      <Card className="p-4 text-center text-muted-foreground">
        <Users className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">No active combat</p>
      </Card>
    );
  }

  const currentParticipant = activeEncounter.participants.find(
    (p) => p.id === activeEncounter.currentTurnParticipantId,
  );
  const recentActions = activeEncounter.actions.slice(-5); // Last 5 actions

  return (
    <Card className="p-4 space-y-4 h-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sword className="w-4 h-4 text-destructive" />
          <h3 className="font-semibold">Combat Round {activeEncounter.currentRound}</h3>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={nextTurn}>
            Next Turn
          </Button>
          <Button size="sm" variant="destructive" onClick={endCombat}>
            End Combat
          </Button>
        </div>
      </div>

      {/* Initiative Order */}
      <ScrollArea className="flex-1 max-h-48">
        <div className="space-y-2">
          {activeEncounter.participants.map((participant, index) => {
            const isCurrentTurn = participant.id === activeEncounter.currentTurnParticipantId;
            const hpPercent = (participant.currentHitPoints / participant.maxHitPoints) * 100;
            const isPlayer = participant.participantType === 'player';

            return (
              <div
                key={participant.id}
                className={`p-2 rounded-md border ${
                  isCurrentTurn
                    ? 'border-primary bg-primary/5'
                    : isPlayer
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${isPlayer ? 'text-blue-800' : 'text-red-800'}`}>
                    {participant.name}
                  </span>
                  <span className="text-muted-foreground">Init: {participant.initiative}</span>
                </div>
                <div className="space-y-1 mt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>
                      HP: {participant.currentHitPoints}/{participant.maxHitPoints}
                    </span>
                    <span className="text-muted-foreground">AC: {participant.armorClass}</span>
                  </div>
                  <Progress
                    value={hpPercent}
                    className={`h-1 ${hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  />
                </div>
                {participant.conditions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {participant.conditions.slice(0, 3).map((condition) => (
                      <span key={condition.name} className="px-1 py-0.5 bg-muted text-xs rounded">
                        {condition.name}
                      </span>
                    ))}
                    {participant.conditions.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{participant.conditions.length - 3}
                      </span>
                    )}
                  </div>
                )}
                {isCurrentTurn && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-primary">
                    <Zap className="w-3 h-3" />
                    <span>Current Turn</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Recent Actions */}
      {recentActions.length > 0 && (
        <div>
          <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Recent Actions
          </h4>
          <ScrollArea className="h-20">
            <div className="space-y-1 text-xs text-muted-foreground">
              {recentActions.map((action) => (
                <div key={action.id} className="truncate">
                  {action.description}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Turn Summary */}
      {currentParticipant && (
        <div className="pt-2 border-t text-xs text-muted-foreground">
          <div>Current: {currentParticipant.name}</div>
          <div className="text-[10px]">
            Action: {currentParticipant.actionTaken ? 'Used' : 'Available'} | Bonus:{' '}
            {currentParticipant.bonusActionTaken ? 'Used' : 'Available'} | Reaction:{' '}
            {currentParticipant.reactionTaken ? 'Used' : 'Available'}
          </div>
        </div>
      )}
    </Card>
  );
};

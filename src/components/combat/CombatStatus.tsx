/**
 * Combat Status Component
 *
 * Displays current game phase and combat status information
 * Shows turn order when in combat and pending dice rolls
 * Integrates with GameContext and CombatContext for real-time updates
 */

import {
  Sword,
  Users,
  MessageSquare,
  Search,
  Bed,
  Dice6,
  Clock,
  Shield,
  Heart,
} from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useCombat } from '@/contexts/CombatContext';
import { useGame } from '@/contexts/GameContext';

interface CombatStatusProps {
  className?: string;
}

/**
 * Combat Status display component
 * Shows current game phase, combat state, and active participant info
 */
export const CombatStatus: React.FC<CombatStatusProps> = ({ className }) => {
  const { state: gameState } = useGame();
  const { state: combatState } = useCombat();

  // Get phase display info
  const getPhaseInfo = () => {
    switch (gameState.currentPhase) {
      case 'exploration':
        return { icon: Search, label: 'Exploration', color: 'bg-blue-500' };
      case 'combat':
        return { icon: Sword, label: 'Combat', color: 'bg-red-500' };
      case 'social':
        return { icon: MessageSquare, label: 'Social', color: 'bg-green-500' };
      case 'puzzle':
        return { icon: Users, label: 'Puzzle', color: 'bg-purple-500' };
      case 'rest':
        return { icon: Bed, label: 'Rest', color: 'bg-gray-500' };
      default:
        return { icon: Search, label: 'Unknown', color: 'bg-gray-400' };
    }
  };

  const phaseInfo = getPhaseInfo();
  const PhaseIcon = phaseInfo.icon;

  // Get current turn info
  const getCurrentTurnInfo = () => {
    if (!combatState.isInCombat || !combatState.activeEncounter) return null;

    const currentParticipant = combatState.activeEncounter.participants.find(
      (p) => p.id === combatState.activeEncounter?.currentTurnParticipantId,
    );

    if (!currentParticipant) return null;

    return {
      name: currentParticipant.name,
      initiative: currentParticipant.initiative?.value || 0,
      hp: currentParticipant.hitPoints,
    };
  };

  const currentTurn = getCurrentTurnInfo();
  const pendingRolls = gameState.diceRollQueue.pendingRolls.filter((r) => r.status === 'pending');

  return (
    <Card className={`p-3 bg-white/90 backdrop-blur-sm border-2 ${className}`}>
      <div className="flex items-center gap-3">
        {/* Game Phase Indicator */}
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-full ${phaseInfo.color} text-white`}>
            <PhaseIcon className="w-4 h-4" />
          </div>
          <Badge variant="secondary" className="text-xs font-medium">
            {phaseInfo.label}
          </Badge>
        </div>

        {/* Combat Info */}
        {combatState.isInCombat && currentTurn && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm font-medium">{currentTurn.name}</span>
              <Badge variant="outline" className="text-xs">
                Init {currentTurn.initiative}
              </Badge>
              {currentTurn.hp && (
                <div className="flex items-center gap-1">
                  <Heart className="w-3 h-3 text-red-500" />
                  <span className="text-xs">
                    {currentTurn.hp.current}/{currentTurn.hp.maximum}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Pending Dice Rolls */}
        {pendingRolls.length > 0 && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1">
              <Dice6 className="w-3 h-3 text-blue-500 animate-pulse" />
              <Badge variant="secondary" className="text-xs">
                {pendingRolls.length} roll{pendingRolls.length > 1 ? 's' : ''} pending
              </Badge>
            </div>
          </>
        )}

        {/* Combat Round Counter */}
        {combatState.isInCombat && combatState.activeEncounter?.round && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-orange-500" />
              <span className="text-xs text-muted-foreground">
                Round {combatState.activeEncounter.round}
              </span>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

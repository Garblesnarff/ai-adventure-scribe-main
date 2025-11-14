import { Dice6, Heart, Shield, Zap, Plus, X } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Z_INDEX } from '@/constants/z-index';
import { useCharacter } from '@/contexts/CharacterContext';
import { useCombat } from '@/contexts/CombatContext';
import logger from '@/lib/logger';

interface FloatingActionPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  combatMode: boolean;
}

/**
 * FloatingActionPanel - Quick access panel for common RPG actions
 * Reduces dependency on sidebar for frequently used features
 */
export const FloatingActionPanel: React.FC<FloatingActionPanelProps> = ({
  isVisible,
  onToggle,
  combatMode,
}) => {
  const { state: characterState } = useCharacter();
  const { state: combatState } = useCombat();
  const character = characterState.character;

  const [isExpanded, setIsExpanded] = useState(false);

  if (!character) return null;

  // Quick stats for easy reference
  const maxHp = Math.max(
    1,
    character.level * (character.class?.hitDie || 8) +
      character.abilityScores.constitution.modifier * character.level,
  );

  const armorClass = 10 + character.abilityScores.dexterity.modifier;
  const proficiency = Math.floor((character.level - 1) / 4) + 2;

  const handleQuickRoll = (type: string) => {
    // This would integrate with your dice rolling system
    logger.info(`Quick rolling ${type}`);
    // You could dispatch a dice roll event or call a dice service here
  };

  if (!isVisible) {
    return (
      <div className={`fixed left-4 bottom-4 z-[${Z_INDEX.FLOATING_PANEL}] md:left-6 md:bottom-6`}>
        <Button
          onClick={onToggle}
          size="sm"
          className={`rounded-full p-3 h-auto w-auto shadow-xl border-2 transition-all duration-300 hover:scale-110 hover-glow focus-glow ${
            combatMode
              ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-400/50 animate-pulse'
              : 'bg-gradient-to-r from-infinite-purple/20 to-infinite-teal/20 border-infinite-purple/50'
          }`}
        >
          <Plus className="h-5 w-5" />
          {/* Activity indicator */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-infinite-gold rounded-full animate-pulse"></div>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`fixed left-4 bottom-4 z-[${Z_INDEX.FLOATING_PANEL}] md:left-6 md:bottom-6 animate-in slide-in-from-bottom-2 duration-300`}
    >
      <Card className="glass-strong border-2 border-infinite-purple/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-white/10 bg-gradient-to-r from-infinite-purple/10 to-infinite-teal/10">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-semibold text-sm text-card-foreground">
              🎲 Quick Actions
            </h4>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0 rounded-full hover:bg-infinite-purple/20"
              >
                {isExpanded ? '−' : '+'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="h-6 w-6 p-0 rounded-full hover:bg-red-500/20"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="p-3 border-b border-white/10">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-400/20">
              <Heart className="h-4 w-4 mx-auto text-red-400 mb-1" />
              <div className="text-xs font-bold text-card-foreground">{maxHp}</div>
              <div className="text-[10px] text-muted-foreground">HP</div>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-400/20">
              <Shield className="h-4 w-4 mx-auto text-blue-400 mb-1" />
              <div className="text-xs font-bold text-card-foreground">{armorClass}</div>
              <div className="text-[10px] text-muted-foreground">AC</div>
            </div>
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-400/20">
              <Zap className="h-4 w-4 mx-auto text-green-400 mb-1" />
              <div className="text-xs font-bold text-card-foreground">+{proficiency}</div>
              <div className="text-[10px] text-muted-foreground">PROF</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-3">
          <div className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuickRoll('d20')}
              className="w-full justify-start h-8 text-xs hover:bg-infinite-purple/10"
            >
              <Dice6 className="h-3 w-3 mr-2" />
              Roll d20
            </Button>

            {combatMode && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickRoll('initiative')}
                  className="w-full justify-start h-8 text-xs hover:bg-red-500/10"
                >
                  ⚡ Initiative
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickRoll('attack')}
                  className="w-full justify-start h-8 text-xs hover:bg-orange-500/10"
                >
                  ⚔️ Attack Roll
                </Button>
              </>
            )}

            {isExpanded && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickRoll('perception')}
                  className="w-full justify-start h-8 text-xs hover:bg-infinite-teal/10"
                >
                  👁️ Perception
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickRoll('stealth')}
                  className="w-full justify-start h-8 text-xs hover:bg-purple-500/10"
                >
                  🥷 Stealth
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickRoll('investigation')}
                  className="w-full justify-start h-8 text-xs hover:bg-blue-500/10"
                >
                  🔍 Investigation
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Character Level Indicator */}
        <div className="px-3 pb-3">
          <div className="text-center p-2 rounded-lg bg-infinite-gold/10 border border-infinite-gold/20">
            <div className="text-xs font-bold text-infinite-gold">
              {character.name} • Level {character.level}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {character.race?.name} {character.class?.name}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

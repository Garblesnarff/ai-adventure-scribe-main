/**
 * Enemy Card Component
 *
 * Displays enemy information during combat encounters.
 * Follows D&D 5e rules where HP is hidden until defeated or DM reveals.
 * Provides attack buttons and visual enemy representation.
 */

import { Sword, Shield, Skull, Zap, Target } from 'lucide-react';
import React from 'react';

import HPTracker from './HPTracker';

import type { MonsterAttack } from '@/types/combat';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import DiceRoller from '@/components/ui/dice-roller';
import { useCombat } from '@/contexts/CombatContext';

interface EnemyCardProps {
  enemyId: string;
  className?: string;
  onAttack?: (attack: MonsterAttack) => void;
}

const EnemyCard: React.FC<EnemyCardProps> = ({ enemyId, className = '', onAttack }) => {
  const { state } = useCombat();
  const enemy = state.activeEncounter?.participants.find((p) => p.id === enemyId);

  if (!enemy || enemy.participantType !== 'monster') {
    return null;
  }

  const getChallengeRatingColor = (cr: string) => {
    const numCR = parseFloat(cr);
    if (numCR >= 5) return 'bg-red-600 text-white';
    if (numCR >= 1) return 'bg-orange-500 text-white';
    if (numCR >= 0.25) return 'bg-yellow-500 text-white';
    if (numCR >= 0.125) return 'bg-blue-500 text-white';
    return 'bg-green-500 text-white';
  };

  const renderAttackButton = (attack: MonsterAttack, index: number) => {
    const damageModifier = enemy.monsterData?.attacks?.[index]?.attackBonus || 0;
    const damageType = enemy.monsterData?.attacks?.[index]?.damageType || 'bludgeoning';

    return (
      <Button
        key={index}
        variant="outline"
        size="sm"
        className="w-full mb-1 justify-start"
        onClick={() => onAttack?.(attack)}
      >
        <Sword className="w-3 h-3 mr-2" />
        <span className="text-xs mr-2">{attack.name}</span>
        {attack.damageRoll && (
          <DiceRoller
            dice={attack.damageRoll}
            modifier={damageModifier}
            label=""
            className="flex-shrink-0"
            displayOnly
          />
        )}
        {damageType !== 'none' && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {damageType}
          </Badge>
        )}
      </Button>
    );
  };

  return (
    <Card className={`w-full max-w-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-red-700 flex items-center gap-2">
            <Skull className="w-5 h-5" />
            {enemy.name}
          </CardTitle>

          {enemy.monsterData?.challengeRating && (
            <Badge
              className={getChallengeRatingColor(enemy.monsterData.challengeRating)}
              variant="secondary"
            >
              CR {enemy.monsterData.challengeRating}
            </Badge>
          )}
        </div>

        {enemy.monsterData?.type && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Target className="w-3 h-3" />
            <span>{enemy.monsterData.type}</span>
            {enemy.monsterData?.alignment && (
              <span className="ml-2">({enemy.monsterData.alignment})</span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <HPTracker participant={enemy} showHPDetails={false} isInteractive={false} />

        {enemy.monsterData?.specialAbilities && enemy.monsterData.specialAbilities.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-purple-700 mb-1">
              <Zap className="w-3 h-3" />
              Special Abilities
            </div>
            {enemy.monsterData.specialAbilities.map((ability, index) => (
              <Badge key={index} variant="secondary" className="text-xs w-full justify-start">
                {ability}
              </Badge>
            ))}
          </div>
        )}

        {enemy.monsterData?.attacks && enemy.monsterData.attacks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-red-700">
              <Sword className="w-3 h-3" />
              Actions
            </div>
            <div className="space-y-1">
              {enemy.monsterData.attacks.map((attack, index) => renderAttackButton(attack, index))}
            </div>
          </div>
        )}

        {enemy.conditions.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t">
            {enemy.conditions.map((condition, index) => (
              <Badge key={index} variant="destructive" className="text-xs">
                {condition.name}
                {condition.duration > 0 && ` (${condition.duration})`}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnemyCard;

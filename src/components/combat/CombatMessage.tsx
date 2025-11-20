import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HexagonalBadge } from '@/components/ui/hexagonal-badge';
import { Separator } from '@/components/ui/separator';
import { DiceRoll } from '@/utils/diceUtils';
import { DetectedCombatAction } from '@/utils/combatDetection';
import { Sword, Shield, Zap, Heart, Skull, Target, Dice6 } from 'lucide-react';

export interface CombatMessageData {
  type:
    | 'attack_roll'
    | 'damage_roll'
    | 'saving_throw'
    | 'skill_check'
    | 'initiative'
    | 'death_save'
    | 'concentration_save';
  actor: string;
  target?: string;
  roll: DiceRoll;
  dc?: number;
  success?: boolean;
  critical?: boolean;
  action?: DetectedCombatAction;
  description: string;
}

interface CombatMessageProps {
  data: CombatMessageData;
  timestamp?: string;
}

/**
 * Combat Message Component
 * Displays combat-specific dice rolls and actions in the chat
 */
export const CombatMessage: React.FC<CombatMessageProps> = ({ data, timestamp }) => {
  const getTypeIcon = () => {
    switch (data.type) {
      case 'attack_roll':
        return <Sword className="w-4 h-4" />;
      case 'damage_roll':
        return <Zap className="w-4 h-4" />;
      case 'saving_throw':
        return <Shield className="w-4 h-4" />;
      case 'skill_check':
        return <Target className="w-4 h-4" />;
      case 'initiative':
        return <Dice6 className="w-4 h-4" />;
      case 'death_save':
        return <Skull className="w-4 h-4" />;
      case 'concentration_save':
        return <Heart className="w-4 h-4" />;
      default:
        return <Dice6 className="w-4 h-4" />;
    }
  };

  const getTypeColor = () => {
    switch (data.type) {
      case 'attack_roll':
        return data.critical ? 'bg-red-500' : data.success ? 'bg-green-500' : 'bg-gray-500';
      case 'damage_roll':
        return 'bg-orange-500';
      case 'saving_throw':
        return data.success ? 'bg-blue-500' : 'bg-red-500';
      case 'skill_check':
        return data.success ? 'bg-purple-500' : 'bg-gray-500';
      case 'initiative':
        return 'bg-yellow-500';
      case 'death_save':
        return data.success ? 'bg-green-600' : 'bg-red-600';
      case 'concentration_save':
        return data.success ? 'bg-electricCyan' : 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDiceResult = (roll: DiceRoll) => {
    const { dieType, count, results, modifier, total } = roll;

    // Handle advantage/disadvantage display
    if (roll.advantage || roll.disadvantage) {
      const keptResults = roll.keptResults || results;
      const droppedResults = results.filter((r) => !keptResults.includes(r));

      return (
        <div className="flex flex-col gap-1">
          <div className="text-sm">
            <span className="font-medium">
              {count}d{dieType}
            </span>
            {modifier !== 0 && (
              <span>
                {' '}
                {modifier >= 0 ? '+' : ''}
                {modifier}
              </span>
            )}
            <span className="ml-2 text-xs text-muted-foreground">
              ({roll.advantage ? 'Advantage' : 'Disadvantage'})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-600 font-medium">
              Kept: [{keptResults.join(', ')}]
            </span>
            {droppedResults.length > 0 && (
              <span className="text-xs text-red-400 line-through">
                Dropped: [{droppedResults.join(', ')}]
              </span>
            )}
          </div>
          <div className="font-bold text-lg">Total: {total}</div>
        </div>
      );
    }

    // Normal roll display
    return (
      <div className="flex flex-col gap-1">
        <div className="text-sm">
          <span className="font-medium">
            {count}d{dieType}
          </span>
          {modifier !== 0 && (
            <span>
              {' '}
              {modifier >= 0 ? '+' : ''}
              {modifier}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          [{results.join(', ')}] {modifier !== 0 && `${modifier >= 0 ? '+' : ''}${modifier}`}
        </div>
        <div className="font-bold text-lg">Total: {total}</div>
      </div>
    );
  };

  const getResultText = () => {
    if (data.type === 'damage_roll') {
      return `${data.roll.total} damage`;
    }

    // Use HexagonalBadge with electricCyan for concentration saves
    if (data.type === 'concentration_save') {
      if (data.dc !== undefined) {
        const success = data.roll.total >= data.dc;
        return (
          <div className="flex items-center gap-2">
            <HexagonalBadge
              variant={success ? 'status' : 'destructive'}
              size="sm"
              pulse={success}
              className={
                success
                  ? 'text-xs bg-electricCyan/20 text-electricCyan border-electricCyan/40 shadow-[0_0_8px_rgba(6,182,212,0.4)] font-semibold'
                  : 'text-xs'
              }
            >
              {success ? 'Maintained' : 'Lost'}
            </HexagonalBadge>
          </div>
        );
      }

      if (data.success !== undefined) {
        return (
          <HexagonalBadge
            variant={data.success ? 'status' : 'destructive'}
            size="sm"
            pulse={data.success}
            className={
              data.success
                ? 'text-xs bg-electricCyan/20 text-electricCyan border-electricCyan/40 shadow-[0_0_8px_rgba(6,182,212,0.4)] font-semibold'
                : 'text-xs'
            }
          >
            {data.success ? 'Maintained' : 'Lost'}
          </HexagonalBadge>
        );
      }
    }

    if (data.dc !== undefined) {
      const success = data.roll.total >= data.dc;
      return (
        <div className="flex items-center gap-2">
          <Badge variant={success ? 'default' : 'destructive'} className="text-xs">
            {success ? 'Success' : 'Failure'}
          </Badge>
        </div>
      );
    }

    if (data.critical) {
      return (
        <Badge variant="destructive" className="text-xs animate-pulse">
          Critical {data.type === 'attack_roll' ? 'Hit' : 'Success'}!
        </Badge>
      );
    }

    if (data.success !== undefined) {
      return (
        <Badge variant={data.success ? 'default' : 'destructive'} className="text-xs">
          {data.success ? 'Success' : 'Failure'}
        </Badge>
      );
    }

    return null;
  };

  const getBorderClass = () => {
    switch (data.type) {
      case 'attack_roll':
        return data.critical
          ? 'border-l-red-500'
          : data.success
            ? 'border-l-green-500'
            : 'border-l-gray-500';
      case 'damage_roll':
        return 'border-l-orange-500';
      case 'saving_throw':
        return data.success ? 'border-l-blue-500' : 'border-l-red-500';
      case 'skill_check':
        return data.success ? 'border-l-purple-500' : 'border-l-gray-500';
      case 'initiative':
        return 'border-l-yellow-500';
      case 'death_save':
        return data.success ? 'border-l-green-600' : 'border-l-red-600';
      case 'concentration_save':
        return data.success ? 'border-l-electricCyan' : 'border-l-red-500';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <Card className={`p-3 mb-2 bg-card/80 border-l-4 ${getBorderClass()}`}>
      <div className="flex items-start gap-3">
        {/* Icon and Type */}
        <div className={`p-2 rounded-full text-white ${getTypeColor()}`}>{getTypeIcon()}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{data.actor}</span>
              {data.target && (
                <>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-sm">{data.target}</span>
                </>
              )}
            </div>
            {timestamp && <span className="text-xs text-muted-foreground">{timestamp}</span>}
          </div>

          {/* Action Description */}
          <div className="text-sm text-muted-foreground mb-3">{data.description}</div>

          <Separator className="my-2" />

          {/* Dice Roll Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>{formatDiceResult(data.roll)}</div>
            <div className="flex items-center">{getResultText()}</div>
          </div>

          {/* Additional Action Info */}
          {data.action && (
            <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium">Action:</span>
                <span>{data.action.action}</span>
                {data.action.weapon && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span>{data.action.weapon}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

/**
 * Initiative Roll Message Component
 * Special component for initiative rolls showing turn order
 */
interface InitiativeMessageProps {
  participants: Array<{ name: string; initiative: number; roll: DiceRoll }>;
  timestamp?: string;
}

export const InitiativeMessage: React.FC<InitiativeMessageProps> = ({
  participants,
  timestamp,
}) => {
  const sortedParticipants = [...participants].sort((a, b) => b.initiative - a.initiative);

  return (
    <Card className="p-4 mb-2 bg-yellow-50 border-l-4 border-l-yellow-500">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-full text-white bg-yellow-500">
          <Dice6 className="w-4 h-4" />
        </div>
        <span className="font-semibold">Initiative Order</span>
        {timestamp && <span className="text-xs text-muted-foreground ml-auto">{timestamp}</span>}
      </div>

      <div className="space-y-2">
        {sortedParticipants.map((participant, index) => (
          <div
            key={participant.name}
            className="flex items-center justify-between p-2 bg-white rounded"
          >
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs min-w-6 justify-center">
                {index + 1}
              </Badge>
              <span className="font-medium">{participant.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                [{participant.roll.results.join(', ')}] {participant.roll.modifier >= 0 ? '+' : ''}
                {participant.roll.modifier}
              </span>
              <Badge variant="secondary" className="font-mono">
                {participant.initiative}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

/**
 * Combat Summary Message Component
 * Displays end-of-combat summary with damage dealt, rounds, etc.
 */
interface CombatSummaryProps {
  summary: {
    rounds: number;
    totalDamage: number;
    participants: Array<{ name: string; damageDealt: number; damageTaken: number; status: string }>;
    outcome: string;
  };
  timestamp?: string;
}

export const CombatSummaryMessage: React.FC<CombatSummaryProps> = ({ summary, timestamp }) => {
  return (
    <Card className="p-4 mb-2 bg-slate-50 border-l-4 border-l-slate-500">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-full text-white bg-slate-500">
          <Shield className="w-4 h-4" />
        </div>
        <span className="font-semibold">Combat Summary</span>
        {timestamp && <span className="text-xs text-muted-foreground ml-auto">{timestamp}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <div className="text-sm">
            <strong>Outcome:</strong> {summary.outcome}
          </div>
          <div className="text-sm">
            <strong>Rounds:</strong> {summary.rounds}
          </div>
          <div className="text-sm">
            <strong>Total Damage:</strong> {summary.totalDamage}
          </div>
        </div>
      </div>

      <Separator className="my-3" />

      <div className="space-y-2">
        <h4 className="font-medium text-sm mb-2">Participant Summary:</h4>
        {summary.participants.map((participant) => (
          <div
            key={participant.name}
            className="flex items-center justify-between p-2 bg-white rounded text-xs"
          >
            <span className="font-medium">{participant.name}</span>
            <div className="flex items-center gap-4">
              <span className="text-red-600">-{participant.damageTaken} HP</span>
              <span className="text-green-600">+{participant.damageDealt} DMG</span>
              <Badge variant="outline" className="text-xs">
                {participant.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

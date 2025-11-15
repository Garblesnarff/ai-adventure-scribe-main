import { Play, AlertTriangle, Flame, Zap } from 'lucide-react';
import React from 'react';

import DeathSaveManager from './DeathSaveManager';

import type { ActionType, Encounter } from '@/types/combat';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import DiceRoller from '@/components/ui/dice-roller';
import { Separator } from '@/components/ui/separator';
import { CombatParticipant } from '@/types/combat';
import { canUseClassFeature } from '@/utils/classFeatures';
import { needsDeathSaves } from '@/utils/combat/deathSaves';
import { canUseRacialTrait } from '@/utils/racialTraits';

interface ActionPanelProps {
  activeEncounter: Encounter;
  currentParticipantId: string;
  selectedEnemyId: string | null;
  actionValidation: {
    isValid: boolean;
    suggestions: string[];
    errors: string[];
  } | null;
  onCombatAction: (
    actionType: ActionType,
    participantId: string,
    targetId?: string,
    additionalData?: any,
  ) => void;
  onNextTurn: () => void;
  onRollInitiative: (participantId: string) => void;
  onTwoWeaponAttack: (participantId: string, targetId?: string) => void;
  onEnhancedAttack: (
    participantId: string,
    targetId?: string,
    actionType?: ActionType,
    hasAdvantage?: boolean,
    hasDisadvantage?: boolean,
    divineSmiteSlotLevel?: number,
  ) => void;
  onClassFeatureUse: (participantId: string, featureName: string) => void;
  onRacialTraitUse: (participantId: string, traitName: string) => void;
  onDeathSave: (participantId: string) => void;
  showNextTurnButton?: boolean;
}

const ActionPanel: React.FC<ActionPanelProps> = ({
  activeEncounter,
  currentParticipantId,
  selectedEnemyId,
  actionValidation,
  onCombatAction,
  onNextTurn,
  onRollInitiative,
  onTwoWeaponAttack,
  onEnhancedAttack,
  onClassFeatureUse,
  onRacialTraitUse,
  onDeathSave,
  showNextTurnButton = true,
}) => {
  const currentParticipant = activeEncounter.participants.find(
    (p) => p.id === currentParticipantId,
  );

  if (!currentParticipant) {
    return null;
  }

  const isDying = needsDeathSaves(currentParticipant);
  const isDead = currentParticipant.isDead || false;
  const hasConditions = currentParticipant.conditions && currentParticipant.conditions.length > 0;
  const hasConcentration = currentParticipant.activeConcentration;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
            <span className="font-semibold">{currentParticipant.name}'s Turn</span>
          </div>
          {showNextTurnButton && (
            <Button variant="outline" size="sm" onClick={onNextTurn}>
              <Play className="w-4 h-4 mr-2" />
              Next Turn
            </Button>
          )}
        </div>

        <Separator className="my-3" />

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
          <div className="flex gap-2 flex-wrap">
            <DiceRoller
              dice="1d20"
              label="Initiative"
              modifier={0}
              onRoll={() => onRollInitiative(currentParticipant.id)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onCombatAction('grapple', currentParticipant.id, selectedEnemyId || undefined)
              }
            >
              Grapple
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onCombatAction('shove', currentParticipant.id, selectedEnemyId || undefined)
              }
            >
              Shove
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTwoWeaponAttack(currentParticipant.id, selectedEnemyId || undefined)}
            >
              Two-Weapon Attack
            </Button>
            {currentParticipant.characterClass === 'paladin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onEnhancedAttack(
                    currentParticipant.id,
                    selectedEnemyId || undefined,
                    'divine_smite',
                    false,
                    false,
                    1,
                  )
                }
              >
                Divine Smite (1st)
              </Button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCombatAction('dash', currentParticipant.id)}
            >
              Dash
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCombatAction('dodge', currentParticipant.id)}
            >
              Dodge
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCombatAction('help', currentParticipant.id)}
            >
              Help
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCombatAction('hide', currentParticipant.id)}
            >
              Hide
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCombatAction('ready', currentParticipant.id)}
            >
              Ready Action
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCombatAction('cast_spell', currentParticipant.id)}
            >
              Cast Spell
            </Button>
          </div>

          {currentParticipant.classFeatures && (
            <div className="flex gap-2 flex-wrap">
              {currentParticipant.classFeatures
                .filter((feature) => feature.type !== 'passive')
                .map((feature) => {
                  const canUse = canUseClassFeature(
                    feature,
                    (currentParticipant.resources || {}) as any,
                  );
                  return (
                    <Button
                      key={feature.name}
                      variant="outline"
                      size="sm"
                      onClick={() => onClassFeatureUse(currentParticipant.id, feature.name)}
                      disabled={!canUse}
                      className={
                        currentParticipant.isRaging && feature.name === 'rage'
                          ? 'bg-red-500 text-white'
                          : ''
                      }
                    >
                      {feature.name === 'rage' && currentParticipant.isRaging ? (
                        <>
                          <Flame className="w-4 h-4 mr-1" />
                          Stop Raging
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-1" />
                          {feature.name.replace('_', ' ')}
                        </>
                      )}
                      {feature.maxUses && (
                        <span className="ml-1 text-xs">
                          ({feature.currentUses || 0}/{feature.maxUses})
                        </span>
                      )}
                    </Button>
                  );
                })}
            </div>
          )}

          {currentParticipant.racialTraits &&
            (() => {
              const activeTraits = currentParticipant.racialTraits.filter(
                (trait) => trait.type === 'active' && canUseRacialTrait(trait),
              );
              if (activeTraits.length === 0) return null;
              return (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Racial Traits:</div>
                  <div className="flex gap-2 flex-wrap">
                    {activeTraits.map((trait) => (
                      <Button
                        key={trait.name}
                        variant="outline"
                        size="sm"
                        onClick={() => onRacialTraitUse(currentParticipant.id, trait.name)}
                        className="bg-green-50 hover:bg-green-100 border-green-200"
                      >
                        {trait.name.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        {trait.currentUses !== undefined && (
                          <span className="ml-1 text-xs">
                            ({trait.currentUses}/{trait.maxUses})
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })()}

          {(hasConditions || isDying || isDead || hasConcentration) && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Status:</div>
              <div className="flex gap-2 flex-wrap items-center">
                {hasConcentration && (
                  <Badge variant="outline" className="border-blue-500 text-blue-700">
                    Concentrating
                  </Badge>
                )}
                {isDying && (
                  <DeathSaveManager participant={currentParticipant} onDeathSave={onDeathSave} />
                )}
                {isDead && <Badge variant="destructive">Dead</Badge>}
                {hasConditions &&
                  currentParticipant.conditions.map((condition) => (
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
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActionPanel;

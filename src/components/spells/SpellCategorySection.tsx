import { Sparkles, Wand2, Users, Info } from 'lucide-react';
import React from 'react';

import SpellCard from './SpellCard';

import type { Spell } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import logger from '@/lib/logger';

interface SpellCategorySectionProps {
  title: string;
  description: string;
  spells: Spell[];
  selectedSpells: string[];
  maxSpells: number;
  onToggleSpell: (spellId: string) => void;
  icon?: 'cantrip' | 'spell' | 'racial';
  showProgress?: boolean;
  info?: string;
  className?: string;
  colorTheme?: 'gold' | 'purple' | 'teal';
}

/**
 * SpellCategorySection - Organized section for different spell categories
 * Features:
 * - Clear category identification with icons
 * - Progress tracking toward selection limits
 * - Spell list with filtering and selection
 * - Educational information about spell types
 * - Visual feedback for selection status
 */
const SpellCategorySection: React.FC<SpellCategorySectionProps> = ({
  title,
  description,
  spells,
  selectedSpells,
  maxSpells,
  onToggleSpell,
  icon = 'spell',
  showProgress = true,
  info,
  className = '',
  colorTheme = 'purple',
}) => {
  const selectedCount = selectedSpells.length;
  const progressPercentage = maxSpells > 0 ? (selectedCount / maxSpells) * 100 : 0;
  const isComplete = selectedCount === maxSpells;
  const isOverLimit = selectedCount > maxSpells;

  // Debug logging for spell categories
  logger.debug(`🎯 [SpellCategorySection] ${title} - Render:`, {
    spellCount: spells.length,
    selectedCount,
    maxSpells,
    spellNames: spells.slice(0, 3).map((s) => s.name),
    selectedSpells,
    isComplete,
    isOverLimit,
  });

  const getIcon = () => {
    switch (icon) {
      case 'cantrip':
        return <Sparkles className="w-5 h-5 text-yellow-500" />;
      case 'racial':
        return <Users className="w-5 h-5 text-purple-500" />;
      default:
        return <Wand2 className="w-5 h-5 text-blue-500" />;
    }
  };

  const getProgressColor = () => {
    if (isOverLimit) return 'bg-destructive';
    if (isComplete) return 'bg-green-500';
    return 'bg-primary';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {getIcon()}
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                {title}
                <Badge
                  variant={isOverLimit ? 'destructive' : isComplete ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {selectedCount}/{maxSpells}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {showProgress && maxSpells > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Selection Progress</span>
              <span className={isOverLimit ? 'text-destructive font-medium' : ''}>
                {selectedCount} of {maxSpells} selected
              </span>
            </div>
            <Progress
              value={Math.min(progressPercentage, 100)}
              className="h-2"
              style={
                {
                  '--progress-bg': getProgressColor(),
                } as React.CSSProperties
              }
            />
            {isOverLimit && (
              <p className="text-xs text-destructive">
                Too many spells selected. Please deselect {selectedCount - maxSpells} spell
                {selectedCount - maxSpells > 1 ? 's' : ''}.
              </p>
            )}
          </div>
        )}

        {/* Info Box */}
        {info && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">{info}</p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {spells.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
              {getIcon()}
            </div>
            <p>No spells available in this category</p>
          </div>
        ) : (
          <div className="space-y-3">
            {spells.map((spell) => {
              const isSelected = selectedSpells.includes(spell.id);
              const isDisabled = !isSelected && selectedCount >= maxSpells;

              return (
                <SpellCard
                  key={spell.id}
                  spell={spell}
                  isSelected={isSelected}
                  isDisabled={isDisabled}
                  onToggle={onToggleSpell}
                  showLevel={icon !== 'cantrip'}
                  colorTheme={colorTheme}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SpellCategorySection;

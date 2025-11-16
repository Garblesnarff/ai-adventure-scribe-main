import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HexagonalBadge } from '@/components/ui/hexagonal-badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Spell } from '@/types/character';
import { getComponentTrackingInfo } from '@/utils/spellComponents';
import {
  Eye,
  Hand,
  Gem,
  Clock,
  Target,
  Timer,
  Zap,
  Sparkles,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import logger from '@/lib/logger';

interface SpellCardProps {
  spell: Spell;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (spellId: string) => void;
  showLevel?: boolean;
  className?: string;
  colorTheme?: 'gold' | 'purple' | 'teal';
}

/**
 * SpellCard - Individual spell display component with comprehensive information
 * Features:
 * - Clear spell identification with level and school
 * - Component indicators (V, S, M) with tooltips
 * - Visual indicators for concentration, ritual, damage
 * - Interactive selection state with validation
 * - Mobile-responsive design
 * - Accessibility support
 */
const SpellCard: React.FC<SpellCardProps> = ({
  spell,
  isSelected,
  isDisabled,
  onToggle,
  showLevel = true,
  className = '',
  colorTheme = 'purple',
}) => {
  const components = getComponentTrackingInfo(spell);

  // School color mapping for visual consistency
  const schoolColors: Record<string, string> = {
    Abjuration: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    Conjuration: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    Divination: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    Enchantment: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    Evocation: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    Illusion: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    Necromancy: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    Transmutation: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };

  const schoolColor =
    schoolColors[spell.school] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';

  // Get theme-specific colors for selection highlighting
  const getThemeColors = () => {
    switch (colorTheme) {
      case 'gold':
        return {
          border: 'border-infinite-gold',
          bg: 'bg-infinite-gold/10',
          shadow: 'shadow-infinite-gold/20',
          checkbox:
            'data-[state=checked]:bg-infinite-gold data-[state=checked]:border-infinite-gold',
        };
      case 'purple':
        return {
          border: 'border-infinite-purple',
          bg: 'bg-infinite-purple/10',
          shadow: 'shadow-infinite-purple/20',
          checkbox:
            'data-[state=checked]:bg-infinite-purple data-[state=checked]:border-infinite-purple',
        };
      case 'teal':
        return {
          border: 'border-infinite-teal',
          bg: 'bg-infinite-teal/10',
          shadow: 'shadow-infinite-teal/20',
          checkbox:
            'data-[state=checked]:bg-infinite-teal data-[state=checked]:border-infinite-teal',
        };
      default:
        return {
          border: 'border-primary',
          bg: 'bg-primary/5',
          shadow: 'shadow-primary/20',
          checkbox: 'data-[state=checked]:bg-primary data-[state=checked]:border-primary',
        };
    }
  };

  const themeColors = getThemeColors();

  return (
    <TooltipProvider>
      <Card
        className={`
          transition-all duration-200 cursor-pointer hover:shadow-md
          ${
            isSelected
              ? `${themeColors.border} ${themeColors.bg} shadow-sm ${themeColors.shadow}`
              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
          }
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        onClick={() => {
          logger.info(`🪄 [SpellCard] Click on ${spell.name}:`, {
            spellId: spell.id,
            isSelected,
            isDisabled,
            willToggle: !isDisabled,
          });
          if (!isDisabled) {
            onToggle(spell.id);
          }
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Main Content */}
            <div className="flex-1 space-y-2">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg leading-tight">{spell.name}</h4>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {/* Level Badge */}
                    {showLevel && (
                      <HexagonalBadge variant="outline" size="sm" className="text-xs">
                        {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}
                      </HexagonalBadge>
                    )}

                    {/* School Badge */}
                    <HexagonalBadge size="sm" className={`text-xs ${schoolColor}`}>
                      {spell.school}
                    </HexagonalBadge>

                    {/* Special Indicators */}
                    {spell.concentration && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HexagonalBadge
                            variant="secondary"
                            size="sm"
                            className="text-xs flex items-center gap-1"
                          >
                            <Timer className="w-3 h-3" />
                            Concentration
                          </HexagonalBadge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Requires concentration to maintain</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {spell.ritual && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HexagonalBadge
                            variant="secondary"
                            size="sm"
                            className="text-xs flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Ritual
                          </HexagonalBadge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Can be cast as a ritual (+10 minutes, no spell slot)</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {spell.damage && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HexagonalBadge
                            variant="destructive"
                            size="sm"
                            className="text-xs flex items-center gap-1"
                          >
                            <Zap className="w-3 h-3" />
                            {spell.damage}
                          </HexagonalBadge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Damage: {spell.damage}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {/* Selection Checkbox */}
                <Checkbox
                  checked={isSelected}
                  disabled={isDisabled}
                  className={`mt-1 ${themeColors.checkbox}`}
                  aria-label={`Select ${spell.name}`}
                />
              </div>

              {/* Spell Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className="truncate">{spell.casting_time}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Casting Time: {spell.casting_time}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      <span className="truncate">{spell.range_text}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Range: {spell.range_text}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      <span className="truncate">{spell.duration}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Duration: {spell.duration}</p>
                  </TooltipContent>
                </Tooltip>

                {/* Components */}
                <div className="flex items-center gap-1">
                  {components.verbal && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Eye className="w-3 h-3 text-blue-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Verbal component required</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {components.somatic && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Hand className="w-3 h-3 text-green-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Somatic component required (hand gestures)</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {components.material && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Gem
                          className={`w-3 h-3 ${components.materialCost ? 'text-yellow-500' : 'text-purple-500'}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs">
                          <p>Material component required</p>
                          {components.materialDescription && (
                            <p className="mt-1 text-sm">{components.materialDescription}</p>
                          )}
                          {components.materialCost && (
                            <p className="mt-1 text-sm font-semibold">
                              Cost: {components.materialCost} GP
                              {components.materialConsumed && ' (consumed)'}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-foreground leading-relaxed">{spell.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default SpellCard;

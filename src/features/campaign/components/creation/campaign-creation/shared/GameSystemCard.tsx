import { Check, Star } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { GameSystem, GameSystemConfig } from '@/types/game-systems';

interface GameSystemCardProps {
  system: GameSystemConfig;
  selected?: boolean;
  onSelect: (systemId: GameSystem) => void;
  variant?: 'grid' | 'list' | 'compact';
}

/**
 * Renders a complexity rating as stars (1-5)
 */
const ComplexityStars: React.FC<{ complexity: number; className?: string }> = ({
  complexity,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-0.5', className)} aria-label={`Complexity: ${complexity} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            'w-3.5 h-3.5 transition-colors',
            index < complexity
              ? 'fill-amber-400 text-amber-400'
              : 'fill-gray-200 text-gray-300 dark:fill-gray-700 dark:text-gray-600',
          )}
        />
      ))}
    </div>
  );
};

/**
 * Renders a license badge with appropriate styling
 */
const LicenseBadge: React.FC<{ license: string; className?: string }> = ({
  license,
  className,
}) => {
  const getLicenseColor = (license: string) => {
    switch (license) {
      case 'OGL':
        return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700';
      case 'CC-BY':
        return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700';
      case 'CC-BY-SA':
        return 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-700';
      case 'ORC':
        return 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-700';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
    }
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-semibold border px-2 py-0.5',
        getLicenseColor(license),
        className,
      )}
    >
      {license}
    </Badge>
  );
};

/**
 * GameSystemCard Component
 *
 * A reusable card component for displaying game system information with multiple layout variants.
 * Supports selection state, complexity visualization, license display, and responsive design.
 */
export const GameSystemCard: React.FC<GameSystemCardProps> = ({
  system,
  selected = false,
  onSelect,
  variant = 'grid',
}) => {
  const handleClick = () => {
    onSelect(system.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(system.id);
    }
  };

  // Grid variant - large icon, vertical layout
  if (variant === 'grid') {
    return (
      <Card
        className={cn(
          'cursor-pointer transition-all duration-300 hover:shadow-xl border-2 p-6 relative group',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          selected
            ? 'shadow-lg'
            : 'border-border hover:border-primary/50',
        )}
        style={{
          borderColor: selected ? system.color : undefined,
          backgroundColor: selected ? `${system.color}08` : undefined,
        }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={`${system.name} - ${system.description}`}
      >
        {/* Selection checkmark */}
        {selected && (
          <div
            className="absolute top-3 right-3 rounded-full p-1.5 text-white shadow-md"
            style={{ backgroundColor: system.color }}
          >
            <Check className="w-4 h-4" />
          </div>
        )}

        {/* System icon */}
        <div className="flex justify-center mb-4">
          <div
            className={cn(
              'text-6xl transition-transform duration-300 group-hover:scale-110',
              selected && 'scale-110',
            )}
          >
            {system.icon}
          </div>
        </div>

        {/* System name */}
        <h3 className="text-xl font-bold text-center mb-2 text-foreground">
          {system.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground text-center mb-4 line-clamp-2 min-h-[2.5rem]">
          {system.description}
        </p>

        {/* Complexity and License */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Complexity</span>
            <ComplexityStars complexity={system.complexity} />
          </div>
          <LicenseBadge license={system.license} />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4 min-h-[2rem]">
          {system.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {system.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{system.tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Select button */}
        <Button
          className="w-full transition-all"
          variant={selected ? 'default' : 'outline'}
          style={
            selected
              ? {
                  backgroundColor: system.color,
                  borderColor: system.color,
                  color: 'white',
                }
              : undefined
          }
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          {selected ? (
            <>
              <Check className="w-4 h-4" />
              Selected
            </>
          ) : (
            'Select System'
          )}
        </Button>
      </Card>
    );
  }

  // List variant - horizontal layout with full details
  if (variant === 'list') {
    return (
      <Card
        className={cn(
          'cursor-pointer transition-all duration-300 hover:shadow-lg border-2 p-4 relative',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          selected
            ? 'shadow-lg'
            : 'border-border hover:border-primary/50',
        )}
        style={{
          borderColor: selected ? system.color : undefined,
          backgroundColor: selected ? `${system.color}08` : undefined,
        }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={`${system.name} - ${system.description}`}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="text-5xl flex-shrink-0 transition-transform duration-300 hover:scale-110">
            {system.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground mb-1">
                  {system.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {system.description}
                </p>
              </div>
              {selected && (
                <div
                  className="rounded-full p-1.5 text-white shadow-md ml-2 flex-shrink-0"
                  style={{ backgroundColor: system.color }}
                >
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Meta information */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Complexity:</span>
                <ComplexityStars complexity={system.complexity} />
              </div>
              <LicenseBadge license={system.license} />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {system.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Select button */}
          <div className="flex-shrink-0">
            <Button
              variant={selected ? 'default' : 'outline'}
              size="sm"
              style={
                selected
                  ? {
                      backgroundColor: system.color,
                      borderColor: system.color,
                      color: 'white',
                    }
                  : undefined
              }
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              {selected ? (
                <>
                  <Check className="w-4 h-4" />
                  Selected
                </>
              ) : (
                'Select'
              )}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Compact variant - minimal space, essential info only
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-300 hover:shadow-md border-2 p-3 relative',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        selected
          ? 'shadow-md'
          : 'border-border hover:border-primary/50',
      )}
      style={{
        borderColor: selected ? system.color : undefined,
        backgroundColor: selected ? `${system.color}08` : undefined,
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${system.name} - ${system.description}`}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="text-3xl flex-shrink-0">
          {system.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-foreground truncate">
              {system.name}
            </h3>
            {selected && (
              <div
                className="rounded-full p-0.5 text-white shadow-sm ml-2 flex-shrink-0"
                style={{ backgroundColor: system.color }}
              >
                <Check className="w-3 h-3" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mb-1">
            <ComplexityStars complexity={system.complexity} className="scale-90 origin-left" />
            <LicenseBadge license={system.license} className="text-[10px] px-1.5 py-0" />
          </div>
          <div className="flex flex-wrap gap-1">
            {system.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {system.tags.length > 2 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{system.tags.length - 2}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default GameSystemCard;

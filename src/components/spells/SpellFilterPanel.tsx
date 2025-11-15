import { Filter, X, Eye, Hand, Gem, Timer, RotateCcw, Zap } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export interface SpellFilters {
  schools: string[];
  components: {
    verbal: boolean;
    somatic: boolean;
    material: boolean;
  };
  properties: {
    concentration: boolean;
    ritual: boolean;
    damage: boolean;
  };
}

interface SpellFilterPanelProps {
  filters: SpellFilters;
  onChange: (filters: SpellFilters) => void;
  availableSchools: string[];
  isOpen?: boolean;
  className?: string;
}

/**
 * SpellFilterPanel - Advanced filtering interface for spells
 * Features:
 * - Filter by spell school with multi-select
 * - Component requirement filters (V, S, M)
 * - Special property filters (concentration, ritual, damage)
 * - Clear all filters functionality
 * - Visual filter indicators
 * - Collapsible design for mobile
 */
const SpellFilterPanel: React.FC<SpellFilterPanelProps> = ({
  filters,
  onChange,
  availableSchools,
  isOpen = true,
  className = '',
}) => {
  const schoolColors: Record<string, string> = {
    Abjuration: 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200',
    Conjuration:
      'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200',
    Divination:
      'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200',
    Enchantment: 'bg-pink-100 text-pink-800 hover:bg-pink-200 dark:bg-pink-900 dark:text-pink-200',
    Evocation: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200',
    Illusion:
      'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200',
    Necromancy: 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-200',
    Transmutation:
      'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200',
  };

  const toggleSchool = (school: string) => {
    const newSchools = filters.schools.includes(school)
      ? filters.schools.filter((s) => s !== school)
      : [...filters.schools, school];

    onChange({
      ...filters,
      schools: newSchools,
    });
  };

  const toggleComponent = (component: keyof SpellFilters['components']) => {
    onChange({
      ...filters,
      components: {
        ...filters.components,
        [component]: !filters.components[component],
      },
    });
  };

  const toggleProperty = (property: keyof SpellFilters['properties']) => {
    onChange({
      ...filters,
      properties: {
        ...filters.properties,
        [property]: !filters.properties[property],
      },
    });
  };

  const clearAllFilters = () => {
    onChange({
      schools: [],
      components: {
        verbal: false,
        somatic: false,
        material: false,
      },
      properties: {
        concentration: false,
        ritual: false,
        damage: false,
      },
    });
  };

  const hasActiveFilters =
    filters.schools.length > 0 ||
    Object.values(filters.components).some(Boolean) ||
    Object.values(filters.properties).some(Boolean);

  if (!isOpen) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs h-7">
              <X className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* School Filters */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Schools of Magic</Label>
          <div className="flex flex-wrap gap-2">
            {availableSchools.map((school) => {
              const isSelected = filters.schools.includes(school);
              const colorClass = schoolColors[school] || 'bg-gray-100 text-gray-800';

              return (
                <Badge
                  key={school}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? colorClass : 'hover:bg-muted'
                  }`}
                  onClick={() => toggleSchool(school)}
                >
                  {school}
                </Badge>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Component Filters */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Components Required</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="verbal"
                checked={filters.components.verbal}
                onCheckedChange={() => toggleComponent('verbal')}
              />
              <Label htmlFor="verbal" className="flex items-center gap-2 text-sm cursor-pointer">
                <Eye className="w-4 h-4 text-blue-500" />
                Verbal (V)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="somatic"
                checked={filters.components.somatic}
                onCheckedChange={() => toggleComponent('somatic')}
              />
              <Label htmlFor="somatic" className="flex items-center gap-2 text-sm cursor-pointer">
                <Hand className="w-4 h-4 text-green-500" />
                Somatic (S)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="material"
                checked={filters.components.material}
                onCheckedChange={() => toggleComponent('material')}
              />
              <Label htmlFor="material" className="flex items-center gap-2 text-sm cursor-pointer">
                <Gem className="w-4 h-4 text-purple-500" />
                Material (M)
              </Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Property Filters */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Special Properties</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="concentration"
                checked={filters.properties.concentration}
                onCheckedChange={() => toggleProperty('concentration')}
              />
              <Label
                htmlFor="concentration"
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Timer className="w-4 h-4 text-orange-500" />
                Concentration
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ritual"
                checked={filters.properties.ritual}
                onCheckedChange={() => toggleProperty('ritual')}
              />
              <Label htmlFor="ritual" className="flex items-center gap-2 text-sm cursor-pointer">
                <RotateCcw className="w-4 h-4 text-indigo-500" />
                Ritual
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="damage"
                checked={filters.properties.damage}
                onCheckedChange={() => toggleProperty('damage')}
              />
              <Label htmlFor="damage" className="flex items-center gap-2 text-sm cursor-pointer">
                <Zap className="w-4 h-4 text-red-500" />
                Deals Damage
              </Label>
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm font-medium">Active Filters</Label>
              <div className="flex flex-wrap gap-1">
                {filters.schools.map((school) => (
                  <Badge
                    key={school}
                    variant="secondary"
                    className="text-xs cursor-pointer"
                    onClick={() => toggleSchool(school)}
                  >
                    {school}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
                {Object.entries(filters.components).map(
                  ([component, active]) =>
                    active && (
                      <Badge
                        key={component}
                        variant="secondary"
                        className="text-xs cursor-pointer"
                        onClick={() =>
                          toggleComponent(component as keyof SpellFilters['components'])
                        }
                      >
                        {component.charAt(0).toUpperCase()}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ),
                )}
                {Object.entries(filters.properties).map(
                  ([property, active]) =>
                    active && (
                      <Badge
                        key={property}
                        variant="secondary"
                        className="text-xs cursor-pointer"
                        onClick={() => toggleProperty(property as keyof SpellFilters['properties'])}
                      >
                        {property}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ),
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SpellFilterPanel;

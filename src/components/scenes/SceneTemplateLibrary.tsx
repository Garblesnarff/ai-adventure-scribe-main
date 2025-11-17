/**
 * Scene Template Library Component
 *
 * Built-in scene templates for quick scene creation:
 * - Tavern
 * - Forest
 * - Dungeon
 * - Castle
 * - Cave
 * - Town Square
 * - And more...
 */

import React, { useState } from 'react';
import { Search, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GridType } from '@/types/scene';
import { cn } from '@/lib/utils';

interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  category: 'interior' | 'exterior' | 'dungeon' | 'wilderness' | 'urban';
  width: number;
  height: number;
  gridSize: number;
  gridType: GridType;
  thumbnailEmoji: string;
  suggestedSettings: {
    enableFogOfWar: boolean;
    enableDynamicLighting: boolean;
    ambientLightLevel: string;
    timeOfDay: string;
  };
}

const BUILT_IN_TEMPLATES: SceneTemplate[] = [
  {
    id: 'tavern',
    name: 'Tavern Interior',
    description: 'Cozy tavern with tables, bar, and fireplace',
    category: 'interior',
    width: 20,
    height: 15,
    gridSize: 5,
    gridType: GridType.SQUARE,
    thumbnailEmoji: '🍺',
    suggestedSettings: {
      enableFogOfWar: false,
      enableDynamicLighting: true,
      ambientLightLevel: '0.70',
      timeOfDay: 'night',
    },
  },
  {
    id: 'forest',
    name: 'Forest Clearing',
    description: 'Open area surrounded by dense trees',
    category: 'wilderness',
    width: 30,
    height: 25,
    gridSize: 5,
    gridType: GridType.HEXAGONAL_VERTICAL,
    thumbnailEmoji: '🌲',
    suggestedSettings: {
      enableFogOfWar: true,
      enableDynamicLighting: false,
      ambientLightLevel: '1.00',
      timeOfDay: 'day',
    },
  },
  {
    id: 'dungeon-corridor',
    name: 'Dungeon Corridor',
    description: 'Stone corridors with multiple rooms',
    category: 'dungeon',
    width: 25,
    height: 20,
    gridSize: 5,
    gridType: GridType.SQUARE,
    thumbnailEmoji: '🏛️',
    suggestedSettings: {
      enableFogOfWar: true,
      enableDynamicLighting: true,
      ambientLightLevel: '0.20',
      timeOfDay: 'night',
    },
  },
  {
    id: 'castle-throne',
    name: 'Castle Throne Room',
    description: 'Grand hall with throne and pillars',
    category: 'interior',
    width: 30,
    height: 20,
    gridSize: 5,
    gridType: GridType.SQUARE,
    thumbnailEmoji: '👑',
    suggestedSettings: {
      enableFogOfWar: false,
      enableDynamicLighting: true,
      ambientLightLevel: '0.80',
      timeOfDay: 'day',
    },
  },
  {
    id: 'cave',
    name: 'Natural Cave',
    description: 'Winding cave system with stalagmites',
    category: 'dungeon',
    width: 25,
    height: 25,
    gridSize: 5,
    gridType: GridType.SQUARE,
    thumbnailEmoji: '⛰️',
    suggestedSettings: {
      enableFogOfWar: true,
      enableDynamicLighting: true,
      ambientLightLevel: '0.00',
      timeOfDay: 'night',
    },
  },
  {
    id: 'town-square',
    name: 'Town Square',
    description: 'Open plaza with fountain and market stalls',
    category: 'urban',
    width: 25,
    height: 25,
    gridSize: 5,
    gridType: GridType.SQUARE,
    thumbnailEmoji: '🏛️',
    suggestedSettings: {
      enableFogOfWar: false,
      enableDynamicLighting: false,
      ambientLightLevel: '1.00',
      timeOfDay: 'day',
    },
  },
  {
    id: 'ship-deck',
    name: 'Ship Deck',
    description: 'Upper deck of a sailing vessel',
    category: 'exterior',
    width: 30,
    height: 15,
    gridSize: 5,
    gridType: GridType.SQUARE,
    thumbnailEmoji: '⛵',
    suggestedSettings: {
      enableFogOfWar: false,
      enableDynamicLighting: false,
      ambientLightLevel: '1.00',
      timeOfDay: 'day',
    },
  },
  {
    id: 'arena',
    name: 'Combat Arena',
    description: 'Circular arena with tiered seating',
    category: 'urban',
    width: 30,
    height: 30,
    gridSize: 5,
    gridType: GridType.SQUARE,
    thumbnailEmoji: '⚔️',
    suggestedSettings: {
      enableFogOfWar: false,
      enableDynamicLighting: false,
      ambientLightLevel: '1.00',
      timeOfDay: 'day',
    },
  },
  {
    id: 'mountain-path',
    name: 'Mountain Path',
    description: 'Narrow trail along a cliff face',
    category: 'wilderness',
    width: 20,
    height: 30,
    gridSize: 5,
    gridType: GridType.SQUARE,
    thumbnailEmoji: '🏔️',
    suggestedSettings: {
      enableFogOfWar: true,
      enableDynamicLighting: false,
      ambientLightLevel: '1.00',
      timeOfDay: 'day',
    },
  },
  {
    id: 'wizard-tower',
    name: 'Wizard Tower',
    description: 'Circular tower interior with arcane symbols',
    category: 'interior',
    width: 20,
    height: 20,
    gridSize: 5,
    gridType: GridType.SQUARE,
    thumbnailEmoji: '🔮',
    suggestedSettings: {
      enableFogOfWar: false,
      enableDynamicLighting: true,
      ambientLightLevel: '0.60',
      timeOfDay: 'night',
    },
  },
  {
    id: 'graveyard',
    name: 'Graveyard',
    description: 'Cemetery with tombstones and crypts',
    category: 'exterior',
    width: 25,
    height: 20,
    gridSize: 5,
    gridType: GridType.SQUARE,
    thumbnailEmoji: '⚰️',
    suggestedSettings: {
      enableFogOfWar: true,
      enableDynamicLighting: true,
      ambientLightLevel: '0.40',
      timeOfDay: 'night',
    },
  },
  {
    id: 'bridge',
    name: 'Stone Bridge',
    description: 'Bridge crossing over a ravine or river',
    category: 'exterior',
    width: 15,
    height: 25,
    gridSize: 5,
    gridType: GridType.SQUARE,
    thumbnailEmoji: '🌉',
    suggestedSettings: {
      enableFogOfWar: false,
      enableDynamicLighting: false,
      ambientLightLevel: '1.00',
      timeOfDay: 'day',
    },
  },
];

interface SceneTemplateLibraryProps {
  onSelectTemplate?: (template: SceneTemplate) => void;
  selectedTemplateId?: string;
}

const CATEGORY_COLORS = {
  interior: 'bg-amber-100 text-amber-800',
  exterior: 'bg-green-100 text-green-800',
  dungeon: 'bg-slate-100 text-slate-800',
  wilderness: 'bg-emerald-100 text-emerald-800',
  urban: 'bg-blue-100 text-blue-800',
};

export const SceneTemplateLibrary: React.FC<SceneTemplateLibraryProps> = ({
  onSelectTemplate,
  selectedTemplateId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(BUILT_IN_TEMPLATES.map((t) => t.category)));

  const filteredTemplates = BUILT_IN_TEMPLATES.filter((template) => {
    const matchesSearch =
      !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="capitalize"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => {
          const isSelected = template.id === selectedTemplateId;

          return (
            <Card
              key={template.id}
              variant="parchment"
              className={cn(
                'cursor-pointer transition-all hover:scale-[1.02]',
                isSelected && 'ring-2 ring-electricCyan shadow-lg shadow-electricCyan/50',
              )}
              onClick={() => onSelectTemplate?.(template)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-5xl mb-2">{template.thumbnailEmoji}</div>
                  {isSelected && (
                    <div className="bg-electricCyan text-white rounded-full p-1">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription className="text-sm">
                  {template.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <Badge className={CATEGORY_COLORS[template.category]}>
                  {template.category}
                </Badge>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Size</p>
                    <p className="font-medium">
                      {template.width} × {template.height}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Grid</p>
                    <p className="font-medium capitalize">
                      {template.gridType.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Light</p>
                    <p className="font-medium">
                      {Math.round(parseFloat(template.suggestedSettings.ambientLightLevel) * 100)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Time</p>
                    <p className="font-medium capitalize">
                      {template.suggestedSettings.timeOfDay}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 text-xs">
                  {template.suggestedSettings.enableFogOfWar && (
                    <Badge variant="outline">Fog of War</Badge>
                  )}
                  {template.suggestedSettings.enableDynamicLighting && (
                    <Badge variant="outline">Dynamic Light</Badge>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-0">
                <Button
                  variant={isSelected ? 'default' : 'outline'}
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTemplate?.(template);
                  }}
                >
                  {isSelected ? 'Selected' : 'Use Template'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <Card variant="parchment" className="p-12 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <CardTitle className="mb-2">No Templates Found</CardTitle>
          <CardDescription>
            Try adjusting your search or filter to find templates.
          </CardDescription>
        </Card>
      )}
    </div>
  );
};

export { BUILT_IN_TEMPLATES };
export type { SceneTemplate };

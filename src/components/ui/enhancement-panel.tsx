/**
 * Enhancement Panel Component
 *
 * Groups and manages multiple enhancement options for character
 * and campaign creation with filtering and AI integration.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Filter, Sparkles, RotateCcw } from 'lucide-react';
import {
  EnhancementOption,
  OptionSelection,
  EnhancementPackage,
  checkOptionAvailability,
  CHARACTER_ENHANCEMENTS,
  CAMPAIGN_ENHANCEMENTS
} from '@/types/enhancement-options';
import { OptionSelector } from './option-selector';

interface EnhancementPanelProps {
  category: 'character' | 'campaign';
  characterData?: any;
  campaignData?: any;
  selections: OptionSelection[];
  onSelectionChange: (selections: OptionSelection[]) => void;
  onAIGenerate?: (optionId: string) => Promise<string>;
  className?: string;
}

export function EnhancementPanel({
  category,
  characterData,
  campaignData,
  selections,
  onSelectionChange,
  onAIGenerate,
  className = ''
}: EnhancementPanelProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [showOnlyAvailable, setShowOnlyAvailable] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState<string | null>(null);

  // Get the appropriate options based on category
  const allOptions = category === 'character' ? CHARACTER_ENHANCEMENTS : CAMPAIGN_ENHANCEMENTS;

  // Get all available tags
  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    allOptions.forEach(option => {
      option.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [allOptions]);

  // Filter options based on search, tags, and availability
  const filteredOptions = React.useMemo(() => {
    let filtered = allOptions;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(option =>
        option.name.toLowerCase().includes(term) ||
        option.description.toLowerCase().includes(term) ||
        option.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(option =>
        selectedTags.some(tag => option.tags.includes(tag))
      );
    }

    // Availability filter
    if (showOnlyAvailable) {
      const selectedOptionIds = selections.map(s => s.optionId);
      filtered = filtered.filter(option =>
        checkOptionAvailability(option, characterData, campaignData, selectedOptionIds)
      );
    }

    return filtered;
  }, [allOptions, searchTerm, selectedTags, showOnlyAvailable, characterData, campaignData, selections]);

  // Group options by their primary tag
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, EnhancementOption[]> = {};
    filteredOptions.forEach(option => {
      const primaryTag = option.tags[0] || 'other';
      if (!groups[primaryTag]) {
        groups[primaryTag] = [];
      }
      groups[primaryTag].push(option);
    });
    return groups;
  }, [filteredOptions]);

  const handleSelectionChange = (selection: OptionSelection) => {
    const existingIndex = selections.findIndex(s => s.optionId === selection.optionId);

    if (existingIndex >= 0) {
      // Update existing selection
      const newSelections = [...selections];
      newSelections[existingIndex] = selection;
      onSelectionChange(newSelections);
    } else {
      // Add new selection
      onSelectionChange([...selections, selection]);
    }
  };

  const handleRemoveSelection = (optionId: string) => {
    onSelectionChange(selections.filter(s => s.optionId !== optionId));
  };

  const handleAIGenerate = async (optionId: string): Promise<string> => {
    if (!onAIGenerate) return '';

    setIsGenerating(optionId);
    try {
      const result = await onAIGenerate(optionId);
      return result;
    } finally {
      setIsGenerating(null);
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
    setShowOnlyAvailable(true);
  };

  const getSelectionValue = (optionId: string) => {
    return selections.find(s => s.optionId === optionId);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          {category === 'character' ? 'Character Enhancements' : 'Campaign Enhancements'}
        </CardTitle>
        <CardDescription>
          {category === 'character'
            ? 'Select options to make your character unique and interesting'
            : 'Choose elements to enhance your campaign world and story'
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search enhancements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
              className={showOnlyAvailable ? 'bg-primary/10' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              Available Only
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>

          {/* Tag Filter */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Filter by tags:</p>
            <div className="flex flex-wrap gap-1">
              {allTags.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Current Selections Summary */}
        {selections.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Current Selections ({selections.length}):</h4>
            <div className="flex flex-wrap gap-2">
              {selections.map(selection => {
                const option = allOptions.find(o => o.id === selection.optionId);
                if (!option) return null;

                return (
                  <Badge
                    key={selection.optionId}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/20 transition-colors"
                    onClick={() => handleRemoveSelection(selection.optionId)}
                  >
                    {option.icon} {option.name} ×
                  </Badge>
                );
              })}
            </div>
            <Separator />
          </div>
        )}

        {/* Options Display */}
        <ScrollArea className="h-[500px]">
          {Object.keys(groupedOptions).length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No enhancements match your current filters.</p>
              <Button variant="outline" onClick={clearFilters} className="mt-2">
                Clear Filters
              </Button>
            </div>
          ) : (
            <Tabs defaultValue={Object.keys(groupedOptions)[0]} className="w-full">
              <div className="flex justify-start mb-4">
                <TabsList className="bg-muted/50 p-1 rounded-lg">
                  {Object.keys(groupedOptions).map(group => (
                    <TabsTrigger
                      key={group}
                      value={group}
                      className="capitalize text-sm px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                    >
                      {group} ({groupedOptions[group].length})
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {Object.entries(groupedOptions).map(([group, options]) => (
                <TabsContent key={group} value={group} className="mt-4 space-y-4">
                  {options.map(option => {
                    const isSelected = selections.some(s => s.optionId === option.id);
                    const selectedOptionIds = selections.map(s => s.optionId);
                    const isAvailable = checkOptionAvailability(
                      option,
                      characterData,
                      campaignData,
                      selectedOptionIds
                    );

                    return (
                      <OptionSelector
                        key={option.id}
                        option={option}
                        value={getSelectionValue(option.id)}
                        onChange={handleSelectionChange}
                        disabled={!isAvailable && !isSelected}
                        onAIGenerate={option.aiGenerated ? handleAIGenerate : undefined}
                        isGenerating={isGenerating === option.id}
                      />
                    );
                  })}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/**
 * Enhancement Panel Component
 *
 * Groups and manages multiple enhancement options for character
 * and campaign creation with filtering and AI integration.
 */

import { Search, Filter, Sparkles, RotateCcw, Grid, List, Eye } from 'lucide-react';
import React from 'react';

import { OptionSelector } from './option-selector';

import type { EnhancementOption, OptionSelection } from '@/types/enhancement-options';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  EnhancementPackage,
  checkOptionAvailability,
  CHARACTER_ENHANCEMENTS,
  CAMPAIGN_ENHANCEMENTS,
} from '@/types/enhancement-options';

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
  className = '',
}: EnhancementPanelProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [showOnlyAvailable, setShowOnlyAvailable] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<'grid' | 'list' | 'compact'>('grid');

  const CARD_TAGS = React.useMemo(
    () => new Set(['plot', 'hooks', 'story', 'worldbuilding', 'politics', 'tone', 'economy']),
    [],
  );
  const CARD_IDS = React.useMemo(
    () =>
      new Set([
        'story-hooks',
        'world-features',
        'social-dynamics',
        'tone-modifiers',
        'economic-factors',
        'secrets',
        'personal-goals',
        'special-training',
      ]),
    [],
  );

  const shouldUseCards = (option: EnhancementOption) => {
    if (CARD_IDS.has(option.id)) return true;
    return option.tags.some((t) => CARD_TAGS.has(t));
  };

  // Get the appropriate options based on category
  const allOptions = category === 'character' ? CHARACTER_ENHANCEMENTS : CAMPAIGN_ENHANCEMENTS;

  // Get all available tags
  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    allOptions.forEach((option) => {
      option.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [allOptions]);

  // Filter options based on search, tags, and availability
  const filteredOptions = React.useMemo(() => {
    let filtered = allOptions;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (option) =>
          option.name.toLowerCase().includes(term) ||
          option.description.toLowerCase().includes(term) ||
          option.tags.some((tag) => tag.toLowerCase().includes(term)),
      );
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter((option) => selectedTags.some((tag) => option.tags.includes(tag)));
    }

    // Availability filter
    if (showOnlyAvailable) {
      const selectedOptionIds = selections.map((s) => s.optionId);
      filtered = filtered.filter((option) =>
        checkOptionAvailability(option, characterData, campaignData, selectedOptionIds),
      );
    }

    return filtered;
  }, [
    allOptions,
    searchTerm,
    selectedTags,
    showOnlyAvailable,
    characterData,
    campaignData,
    selections,
  ]);

  // Group options by their primary tag
  const groupedOptions = React.useMemo(() => {
    const groups: Record<string, EnhancementOption[]> = {};
    filteredOptions.forEach((option) => {
      const primaryTag = option.tags[0] || 'other';
      if (!groups[primaryTag]) {
        groups[primaryTag] = [];
      }
      groups[primaryTag].push(option);
    });
    return groups;
  }, [filteredOptions]);

  const handleSelectionChange = (selection: OptionSelection) => {
    const existingIndex = selections.findIndex((s) => s.optionId === selection.optionId);

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
    onSelectionChange(selections.filter((s) => s.optionId !== optionId));
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
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
    setShowOnlyAvailable(true);
  };

  const getSelectionValue = (optionId: string) => {
    return selections.find((s) => s.optionId === optionId);
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
            : 'Choose elements to enhance your campaign world and story'}
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

          {/* View toggles */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">View:</span>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-none border-x"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'compact' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('compact')}
                className="rounded-l-none"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tag Filter */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Filter by tags:</p>
            <div className="flex flex-wrap gap-1">
              {allTags.map((tag) => (
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
              {selections.map((selection) => {
                const option = allOptions.find((o) => o.id === selection.optionId);
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
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 h-auto p-2 bg-gradient-to-r from-infinite-dark/10 via-infinite-purple/5 to-infinite-teal/10 backdrop-blur-sm border-2 border-infinite-purple/20 shadow-lg">
                  {Object.keys(groupedOptions).map((group) => (
                    <TabsTrigger
                      key={group}
                      value={group}
                      className="
                        flex flex-col items-center gap-2 px-3 py-4 text-xs font-semibold rounded-lg transition-all duration-300 ease-in-out
                        data-[state=active]:bg-gradient-to-br data-[state=active]:from-infinite-purple/20 data-[state=active]:to-infinite-purple/10
                        data-[state=active]:text-infinite-purple data-[state=active]:shadow-lg data-[state=active]:shadow-infinite-purple/25
                        data-[state=active]:border-2 data-[state=active]:border-infinite-purple/30 data-[state=active]:transform data-[state=active]:scale-[1.02]
                        hover:bg-infinite-gold/10 hover:text-infinite-gold hover:shadow-md hover:shadow-infinite-gold/20
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-infinite-purple/50 focus-visible:ring-offset-2
                        disabled:opacity-50 disabled:pointer-events-none
                      "
                    >
                      <span className="capitalize font-ui tracking-wide text-center leading-tight">
                        {group}
                      </span>
                      <span className="text-[10px] opacity-75">
                        ({groupedOptions[group].length})
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {Object.entries(groupedOptions).map(([group, options]) => (
                <TabsContent key={group} value={group} className="mt-4 space-y-6">
                  {options.map((option) => {
                    const isSelected = selections.some((s) => s.optionId === option.id);
                    const selectedOptionIds = selections.map((s) => s.optionId);
                    const isAvailable = checkOptionAvailability(
                      option,
                      characterData,
                      campaignData,
                      selectedOptionIds,
                    );
                    const itemLayout = shouldUseCards(option) ? 'cards' : 'list';

                    // When using cards layout, render per-value cards directly (no nested card wrapper)
                    if (itemLayout === 'cards' && option.options && option.options.length > 0) {
                      const selection = getSelectionValue(option.id);
                      const max = option.max || (option.type === 'multiple' ? Infinity : 1);
                      const selectedValues: string[] = (selection?.value as string[]) || [];
                      const atMax = selectedValues.length >= max;

                      const onToggle = (opt: string) => {
                        if (!isAvailable && !isSelected) return;
                        if (option.type === 'multiple') {
                          const isAlready = selectedValues.includes(opt);
                          if (isAlready) {
                            handleSelectionChange({
                              optionId: option.id,
                              value: selectedValues.filter((v) => v !== opt),
                              timestamp: new Date().toISOString(),
                            });
                          } else if (!atMax) {
                            handleSelectionChange({
                              optionId: option.id,
                              value: [...selectedValues, opt],
                              timestamp: new Date().toISOString(),
                            });
                          }
                        } else {
                          handleSelectionChange({
                            optionId: option.id,
                            value: opt as unknown as OptionSelection['value'],
                            timestamp: new Date().toISOString(),
                          });
                        }
                      };

                      return (
                        <div key={option.id} className="space-y-3">
                          {option.max && option.type === 'multiple' && (
                            <div className="text-xs text-muted-foreground mb-1">
                              Select up to {option.max} options ({selectedValues.length}/
                              {option.max} selected)
                            </div>
                          )}
                          <div
                            role={option.type === 'multiple' ? 'group' : 'radiogroup'}
                            aria-label={option.name}
                            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`}
                          >
                            {option.options.map((opt) => {
                              const isChecked =
                                option.type === 'multiple'
                                  ? selectedValues.includes(opt)
                                  : (selection?.value as string) === opt;
                              const canSelect =
                                option.type === 'multiple' ? isChecked || !atMax : true;
                              return (
                                <Card
                                  key={opt}
                                  role={option.type === 'multiple' ? 'checkbox' : 'radio'}
                                  aria-checked={isChecked}
                                  aria-disabled={!canSelect || (!isAvailable && !isSelected)}
                                  tabIndex={0}
                                  className={`w-full cursor-pointer transition-all rounded-lg border-2 ${
                                    isChecked
                                      ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/30'
                                      : !canSelect || (!isAvailable && !isSelected)
                                        ? 'border-border/60 opacity-60 cursor-not-allowed'
                                        : 'border-border/30 hover:border-primary/50 hover:shadow-xl'
                                  } ${viewMode === 'compact' ? 'p-4' : 'p-6'} hover:-translate-y-0.5`}
                                  onClick={() => {
                                    if (canSelect) onToggle(opt);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      if (canSelect) onToggle(opt);
                                    }
                                  }}
                                >
                                  <div className="flex flex-col gap-2">
                                    <span
                                      className={`${viewMode === 'compact' ? 'text-sm' : 'text-base'} font-medium leading-snug`}
                                    >
                                      {opt}
                                    </span>
                                    {isChecked && (
                                      <Badge variant="secondary" className="text-[10px]">
                                        Selected
                                      </Badge>
                                    )}
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    // Default: render the standard selector card
                    return (
                      <OptionSelector
                        key={option.id}
                        option={option}
                        value={getSelectionValue(option.id)}
                        onChange={handleSelectionChange}
                        disabled={!isAvailable && !isSelected}
                        onAIGenerate={option.aiGenerated ? handleAIGenerate : undefined}
                        isGenerating={isGenerating === option.id}
                        compact={viewMode === 'compact'}
                        itemLayout={itemLayout}
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

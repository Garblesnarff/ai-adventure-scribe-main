import { Gauge, Clock, Theater, Zap, Skull, Grid, List, Eye, Check, Sparkles } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { useCampaign } from '@/contexts/CampaignContext';

/**
 * Predefined options for campaign parameters
 */
const difficultyLevels = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const campaignLengths = [
  { value: 'one-shot', label: 'One-Shot Adventure' },
  { value: 'short', label: 'Short Campaign' },
  { value: 'full', label: 'Full Campaign' },
];

const tones = [
  { value: 'serious', label: 'Serious' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'gritty', label: 'Gritty' },
];

/**
 * Campaign parameters selection component
 * Handles difficulty, length, and tone selection with loading states
 */
const CampaignParameters: React.FC<{ isLoading?: boolean }> = ({ isLoading = false }) => {
  const { state, dispatch } = useCampaign();
  const { toast } = useToast();

  const [viewMode, setViewMode] = React.useState<'grid' | 'list' | 'compact'>('compact');
  const [searchQuery, setSearchQuery] = React.useState('');

  /**
   * Handles parameter value changes
   * @param field - Parameter field name
   * @param value - Selected parameter value
   */
  const handleParameterChange = (field: string, value: string) => {
    dispatch({ type: 'UPDATE_CAMPAIGN', payload: { [field]: value } });
    const label =
      field === 'difficulty_level'
        ? difficultyLevels.find((d) => d.value === value)?.label
        : field === 'campaign_length'
          ? campaignLengths.find((d) => d.value === value)?.label
          : tones.find((d) => d.value === value)?.label;
    toast({ title: 'Selection updated', description: label || value, duration: 1000 });
    // Intentionally do not auto-scroll on parameter selection to avoid jarring UX
  };

  if (isLoading) {
    return (
      <div className="space-y-8 parchment animate-fade-in-up">
        {[1, 2, 3].map((section) => (
          <div key={section}>
            <div className="text-center mb-4">
              <Skeleton className="h-8 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="choice-btn p-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // filters are small; search narrows visible options by label across sections
  const matchesSearch = (label: string) =>
    !searchQuery.trim() || label.toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <div className="space-y-10 parchment animate-fade-in-up">
      {/* Controls */}
      <div className="space-y-4">
        <div className="relative">
          <Input
            placeholder="Search difficulty, length, or tone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
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
      </div>
      <div>
        <div className="text-center mb-6">
          <Label className="text-xl font-serif font-semibold flex items-center justify-center">
            <Gauge className="h-5 w-5 mr-2 text-blue-600" />
            Difficulty Level
          </Label>
          <p className="text-sm text-muted-foreground mt-2">
            Choose the challenge level for your adventurers
          </p>
        </div>
        <RadioGroup
          value={state.campaign?.difficulty_level || ''}
          onValueChange={(value) => handleParameterChange('difficulty_level', value)}
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-3 gap-4'
              : viewMode === 'list'
                ? 'space-y-4'
                : 'grid grid-cols-1 md:grid-cols-3 gap-3'
          }
        >
          {difficultyLevels
            .filter((l) => matchesSearch(l.label))
            .map((level) => {
              const isSelected = state.campaign?.difficulty_level === level.value;
              let colorClass: string;
              switch (level.value) {
                case 'easy':
                  colorClass = 'text-green-600';
                  break;
                case 'medium':
                  colorClass = 'text-amber-600';
                  break;
                case 'hard':
                  colorClass = 'text-destructive';
                  break;
                default:
                  colorClass = 'text-foreground';
              }
              if (viewMode === 'list') {
                return (
                  <Card
                    key={level.value}
                    className={`cursor-pointer transition-all hover:shadow-lg border-2 relative overflow-hidden ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleParameterChange('difficulty_level', level.value)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ')
                        handleParameterChange('difficulty_level', level.value);
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem
                            value={level.value}
                            id={`difficulty-${level.value}`}
                            className="text-blue-600"
                          />
                          <div className={`flex items-center ${colorClass}`}>
                            <Gauge className="h-5 w-5" />
                            <Label
                              htmlFor={`difficulty-${level.value}`}
                              className="font-medium cursor-pointer leading-tight ml-2"
                            >
                              {level.label}
                            </Label>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              }

              if (viewMode === 'compact') {
                return (
                  <Card
                    key={level.value}
                    className={`cursor-pointer transition-all hover:shadow-lg border-2 relative p-3 overflow-hidden ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleParameterChange('difficulty_level', level.value)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ')
                        handleParameterChange('difficulty_level', level.value);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem
                          value={level.value}
                          id={`difficulty-${level.value}`}
                          className="text-blue-600"
                        />
                        <div className={`flex items-center ${colorClass}`}>
                          <Gauge className="h-4 w-4" />
                          <Label
                            htmlFor={`difficulty-${level.value}`}
                            className="font-medium cursor-pointer leading-tight ml-2"
                          >
                            {level.label}
                          </Label>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </Card>
                );
              }

              return (
                <Card
                  key={level.value}
                  className={`group cursor-pointer transition-all hover:shadow-xl border-2 relative overflow-hidden aspect-square ${
                    isSelected
                      ? 'border-primary shadow-lg'
                      : 'border-border/30 hover:border-infinite-purple/50'
                  }`}
                  onClick={() => handleParameterChange('difficulty_level', level.value)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ')
                      handleParameterChange('difficulty_level', level.value);
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{ boxShadow: 'inset 0 0 60px 20px rgba(0,0,0,0.08)' }}
                  />
                  {isSelected && (
                    <div className="absolute top-3 right-3 z-20 bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
                    <Gauge className="h-5 w-5" />
                    <span className="font-bold text-lg">{level.label}</span>
                  </div>
                </Card>
              );
            })}
        </RadioGroup>
      </div>

      <div>
        <div className="text-center mb-6">
          <Label className="text-xl font-serif font-semibold flex items-center justify-center">
            <Clock className="h-5 w-5 mr-2 text-blue-600" />
            Campaign Length
          </Label>
          <p className="text-sm text-muted-foreground mt-2">
            How long will your epic story unfold?
          </p>
        </div>
        <RadioGroup
          value={state.campaign?.campaign_length || ''}
          onValueChange={(value) => handleParameterChange('campaign_length', value)}
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-3 gap-4'
              : viewMode === 'list'
                ? 'space-y-4'
                : 'grid grid-cols-1 md:grid-cols-3 gap-3'
          }
        >
          {campaignLengths
            .filter((l) => matchesSearch(l.label))
            .map((length) => {
              const isSelected = state.campaign?.campaign_length === length.value;
              let colorClass: string;
              switch (length.value) {
                case 'one-shot':
                  colorClass = 'text-blue-600';
                  break;
                case 'short':
                  colorClass = 'text-purple-600';
                  break;
                case 'full':
                  colorClass = 'text-infinite-purple';
                  break;
                default:
                  colorClass = 'text-foreground';
              }
              if (viewMode === 'list') {
                return (
                  <Card
                    key={length.value}
                    className={`cursor-pointer transition-all hover:shadow-lg border-2 relative overflow-hidden ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleParameterChange('campaign_length', length.value)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ')
                        handleParameterChange('campaign_length', length.value);
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem
                            value={length.value}
                            id={`length-${length.value}`}
                            className="text-blue-600"
                          />
                          <div className={`flex items-center ${colorClass}`}>
                            <Clock className="h-5 w-5" />
                            <Label
                              htmlFor={`length-${length.value}`}
                              className="font-medium cursor-pointer leading-tight ml-2"
                            >
                              {length.label}
                            </Label>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              }

              if (viewMode === 'compact') {
                return (
                  <Card
                    key={length.value}
                    className={`cursor-pointer transition-all hover:shadow-lg border-2 relative p-3 overflow-hidden ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleParameterChange('campaign_length', length.value)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ')
                        handleParameterChange('campaign_length', length.value);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem
                          value={length.value}
                          id={`length-${length.value}`}
                          className="text-blue-600"
                        />
                        <div className={`flex items-center ${colorClass}`}>
                          <Clock className="h-4 w-4" />
                          <Label
                            htmlFor={`length-${length.value}`}
                            className="font-medium cursor-pointer leading-tight ml-2"
                          >
                            {length.label}
                          </Label>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </Card>
                );
              }

              return (
                <Card
                  key={length.value}
                  className={`group cursor-pointer transition-all hover:shadow-xl border-2 relative overflow-hidden aspect-square ${
                    isSelected
                      ? 'border-primary shadow-lg'
                      : 'border-border/30 hover:border-infinite-purple/50'
                  }`}
                  onClick={() => handleParameterChange('campaign_length', length.value)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ')
                      handleParameterChange('campaign_length', length.value);
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{ boxShadow: 'inset 0 0 60px 20px rgba(0,0,0,0.08)' }}
                  />
                  {isSelected && (
                    <div className="absolute top-3 right-3 z-20 bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span className="font-bold text-lg">{length.label}</span>
                  </div>
                </Card>
              );
            })}
        </RadioGroup>
      </div>

      <div>
        <div className="text-center mb-6">
          <Label className="text-xl font-serif font-semibold flex items-center justify-center">
            <Theater className="h-5 w-5 mr-2 text-blue-600" />
            Campaign Tone
          </Label>
          <p className="text-sm text-muted-foreground mt-2">
            What mood will define your adventure?
          </p>
        </div>
        <RadioGroup
          value={state.campaign?.tone || ''}
          onValueChange={(value) => handleParameterChange('tone', value)}
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-3 gap-4'
              : viewMode === 'list'
                ? 'space-y-4'
                : 'grid grid-cols-1 md:grid-cols-3 gap-3'
          }
        >
          {tones
            .filter((l) => matchesSearch(l.label))
            .map((tone) => {
              const isSelected = state.campaign?.tone === tone.value;
              let colorClass: string;
              let icon: React.ReactNode;
              switch (tone.value) {
                case 'serious':
                  colorClass = 'text-gray-700';
                  icon = <Theater className="h-5 w-5" />;
                  break;
                case 'humorous':
                  colorClass = 'text-yellow-600';
                  icon = <Zap className="h-5 w-5" />;
                  break;
                case 'gritty':
                  colorClass = 'text-destructive';
                  icon = <Skull className="h-5 w-5" />;
                  break;
                default:
                  colorClass = 'text-foreground';
                  icon = <Theater className="h-5 w-5" />;
              }
              if (viewMode === 'list') {
                return (
                  <Card
                    key={tone.value}
                    className={`cursor-pointer transition-all hover:shadow-lg border-2 relative overflow-hidden ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleParameterChange('tone', tone.value)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ')
                        handleParameterChange('tone', tone.value);
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem
                            value={tone.value}
                            id={`tone-${tone.value}`}
                            className="text-blue-600"
                          />
                          <div className={`flex items-center ${colorClass}`}>
                            {icon}
                            <Label
                              htmlFor={`tone-${tone.value}`}
                              className="font-medium cursor-pointer leading-tight ml-2"
                            >
                              {tone.label}
                            </Label>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              }

              if (viewMode === 'compact') {
                return (
                  <Card
                    key={tone.value}
                    className={`cursor-pointer transition-all hover:shadow-lg border-2 relative p-3 overflow-hidden ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleParameterChange('tone', tone.value)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ')
                        handleParameterChange('tone', tone.value);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem
                          value={tone.value}
                          id={`tone-${tone.value}`}
                          className="text-blue-600"
                        />
                        <div className={`flex items-center ${colorClass}`}>
                          {icon}
                          <Label
                            htmlFor={`tone-${tone.value}`}
                            className="font-medium cursor-pointer leading-tight ml-2"
                          >
                            {tone.label}
                          </Label>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </Card>
                );
              }

              return (
                <Card
                  key={tone.value}
                  className={`group cursor-pointer transition-all hover:shadow-xl border-2 relative overflow-hidden aspect-square ${
                    isSelected
                      ? 'border-primary shadow-lg'
                      : 'border-border/30 hover:border-infinite-purple/50'
                  }`}
                  onClick={() => handleParameterChange('tone', tone.value)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ')
                      handleParameterChange('tone', tone.value);
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{ boxShadow: 'inset 0 0 60px 20px rgba(0,0,0,0.08)' }}
                  />
                  {isSelected && (
                    <div className="absolute top-3 right-3 z-20 bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
                    {icon}
                    <span className="font-bold text-lg">{tone.label}</span>
                  </div>
                </Card>
              );
            })}
        </RadioGroup>
      </div>
    </div>
  );
};

export default CampaignParameters;

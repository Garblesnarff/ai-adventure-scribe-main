/**
 * Option Selector Component
 *
 * Reusable UI component for selecting enhancement options during
 * character and campaign creation.
 */

import { Sparkles, Loader2 } from 'lucide-react';
import React from 'react';

import type {
  EnhancementOption,
  OptionSelection,
  OptionType} from '@/types/enhancement-options';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import logger from '@/lib/logger';
import {
  validateOptionSelection
} from '@/types/enhancement-options';

interface OptionSelectorProps<T extends OptionType = OptionType> {
  option: EnhancementOption<T>;
  value?: OptionSelection<T>;
  onChange: (selection: OptionSelection<T>) => void;
  disabled?: boolean;
  showMechanicalEffects?: boolean;
  onAIGenerate?: (optionId: string) => Promise<string>;
  isGenerating?: boolean;
  compact?: boolean;
  itemLayout?: 'list' | 'cards';
}

export function OptionSelector<T extends OptionType = OptionType>({
  option,
  value,
  onChange,
  disabled = false,
  showMechanicalEffects = true,
  onAIGenerate,
  isGenerating = false,
  compact = false,
  itemLayout = 'list'
}: OptionSelectorProps<T>) {
  const [customValue, setCustomValue] = React.useState(value?.customValue || '');
  const headerId = React.useId();

  const handleValueChange = (newValue: OptionSelection<T>['value']) => {
    const selection: OptionSelection<T> = {
      optionId: option.id,
      value: newValue,
      customValue: customValue || undefined,
      timestamp: new Date().toISOString()
    };

    if (validateOptionSelection(option, selection)) {
      onChange(selection);
    }
  };

  const handleCustomValueChange = (newCustomValue: string) => {
    setCustomValue(newCustomValue);
    if (value) {
      onChange({
        ...value,
        customValue: newCustomValue || undefined
      });
    }
  };

  const handleAIGenerate = async () => {
    if (onAIGenerate) {
      try {
        const generated = await onAIGenerate(option.id);
        const selection: OptionSelection<T> = {
          optionId: option.id,
          value: generated as unknown as OptionSelection<T>['value'],
          aiGenerated: true,
          timestamp: new Date().toISOString()
        };
        onChange(selection);
      } catch (error) {
        logger.error('Failed to generate AI content:', error);
      }
    }
  };

  const renderOptionInput = () => {
    switch (option.type) {
      case 'single':
        if (option.aiGenerated) {
          return (
            <div className="space-y-4">
              <Button
                onClick={handleAIGenerate}
                disabled={disabled || isGenerating}
                className="w-full"
                variant="outline"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate with AI
                  </>
                )}
              </Button>
              {value?.value && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">{value.value as string}</p>
                  {value.aiGenerated && (
                    <Badge variant="secondary" className="mt-2">
                      AI Generated
                    </Badge>
                  )}
                </div>
              )}
            </div>
          );
        }

        // Cards layout for single-choice options
        if (itemLayout === 'cards' && option.options && option.options.length > 0) {
          const selected = (value?.value as string) || '';
          return (
            <div role="radiogroup" aria-labelledby={headerId} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`}>
              {option.options.map((opt) => {
                const isSelected = selected === opt;
                return (
                  <Card
                    key={opt}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    aria-disabled={disabled}
                    className={`w-full cursor-pointer transition-all rounded-lg border-2 ${
                      isSelected ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/30' : 'border-border/30 hover:border-primary/50 hover:shadow-xl'
                    } ${compact ? 'p-4' : 'p-6'} hover:-translate-y-0.5`}
                    onClick={() => !disabled && handleValueChange(opt)}
                    onKeyDown={(e) => {
                      if (disabled) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleValueChange(opt);
                      }
                    }}
                  >
                    <div className="flex flex-col gap-2">
                      <span className={`${compact ? 'text-sm' : 'text-base'} font-medium leading-snug`}>{opt}</span>
                      {isSelected && (
                        <Badge variant="secondary" className="text-[10px]">Selected</Badge>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          );
        }

        return (
          <RadioGroup
            value={value?.value as string || ''}
            onValueChange={handleValueChange}
            disabled={disabled}
            className="space-y-2"
          >
            {option.options?.map((optionValue) => (
              <div key={optionValue} className="flex items-center space-x-2">
                <RadioGroupItem value={optionValue} id={`${option.id}-${optionValue}`} />
                <Label
                  htmlFor={`${option.id}-${optionValue}`}
                  className="text-sm cursor-pointer"
                >
                  {optionValue}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'multiple':
        {
          const selectedValues = (value?.value as string[]) || [];
          const maxSelections = option.max || Infinity;

          // Cards layout for multiple-choice options
          if (itemLayout === 'cards' && option.options && option.options.length > 0) {
            const atMax = selectedValues.length >= maxSelections;
            return (
              <div className="space-y-2">
                {option.max && (
                  <p className="text-xs text-muted-foreground mb-1">
                    Select up to {option.max} options ({selectedValues.length}/{option.max} selected)
                  </p>
                )}
                <div role="group" aria-labelledby={headerId} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`}>
                  {option.options.map((opt) => {
                    const isSelected = selectedValues.includes(opt);
                    const canSelect = isSelected || !atMax;
                    return (
                      <Card
                        key={opt}
                        role="checkbox"
                        aria-checked={isSelected}
                        aria-disabled={disabled || !canSelect}
                        tabIndex={0}
                        className={`w-full cursor-pointer transition-all rounded-lg border-2 ${
                          isSelected ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/30' : (disabled || !canSelect) ? 'border-border/60 opacity-60 cursor-not-allowed' : 'border-border/30 hover:border-primary/50 hover:shadow-xl'
                        } ${compact ? 'p-4' : 'p-6'} hover:-translate-y-0.5`}
                        onClick={() => {
                          if (disabled || (!canSelect && !isSelected)) return;
                          if (isSelected) {
                            handleValueChange(selectedValues.filter(v => v !== opt));
                          } else {
                            handleValueChange([...selectedValues, opt]);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (disabled || (!canSelect && !isSelected)) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (isSelected) {
                              handleValueChange(selectedValues.filter(v => v !== opt));
                            } else {
                              handleValueChange([...selectedValues, opt]);
                            }
                          }
                        }}
                      >
                        <div className="flex flex-col gap-2">
                          <span className={`${compact ? 'text-sm' : 'text-base'} font-medium leading-snug`}>{opt}</span>
                          {isSelected && (
                            <Badge variant="secondary" className="text-[10px]">Selected</Badge>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          }

          // Default list layout
          return (
            <div className="space-y-2">
              {option.max && (
                <p className="text-xs text-muted-foreground">
                  Select up to {option.max} options ({selectedValues.length}/{option.max} selected)
                </p>
              )}
              {option.options?.map((optionValue) => {
                const isSelected = selectedValues.includes(optionValue);
                const canSelect = isSelected || selectedValues.length < maxSelections;

                return (
                  <div key={optionValue} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${option.id}-${optionValue}`}
                      checked={isSelected}
                      disabled={disabled || !canSelect}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleValueChange([...selectedValues, optionValue]);
                        } else {
                          handleValueChange(selectedValues.filter(v => v !== optionValue));
                        }
                      }}
                    />
                    <Label
                      htmlFor={`${option.id}-${optionValue}`}
                      className={`text-sm cursor-pointer ${!canSelect && !isSelected ? 'text-muted-foreground' : ''}`}
                    >
                      {optionValue}
                    </Label>
                  </div>
                );
              })}
            </div>
          );
        }

      case 'number':
        return (
          <div className="space-y-2">
            <Input
              type="number"
              min={option.min}
              max={option.max}
              value={value?.value as number || ''}
              onChange={(e) => handleValueChange(parseInt(e.target.value) || 0)}
              disabled={disabled}
              placeholder={`${option.min || 0} - ${option.max || '∞'}`}
            />
            {(option.min !== undefined || option.max !== undefined) && (
              <p className="text-xs text-muted-foreground">
                Range: {option.min || 0} to {option.max || '∞'}
              </p>
            )}
          </div>
        );

      case 'text':
        return (
          <Textarea
            value={value?.value as string || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            disabled={disabled}
            placeholder="Enter your custom text..."
            rows={3}
          />
        );

      default:
        return null;
    }
  };

  const renderMechanicalEffects = () => {
    if (!showMechanicalEffects) return null;

    const effects = option.mechanicalEffects;
    const campaignEffects = option.campaignEffects;

    if (!effects && !campaignEffects) return null;

    return (
      <div className="space-y-2">
        <Separator />
        <div className="text-sm">
          <h4 className="font-medium text-muted-foreground mb-2">Effects:</h4>

          {effects && (
            <div className="space-y-1">
              {effects.abilityBonus && (
                <p>• Ability Bonuses: {Object.entries(effects.abilityBonus).map(([ability, bonus]) => `${ability} +${bonus}`).join(', ')}</p>
              )}
              {effects.skillBonus && effects.skillBonus.length > 0 && (
                <p>• Skill Bonuses: {effects.skillBonus.join(', ')}</p>
              )}
              {effects.traits && effects.traits.length > 0 && (
                <p>• Traits: {effects.traits.join(', ')}</p>
              )}
              {effects.languages && effects.languages.length > 0 && (
                <p>• Languages: {effects.languages.join(', ')}</p>
              )}
              {effects.resistances && effects.resistances.length > 0 && (
                <p>• Resistances: {effects.resistances.join(', ')}</p>
              )}
              {effects.expertise && effects.expertise.length > 0 && (
                <p>• Expertise: {effects.expertise.join(', ')}</p>
              )}
            </div>
          )}

          {campaignEffects && (
            <div className="space-y-1">
              {campaignEffects.atmosphere && campaignEffects.atmosphere.length > 0 && (
                <p>• Atmosphere: {campaignEffects.atmosphere.join(', ')}</p>
              )}
              {campaignEffects.themes && campaignEffects.themes.length > 0 && (
                <p>• Themes: {campaignEffects.themes.join(', ')}</p>
              )}
              {campaignEffects.hooks && campaignEffects.hooks.length > 0 && (
                <p>• Story Hooks: {campaignEffects.hooks.join(', ')}</p>
              )}
              {campaignEffects.worldLaws && campaignEffects.worldLaws.length > 0 && (
                <p>• World Laws: {campaignEffects.worldLaws.join(', ')}</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className={`transition-all duration-200 ${disabled ? 'opacity-60' : 'hover:shadow-md'} ${compact ? 'p-2' : ''}`}>
      <CardHeader className={compact ? 'py-2' : 'pb-3'}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {option.icon && <span className="text-lg">{option.icon}</span>}
            <CardTitle className={compact ? 'text-sm' : 'text-base'}>{option.name}</CardTitle>
            {option.aiGenerated && (
              <Badge variant="outline" className="text-xs">
                <Sparkles className="w-3 h-3 mr-1" />
                AI
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className={compact ? 'text-xs' : 'text-sm'}>
          {option.description}
        </CardDescription>
      </CardHeader>

      <CardContent className={compact ? 'space-y-2 pt-0' : 'space-y-4'}>
        {renderOptionInput()}

        {/* Custom value input for additional details */}
        {option.type !== 'text' && (
          <div className="space-y-2">
            <Label htmlFor={`${option.id}-custom`} className={compact ? 'text-xs font-medium' : 'text-sm font-medium'}>
              Additional Notes (Optional)
            </Label>
            <Input
              id={`${option.id}-custom`}
              value={customValue}
              onChange={(e) => handleCustomValueChange(e.target.value)}
              disabled={disabled}
              placeholder="Add custom details or modifications..."
              className={compact ? 'text-xs h-8' : 'text-sm'}
            />
          </div>
        )}

        {renderMechanicalEffects()}
      </CardContent>
    </Card>
  );
}
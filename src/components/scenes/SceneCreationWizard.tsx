/**
 * Scene Creation Wizard Component
 *
 * Multi-step wizard for creating new scenes with:
 * - Step 1: Name and description
 * - Step 2: Dimensions (width × height)
 * - Step 3: Grid type and size
 * - Step 4: Background image upload
 * - Step 5: Settings (fog of war, lighting, etc.)
 */

import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

import { MapUploader } from './MapUploader';
import { SceneSettings } from './SceneSettings';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { trpc } from '@/infrastructure/api/trpc-client';
import { GridType } from '@/types/scene';
import { cn } from '@/lib/utils';

interface SceneCreationWizardProps {
  campaignId: string;
  onComplete?: (sceneId: string) => void;
  onCancel?: () => void;
}

interface SceneFormData {
  name: string;
  description: string;
  width: number;
  height: number;
  gridSize: number;
  gridType: GridType;
  gridColor: string;
  backgroundImageUrl: string;
  thumbnailUrl: string;
  enableFogOfWar: boolean;
  enableDynamicLighting: boolean;
  snapToGrid: boolean;
  gridOpacity: string;
  ambientLightLevel: string;
  darknessLevel: string;
  weatherEffects: string;
  timeOfDay: string;
}

const STEPS = [
  { title: 'Name & Description', description: 'Basic scene information' },
  { title: 'Dimensions', description: 'Set map size in squares' },
  { title: 'Grid Settings', description: 'Choose grid type and size' },
  { title: 'Background Image', description: 'Upload map image' },
  { title: 'Scene Settings', description: 'Configure lighting and effects' },
];

const DEFAULT_FORM_DATA: SceneFormData = {
  name: '',
  description: '',
  width: 20,
  height: 20,
  gridSize: 5,
  gridType: GridType.SQUARE,
  gridColor: '#000000',
  backgroundImageUrl: '',
  thumbnailUrl: '',
  enableFogOfWar: true,
  enableDynamicLighting: false,
  snapToGrid: true,
  gridOpacity: '0.30',
  ambientLightLevel: '1.00',
  darknessLevel: '0.00',
  weatherEffects: '',
  timeOfDay: 'day',
};

export const SceneCreationWizard: React.FC<SceneCreationWizardProps> = ({
  campaignId,
  onComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<SceneFormData>(DEFAULT_FORM_DATA);
  const { toast } = useToast();

  // Create scene mutation
  const createSceneMutation = trpc.scenes.create.useMutation({
    onSuccess: async (scene) => {
      // Update settings if needed
      if (currentStep === STEPS.length - 1) {
        await updateSettingsMutation.mutateAsync({
          sceneId: scene.id,
          settings: {
            enableFogOfWar: formData.enableFogOfWar,
            enableDynamicLighting: formData.enableDynamicLighting,
            snapToGrid: formData.snapToGrid,
            gridOpacity: formData.gridOpacity,
            ambientLightLevel: formData.ambientLightLevel,
            darknessLevel: formData.darknessLevel,
            weatherEffects: formData.weatherEffects || undefined,
            timeOfDay: formData.timeOfDay || undefined,
          },
        });
      }

      toast({
        title: 'Scene Created',
        description: 'Your new scene has been successfully created.',
      });
      onComplete?.(scene.id);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create scene.',
        variant: 'destructive',
      });
    },
  });

  const updateSettingsMutation = trpc.scenes.updateSettings.useMutation();

  const updateFormData = (updates: Partial<SceneFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        if (!formData.name.trim()) {
          toast({
            title: 'Name Required',
            description: 'Please enter a name for your scene.',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      case 1:
        if (formData.width < 1 || formData.width > 100 || formData.height < 1 || formData.height > 100) {
          toast({
            title: 'Invalid Dimensions',
            description: 'Width and height must be between 1 and 100.',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      case 2:
        if (formData.gridSize < 1 || formData.gridSize > 50) {
          toast({
            title: 'Invalid Grid Size',
            description: 'Grid size must be between 1 and 50.',
            variant: 'destructive',
          });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    createSceneMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      campaignId,
      width: formData.width,
      height: formData.height,
      gridSize: formData.gridSize,
      gridType: formData.gridType,
      gridColor: formData.gridColor,
      backgroundImageUrl: formData.backgroundImageUrl || '',
      thumbnailUrl: formData.thumbnailUrl || '',
    });
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      <Card variant="parchment">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-2xl">Create New Scene</CardTitle>
              <CardDescription>
                {STEPS[currentStep].title} - {STEPS[currentStep].description}
              </CardDescription>
            </div>
            {onCancel && (
              <Button variant="ghost" size="icon" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Step {currentStep + 1} of {STEPS.length}
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between mt-4">
            {STEPS.map((step, index) => (
              <div
                key={index}
                className={cn(
                  'flex flex-col items-center gap-2 flex-1',
                  index < STEPS.length - 1 && 'relative after:absolute after:top-5 after:left-[60%] after:w-full after:h-0.5 after:bg-border',
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all relative z-10',
                    index < currentStep && 'bg-electricCyan text-white',
                    index === currentStep && 'bg-infinite-purple text-white ring-4 ring-infinite-purple/20',
                    index > currentStep && 'bg-muted text-muted-foreground',
                  )}
                >
                  {index < currentStep ? <Check className="h-5 w-5" /> : index + 1}
                </div>
                <span className="text-xs text-center hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Step 1: Name & Description */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="scene-name">Scene Name *</Label>
                <Input
                  id="scene-name"
                  placeholder="e.g., Goblin Cave Entrance"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scene-description">Description (Optional)</Label>
                <Textarea
                  id="scene-description"
                  placeholder="Describe the scene, important features, or notes for yourself..."
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  rows={6}
                />
              </div>
            </div>
          )}

          {/* Step 2: Dimensions */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="scene-width">Width (squares) *</Label>
                  <Input
                    id="scene-width"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.width}
                    onChange={(e) => updateFormData({ width: parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-muted-foreground">1 - 100 squares</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scene-height">Height (squares) *</Label>
                  <Input
                    id="scene-height"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.height}
                    onChange={(e) => updateFormData({ height: parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-muted-foreground">1 - 100 squares</p>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Preview Dimensions</p>
                <p className="text-muted-foreground">
                  Your scene will be <strong>{formData.width} × {formData.height}</strong> squares
                  {' '}({formData.width * formData.gridSize} × {formData.height * formData.gridSize} feet)
                </p>
              </div>

              {/* Common presets */}
              <div className="space-y-2">
                <Label>Quick Presets</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { name: 'Small (15×15)', w: 15, h: 15 },
                    { name: 'Medium (20×20)', w: 20, h: 20 },
                    { name: 'Large (30×30)', w: 30, h: 30 },
                    { name: 'Huge (40×30)', w: 40, h: 30 },
                  ].map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      onClick={() => updateFormData({ width: preset.w, height: preset.h })}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Grid Settings */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Grid Type *</Label>
                <RadioGroup
                  value={formData.gridType}
                  onValueChange={(value) => updateFormData({ gridType: value as GridType })}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value={GridType.SQUARE} id="grid-square" />
                      <Label htmlFor="grid-square" className="flex-1 cursor-pointer">
                        <div className="font-medium">Square Grid</div>
                        <div className="text-sm text-muted-foreground">Classic D&D grid</div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value={GridType.HEXAGONAL_HORIZONTAL} id="grid-hex-h" />
                      <Label htmlFor="grid-hex-h" className="flex-1 cursor-pointer">
                        <div className="font-medium">Hex (Horizontal)</div>
                        <div className="text-sm text-muted-foreground">Flat-topped hexagons</div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value={GridType.HEXAGONAL_VERTICAL} id="grid-hex-v" />
                      <Label htmlFor="grid-hex-v" className="flex-1 cursor-pointer">
                        <div className="font-medium">Hex (Vertical)</div>
                        <div className="text-sm text-muted-foreground">Point-topped hexagons</div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value={GridType.GRIDLESS} id="grid-none" />
                      <Label htmlFor="grid-none" className="flex-1 cursor-pointer">
                        <div className="font-medium">Gridless</div>
                        <div className="text-sm text-muted-foreground">No grid overlay</div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grid-size">Grid Size (feet per square) *</Label>
                <Input
                  id="grid-size"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.gridSize}
                  onChange={(e) => updateFormData({ gridSize: parseInt(e.target.value) || 1 })}
                />
                <p className="text-xs text-muted-foreground">
                  Common values: 5ft (standard), 10ft (large scale)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grid-color">Grid Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="grid-color"
                    type="color"
                    value={formData.gridColor}
                    onChange={(e) => updateFormData({ gridColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.gridColor}
                    onChange={(e) => updateFormData({ gridColor: e.target.value })}
                    placeholder="#000000"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Background Image */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <MapUploader
                campaignId={campaignId}
                width={formData.width}
                height={formData.height}
                gridSize={formData.gridSize}
                onImageUpload={(url, thumbnailUrl) => {
                  updateFormData({
                    backgroundImageUrl: url,
                    thumbnailUrl: thumbnailUrl || url,
                  });
                }}
              />

              {formData.backgroundImageUrl && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Image Uploaded</p>
                  <p className="text-xs text-muted-foreground break-all">
                    {formData.backgroundImageUrl}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Scene Settings */}
          {currentStep === 4 && (
            <SceneSettings
              settings={{
                enableFogOfWar: formData.enableFogOfWar,
                enableDynamicLighting: formData.enableDynamicLighting,
                snapToGrid: formData.snapToGrid,
                gridOpacity: formData.gridOpacity,
                ambientLightLevel: formData.ambientLightLevel,
                darknessLevel: formData.darknessLevel,
                weatherEffects: formData.weatherEffects || undefined,
                timeOfDay: formData.timeOfDay || undefined,
              }}
              onChange={(settings) => updateFormData(settings as Partial<SceneFormData>)}
            />
          )}
        </CardContent>

        {/* Navigation Buttons */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0 || createSceneMutation.isLoading}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            <div className="flex gap-2">
              {onCancel && (
                <Button variant="ghost" onClick={onCancel} disabled={createSceneMutation.isLoading}>
                  Cancel
                </Button>
              )}
              <Button
                variant="cosmic"
                onClick={handleNext}
                disabled={createSceneMutation.isLoading}
              >
                {currentStep === STEPS.length - 1 ? (
                  <>
                    {createSceneMutation.isLoading ? (
                      'Creating...'
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Finish
                      </>
                    )}
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

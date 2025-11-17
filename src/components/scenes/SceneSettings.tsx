/**
 * Scene Settings Component
 *
 * Settings panel for configuring scene options:
 * - Fog of war toggle
 * - Dynamic lighting toggle
 * - Grid settings (color, opacity, snap)
 * - Ambient light level slider
 * - Darkness level slider
 * - Time of day selector
 * - Weather effects input
 */

import React from 'react';
import { Sun, Moon, Cloud, Eye, Lightbulb, Grid } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

interface SceneSettingsData {
  enableFogOfWar?: boolean;
  enableDynamicLighting?: boolean;
  snapToGrid?: boolean;
  gridOpacity?: string;
  ambientLightLevel?: string;
  darknessLevel?: string;
  weatherEffects?: string;
  timeOfDay?: string;
}

interface SceneSettingsProps {
  settings: SceneSettingsData;
  onChange?: (settings: SceneSettingsData) => void;
  showSaveButton?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
}

export const SceneSettings: React.FC<SceneSettingsProps> = ({
  settings,
  onChange,
  showSaveButton = false,
  onSave,
  isSaving = false,
}) => {
  const updateSetting = (key: keyof SceneSettingsData, value: any) => {
    onChange?.({ ...settings, [key]: value });
  };

  // Convert string opacity to slider value (0-100)
  const gridOpacityValue = settings.gridOpacity
    ? Math.round(parseFloat(settings.gridOpacity) * 100)
    : 30;

  const ambientLightValue = settings.ambientLightLevel
    ? Math.round(parseFloat(settings.ambientLightLevel) * 100)
    : 100;

  const darknessValue = settings.darknessLevel
    ? Math.round(parseFloat(settings.darknessLevel) * 100)
    : 0;

  const handleGridOpacityChange = (value: number[]) => {
    const opacity = (value[0] / 100).toFixed(2);
    updateSetting('gridOpacity', opacity);
  };

  const handleAmbientLightChange = (value: number[]) => {
    const level = (value[0] / 100).toFixed(2);
    updateSetting('ambientLightLevel', level);
  };

  const handleDarknessChange = (value: number[]) => {
    const level = (value[0] / 100).toFixed(2);
    updateSetting('darknessLevel', level);
  };

  return (
    <div className="space-y-6">
      {/* Vision & Fog of War */}
      <Card variant="parchment">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Vision & Fog of War
          </CardTitle>
          <CardDescription>
            Control what players can see and how the map is revealed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="fog-of-war">Fog of War</Label>
              <p className="text-xs text-muted-foreground">
                Hide unexplored areas from players
              </p>
            </div>
            <Switch
              id="fog-of-war"
              checked={settings.enableFogOfWar ?? true}
              onCheckedChange={(checked) => updateSetting('enableFogOfWar', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dynamic-lighting">Dynamic Lighting</Label>
              <p className="text-xs text-muted-foreground">
                Enable token-based vision and light sources
              </p>
            </div>
            <Switch
              id="dynamic-lighting"
              checked={settings.enableDynamicLighting ?? false}
              onCheckedChange={(checked) => updateSetting('enableDynamicLighting', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Grid Settings */}
      <Card variant="parchment">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid className="h-5 w-5" />
            Grid Settings
          </CardTitle>
          <CardDescription>
            Configure grid appearance and behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="snap-to-grid">Snap to Grid</Label>
              <p className="text-xs text-muted-foreground">
                Automatically align tokens to grid
              </p>
            </div>
            <Switch
              id="snap-to-grid"
              checked={settings.snapToGrid ?? true}
              onCheckedChange={(checked) => updateSetting('snapToGrid', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Grid Opacity</Label>
              <span className="text-sm text-muted-foreground">{gridOpacityValue}%</span>
            </div>
            <Slider
              value={[gridOpacityValue]}
              onValueChange={handleGridOpacityChange}
              min={0}
              max={100}
              step={1}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lighting */}
      <Card variant="parchment">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Lighting
          </CardTitle>
          <CardDescription>
            Adjust ambient light and darkness levels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Ambient Light Level</Label>
              <span className="text-sm text-muted-foreground">{ambientLightValue}%</span>
            </div>
            <Slider
              value={[ambientLightValue]}
              onValueChange={handleAmbientLightChange}
              min={0}
              max={100}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Base light level when no light sources are present
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Darkness Level</Label>
              <span className="text-sm text-muted-foreground">{darknessValue}%</span>
            </div>
            <Slider
              value={[darknessValue]}
              onValueChange={handleDarknessChange}
              min={0}
              max={100}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Global darkness overlay (useful for night scenes)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Environment */}
      <Card variant="parchment">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Environment
          </CardTitle>
          <CardDescription>
            Set time of day and weather conditions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Time of Day</Label>
            <RadioGroup
              value={settings.timeOfDay || 'day'}
              onValueChange={(value) => updateSetting('timeOfDay', value)}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="dawn" id="time-dawn" />
                  <Label htmlFor="time-dawn" className="flex-1 cursor-pointer flex items-center gap-2">
                    <Sun className="h-4 w-4 text-orange-400" />
                    Dawn
                  </Label>
                </div>

                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="day" id="time-day" />
                  <Label htmlFor="time-day" className="flex-1 cursor-pointer flex items-center gap-2">
                    <Sun className="h-4 w-4 text-yellow-400" />
                    Day
                  </Label>
                </div>

                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="dusk" id="time-dusk" />
                  <Label htmlFor="time-dusk" className="flex-1 cursor-pointer flex items-center gap-2">
                    <Sun className="h-4 w-4 text-orange-600" />
                    Dusk
                  </Label>
                </div>

                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="night" id="time-night" />
                  <Label htmlFor="time-night" className="flex-1 cursor-pointer flex items-center gap-2">
                    <Moon className="h-4 w-4 text-blue-300" />
                    Night
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="weather">Weather Effects</Label>
            <Input
              id="weather"
              placeholder="e.g., Heavy rain, Light snow, Fog"
              value={settings.weatherEffects || ''}
              onChange={(e) => updateSetting('weatherEffects', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Descriptive weather conditions for narrative purposes
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Settings Summary */}
      <Card variant="glass">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Fog of War</p>
              <p className="font-medium">{settings.enableFogOfWar ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Dynamic Lighting</p>
              <p className="font-medium">{settings.enableDynamicLighting ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Grid Snap</p>
              <p className="font-medium">{settings.snapToGrid ? 'On' : 'Off'}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Time</p>
              <p className="font-medium capitalize">{settings.timeOfDay || 'Day'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {showSaveButton && (
        <Button
          variant="cosmic"
          className="w-full"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      )}
    </div>
  );
};

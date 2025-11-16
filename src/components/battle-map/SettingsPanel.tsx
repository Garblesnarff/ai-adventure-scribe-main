/**
 * Settings Panel Component
 *
 * User settings panel for battle map preferences.
 * Allows configuration of canvas quality, animations, and behavior.
 *
 * Features:
 * - Canvas quality slider (low/medium/high)
 * - Animation speed slider
 * - Auto-center on turn toggle
 * - Grid snap toggle
 * - Confirm before delete toggle
 * - Show FPS counter toggle
 * - Performance mode toggle
 * - Reset to defaults button
 * - Persistent storage
 *
 * @module components/battle-map/SettingsPanel
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Monitor,
  Zap,
  Target,
  Grid3x3,
  AlertTriangle,
  RotateCcw,
  Save,
  Activity,
  Gauge,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ===========================
// Types
// ===========================

export interface BattleMapSettings {
  /** Canvas rendering quality */
  canvasQuality: 'low' | 'medium' | 'high';
  /** Animation speed multiplier (0.5 = slow, 1 = normal, 2 = fast) */
  animationSpeed: number;
  /** Auto-center camera on turn change */
  autoCenterOnTurn: boolean;
  /** Snap tokens to grid */
  gridSnap: boolean;
  /** Confirm before deleting */
  confirmBeforeDelete: boolean;
  /** Show FPS counter */
  showFPS: boolean;
  /** Performance mode (reduces visual effects) */
  performanceMode: boolean;
  /** Maximum particles */
  maxParticles: number;
  /** Enable shadows */
  enableShadows: boolean;
  /** Enable bloom effect */
  enableBloom: boolean;
  /** Enable anti-aliasing */
  enableAntiAliasing: boolean;
  /** Token label visibility */
  tokenLabels: 'always' | 'hover' | 'never';
  /** Measurement unit */
  measurementUnit: 'feet' | 'meters' | 'squares';
}

export interface SettingsPanelProps {
  /** Current settings */
  settings?: Partial<BattleMapSettings>;
  /** Callback when settings change */
  onSettingsChange?: (settings: BattleMapSettings) => void;
  /** Custom className */
  className?: string;
  /** Trigger element (if not using default button) */
  trigger?: React.ReactNode;
  /** Whether panel is open (controlled) */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

// ===========================
// Default Settings
// ===========================

const DEFAULT_SETTINGS: BattleMapSettings = {
  canvasQuality: 'medium',
  animationSpeed: 1,
  autoCenterOnTurn: true,
  gridSnap: true,
  confirmBeforeDelete: true,
  showFPS: false,
  performanceMode: false,
  maxParticles: 100,
  enableShadows: true,
  enableBloom: true,
  enableAntiAliasing: true,
  tokenLabels: 'hover',
  measurementUnit: 'feet',
};

const STORAGE_KEY = 'battle-map-settings';

// ===========================
// Settings Section Component
// ===========================

interface SettingsSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, icon: Icon, children }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-3 pl-6">{children}</div>
    </div>
  );
};

// ===========================
// Setting Item Component
// ===========================

interface SettingItemProps {
  label: string;
  description?: string;
  badge?: string;
  children: React.ReactNode;
}

const SettingItem: React.FC<SettingItemProps> = ({ label, description, badge, children }) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <Label className="text-sm cursor-pointer">{label}</Label>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
};

// ===========================
// Settings Panel Component
// ===========================

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings: initialSettings,
  onSettingsChange,
  className,
  trigger,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [settings, setSettings] = useState<BattleMapSettings>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(stored), ...initialSettings };
        } catch (error) {
          console.error('Failed to load settings from localStorage', error);
        }
      }
    }
    return { ...DEFAULT_SETTINGS, ...initialSettings };
  });

  const [hasChanges, setHasChanges] = useState(false);

  // ===========================
  // Settings Persistence
  // ===========================

  const saveSettings = useCallback((newSettings: BattleMapSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    onSettingsChange?.(newSettings);
    setHasChanges(false);
    toast.success('Settings saved');
  }, [onSettingsChange]);

  const updateSetting = useCallback(
    <K extends keyof BattleMapSettings>(key: K, value: BattleMapSettings[K]) => {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      setHasChanges(true);
      // Auto-save after a short delay
      setTimeout(() => {
        saveSettings(newSettings);
      }, 500);
    },
    [settings, saveSettings]
  );

  const resetToDefaults = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    toast.success('Settings reset to defaults');
  }, [saveSettings]);

  // ===========================
  // Quality Presets
  // ===========================

  const applyQualityPreset = useCallback(
    (quality: 'low' | 'medium' | 'high') => {
      let preset: Partial<BattleMapSettings>;

      switch (quality) {
        case 'low':
          preset = {
            canvasQuality: 'low',
            performanceMode: true,
            maxParticles: 25,
            enableShadows: false,
            enableBloom: false,
            enableAntiAliasing: false,
          };
          break;
        case 'medium':
          preset = {
            canvasQuality: 'medium',
            performanceMode: false,
            maxParticles: 100,
            enableShadows: true,
            enableBloom: false,
            enableAntiAliasing: true,
          };
          break;
        case 'high':
          preset = {
            canvasQuality: 'high',
            performanceMode: false,
            maxParticles: 200,
            enableShadows: true,
            enableBloom: true,
            enableAntiAliasing: true,
          };
          break;
      }

      const newSettings = { ...settings, ...preset };
      saveSettings(newSettings);
      toast.success(`Applied ${quality} quality preset`);
    },
    [settings, saveSettings]
  );

  // ===========================
  // Render
  // ===========================

  return (
    <Sheet open={controlledOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className={cn('w-full sm:max-w-md overflow-y-auto', className)}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Battle Map Settings
          </SheetTitle>
          <SheetDescription>
            Customize your battle map experience
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Performance Section */}
          <SettingsSection title="Performance" icon={Gauge}>
            <SettingItem
              label="Canvas Quality"
              description="Overall rendering quality"
            >
              <Select
                value={settings.canvasQuality}
                onValueChange={(value: any) => applyQualityPreset(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </SettingItem>

            <SettingItem
              label="Performance Mode"
              description="Reduce visual effects for better performance"
              badge="Recommended for older devices"
            >
              <Switch
                checked={settings.performanceMode}
                onCheckedChange={(checked) => updateSetting('performanceMode', checked)}
              />
            </SettingItem>

            <SettingItem
              label="Show FPS Counter"
              description="Display frames per second"
            >
              <Switch
                checked={settings.showFPS}
                onCheckedChange={(checked) => updateSetting('showFPS', checked)}
              />
            </SettingItem>
          </SettingsSection>

          <Separator />

          {/* Visual Effects Section */}
          <SettingsSection title="Visual Effects" icon={Zap}>
            <SettingItem label="Animation Speed">
              <div className="w-32 space-y-2">
                <Slider
                  value={[settings.animationSpeed]}
                  onValueChange={([value]) => updateSetting('animationSpeed', value)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground text-center block">
                  {settings.animationSpeed}x
                </span>
              </div>
            </SettingItem>

            <SettingItem
              label="Shadows"
              description="Enable token and object shadows"
            >
              <Switch
                checked={settings.enableShadows}
                onCheckedChange={(checked) => updateSetting('enableShadows', checked)}
              />
            </SettingItem>

            <SettingItem
              label="Bloom Effect"
              description="Add glow to lights and effects"
            >
              <Switch
                checked={settings.enableBloom}
                onCheckedChange={(checked) => updateSetting('enableBloom', checked)}
              />
            </SettingItem>

            <SettingItem
              label="Anti-Aliasing"
              description="Smooth edges (impacts performance)"
            >
              <Switch
                checked={settings.enableAntiAliasing}
                onCheckedChange={(checked) => updateSetting('enableAntiAliasing', checked)}
              />
            </SettingItem>

            <SettingItem label="Max Particles">
              <div className="w-32 space-y-2">
                <Slider
                  value={[settings.maxParticles]}
                  onValueChange={([value]) => updateSetting('maxParticles', value)}
                  min={0}
                  max={200}
                  step={25}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground text-center block">
                  {settings.maxParticles}
                </span>
              </div>
            </SettingItem>
          </SettingsSection>

          <Separator />

          {/* Behavior Section */}
          <SettingsSection title="Behavior" icon={Target}>
            <SettingItem
              label="Auto-Center on Turn"
              description="Center camera on active token"
            >
              <Switch
                checked={settings.autoCenterOnTurn}
                onCheckedChange={(checked) => updateSetting('autoCenterOnTurn', checked)}
              />
            </SettingItem>

            <SettingItem
              label="Grid Snap"
              description="Snap tokens to grid"
            >
              <Switch
                checked={settings.gridSnap}
                onCheckedChange={(checked) => updateSetting('gridSnap', checked)}
              />
            </SettingItem>

            <SettingItem
              label="Confirm Before Delete"
              description="Ask before deleting items"
            >
              <Switch
                checked={settings.confirmBeforeDelete}
                onCheckedChange={(checked) => updateSetting('confirmBeforeDelete', checked)}
              />
            </SettingItem>

            <SettingItem
              label="Token Labels"
              description="When to show token names"
            >
              <Select
                value={settings.tokenLabels}
                onValueChange={(value: any) => updateSetting('tokenLabels', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Always</SelectItem>
                  <SelectItem value="hover">On Hover</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </SettingItem>

            <SettingItem
              label="Measurement Unit"
              description="Distance measurement unit"
            >
              <Select
                value={settings.measurementUnit}
                onValueChange={(value: any) => updateSetting('measurementUnit', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feet">Feet</SelectItem>
                  <SelectItem value="meters">Meters</SelectItem>
                  <SelectItem value="squares">Squares</SelectItem>
                </SelectContent>
              </Select>
            </SettingItem>
          </SettingsSection>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={resetToDefaults}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            {hasChanges && (
              <Button
                variant="default"
                onClick={() => saveSettings(settings)}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Now
              </Button>
            )}
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
            <Activity className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              Settings are automatically saved and persisted between sessions.
              Changes may require a page refresh to take full effect.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ===========================
// Hook for Settings
// ===========================

export function useBattleMapSettings() {
  const [settings, setSettings] = useState<BattleMapSettings>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        } catch (error) {
          console.error('Failed to load settings', error);
        }
      }
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = useCallback((newSettings: Partial<BattleMapSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}

// ===========================
// Exports
// ===========================

export type { SettingsPanelProps, BattleMapSettings };
export { DEFAULT_SETTINGS, STORAGE_KEY };

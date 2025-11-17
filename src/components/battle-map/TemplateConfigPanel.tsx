/**
 * Template Config Panel Component
 *
 * UI panel for configuring and managing AoE templates.
 * Features:
 * - Select spell from character sheet
 * - Auto-populate template size from spell data
 * - Color picker
 * - Template type selector
 * - Size input
 * - Apply damage button
 * - Delete template button
 */

import React, { useState, useMemo, useCallback } from 'react';
import { TemplateType, CreateTemplateData, MeasurementTemplate, commonSpellTemplates } from '@/types/drawing';
import { Spell } from '@/types/character';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Trash2, Target, Wand2 } from 'lucide-react';

// ===========================
// Types
// ===========================

export interface TemplateConfigPanelProps {
  /** Current template being edited (if any) */
  template?: MeasurementTemplate | null;
  /** Available spells from character sheet */
  spells?: Spell[];
  /** Current scene ID */
  sceneId: string;
  /** Source token ID (caster) */
  sourceTokenId?: string;
  /** Callback when template is created/updated */
  onTemplateChange?: (template: Partial<CreateTemplateData>) => void;
  /** Callback when template is created */
  onCreate?: (template: CreateTemplateData) => void;
  /** Callback when template is updated */
  onUpdate?: (templateId: string, updates: Partial<MeasurementTemplate>) => void;
  /** Callback when template is deleted */
  onDelete?: (templateId: string) => void;
  /** Callback when damage is applied */
  onApplyDamage?: (templateId: string) => void;
}

// ===========================
// Component
// ===========================

export const TemplateConfigPanel: React.FC<TemplateConfigPanelProps> = ({
  template,
  spells = [],
  sceneId,
  sourceTokenId,
  onTemplateChange,
  onCreate,
  onUpdate,
  onDelete,
  onApplyDamage,
}) => {
  // Form state
  const [selectedSpell, setSelectedSpell] = useState<string>('');
  const [templateType, setTemplateType] = useState<TemplateType>(
    template?.templateType || TemplateType.CONE
  );
  const [distance, setDistance] = useState<number>(template?.distance || 15);
  const [width, setWidth] = useState<number>(template?.width || 5);
  const [angle, setAngle] = useState<number>(template?.angle || 90);
  const [fillColor, setFillColor] = useState<string>(template?.fillColor || '#ff4500');
  const [borderColor, setBorderColor] = useState<string>(template?.borderColor || '#ff0000');
  const [fillAlpha, setFillAlpha] = useState<number>(template?.fillAlpha || 0.3);
  const [borderAlpha, setBorderAlpha] = useState<number>(template?.borderAlpha || 0.8);
  const [persistent, setPersistent] = useState<boolean>(template?.persistent || false);

  // Parse spell description to extract AoE information
  const parseSpellAoE = useCallback((spell: Spell) => {
    const desc = spell.description.toLowerCase();
    const range = spell.range_text.toLowerCase();

    // Common patterns
    if (desc.includes('cone') || range.includes('cone')) {
      const match = desc.match(/(\d+)[-\s]*foot cone/);
      return {
        templateType: TemplateType.CONE,
        distance: match ? parseInt(match[1]) : 15,
        angle: 90,
      };
    }

    if (desc.includes('sphere') || desc.includes('radius')) {
      const match = desc.match(/(\d+)[-\s]*foot[- ]radius/);
      return {
        templateType: TemplateType.SPHERE,
        distance: match ? parseInt(match[1]) : 20,
      };
    }

    if (desc.includes('cube')) {
      const match = desc.match(/(\d+)[-\s]*foot cube/);
      return {
        templateType: TemplateType.CUBE,
        distance: match ? parseInt(match[1]) : 10,
      };
    }

    if (desc.includes('line')) {
      const lengthMatch = desc.match(/(\d+)[-\s]*foot[- ](?:long )?line/);
      const widthMatch = desc.match(/(\d+)[-\s]*foot[- ]wide/);
      return {
        templateType: TemplateType.LINE,
        distance: lengthMatch ? parseInt(lengthMatch[1]) : 60,
        width: widthMatch ? parseInt(widthMatch[1]) : 5,
      };
    }

    return null;
  }, []);

  // Handle spell selection
  const handleSpellSelect = useCallback(
    (spellId: string) => {
      setSelectedSpell(spellId);
      const spell = spells.find((s) => s.id === spellId);
      if (!spell) return;

      // Check if we have predefined template data
      const predefinedTemplate = commonSpellTemplates[spell.name];
      if (predefinedTemplate) {
        setTemplateType(predefinedTemplate.templateType || TemplateType.CONE);
        setDistance(predefinedTemplate.distance || 15);
        setWidth(predefinedTemplate.width || 5);
        setAngle(predefinedTemplate.angle || 90);
        setFillColor(predefinedTemplate.fillColor || '#ff4500');
        return;
      }

      // Otherwise, try to parse from description
      const parsedAoE = parseSpellAoE(spell);
      if (parsedAoE) {
        setTemplateType(parsedAoE.templateType);
        setDistance(parsedAoE.distance);
        if (parsedAoE.width) setWidth(parsedAoE.width);
        if (parsedAoE.angle) setAngle(parsedAoE.angle);
      }
    },
    [spells, parseSpellAoE]
  );

  // Get current spell data
  const currentSpell = useMemo(() => {
    return spells.find((s) => s.id === selectedSpell);
  }, [spells, selectedSpell]);

  // Create template data
  const currentTemplateData = useMemo<Partial<CreateTemplateData>>(
    () => ({
      sceneId,
      templateType,
      distance,
      width,
      angle,
      direction: 0, // Default direction (north)
      x: 0, // Will be set when placing
      y: 0, // Will be set when placing
      sourceTokenId,
      spellName: currentSpell?.name,
      spellLevel: currentSpell?.level,
      fillColor,
      borderColor,
      persistent,
    }),
    [
      sceneId,
      templateType,
      distance,
      width,
      angle,
      sourceTokenId,
      currentSpell,
      fillColor,
      borderColor,
      persistent,
    ]
  );

  // Notify parent of changes
  React.useEffect(() => {
    onTemplateChange?.(currentTemplateData);
  }, [currentTemplateData, onTemplateChange]);

  // Handle create template
  const handleCreate = () => {
    if (!onCreate) return;
    onCreate(currentTemplateData as CreateTemplateData);
  };

  // Handle update template
  const handleUpdate = () => {
    if (!template || !onUpdate) return;
    onUpdate(template.id, {
      distance,
      width,
      angle,
      fillColor,
      borderColor,
      fillAlpha,
      borderAlpha,
      persistent,
    });
  };

  // Handle delete template
  const handleDelete = () => {
    if (!template || !onDelete) return;
    onDelete(template.id);
  };

  // Handle apply damage
  const handleApplyDamage = () => {
    if (!template || !onApplyDamage) return;
    onApplyDamage(template.id);
  };

  const isEditing = !!template;

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          {isEditing ? 'Edit Template' : 'Create Template'}
        </CardTitle>
        <CardDescription>
          {isEditing
            ? 'Modify the selected area of effect template'
            : 'Configure a new area of effect template'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Spell Selection */}
        {!isEditing && spells.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="spell-select">Select Spell</Label>
            <Select value={selectedSpell} onValueChange={handleSpellSelect}>
              <SelectTrigger id="spell-select">
                <SelectValue placeholder="Choose a spell..." />
              </SelectTrigger>
              <SelectContent>
                {spells.map((spell) => (
                  <SelectItem key={spell.id} value={spell.id}>
                    {spell.name} {spell.level > 0 && `(Level ${spell.level})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Template Type */}
        <div className="space-y-2">
          <Label htmlFor="template-type">Template Type</Label>
          <Select
            value={templateType}
            onValueChange={(value) => setTemplateType(value as TemplateType)}
          >
            <SelectTrigger id="template-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TemplateType.CONE}>Cone</SelectItem>
              <SelectItem value={TemplateType.SPHERE}>Sphere</SelectItem>
              <SelectItem value={TemplateType.CYLINDER}>Cylinder</SelectItem>
              <SelectItem value={TemplateType.CUBE}>Cube</SelectItem>
              <SelectItem value={TemplateType.LINE}>Line</SelectItem>
              <SelectItem value={TemplateType.RAY}>Ray</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Distance/Radius */}
        <div className="space-y-2">
          <Label htmlFor="distance">
            {templateType === TemplateType.SPHERE || templateType === TemplateType.CYLINDER
              ? 'Radius (ft)'
              : templateType === TemplateType.CUBE
              ? 'Size (ft)'
              : 'Distance (ft)'}
          </Label>
          <Input
            id="distance"
            type="number"
            value={distance}
            onChange={(e) => setDistance(parseInt(e.target.value) || 0)}
            min={5}
            step={5}
          />
        </div>

        {/* Width (for Line/Ray) */}
        {(templateType === TemplateType.LINE || templateType === TemplateType.RAY) && (
          <div className="space-y-2">
            <Label htmlFor="width">Width (ft)</Label>
            <Input
              id="width"
              type="number"
              value={width}
              onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
              min={5}
              step={5}
            />
          </div>
        )}

        {/* Angle (for Cone) */}
        {templateType === TemplateType.CONE && (
          <div className="space-y-2">
            <Label htmlFor="angle">Cone Angle (degrees)</Label>
            <Input
              id="angle"
              type="number"
              value={angle}
              onChange={(e) => setAngle(parseInt(e.target.value) || 0)}
              min={30}
              max={180}
              step={15}
            />
          </div>
        )}

        {/* Fill Color */}
        <div className="space-y-2">
          <Label htmlFor="fill-color">Fill Color</Label>
          <div className="flex gap-2">
            <Input
              id="fill-color"
              type="color"
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
              className="w-16 h-10 p-1"
            />
            <Input
              type="text"
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        {/* Fill Opacity */}
        <div className="space-y-2">
          <Label htmlFor="fill-alpha">Fill Opacity: {Math.round(fillAlpha * 100)}%</Label>
          <Slider
            id="fill-alpha"
            value={[fillAlpha * 100]}
            onValueChange={(value) => setFillAlpha(value[0] / 100)}
            min={0}
            max={100}
            step={5}
          />
        </div>

        {/* Border Color */}
        <div className="space-y-2">
          <Label htmlFor="border-color">Border Color</Label>
          <div className="flex gap-2">
            <Input
              id="border-color"
              type="color"
              value={borderColor}
              onChange={(e) => setBorderColor(e.target.value)}
              className="w-16 h-10 p-1"
            />
            <Input
              type="text"
              value={borderColor}
              onChange={(e) => setBorderColor(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        {/* Border Opacity */}
        <div className="space-y-2">
          <Label htmlFor="border-alpha">Border Opacity: {Math.round(borderAlpha * 100)}%</Label>
          <Slider
            id="border-alpha"
            value={[borderAlpha * 100]}
            onValueChange={(value) => setBorderAlpha(value[0] / 100)}
            min={0}
            max={100}
            step={5}
          />
        </div>

        {/* Persistent */}
        <div className="flex items-center space-x-2">
          <input
            id="persistent"
            type="checkbox"
            checked={persistent}
            onChange={(e) => setPersistent(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="persistent" className="cursor-pointer">
            Keep template after use
          </Label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-4">
          {isEditing ? (
            <>
              <Button onClick={handleUpdate} className="w-full">
                Update Template
              </Button>
              {onApplyDamage && (
                <Button onClick={handleApplyDamage} variant="secondary" className="w-full">
                  <Target className="h-4 w-4 mr-2" />
                  Apply Damage to Targets
                </Button>
              )}
              <Button onClick={handleDelete} variant="destructive" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Template
              </Button>
            </>
          ) : (
            <Button onClick={handleCreate} className="w-full">
              <Wand2 className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TemplateConfigPanel;

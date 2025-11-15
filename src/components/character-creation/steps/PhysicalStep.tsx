import { Ruler, Weight, User, Eye, Palette, Sparkles } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useCharacter } from '@/contexts/CharacterContext';

const PhysicalStep: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const [useMetric, setUseMetric] = useState(false);

  const handleGenderChange = (gender: 'male' | 'female') => {
    dispatch({ type: 'SET_GENDER', payload: gender });
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_AGE', payload: parseInt(e.target.value) });
  };

  const handleHeightChange = (value: number[]) => {
    dispatch({ type: 'SET_HEIGHT', payload: value[0] });
  };

  const handleWeightChange = (value: number[]) => {
    dispatch({ type: 'SET_WEIGHT', payload: value[0] });
  };

  const handleEyesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_EYES', payload: e.target.value });
  };

  const handleSkinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_SKIN', payload: e.target.value });
  };

  const handleHairChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_HAIR', payload: e.target.value });
  };

  const { race } = state.character;
  const heightRange = race?.heightRange || [48, 84];
  const weightRange = race?.weightRange || [80, 300];

  const convertToMetricHeight = (inches: number) => {
    return Math.round(inches * 2.54);
  };

  const convertToMetricWeight = (lbs: number) => {
    return Math.round(lbs * 0.453592);
  };

  const formatHeight = (inches: number) => {
    if (useMetric) {
      return `${convertToMetricHeight(inches)} cm`;
    }
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  };

  const formatWeight = (lbs: number) => {
    if (useMetric) {
      return `${convertToMetricWeight(lbs)} kg`;
    }
    return `${lbs} lbs`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-infinite-purple to-infinite-teal rounded-full shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-infinite-purple to-infinite-teal bg-clip-text text-transparent">
              Physical Appearance
            </h2>
            <p className="text-muted-foreground">Define your character's physical traits</p>
          </div>
        </div>
        {race && (
          <Badge variant="outline" className="text-sm">
            {race.name} Character
          </Badge>
        )}
      </div>

      {/* Units Toggle */}
      <Card className="glass rounded-2xl hover-lift">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-3">
            <Label htmlFor="metric-switch" className={!useMetric ? 'font-semibold' : ''}>
              Imperial
            </Label>
            <Switch id="metric-switch" checked={useMetric} onCheckedChange={setUseMetric} />
            <Label htmlFor="metric-switch" className={useMetric ? 'font-semibold' : ''}>
              Metric
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gender & Age Card */}
        <Card className="glass rounded-2xl hover-lift border-2 border-infinite-purple/20 transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-infinite-purple" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium mb-3 block">Gender</Label>
              <RadioGroup
                defaultValue={state.character.gender}
                onValueChange={handleGenderChange}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2 flex-1">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male" className="cursor-pointer">
                    Male
                  </Label>
                </div>
                <div className="flex items-center space-x-2 flex-1">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female" className="cursor-pointer">
                    Female
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="age" className="text-sm font-medium mb-2 block">
                Age (years)
              </Label>
              <Input
                id="age"
                type="number"
                value={state.character.age || ''}
                onChange={handleAgeChange}
                className="text-lg"
                placeholder="Enter age"
              />
            </div>
          </CardContent>
        </Card>

        {/* Height Card */}
        <Card className="glass rounded-2xl hover-lift border-2 border-infinite-gold/20 transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-infinite-gold" />
                Height
              </div>
              <Badge variant="secondary" className="text-lg font-bold">
                {formatHeight(state.character.height || heightRange[0])}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Slider
              min={heightRange[0]}
              max={heightRange[1]}
              step={1}
              value={[state.character.height || heightRange[0]]}
              onValueChange={handleHeightChange}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Min: {formatHeight(heightRange[0])}</span>
              <span>Max: {formatHeight(heightRange[1])}</span>
            </div>
          </CardContent>
        </Card>

        {/* Weight Card */}
        <Card className="glass rounded-2xl hover-lift border-2 border-infinite-teal/20 transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Weight className="w-5 h-5 text-infinite-teal" />
                Weight
              </div>
              <Badge variant="secondary" className="text-lg font-bold">
                {formatWeight(state.character.weight || weightRange[0])}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Slider
              min={weightRange[0]}
              max={weightRange[1]}
              step={1}
              value={[state.character.weight || weightRange[0]]}
              onValueChange={handleWeightChange}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Min: {formatWeight(weightRange[0])}</span>
              <span>Max: {formatWeight(weightRange[1])}</span>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Colors Card */}
        <Card className="glass rounded-2xl hover-lift border-2 border-infinite-purple/20 transition-all lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-infinite-purple" />
              Appearance Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eyes" className="flex items-center gap-2 text-sm font-medium">
                <Eye className="w-4 h-4" />
                Eye Color
              </Label>
              <Input
                id="eyes"
                value={state.character.eyes || ''}
                onChange={handleEyesChange}
                placeholder="e.g., Blue, Green, Brown"
                className="transition-all focus:ring-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skin" className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                Skin Color
              </Label>
              <Input
                id="skin"
                value={state.character.skin || ''}
                onChange={handleSkinChange}
                placeholder="e.g., Pale, Tan, Dark"
                className="transition-all focus:ring-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hair" className="flex items-center gap-2 text-sm font-medium">
                <Palette className="w-4 h-4" />
                Hair Color
              </Label>
              <Input
                id="hair"
                value={state.character.hair || ''}
                onChange={handleHairChange}
                placeholder="e.g., Black, Blonde, Red"
                className="transition-all focus:ring-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="glass rounded-2xl border-2 border-infinite-teal/20">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-infinite-teal/20 rounded-full">
              <Sparkles className="w-4 h-4 text-infinite-teal" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                <strong>Tip:</strong> Your physical characteristics help bring your character to
                life. These details will be used for character portraits and descriptions during
                gameplay.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PhysicalStep;

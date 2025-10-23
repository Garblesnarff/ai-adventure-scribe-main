import React, { useState } from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

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
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Label htmlFor="metric-switch">Imperial</Label>
        <Switch
          id="metric-switch"
          checked={useMetric}
          onCheckedChange={setUseMetric}
        />
        <Label htmlFor="metric-switch">Metric</Label>
      </div>

      <div>
        <Label>Gender</Label>
        <RadioGroup
          defaultValue={state.character.gender}
          onValueChange={handleGenderChange}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="male" id="male" />
            <Label htmlFor="male">Male</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="female" id="female" />
            <Label htmlFor="female">Female</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="age">Age</Label>
          <Input
            id="age"
            type="number"
            value={state.character.age || ''}
            onChange={handleAgeChange}
          />
        </div>
      </div>

      <div>
        <Label>Height: {formatHeight(state.character.height || heightRange[0])}</Label>
        <Slider
          min={heightRange[0]}
          max={heightRange[1]}
          step={1}
          value={[state.character.height || heightRange[0]]}
          onValueChange={handleHeightChange}
        />
      </div>

      <div>
        <Label>Weight: {formatWeight(state.character.weight || weightRange[0])}</Label>
        <Slider
          min={weightRange[0]}
          max={weightRange[1]}
          step={1}
          value={[state.character.weight || weightRange[0]]}
          onValueChange={handleWeightChange}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="eyes">Eye Color</Label>
          <Input
            id="eyes"
            value={state.character.eyes || ''}
            onChange={handleEyesChange}
          />
        </div>
        <div>
          <Label htmlFor="skin">Skin Color</Label>
          <Input
            id="skin"
            value={state.character.skin || ''}
            onChange={handleSkinChange}
          />
        </div>
        <div>
          <Label htmlFor="hair">Hair Color</Label>
          <Input
            id="hair"
            value={state.character.hair || ''}
            onChange={handleHairChange}
          />
        </div>
      </div>
    </div>
  );
};

export default PhysicalStep;

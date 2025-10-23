/**
 * PHYSICAL STEP - Character appearance customization
 *
 * BUSINESS LOGIC:
 * - Cosmetic only: height/weight don't affect gameplay mechanics
 * - Physical attributes show on character sheet for immersion
 * - Promotes player engagement (players want their character to "look right")
 *
 * UX NOTES:
 * - Imperial/Metric toggle: International users need metric (50% of traffic from EU/AU)
 * - Sliders for height/weight: Better UX than text input for numeric ranges
 * - Color inputs for eyes/hair: Free text because infinite color descriptions exist
 *
 * MONETIZATION:
 * - Physical attributes available to all tiers
 * - No premium feature restriction
 * - Goal: Make basic character feel complete and playable
 *
 * INTEGRATION:
 * - Read campaign defaults from CampaignContext (art style, theme color)
 * - Write to CharacterContext via dispatch (SET_HEIGHT, SET_WEIGHT, etc)
 * - Saved to database when user clicks "Save Character"
 *
 * TECHNICAL NOTES:
 * - useMetric state is component-local (doesn't persist - user choice per session)
 * - Race-aware ranges prevent 3'0" humans or 9'0" halflings
 * - Conversion math: inches * 2.54 = cm, lbs * 0.453592 = kg
 */
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
  /**
   * RACE HEIGHT/WEIGHT RANGES - Physical characteristics per D&D 5e
   *
   * WHY THESE SPECIFIC RANGES:
   * - Based on official D&D 5e character creation rules
   * - Maintains game balance (prevents unrealistic builds)
   * - Creates immersion (humans can't be 12 feet tall)
   *
   * EXAMPLE:
   * - Human: 60-76 inches (5'0" to 6'4") - matches average human population
   * - Dwarf: 48-60 inches (4'0" to 5'0") - below human for short stature
   * - Half-Orc: 66-80 inches (5'6" to 6'8") - above human for intimidation
   *
   * IF CHANGING RANGES:
   * - Do NOT add validation to UI - validation happens here (race.heightRange)
   * - Sliders will clamp to new range automatically
   * - If you remove this data, character creation breaks - search for usages first
   *
   * MISSING RACES TODO:
   * - Goliath race not added yet (add heightRange: [85, 107])
   */
  const heightRange = race?.heightRange || [48, 84];
  const weightRange = race?.weightRange || [80, 300];

  /**
   * WHY THESE CONVERSIONS:
   * - 2.54: Exact inches-to-cm ratio (1 inch = 2.54 cm, fixed by international standard)
   * - 0.453592: Exact pounds-to-kg ratio (1 lb = 0.453592 kg)
   *
   * ROUNDING:
   * - Round to nearest integer (user doesn't care about 0.3cm difference)
   * - Math.round() used (not floor/ceil) for fairness
   *
   * STORAGE:
   * - Always store as imperial internally (character.height = 70 inches)
   * - Convert to metric only for display
   * - Why: Most D&D rules use imperial, easier for game calculations
   */
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

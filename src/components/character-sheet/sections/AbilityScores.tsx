import { Save, Loader2 } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

interface AbilityScoresProps {
  characterId: string;
  stats: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  onStatsUpdate: () => void;
}

/**
 * AbilityScores component
 * Displays and allows editing of character ability scores
 * @param characterId - The ID of the character
 * @param stats - Current ability scores
 * @param onStatsUpdate - Callback function when stats are updated
 */
const AbilityScores: React.FC<AbilityScoresProps> = ({ characterId, stats, onStatsUpdate }) => {
  const [editedStats, setEditedStats] = useState(stats);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  /**
   * Handles changes to ability score inputs
   * @param ability - The ability score being changed
   * @param value - The new value
   */
  const handleStatChange = (ability: keyof typeof stats, value: string) => {
    const numValue = parseInt(value) || 0;
    setEditedStats((prev) => ({
      ...prev,
      [ability]: numValue,
    }));
  };

  /**
   * Validates ability scores
   * @returns boolean indicating if scores are valid
   */
  const validateStats = () => {
    const scores = Object.values(editedStats);
    return scores.every((score) => score >= 3 && score <= 20);
  };

  /**
   * Saves updated ability scores to the database
   */
  const handleSave = async () => {
    if (!validateStats()) {
      toast({
        title: 'Invalid Ability Scores',
        description: 'Scores must be between 3 and 20',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('character_stats')
        .update(editedStats)
        .eq('character_id', characterId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Ability scores updated successfully',
      });
      onStatsUpdate();
    } catch (error) {
      logger.error('Error updating stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ability scores',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Ability Scores</h2>
        <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(editedStats).map(([ability, value]) => (
          <div key={ability} className="space-y-2">
            <label htmlFor={ability} className="block text-sm font-medium text-gray-700 capitalize">
              {ability}
            </label>
            <Input
              id={ability}
              type="number"
              min="3"
              max="20"
              value={value}
              onChange={(e) => handleStatChange(ability as keyof typeof stats, e.target.value)}
              className="w-full"
            />
          </div>
        ))}
      </div>
    </Card>
  );
};

export default AbilityScores;

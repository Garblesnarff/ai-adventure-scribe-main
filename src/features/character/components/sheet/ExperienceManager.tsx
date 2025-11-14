import { TrendingUp, Plus, Minus, Star, Trophy, Calendar, Target } from 'lucide-react';
import React, { useState } from 'react';

import type { Character } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  getLevelFromExperience,
  getExperienceForLevel,
  experienceTable,
} from '@/data/levelProgression';

interface ExperienceManagerProps {
  character: Character;
  onUpdate: (updatedCharacter: Character) => void;
}

interface ExperienceEntry {
  id: string;
  amount: number;
  source: string;
  date: string;
  type: 'gain' | 'loss';
}

/**
 * ExperienceManager component for tracking and managing character experience
 */
const ExperienceManager: React.FC<ExperienceManagerProps> = ({ character, onUpdate }) => {
  const { toast } = useToast();

  const [experienceAmount, setExperienceAmount] = useState<number>(0);
  const [experienceSource, setExperienceSource] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);

  const currentExperience = character?.experience || 0;
  const currentLevel = character?.level || 1;
  const calculatedLevel = getLevelFromExperience(currentExperience);

  const nextLevel = Math.min(20, currentLevel + 1);
  const nextLevelXP = getExperienceForLevel(nextLevel);
  const previousLevelXP = getExperienceForLevel(currentLevel);

  const progressToNextLevel =
    currentLevel >= 20
      ? 100
      : ((currentExperience - previousLevelXP) / (nextLevelXP - previousLevelXP)) * 100;

  const experienceNeeded = Math.max(0, nextLevelXP - currentExperience);

  // Mock experience history - in full implementation, this would be stored
  const experienceHistory: ExperienceEntry[] = [
    {
      id: '1',
      amount: 300,
      source: 'Defeated goblin patrol',
      date: '2024-01-15',
      type: 'gain',
    },
    {
      id: '2',
      amount: 150,
      source: 'Solved riddle puzzle',
      date: '2024-01-16',
      type: 'gain',
    },
    {
      id: '3',
      amount: 450,
      source: 'Completed quest: Save the Village',
      date: '2024-01-18',
      type: 'gain',
    },
  ];

  /**
   * Award experience points
   */
  const awardExperience = () => {
    if (experienceAmount <= 0 || !experienceSource.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid experience amount and source.',
        variant: 'destructive',
      });
      return;
    }

    const newExperience = currentExperience + experienceAmount;
    const newLevel = getLevelFromExperience(newExperience);

    onUpdate({
      ...character,
      experience: newExperience,
    });

    if (newLevel > currentLevel) {
      toast({
        title: 'Level Up Available!',
        description: `You have enough experience for level ${newLevel}. Visit the advancement section to level up.`,
      });
    } else {
      toast({
        title: 'Experience Awarded',
        description: `Gained ${experienceAmount} XP from: ${experienceSource}`,
      });
    }

    // Reset form
    setExperienceAmount(0);
    setExperienceSource('');
  };

  /**
   * Remove experience points
   */
  const removeExperience = () => {
    if (experienceAmount <= 0 || !experienceSource.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid experience amount and source.',
        variant: 'destructive',
      });
      return;
    }

    const newExperience = Math.max(0, currentExperience - experienceAmount);

    onUpdate({
      ...character,
      experience: newExperience,
    });

    toast({
      title: 'Experience Removed',
      description: `Removed ${experienceAmount} XP: ${experienceSource}`,
    });

    // Reset form
    setExperienceAmount(0);
    setExperienceSource('');
  };

  /**
   * Set experience to a specific level
   */
  const setToLevel = (targetLevel: number) => {
    const requiredXP = getExperienceForLevel(targetLevel);

    onUpdate({
      ...character,
      experience: requiredXP,
    });

    toast({
      title: 'Experience Set',
      description: `Set experience to ${requiredXP.toLocaleString()} XP (Level ${targetLevel}).`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold-500" />
            Experience Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-primary">{currentLevel}</div>
              <div className="text-sm text-muted-foreground">Current Level</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold">{currentExperience.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Experience</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {currentLevel >= 20 ? '0' : experienceNeeded.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                {currentLevel >= 20 ? 'Max Level' : 'XP to Next Level'}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Level {currentLevel}</span>
              <span>{currentLevel >= 20 ? 'Max Level Reached' : `Level ${nextLevel}`}</span>
            </div>
            <Progress value={progressToNextLevel} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{previousLevelXP.toLocaleString()} XP</span>
              <span>
                {currentLevel >= 20
                  ? currentExperience.toLocaleString()
                  : nextLevelXP.toLocaleString()}{' '}
                XP
              </span>
            </div>
          </div>

          {/* Level Check Warning */}
          {calculatedLevel > currentLevel && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary rounded-lg">
              <div className="flex items-center gap-2 text-primary font-medium">
                <Star className="w-4 h-4" />
                Level Up Available!
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                You have enough experience for level {calculatedLevel}. Visit the Character
                Advancement section to level up.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Experience Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Manage Experience
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="experience-amount">Experience Amount</Label>
                <Input
                  id="experience-amount"
                  type="number"
                  min="0"
                  value={experienceAmount || ''}
                  onChange={(e) => setExperienceAmount(Number(e.target.value))}
                  placeholder="Enter XP amount"
                />
              </div>
              <div>
                <Label htmlFor="experience-source">Source/Reason</Label>
                <Input
                  id="experience-source"
                  type="text"
                  value={experienceSource}
                  onChange={(e) => setExperienceSource(e.target.value)}
                  placeholder="e.g., Defeated dragon, Completed quest"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={awardExperience}
                disabled={!experienceAmount || !experienceSource}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Award XP
              </Button>
              <Button
                variant="outline"
                onClick={removeExperience}
                disabled={!experienceAmount || !experienceSource}
                className="flex-1"
              >
                <Minus className="w-4 h-4 mr-2" />
                Remove XP
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Level Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            Quick Level Set
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {Array.from({ length: 20 }, (_, i) => i + 1).map((level) => (
              <Button
                key={level}
                variant={level === currentLevel ? 'default' : 'outline'}
                size="sm"
                onClick={() => setToLevel(level)}
                disabled={level === currentLevel}
              >
                {level}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Click a level to set your experience to that level's minimum requirement.
          </p>
        </CardContent>
      </Card>

      {/* Experience Table Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            Experience Table
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            {Object.entries(experienceTable).map(([level, xp]) => (
              <div
                key={level}
                className={`p-2 border rounded text-center ${
                  Number(level) === currentLevel ? 'bg-primary/10 border-primary' : ''
                }`}
              >
                <div className="font-medium">Level {level}</div>
                <div className="text-muted-foreground">{xp.toLocaleString()} XP</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Experience History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Experience History
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? 'Hide' : 'Show'} History
            </Button>
          </div>
        </CardHeader>
        {showHistory && (
          <CardContent>
            <div className="space-y-3">
              {experienceHistory.length > 0 ? (
                experienceHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{entry.source}</div>
                      <div className="text-sm text-muted-foreground">{entry.date}</div>
                    </div>
                    <Badge variant={entry.type === 'gain' ? 'default' : 'destructive'}>
                      {entry.type === 'gain' ? '+' : '-'}
                      {entry.amount} XP
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No experience history available
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ExperienceManager;

import {
  Lightbulb,
  Heart,
  Brain,
  Anchor,
  Frown,
  Star,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Sparkles,
  Target,
  AlertTriangle,
} from 'lucide-react';
import React, { useState } from 'react';

import type { Character } from '@/types/character';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

interface PersonalityManagerProps {
  character: Character;
  onUpdate: (updatedCharacter: Character) => void;
}

interface InspirationEntry {
  date: string;
  trigger: string;
  source: 'trait' | 'ideal' | 'bond' | 'flaw' | 'dm';
  description: string;
}

/**
 * PersonalityManager component for managing character personality and inspiration
 */
const PersonalityManager: React.FC<PersonalityManagerProps> = ({ character, onUpdate }) => {
  const { toast } = useToast();

  const [editMode, setEditMode] = useState<string | null>(null);
  const [newTrait, setNewTrait] = useState('');
  const [newIdeal, setNewIdeal] = useState('');
  const [newBond, setNewBond] = useState('');
  const [newFlaw, setNewFlaw] = useState('');
  const [inspirationNotes, setInspirationNotes] = useState('');

  const personalityTraits = character?.personalityTraits || [];
  const ideals = character?.ideals || [];
  const bonds = character?.bonds || [];
  const flaws = character?.flaws || [];
  const hasInspiration = character?.inspiration || false;
  const inspirationHistory = character?.personalityIntegration?.inspirationHistory || [];

  /**
   * Toggle inspiration state
   */
  const toggleInspiration = () => {
    const newInspirationState = !hasInspiration;

    onUpdate({
      ...character,
      inspiration: newInspirationState,
      personalityIntegration: {
        ...character?.personalityIntegration,
        activeTraits: character?.personalityIntegration?.activeTraits || [],
        inspirationTriggers: character?.personalityIntegration?.inspirationTriggers || [],
        lastInspiration: newInspirationState
          ? new Date().toISOString()
          : character?.personalityIntegration?.lastInspiration,
        inspirationHistory: character?.personalityIntegration?.inspirationHistory || [],
      },
    });

    toast({
      title: newInspirationState ? 'Inspiration Gained!' : 'Inspiration Used',
      description: newInspirationState ? 'You now have inspiration.' : 'Inspiration has been used.',
    });
  };

  /**
   * Award inspiration with reason
   */
  const awardInspiration = (
    trigger: string,
    source: InspirationEntry['source'],
    description: string,
  ) => {
    if (hasInspiration) {
      toast({
        title: 'Already Have Inspiration',
        description: 'You already have inspiration. Use it before gaining more.',
        variant: 'destructive',
      });
      return;
    }

    const newEntry: InspirationEntry = {
      date: new Date().toISOString(),
      trigger,
      source,
      description,
    };

    const newHistory = [...inspirationHistory, newEntry];

    onUpdate({
      ...character,
      inspiration: true,
      personalityIntegration: {
        ...character?.personalityIntegration,
        activeTraits: character?.personalityIntegration?.activeTraits || [],
        inspirationTriggers: character?.personalityIntegration?.inspirationTriggers || [],
        lastInspiration: new Date().toISOString(),
        inspirationHistory: newHistory,
      },
    });

    toast({
      title: 'Inspiration Awarded!',
      description: `Gained inspiration for: ${description}`,
    });

    setInspirationNotes('');
  };

  /**
   * Add new personality element
   */
  const addPersonalityElement = (type: 'trait' | 'ideal' | 'bond' | 'flaw', value: string) => {
    if (!value.trim()) return;

    const updates: Partial<Character> = {};

    switch (type) {
      case 'trait':
        updates.personalityTraits = [...personalityTraits, value];
        setNewTrait('');
        break;
      case 'ideal':
        updates.ideals = [...ideals, value];
        setNewIdeal('');
        break;
      case 'bond':
        updates.bonds = [...bonds, value];
        setNewBond('');
        break;
      case 'flaw':
        updates.flaws = [...flaws, value];
        setNewFlaw('');
        break;
    }

    onUpdate({
      ...character,
      ...updates,
    });

    toast({
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Added`,
      description: `New ${type} has been added to your character.`,
    });
  };

  /**
   * Remove personality element
   */
  const removePersonalityElement = (type: 'trait' | 'ideal' | 'bond' | 'flaw', index: number) => {
    const updates: Partial<Character> = {};

    switch (type) {
      case 'trait':
        updates.personalityTraits = personalityTraits.filter((_, i) => i !== index);
        break;
      case 'ideal':
        updates.ideals = ideals.filter((_, i) => i !== index);
        break;
      case 'bond':
        updates.bonds = bonds.filter((_, i) => i !== index);
        break;
      case 'flaw':
        updates.flaws = flaws.filter((_, i) => i !== index);
        break;
    }

    onUpdate({
      ...character,
      ...updates,
    });

    toast({
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Removed`,
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} has been removed.`,
    });
  };

  /**
   * Get icon for personality element type
   */
  const getPersonalityIcon = (type: string) => {
    switch (type) {
      case 'trait':
        return Heart;
      case 'ideal':
        return Brain;
      case 'bond':
        return Anchor;
      case 'flaw':
        return AlertTriangle;
      default:
        return Heart;
    }
  };

  /**
   * Get color for personality element type
   */
  const getPersonalityColor = (type: string) => {
    switch (type) {
      case 'trait':
        return 'text-red-500';
      case 'ideal':
        return 'text-blue-500';
      case 'bond':
        return 'text-green-500';
      case 'flaw':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

  /**
   * Render personality element list
   */
  const renderPersonalityElements = (
    type: 'trait' | 'ideal' | 'bond' | 'flaw',
    items: string[],
    newValue: string,
    setNewValue: (value: string) => void,
    placeholder: string,
  ) => {
    const Icon = getPersonalityIcon(type);
    const colorClass = getPersonalityColor(type);

    return (
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${colorClass}`}>
            <Icon className="w-5 h-5" />
            {type.charAt(0).toUpperCase() + type.slice(1)}s
            <Badge variant="outline" className="ml-auto">
              {items.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="text-sm">{item}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePersonalityElement(type, index)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            <div className="flex gap-2">
              <Textarea
                placeholder={placeholder}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="flex-1"
                rows={2}
              />
              <Button
                onClick={() => addPersonalityElement(type, newValue)}
                disabled={!newValue.trim()}
                className="mt-auto"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Inspiration System */}
      <Card className={`${hasInspiration ? 'border-gold-500 bg-gold-50 dark:bg-gold-950/20' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb
                className={`w-5 h-5 ${hasInspiration ? 'text-gold-500' : 'text-gray-500'}`}
              />
              Inspiration
            </div>
            <Switch checked={hasInspiration} onCheckedChange={toggleInspiration} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-full border-4 flex items-center justify-center ${
                  hasInspiration
                    ? 'border-gold-500 bg-gold-100 dark:bg-gold-900/50'
                    : 'border-gray-300 bg-gray-100 dark:bg-gray-800'
                }`}
              >
                <Star
                  className={`w-8 h-8 ${hasInspiration ? 'text-gold-500 animate-pulse' : 'text-gray-400'}`}
                />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">
                  {hasInspiration ? 'You have inspiration!' : 'No inspiration'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {hasInspiration
                    ? 'You can use inspiration to gain advantage on one ability check, attack roll, or saving throw.'
                    : 'Inspiration is awarded for excellent roleplaying, particularly when acting on your personality traits, ideals, bonds, and flaws.'}
                </p>
              </div>
            </div>

            {/* Award Inspiration */}
            <div className="space-y-3 border-t pt-4">
              <Label>Award Inspiration</Label>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Reason for inspiration (e.g., 'Acted on bond to protect family')"
                  value={inspirationNotes}
                  onChange={(e) => setInspirationNotes(e.target.value)}
                  className="flex-1"
                  rows={2}
                />
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    onClick={() => awardInspiration(inspirationNotes, 'dm', inspirationNotes)}
                    disabled={!inspirationNotes.trim() || hasInspiration}
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    Award
                  </Button>
                </div>
              </div>
            </div>

            {/* Inspiration History */}
            {inspirationHistory.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Inspiration History
                </Label>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {inspirationHistory
                    .slice(-5)
                    .reverse()
                    .map((entry, index) => (
                      <div key={index} className="text-xs p-2 bg-muted/50 rounded">
                        <div className="flex justify-between items-center">
                          <Badge variant="outline" className="text-xs">
                            {entry.source.toUpperCase()}
                          </Badge>
                          <span className="text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="mt-1">{entry.description}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Personality Elements */}
      <Tabs defaultValue="traits" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="traits">Traits</TabsTrigger>
          <TabsTrigger value="ideals">Ideals</TabsTrigger>
          <TabsTrigger value="bonds">Bonds</TabsTrigger>
          <TabsTrigger value="flaws">Flaws</TabsTrigger>
        </TabsList>

        <TabsContent value="traits">
          {renderPersonalityElements(
            'trait',
            personalityTraits,
            newTrait,
            setNewTrait,
            "e.g., I idolize a particular hero of my faith and constantly refer to that person's deeds and example.",
          )}
        </TabsContent>

        <TabsContent value="ideals">
          {renderPersonalityElements(
            'ideal',
            ideals,
            newIdeal,
            setNewIdeal,
            'e.g., Tradition. The ancient traditions of worship and sacrifice must be preserved and upheld.',
          )}
        </TabsContent>

        <TabsContent value="bonds">
          {renderPersonalityElements(
            'bond',
            bonds,
            newBond,
            setNewBond,
            'e.g., I would die to recover an ancient relic of my faith that was lost long ago.',
          )}
        </TabsContent>

        <TabsContent value="flaws">
          {renderPersonalityElements(
            'flaw',
            flaws,
            newFlaw,
            setNewFlaw,
            'e.g., I judge others harshly, and myself even more severely.',
          )}
        </TabsContent>
      </Tabs>

      {/* Personality Integration Tips */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Target className="w-5 h-5" />
            Roleplaying Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-600 dark:text-blue-400">
          <div className="space-y-2">
            <p>
              <strong>Traits:</strong> Describe how your character behaves in everyday situations.
            </p>
            <p>
              <strong>Ideals:</strong> Drive your character's goals and ambitions - what they
              believe in.
            </p>
            <p>
              <strong>Bonds:</strong> Connect your character to the world - people, places, or
              things they care about.
            </p>
            <p>
              <strong>Flaws:</strong> Give your character weaknesses that can complicate their life
              in interesting ways.
            </p>
            <Separator className="my-3 bg-blue-300 dark:bg-blue-700" />
            <p>
              <em>
                Acting on these elements, especially when it creates interesting complications, is a
                great way to earn inspiration!
              </em>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonalityManager;

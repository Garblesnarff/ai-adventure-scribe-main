import {
  Heart,
  Brain,
  Anchor,
  AlertTriangle,
  Shuffle,
  Copy,
  Lightbulb,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useCharacter } from '@/contexts/CharacterContext';
import { backgrounds } from '@/data/backgroundOptions';

/**
 * EnhancedPersonalitySelection component for character creation
 * Integrates personality elements with background suggestions
 */
const EnhancedPersonalitySelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const character = state.character;
  const selectedBackground = character?.background;

  const [personalityTraits, setPersonalityTraits] = useState<string[]>(
    character?.personalityTraits || ['', ''],
  );
  const [ideal, setIdeal] = useState<string>(character?.ideals?.[0] || '');
  const [bond, setBond] = useState<string>(character?.bonds?.[0] || '');
  const [flaw, setFlaw] = useState<string>(character?.flaws?.[0] || '');

  // Get background suggestions
  const backgroundData = backgrounds.find((bg: any) => bg.id === selectedBackground?.id);
  const suggestions = backgroundData
    ? {
        traits: backgroundData.suggestedPersonalityTraits || [],
        ideals: backgroundData.suggestedIdeals || [],
        bonds: backgroundData.suggestedBonds || [],
        flaws: backgroundData.suggestedFlaws || [],
      }
    : null;

  /**
   * Apply personality changes to character
   */
  const applyPersonalityChanges = () => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: {
        personalityTraits: personalityTraits.filter((trait) => trait.trim()),
        ideals: ideal.trim() ? [ideal] : [],
        bonds: bond.trim() ? [bond] : [],
        flaws: flaw.trim() ? [flaw] : [],
        // Initialize inspiration system
        inspiration: false,
        personalityIntegration: {
          activeTraits: personalityTraits.filter((trait) => trait.trim()),
          inspirationTriggers: [],
          inspirationHistory: [],
        },
      },
    });

    toast({
      title: 'Personality Updated',
      description: "Your character's personality elements have been saved.",
    });
  };

  /**
   * Use a suggested element
   */
  const applySuggestion = (
    type: 'traits' | 'ideals' | 'bonds' | 'flaws',
    suggestion: string,
    index?: number,
  ) => {
    switch (type) {
      case 'traits':
        if (index !== undefined) {
          const newTraits = [...personalityTraits];
          newTraits[index] = suggestion;
          setPersonalityTraits(newTraits);
        }
        break;
      case 'ideals':
        setIdeal(suggestion);
        break;
      case 'bonds':
        setBond(suggestion);
        break;
      case 'flaws':
        setFlaw(suggestion);
        break;
    }
  };

  /**
   * Generate random suggestions from background
   */
  const useRandomSuggestions = () => {
    if (!suggestions) return;

    if (suggestions.traits.length >= 2) {
      const shuffledTraits = [...suggestions.traits].sort(() => Math.random() - 0.5);
      setPersonalityTraits([shuffledTraits[0], shuffledTraits[1]]);
    }

    if (suggestions.ideals.length > 0) {
      const randomIdeal = suggestions.ideals[Math.floor(Math.random() * suggestions.ideals.length)];
      setIdeal(randomIdeal);
    }

    if (suggestions.bonds.length > 0) {
      const randomBond = suggestions.bonds[Math.floor(Math.random() * suggestions.bonds.length)];
      setBond(randomBond);
    }

    if (suggestions.flaws.length > 0) {
      const randomFlaw = suggestions.flaws[Math.floor(Math.random() * suggestions.flaws.length)];
      setFlaw(randomFlaw);
    }

    toast({
      title: 'Random Suggestions Applied',
      description: 'Applied random personality suggestions from your background.',
    });
  };

  /**
   * Auto-apply changes when user finishes typing
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      applyPersonalityChanges();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [personalityTraits, ideal, bond, flaw]);

  /**
   * Render suggestion card
   */
  const renderSuggestions = (
    type: 'traits' | 'ideals' | 'bonds' | 'flaws',
    title: string,
    suggestions: string[],
    icon: React.ElementType,
    colorClass: string,
  ) => {
    if (!suggestions || suggestions.length === 0) return null;

    return (
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className={`flex items-center gap-2 text-sm ${colorClass}`}>
            {React.createElement(icon, { className: 'w-4 h-4' })}
            {title} Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <div
                key={index}
                className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors group"
                onClick={() => applySuggestion(type, suggestion, type === 'traits' ? 0 : undefined)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs flex-1">{suggestion}</p>
                  <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!selectedBackground) {
    return (
      <div className="text-center space-y-4">
        <BookOpen className="w-16 h-16 mx-auto text-muted-foreground" />
        <h2 className="text-2xl font-bold">Background Required</h2>
        <p className="text-muted-foreground">
          Please select a background first to see personality suggestions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Character Personality</h2>
        <p className="text-muted-foreground">
          Define your character's personality using D&D 5E elements
        </p>
        {backgroundData && (
          <Badge variant="outline" className="mt-2">
            {backgroundData.name} Background
          </Badge>
        )}
      </div>

      {/* Quick Actions */}
      {suggestions && (
        <div className="flex justify-center">
          <Button
            onClick={useRandomSuggestions}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Shuffle className="w-4 h-4" />
            Use Random Suggestions
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Input Forms */}
        <div className="space-y-6">
          <Tabs defaultValue="traits">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="traits">Traits</TabsTrigger>
              <TabsTrigger value="ideals">Ideals</TabsTrigger>
              <TabsTrigger value="bonds">Bonds</TabsTrigger>
              <TabsTrigger value="flaws">Flaws</TabsTrigger>
            </TabsList>

            {/* Personality Traits */}
            <TabsContent value="traits">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-500">
                    <Heart className="w-5 h-5" />
                    Personality Traits
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Describe how your character behaves in everyday situations. Usually 2 traits.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="trait-1" className="text-sm">
                      First Trait
                    </Label>
                    <Textarea
                      id="trait-1"
                      placeholder="e.g., I idolize a particular hero of my faith..."
                      value={personalityTraits[0] || ''}
                      onChange={(e) => {
                        const newTraits = [...personalityTraits];
                        newTraits[0] = e.target.value;
                        setPersonalityTraits(newTraits);
                      }}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="trait-2" className="text-sm">
                      Second Trait
                    </Label>
                    <Textarea
                      id="trait-2"
                      placeholder="e.g., I can find common ground between enemies..."
                      value={personalityTraits[1] || ''}
                      onChange={(e) => {
                        const newTraits = [...personalityTraits];
                        newTraits[1] = e.target.value;
                        setPersonalityTraits(newTraits);
                      }}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Ideals */}
            <TabsContent value="ideals">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-500">
                    <Brain className="w-5 h-5" />
                    Ideal
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    What drives your character? What do they believe in most strongly?
                  </p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="e.g., Tradition. The ancient traditions must be preserved and upheld."
                    value={ideal}
                    onChange={(e) => setIdeal(e.target.value)}
                    rows={4}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bonds */}
            <TabsContent value="bonds">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-500">
                    <Anchor className="w-5 h-5" />
                    Bond
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    What connects your character to the world? People, places, or things they care
                    about.
                  </p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="e.g., I would die to recover an ancient relic that was lost long ago."
                    value={bond}
                    onChange={(e) => setBond(e.target.value)}
                    rows={4}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Flaws */}
            <TabsContent value="flaws">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-500">
                    <AlertTriangle className="w-5 h-5" />
                    Flaw
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    What weakness does your character have that can complicate their life?
                  </p>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="e.g., I judge others harshly, and myself even more severely."
                    value={flaw}
                    onChange={(e) => setFlaw(e.target.value)}
                    rows={4}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Suggestions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Background Suggestions
          </h3>

          {suggestions ? (
            <div className="space-y-4">
              {renderSuggestions(
                'traits',
                'Personality Trait',
                suggestions.traits,
                Heart,
                'text-red-500',
              )}
              {renderSuggestions('ideals', 'Ideal', suggestions.ideals, Brain, 'text-blue-500')}
              {renderSuggestions('bonds', 'Bond', suggestions.bonds, Anchor, 'text-green-500')}
              {renderSuggestions(
                'flaws',
                'Flaw',
                suggestions.flaws,
                AlertTriangle,
                'text-orange-500',
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No suggestions available for this background.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Inspiration Info */}
      <Card className="border-gold-200 bg-gold-50 dark:bg-gold-950/20 dark:border-gold-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gold-700 dark:text-gold-300">
            <Sparkles className="w-5 h-5" />
            About Inspiration
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gold-600 dark:text-gold-400">
          <p>
            <strong>Inspiration</strong> is a rule the DM can use to reward you for playing your
            character in a way that's true to their personality traits, ideals, bonds, and flaws.
            When you have inspiration, you can spend it to gain advantage on one ability check,
            attack roll, or saving throw.
          </p>
          <Separator className="my-3 bg-gold-300 dark:bg-gold-700" />
          <p className="text-xs">
            Your DM tells you how to earn inspiration in the game. Typically, you gain it when you
            play out your character's personality in a way that creates interesting complications or
            drives the story forward.
          </p>
        </CardContent>
      </Card>

      {/* Completion Status */}
      <div className="text-center">
        <Button onClick={applyPersonalityChanges} size="lg" className="w-full max-w-md">
          Continue to Equipment Selection
        </Button>
      </div>
    </div>
  );
};

export default EnhancedPersonalitySelection;

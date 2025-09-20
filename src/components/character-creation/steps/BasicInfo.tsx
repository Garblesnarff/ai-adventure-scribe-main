import React from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAutoScroll } from '@/hooks/use-auto-scroll';
import { Sparkles, User, Scroll, Crown, Heart } from 'lucide-react';

/**
 * BasicInfo component for character creation
 * Handles input of character name and optional personality notes
 */
const BasicInfo: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const { scrollToNavigation } = useAutoScroll();

  /**
   * Updates character name in context
   * @param name - New character name
   */
  const handleNameChange = (name: string) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { name }
    });
  };

  /**
   * Updates character personality notes in context
   * @param personalityNotes - Basic personality notes from user
   */
  const handlePersonalityNotesChange = (personalityNotes: string) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { personality_notes: personalityNotes }
    });
  };

  /**
   * Updates character alignment
   * @param alignment - D&D alignment string
   */
  const handleAlignmentChange = (alignment: string) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { alignment }
    });
    // Auto-scroll to navigation after alignment selection
    setTimeout(() => scrollToNavigation(), 100);
  };

  /**
   * Updates personality traits (first and second)
   * @param traits - Array of two trait strings
   */
  const handlePersonalityTraitsChange = (traits: string[]) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { personalityTraits: traits }
    });
  };

  /**
   * Updates ideals (single string as array)
   * @param ideal - Ideal string
   */
  const handleIdealChange = (ideal: string) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { ideals: [ideal] }
    });
  };

  /**
   * Updates bonds (single string as array)
   * @param bond - Bond string
   */
  const handleBondChange = (bond: string) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { bonds: [bond] }
    });
  };

  /**
   * Updates flaws (single string as array)
   * @param flaw - Flaw string
   */
  const handleFlawChange = (flaw: string) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { flaws: [flaw] }
    });
  };

  /**
   * Validates input when focus is lost
   * Shows toast notification if name is empty
   */
  const handleNameBlur = () => {
    if (!state.character?.name?.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for your character.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Begin Your Legend
            </h2>
            <p className="text-muted-foreground">Every great hero needs a name and a story</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Information */}
        <Card className="p-6 bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-950/50 border-blue-200 dark:border-blue-800">
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="text-xl font-semibold">Basic Information</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="character-name" className="text-sm font-medium">
                  Character Name *
                </Label>
                <Input
                  id="character-name"
                  placeholder="Enter your character's name..."
                  value={state.character?.name || ''}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={handleNameBlur}
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personality-notes" className="text-sm font-medium">
                  Personality Notes <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <Textarea
                  id="personality-notes"
                  placeholder="Any initial ideas about your character's personality, quirks, or background..."
                  value={state.character?.personality_notes || ''}
                  onChange={(e) => handlePersonalityNotesChange(e.target.value)}
                  className="min-h-[100px] transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-muted-foreground">
                  💡 These notes will help generate a more detailed description later in the process.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* D&D Personality Elements */}
        <Card className="p-6 bg-gradient-to-br from-white to-purple-50/50 dark:from-gray-900 dark:to-purple-950/50 border-purple-200 dark:border-purple-800">
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Crown className="w-5 h-5 text-purple-600" />
              <h3 className="text-xl font-semibold">D&D Personality Elements</h3>
            </div>

            <p className="text-sm text-muted-foreground">
              Define your character's core personality using standard D&D 5e elements.
            </p>

            <div className="space-y-4">
              {/* Alignment */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Alignment</Label>
                <Select value={state.character?.alignment || ''} onValueChange={handleAlignmentChange}>
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                    <SelectValue placeholder="Select alignment (e.g., Lawful Good)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
                    <SelectItem value="Lawful Good">⚖️ Lawful Good</SelectItem>
                    <SelectItem value="Neutral Good">☀️ Neutral Good</SelectItem>
                    <SelectItem value="Chaotic Good">🌪️ Chaotic Good</SelectItem>
                    <SelectItem value="Lawful Neutral">⚖️ Lawful Neutral</SelectItem>
                    <SelectItem value="True Neutral">⚪ True Neutral</SelectItem>
                    <SelectItem value="Chaotic Neutral">🌪️ Chaotic Neutral</SelectItem>
                    <SelectItem value="Lawful Evil">⚖️ Lawful Evil</SelectItem>
                    <SelectItem value="Neutral Evil">🌑 Neutral Evil</SelectItem>
                    <SelectItem value="Chaotic Evil">🌪️ Chaotic Evil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Personality Traits */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Personality Traits</Label>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="trait-1" className="text-xs text-muted-foreground">Trait 1</Label>
                    <Textarea
                      id="trait-1"
                      placeholder="e.g., I idolize a particular hero of my faith..."
                      value={state.character?.personalityTraits?.[0] || ''}
                      onChange={(e) => handlePersonalityTraitsChange([e.target.value, state.character?.personalityTraits?.[1] || ''])}
                      className="min-h-[60px] transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="trait-2" className="text-xs text-muted-foreground">Trait 2</Label>
                    <Textarea
                      id="trait-2"
                      placeholder="e.g., I can find common ground between enemies..."
                      value={state.character?.personalityTraits?.[1] || ''}
                      onChange={(e) => handlePersonalityTraitsChange([state.character?.personalityTraits?.[0] || '', e.target.value])}
                      className="min-h-[60px] transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Ideal */}
              <div className="space-y-2">
                <Label htmlFor="ideal" className="text-sm font-medium">Ideal</Label>
                <Textarea
                  id="ideal"
                  placeholder="e.g., Freedom. Tyrants must not be allowed to oppress people."
                  value={state.character?.ideals?.[0] || ''}
                  onChange={(e) => handleIdealChange(e.target.value)}
                  className="min-h-[70px] transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Bond */}
              <div className="space-y-2">
                <Label htmlFor="bond" className="text-sm font-medium">Bond</Label>
                <Textarea
                  id="bond"
                  placeholder="e.g., My family is the most important thing in my life..."
                  value={state.character?.bonds?.[0] || ''}
                  onChange={(e) => handleBondChange(e.target.value)}
                  className="min-h-[70px] transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* Flaw */}
              <div className="space-y-2">
                <Label htmlFor="flaw" className="text-sm font-medium">Flaw</Label>
                <Textarea
                  id="flaw"
                  placeholder="e.g., I am too enamored of ale, wine, and other intoxicants."
                  value={state.character?.flaws?.[0] || ''}
                  onChange={(e) => handleFlawChange(e.target.value)}
                  className="min-h-[70px] transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Information Card */}
      <Card className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200 dark:border-green-800">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-full">
            <Heart className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-green-900 dark:text-green-100 mb-1">✨ What's Next?</p>
            <p className="text-sm text-green-800 dark:text-green-200">
              After choosing your character's mechanical aspects (race, class, abilities), we'll use AI to generate a detailed description and portrait based on all your choices, including these personality elements.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BasicInfo;

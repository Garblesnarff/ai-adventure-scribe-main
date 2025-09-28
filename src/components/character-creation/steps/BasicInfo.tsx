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
import { Sparkles, User, Scroll, Crown, Heart, Book } from 'lucide-react';
import { backgrounds } from '@/data/backgroundOptions';
import { CharacterBackground } from '@/types/character';

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
   * Updates character background
   * @param backgroundId - Background ID string
   */
  const handleBackgroundChange = (backgroundId: string) => {
    const background = backgrounds.find(bg => bg.id === backgroundId);
    if (background) {
      dispatch({
        type: 'UPDATE_CHARACTER',
        payload: { background }
      });
      toast({
        title: "Background Selected",
        description: `You have chosen the ${background.name} background.`,
        duration: 2000,
      });
    }
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
              <h3 className="text-xl font-semibold">D&D Character Elements</h3>
            </div>

            <p className="text-sm text-muted-foreground">
              Define your character's alignment and background using standard D&D 5e elements.
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

              {/* Background */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Background</Label>
                <Select value={state.character?.background?.id || ''} onValueChange={handleBackgroundChange}>
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                    <SelectValue placeholder="Select your character's background" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
                    {backgrounds.map((background) => (
                      <SelectItem key={background.id} value={background.id}>
                        <div className="flex items-center space-x-2">
                          <Book className="w-4 h-4" />
                          <span>{background.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {state.character?.background && (
                  <p className="text-xs text-muted-foreground">
                    {state.character.background.description}
                  </p>
                )}
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
              After defining your background, you'll shape your character's personality traits, ideals, bonds, and flaws in the next step. Then we'll continue with race, class, and abilities.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BasicInfo;

import React from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

/**
 * BasicInfo component for character creation
 * Handles input of character name and optional personality notes
 */
const BasicInfo: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();

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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center mb-6">Create Your Character</h2>
      
      <div className="max-w-md mx-auto space-y-4">
        <div className="space-y-2">
          <Label htmlFor="character-name">Character Name *</Label>
          <Input
            id="character-name"
            placeholder="Enter character name"
            value={state.character?.name || ''}
            onChange={(e) => handleNameChange(e.target.value)}
            onBlur={handleNameBlur}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="personality-notes">Personality Notes (Optional)</Label>
          <Textarea
            id="personality-notes"
            placeholder="Any initial ideas about your character's personality, quirks, or background..."
            value={state.character?.personality_notes || ''}
            onChange={(e) => handlePersonalityNotesChange(e.target.value)}
            className="min-h-[100px] w-full"
          />
          <p className="text-xs text-muted-foreground">
            These notes will help generate a more detailed description later in the process.
          </p>
        </div>

        {/* D&D Personality Elements Section */}
        <div className="space-y-2 pt-6 border-t">
          <h3 className="text-lg font-semibold">D&D Personality Elements</h3>
          <p className="text-xs text-muted-foreground">
            Define your character's core personality using standard D&D 5e elements. Suggestions based on background will be available later.
          </p>

          {/* Alignment */}
          <div className="space-y-2">
            <Label htmlFor="alignment">Alignment</Label>
            <Select value={state.character?.alignment || ''} onValueChange={handleAlignmentChange}>
              <SelectTrigger className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                <SelectValue placeholder="Select alignment (e.g., Lawful Good)" />
              </SelectTrigger>
              <SelectContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-gray-300 dark:border-gray-600 ring-1 ring-blue-200/50 dark:ring-blue-800/50">
                <SelectItem value="Lawful Good" className="hover:bg-blue-50 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 hover:border-l-2 hover:border-blue-300 dark:hover:border-blue-600 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white">Lawful Good</SelectItem>
                <SelectItem value="Neutral Good" className="hover:bg-blue-50 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 hover:border-l-2 hover:border-blue-300 dark:hover:border-blue-600 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white">Neutral Good</SelectItem>
                <SelectItem value="Chaotic Good" className="hover:bg-blue-50 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 hover:border-l-2 hover:border-blue-300 dark:hover:border-blue-600 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white">Chaotic Good</SelectItem>
                <SelectItem value="Lawful Neutral" className="hover:bg-blue-50 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 hover:border-l-2 hover:border-blue-300 dark:hover:border-blue-600 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white">Lawful Neutral</SelectItem>
                <SelectItem value="True Neutral" className="hover:bg-blue-50 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 hover:border-l-2 hover:border-blue-300 dark:hover:border-blue-600 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white">True Neutral</SelectItem>
                <SelectItem value="Chaotic Neutral" className="hover:bg-blue-50 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 hover:border-l-2 hover:border-blue-300 dark:hover:border-blue-600 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white">Chaotic Neutral</SelectItem>
                <SelectItem value="Lawful Evil" className="hover:bg-blue-50 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 hover:border-l-2 hover:border-blue-300 dark:hover:border-blue-600 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white">Lawful Evil</SelectItem>
                <SelectItem value="Neutral Evil" className="hover:bg-blue-50 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 hover:border-l-2 hover:border-blue-300 dark:hover:border-blue-600 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white">Neutral Evil</SelectItem>
                <SelectItem value="Chaotic Evil" className="hover:bg-blue-50 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 hover:border-l-2 hover:border-blue-300 dark:hover:border-blue-600 data-[state=checked]:bg-blue-500 data-[state=checked]:text-white">Chaotic Evil</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Personality Traits */}
          <div className="space-y-2">
            <Label>Personality Traits (Typically 2)</Label>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="trait-1" className="text-sm">Trait 1</Label>
                <Textarea
                  id="trait-1"
                  placeholder="e.g., I idolize a particular hero..."
                  value={state.character?.personalityTraits?.[0] || ''}
                  onChange={(e) => handlePersonalityTraitsChange([e.target.value, state.character?.personalityTraits?.[1] || ''])}
                  className="min-h-[60px] w-full"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="trait-2" className="text-sm">Trait 2</Label>
                <Textarea
                  id="trait-2"
                  placeholder="e.g., I can find common ground between enemies..."
                  value={state.character?.personalityTraits?.[1] || ''}
                  onChange={(e) => handlePersonalityTraitsChange([state.character?.personalityTraits?.[0] || '', e.target.value])}
                  className="min-h-[60px] w-full"
                />
              </div>
            </div>
          </div>

          {/* Ideal */}
          <div className="space-y-2">
            <Label htmlFor="ideal">Ideal</Label>
            <Textarea
              id="ideal"
              placeholder="e.g., Freedom. Tyrants must not be allowed to oppress people."
              value={state.character?.ideals?.[0] || ''}
              onChange={(e) => handleIdealChange(e.target.value)}
              className="min-h-[80px] w-full"
            />
          </div>

          {/* Bond */}
          <div className="space-y-2">
            <Label htmlFor="bond">Bond</Label>
            <Textarea
              id="bond"
              placeholder="e.g., My family is the most important thing in my life, even when they have caused me grief."
              value={state.character?.bonds?.[0] || ''}
              onChange={(e) => handleBondChange(e.target.value)}
              className="min-h-[80px] w-full"
            />
          </div>

          {/* Flaw */}
          <div className="space-y-2">
            <Label htmlFor="flaw">Flaw</Label>
            <Textarea
              id="flaw"
              placeholder="e.g., I am too enamored of ale, wine, and other intoxicants."
              value={state.character?.flaws?.[0] || ''}
              onChange={(e) => handleFlawChange(e.target.value)}
              className="min-h-[80px] w-full"
            />
          </div>
        </div>
      </div>
      
      {/* Information card */}
      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 max-w-md mx-auto">
        <div className="text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">What's Next?</p>
          <p className="text-blue-800 dark:text-blue-200">
            After choosing your character's mechanical aspects (race, class, abilities), we'll use AI to generate a detailed description and portrait based on all your choices, including these personality elements.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BasicInfo;

import React, { useState } from 'react';
import { useCharacter } from '@/contexts/CharacterContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Sparkles, User, AlertCircle } from 'lucide-react';

/**
 * Character name validation rules per D&D 5E conventions
 */
const NAME_MIN_LENGTH = 1;
const NAME_MAX_LENGTH = 50;
const NAME_PATTERN = /^[a-zA-Z\s\-']+$/;

/**
 * Validates character name against D&D 5E naming conventions
 */
function validateCharacterName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Character name is required' };
  }

  if (name.trim().length < NAME_MIN_LENGTH) {
    return { isValid: false, error: `Name must be at least ${NAME_MIN_LENGTH} character` };
  }

  if (name.length > NAME_MAX_LENGTH) {
    return { isValid: false, error: `Name must be ${NAME_MAX_LENGTH} characters or less` };
  }

  if (!NAME_PATTERN.test(name)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }

  return { isValid: true };
}

/**
 * BasicInfo component for character creation
 * Handles character name input with validation
 */
const BasicInfo: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const [nameError, setNameError] = useState<string | null>(null);

  /**
   * Updates character name in context with validation
   * @param name - New character name
   */
  const handleNameChange = (name: string) => {
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: { name }
    });

    // Clear error on change
    if (nameError) {
      setNameError(null);
    }
  };

  /**
   * Validates input when focus is lost
   * Shows validation error if name is invalid
   */
  const handleNameBlur = () => {
    const validation = validateCharacterName(state.character?.name || '');

    if (!validation.isValid) {
      setNameError(validation.error || 'Invalid name');
      toast({
        title: "Invalid Name",
        description: validation.error,
        variant: "destructive",
      });
    } else {
      setNameError(null);
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
            <p className="text-muted-foreground">Every great hero needs a name</p>
          </div>
        </div>
      </div>

      {/* Character Name Input */}
      <Card className="p-6 max-w-2xl mx-auto bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-900 dark:to-blue-950/50 border-blue-200 dark:border-blue-800">
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-600" />
            <h3 className="text-xl font-semibold">Character Name</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="character-name" className="text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="character-name"
              placeholder="Enter your character's name..."
              value={state.character?.name || ''}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={handleNameBlur}
              className={`transition-all duration-200 ${
                nameError
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              }`}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'name-error' : undefined}
            />
            {nameError && (
              <div id="name-error" className="flex items-center space-x-2 text-red-500 text-sm" role="alert">
                <AlertCircle className="w-4 h-4" />
                <span>{nameError}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Choose a name that fits your character's background and personality.
              You can always change it later.
            </p>
          </div>
        </div>
      </Card>

      {/* Information Card */}
      <Card className="p-4 max-w-2xl mx-auto bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200 dark:border-green-800">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-full">
            <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-green-900 dark:text-green-100 mb-1">✨ What's Next?</p>
            <p className="text-sm text-green-800 dark:text-green-200">
              After choosing your name, you'll select your race, class, ability scores, background, and equipment to bring your character to life.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BasicInfo;

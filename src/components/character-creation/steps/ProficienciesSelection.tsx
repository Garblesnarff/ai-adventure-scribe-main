import React, { useState } from 'react';

import type { CharacterClass, CharacterBackground, CharacterRace } from '@/types/character';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { useCharacter } from '@/contexts/CharacterContext';
import { backgrounds } from '@/data/backgroundOptions';
import { classes } from '@/data/classOptions';
// import { races } from '@/data/raceOptions'; // Not needed, using state

// Standard D&D 5e languages for choices
const standardLanguages = [
  'Common',
  'Dwarvish',
  'Elvish',
  'Giant',
  'Gnomish',
  'Halfling',
  'Infernal',
  'Orc',
  'Abyssal',
  'Celestial',
  'Deep Speech',
  'Draconic',
  'Sylvan',
  'Undercommon',
];

/**
 * ProficienciesSelection component for choosing skills, tools, and languages
 * Computes fixed proficiencies from race, class, background and presents choices
 */
const ProficienciesSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const character = state.character;

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  // Get current selections
  const currentClass = character?.class as CharacterClass | undefined;
  const currentBackground = character?.background as CharacterBackground | undefined;
  const currentRace = character?.race as CharacterRace | undefined;

  // Compute fixed proficiencies
  const fixedSkills = [
    ...(currentBackground?.skillProficiencies || []),
    // Note: Saving throws are separate, handled in savingThrowProficiencies
  ];
  const fixedTools = currentBackground?.toolProficiencies || [];
  const fixedLanguages = currentRace?.languages || [];
  const fixedSavingThrows = currentClass?.savingThrowProficiencies || [];

  // Skill choices from class
  const skillChoices = currentClass?.skillChoices || [];
  const numSkillChoices = currentClass?.numSkillChoices || 0;
  const hasSkillChoices = numSkillChoices > 0 && skillChoices.length > 0;

  // Language choices from background
  const numLanguageChoices = currentBackground?.languages || 0;
  const hasLanguageChoices = numLanguageChoices > 0;

  // Handle 'Any' for bard skills - use all possible skills
  const availableSkills = skillChoices.includes('Any')
    ? fixedSkills.concat([
        'Acrobatics',
        'Animal Handling',
        'Arcana',
        'Athletics',
        'Deception',
        'History',
        'Insight',
        'Intimidation',
        'Investigation',
        'Medicine',
        'Nature',
        'Perception',
        'Performance',
        'Persuasion',
        'Religion',
        'Sleight of Hand',
        'Stealth',
        'Survival',
      ])
    : skillChoices;

  // Filter out already fixed skills from choices
  const choosableSkills = availableSkills.filter((skill) => !fixedSkills.includes(skill));

  // Update proficiencies on selection complete (e.g., on next button, but for simplicity, update on change with validation)
  const updateProficiencies = () => {
    // Validate selections
    if (hasSkillChoices && selectedSkills.length !== numSkillChoices) {
      toast({
        title: 'Invalid Selection',
        description: `Please select exactly ${numSkillChoices} skill${numSkillChoices > 1 ? 's' : ''}.`,
        variant: 'destructive',
      });
      return;
    }
    if (hasLanguageChoices && selectedLanguages.length !== numLanguageChoices) {
      toast({
        title: 'Invalid Selection',
        description: `Please select exactly ${numLanguageChoices} language${numLanguageChoices > 1 ? 's' : ''}.`,
        variant: 'destructive',
      });
      return;
    }

    const allSkills = [...new Set([...fixedSkills, ...selectedSkills])]; // Dedupe
    const allLanguages = [...new Set([...fixedLanguages, ...selectedLanguages])]; // Dedupe

    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: {
        skillProficiencies: allSkills,
        toolProficiencies: fixedTools,
        savingThrowProficiencies: fixedSavingThrows,
        languages: allLanguages,
      },
    });

    toast({
      title: 'Proficiencies Updated',
      description: 'Your skill, tool, and language proficiencies have been set.',
    });
  };

  // Auto-update on changes, but only if valid
  React.useEffect(() => {
    if (!hasSkillChoices || selectedSkills.length === numSkillChoices) {
      updateProficiencies();
    }
  }, [selectedSkills]);

  React.useEffect(() => {
    if (!hasLanguageChoices || selectedLanguages.length === numLanguageChoices) {
      updateProficiencies();
    }
  }, [selectedLanguages]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center mb-4">Proficiencies & Languages</h2>

      {/* Fixed Proficiencies Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Fixed Proficiencies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {fixedSkills.length > 0 && (
            <div>
              <h3 className="font-medium">Skills: {fixedSkills.join(', ')}</h3>
            </div>
          )}
          {fixedTools.length > 0 && (
            <div>
              <h3 className="font-medium">Tools: {fixedTools.join(', ')}</h3>
            </div>
          )}
          {fixedLanguages.length > 0 && (
            <div>
              <h3 className="font-medium">Languages: {fixedLanguages.join(', ')}</h3>
            </div>
          )}
          {fixedSavingThrows.length > 0 && (
            <div>
              <h3 className="font-medium">
                Saving Throws:{' '}
                {fixedSavingThrows.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}
              </h3>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Skill Choices */}
      {hasSkillChoices && (
        <Card>
          <CardHeader>
            <CardTitle>
              Choose Skills ({selectedSkills.length}/{numSkillChoices})
            </CardTitle>
            <p className="text-sm text-gray-600">
              Your {currentClass?.name} class allows you to choose {numSkillChoices} skill
              {numSkillChoices > 1 ? 's' : ''} from the following:
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {choosableSkills.map((skill) => (
                <div key={skill} className="flex items-center space-x-2">
                  <Checkbox
                    id={skill}
                    checked={selectedSkills.includes(skill)}
                    disabled={
                      !selectedSkills.includes(skill) && selectedSkills.length >= numSkillChoices
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        if (selectedSkills.length >= numSkillChoices) {
                          toast({
                            title: 'Skill Limit Reached',
                            description: `You can only select ${numSkillChoices} skill${numSkillChoices > 1 ? 's' : ''} for your ${currentClass?.name} class.`,
                            variant: 'destructive',
                          });
                          return;
                        }
                        setSelectedSkills((prev) => [...prev, skill]);
                      } else {
                        setSelectedSkills((prev) => prev.filter((s) => s !== skill));
                      }
                    }}
                  />
                  <label
                    htmlFor={skill}
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {skill}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Language Choices */}
      {hasLanguageChoices && (
        <Card>
          <CardHeader>
            <CardTitle>
              Choose Languages ({selectedLanguages.length}/{numLanguageChoices})
            </CardTitle>
            <p className="text-sm text-gray-600">
              Your background grants {numLanguageChoices} additional language
              {numLanguageChoices > 1 ? 's' : ''}:
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {standardLanguages.map((lang) => (
                <div key={lang} className="flex items-center space-x-2">
                  <Checkbox
                    id={lang}
                    checked={selectedLanguages.includes(lang)}
                    disabled={
                      !selectedLanguages.includes(lang) &&
                      selectedLanguages.length >= numLanguageChoices
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        if (selectedLanguages.length >= numLanguageChoices) {
                          toast({
                            title: 'Language Limit Reached',
                            description: `You can only select ${numLanguageChoices} language${numLanguageChoices > 1 ? 's' : ''} from your background.`,
                            variant: 'destructive',
                          });
                          return;
                        }
                        setSelectedLanguages((prev) => [...prev, lang]);
                      } else {
                        setSelectedLanguages((prev) => prev.filter((l) => l !== lang));
                      }
                    }}
                  />
                  <label
                    htmlFor={lang}
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {lang}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Update Button if manual update needed */}
      {(hasSkillChoices || hasLanguageChoices) && (
        <div className="flex justify-center">
          <Button onClick={updateProficiencies} className="mt-4">
            Update Proficiencies
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProficienciesSelection;

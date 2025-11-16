import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HexagonalBadge } from '@/components/ui/hexagonal-badge';
import { Character } from '@/types/character';
import EditableDescription from './EditableDescription';
import { User, Heart, Palette, FileText, Sparkles, Image } from 'lucide-react';

interface CharacterOverviewProps {
  character: Character;
  onUpdate: (updatedCharacter: Character) => void;
}

/**
 * CharacterOverview Component
 *
 * Main overview tab showing core character information including portrait,
 * description, personality notes, and theme information.
 */
const CharacterOverview: React.FC<CharacterOverviewProps> = ({ character, onUpdate }) => {
  return (
    <div className="space-y-6">
      {/* Character Portrait and Core Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            Character Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Portrait */}
            <div className="text-center">
              {character.image_url ? (
                <div className="w-48 h-48 mx-auto rounded-lg overflow-hidden border">
                  <img
                    src={character.image_url}
                    alt={`${character.name} portrait`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 mx-auto rounded-lg bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-6xl font-bold text-primary">
                  {character.name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}

              {/* Character Basic Info */}
              <div className="mt-4 space-y-2">
                <h3 className="text-lg font-semibold">{character.name || 'Unnamed Character'}</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  {character.race && (
                    <div>
                      {character.subrace
                        ? `${character.subrace.name} (${character.race.name})`
                        : character.race.name}
                    </div>
                  )}
                  {character.class && (
                    <div>
                      Level {character.level || 1} {character.class.name}
                    </div>
                  )}
                  {character.background && <div>{character.background.name}</div>}
                  {character.alignment && <div>{character.alignment}</div>}
                </div>
              </div>
            </div>

            {/* Main Description */}
            <div className="lg:col-span-2">
              <EditableDescription
                value={character.description || ''}
                label="Character Description"
                placeholder="Describe your character's overall concept, background, goals, and what makes them unique..."
                field="description"
                character={character}
                onUpdate={onUpdate}
                minHeight="min-h-[200px]"
                isAiGenerated={!!character.description}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personality Notes */}
      {(character.personality_notes || character.personality_notes === '') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Personality Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EditableDescription
              value={character.personality_notes || ''}
              label="Additional Personality Notes"
              placeholder="Add any additional notes about your character's personality, quirks, habits, or roleplay details..."
              field="personality_notes"
              character={character}
              onUpdate={onUpdate}
              minHeight="min-h-[120px]"
              isAiGenerated={false}
            />
          </CardContent>
        </Card>
      )}

      {/* Background Image */}
      {character.background_image && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5 text-amber-500" />
              Character Background Image
              <Badge
                variant="outline"
                className="text-xs bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-700 ml-2"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                AI Generated
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full max-w-md mx-auto rounded-lg overflow-hidden border aspect-video">
              <img
                src={character.background_image}
                alt={`${character.name} background`}
                className="w-full h-full object-cover object-center"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Theme Information */}
      {(character.theme ||
        character.appearance ||
        character.personality_traits ||
        character.backstory_elements) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-500" />
              Character Themes
              <Badge
                variant="outline"
                className="text-xs bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-700 ml-2"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                AI Generated
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {character.theme && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Selected Theme</h4>
                  <HexagonalBadge variant="secondary" size="sm" className="text-sm font-medium">
                    {character.theme}
                  </HexagonalBadge>
                </div>
              )}
              {character.appearance && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    Appearance
                    <Badge
                      variant="outline"
                      className="text-xs bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-700"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI
                    </Badge>
                  </h4>
                  <div className="rounded-md border border-input bg-background/50 px-3 py-2 text-sm">
                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                      {character.appearance}
                    </div>
                  </div>
                </div>
              )}

              {character.personality_traits && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    Personality Traits
                    <Badge
                      variant="outline"
                      className="text-xs bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-700"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI
                    </Badge>
                  </h4>
                  <div className="rounded-md border border-input bg-background/50 px-3 py-2 text-sm">
                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                      {character.personality_traits}
                    </div>
                  </div>
                </div>
              )}

              {character.backstory_elements && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    Backstory Elements
                    <Badge
                      variant="outline"
                      className="text-xs bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-700"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI
                    </Badge>
                  </h4>
                  <div className="rounded-md border border-input bg-background/50 px-3 py-2 text-sm">
                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                      {character.backstory_elements}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Character Traits Summary */}
      {(character.personalityTraits?.length ||
        character.ideals?.length ||
        character.bonds?.length ||
        character.flaws?.length) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-500" />
              Character Traits Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {character.personalityTraits?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Personality Traits
                  </h4>
                  <div className="space-y-1">
                    {character.personalityTraits.map((trait, index) => (
                      <HexagonalBadge key={index} variant="outline" size="sm" className="text-xs">
                        {trait}
                      </HexagonalBadge>
                    ))}
                  </div>
                </div>
              )}

              {character.ideals?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Ideals</h4>
                  <div className="space-y-1">
                    {character.ideals.map((ideal, index) => (
                      <HexagonalBadge
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs bg-blue-50 border-blue-200"
                      >
                        {ideal}
                      </HexagonalBadge>
                    ))}
                  </div>
                </div>
              )}

              {character.bonds?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Bonds</h4>
                  <div className="space-y-1">
                    {character.bonds.map((bond, index) => (
                      <HexagonalBadge
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs bg-green-50 border-green-200"
                      >
                        {bond}
                      </HexagonalBadge>
                    ))}
                  </div>
                </div>
              )}

              {character.flaws?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Flaws</h4>
                  <div className="space-y-1">
                    {character.flaws.map((flaw, index) => (
                      <HexagonalBadge
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs bg-red-50 border-red-200"
                      >
                        {flaw}
                      </HexagonalBadge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CharacterOverview;

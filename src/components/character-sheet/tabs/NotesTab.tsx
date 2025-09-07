import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Character } from '@/types/character';
import { FileText, Heart, Brain, Link, Frown } from 'lucide-react';

interface NotesTabProps {
  character: Character;
  onUpdate: () => void;
}

/**
 * Notes & Backstory tab for character roleplay information
 */
const NotesTab: React.FC<NotesTabProps> = ({ character, onUpdate }) => {
  const [notes, setNotes] = useState('');

  return (
    <div className="space-y-6">
      {/* Character Portrait and Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Character Description
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
                  {character.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Appearance
                </label>
                <Textarea
                  value={character.appearance || ''}
                  placeholder="Describe your character's physical appearance..."
                  className="min-h-[100px] resize-none"
                  readOnly
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Personality
                </label>
                <Textarea
                  value={character.personality_traits || ''}
                  placeholder="What makes your character unique? How do they act?"
                  className="min-h-[100px] resize-none"
                  readOnly
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personality Traits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Personality Traits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {character.personalityTraits && character.personalityTraits.length > 0 ? (
                character.personalityTraits.map((trait, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm">{trait}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No personality traits defined yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-500" />
              Ideals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {character.ideals && character.ideals.length > 0 ? (
                character.ideals.map((ideal, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm">{ideal}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No ideals defined yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5 text-green-500" />
              Bonds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {character.bonds && character.bonds.length > 0 ? (
                character.bonds.map((bond, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm">{bond}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No bonds defined yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Frown className="w-5 h-5 text-orange-500" />
              Flaws
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {character.flaws && character.flaws.length > 0 ? (
                character.flaws.map((flaw, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm">{flaw}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No flaws defined yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backstory */}
      <Card>
        <CardHeader>
          <CardTitle>Backstory</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={character.backstory_elements || ''}
            placeholder="Tell your character's story. Where do they come from? What drives them? What are their goals?"
            className="min-h-[150px] resize-none"
            readOnly
          />
        </CardContent>
      </Card>

      {/* Character Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Character Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add your own notes about this character. Track important story moments, relationships with NPCs, or anything else you want to remember..."
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      {/* Character Stats Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Character Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{character.level}</div>
              <div className="text-sm text-muted-foreground">Level</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{character.experience}</div>
              <div className="text-sm text-muted-foreground">Experience</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {Math.floor((character.level - 1) / 4) + 2}
              </div>
              <div className="text-sm text-muted-foreground">Proficiency</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {10 + character.abilityScores.dexterity.modifier}
              </div>
              <div className="text-sm text-muted-foreground">Armor Class</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotesTab;
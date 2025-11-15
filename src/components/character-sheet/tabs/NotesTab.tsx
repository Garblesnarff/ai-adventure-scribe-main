import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Character } from '@/types/character';
import PersonalityManager from '../PersonalityManager';
import CharacterOverview from './components/CharacterOverview';
import EnhancementDetails from './components/EnhancementDetails';
import EditableDescription from './components/EditableDescription';
import { FileText, Heart, Brain, Link, Frown } from 'lucide-react';
import { fadeInUp, cardContainer, cardItem } from '@/utils/animations';

interface NotesTabProps {
  character: Character;
  onUpdate: (updatedCharacter: Character) => void;
}

/**
 * Notes & Backstory tab for character roleplay information
 */
const NotesTab: React.FC<NotesTabProps> = ({ character, onUpdate }) => {
  const [notes, setNotes] = useState(character.sessionNotes || '');

  const handleSessionNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    onUpdate({
      ...character,
      sessionNotes: newNotes
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personality">Personality</TabsTrigger>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="enhancements">Enhancements</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <CharacterOverview character={character} onUpdate={onUpdate} />
        </TabsContent>

        {/* Personality Tab with Enhanced Manager */}
        <TabsContent value="personality">
          <PersonalityManager character={character} onUpdate={onUpdate} />
        </TabsContent>

        {/* Description Tab */}
        <TabsContent value="description">
          <motion.div
            className="space-y-6"
            variants={cardContainer}
            initial="hidden"
            animate="visible"
          >
            {/* Character Portrait and Description */}
            <motion.div variants={cardItem}>
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
                        {character.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="lg:col-span-2 space-y-4">
                    <EditableDescription
                      label="Appearance"
                      value={character.appearance || ''}
                      field="appearance"
                      character={character}
                      onUpdate={onUpdate}
                      placeholder="Describe your character's physical appearance..."
                      isAiGenerated={!!character.appearance}
                    />

                    <EditableDescription
                      label="Personality"
                      value={character.personality_traits || ''}
                      field="personality_traits"
                      character={character}
                      onUpdate={onUpdate}
                      placeholder="What makes your character unique? How do they act?"
                      isAiGenerated={!!character.personality_traits}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>

            {/* Backstory */}
            <motion.div variants={cardItem}>
              <Card>
                <CardHeader>
                  <CardTitle>Backstory</CardTitle>
                </CardHeader>
                <CardContent>
                  <EditableDescription
                    label=""
                    value={character.backstory_elements || ''}
                    field="backstory_elements"
                    character={character}
                    onUpdate={onUpdate}
                    placeholder="Tell your character's story. Where do they come from? What drives them? What are their goals?"
                    className="min-h-[150px]"
                    isAiGenerated={!!character.backstory_elements}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </TabsContent>

        {/* Enhancements Tab */}
        <TabsContent value="enhancements">
          <EnhancementDetails character={character} onUpdate={onUpdate} />
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <motion.div {...fadeInUp}>
            <Card>
              <CardHeader>
                <CardTitle>Session Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => handleSessionNotesChange(e.target.value)}
                  placeholder="Keep track of important events, NPCs met, quests received, and other session notes..."
                  className="min-h-[300px] resize-none"
                />
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotesTab;
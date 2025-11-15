import {
  User,
  Zap,
  Wand2,
  Package,
  Star,
  FileText,
  Heart,
  Shield,
  Sword,
  TrendingUp,
  Users,
  Image as ImageIcon,
} from 'lucide-react';
import React, { useState } from 'react';

// Tab Components
import ExperienceManager from './ExperienceManager';
import MulticlassManager from './MulticlassManager';
import AbilitiesTab from './tabs/AbilitiesTab';
import FeaturesTab from './tabs/FeaturesTab';
import InventoryTab from './tabs/InventoryTab';
import MainTab from './tabs/MainTab';
import NotesTab from './tabs/NotesTab';
import SpellsTab from './tabs/SpellsTab';

import type { Character } from '@/types/character';

import CharacterGallery from '@/components/gallery/CharacterGallery';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CharacterSheetTabsProps {
  character: Character;
  onCharacterUpdate: () => void;
}

/**
 * Tabbed character sheet layout inspired by Roll20
 * Organizes character information into logical sections
 */
const CharacterSheetTabs: React.FC<CharacterSheetTabsProps> = ({
  character,
  onCharacterUpdate,
}) => {
  const [activeTab, setActiveTab] = useState('main');

  const tabs = [
    {
      id: 'main',
      label: 'Main',
      icon: User,
      description: 'Basic info, combat stats, and core character details',
    },
    {
      id: 'abilities',
      label: 'Abilities & Skills',
      icon: Zap,
      description: 'Ability scores, skills, saves, and proficiencies',
    },
    {
      id: 'advancement',
      label: 'Advancement',
      icon: TrendingUp,
      description: 'Experience, leveling, and character progression',
    },
    {
      id: 'spells',
      label: 'Spells',
      icon: Wand2,
      description: 'Spell slots, known spells, and spellcasting',
    },
    {
      id: 'inventory',
      label: 'Equipment',
      icon: Package,
      description: 'Inventory, currency, and equipment management',
    },
    {
      id: 'features',
      label: 'Features & Traits',
      icon: Star,
      description: 'Class features, racial traits, and special abilities',
    },
    {
      id: 'notes',
      label: 'Notes & Backstory',
      icon: FileText,
      description: 'Character backstory, notes, and roleplay information',
    },
    {
      id: 'gallery',
      label: 'Gallery',
      icon: ImageIcon,
      description: 'All generated images for this character',
    },
  ];

  return (
    <div className="w-full">
      {/* Character Header - Always Visible */}
      <div className="mb-6 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border">
        <div className="flex items-center gap-4">
          {/* Character Portrait/Avatar */}
          <div className="flex-shrink-0">
            {character.avatar_url ? (
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary">
                <img
                  src={character.avatar_url}
                  alt={`${character.name || 'Character'} avatar`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                {character.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>

          {/* Character Title */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{character.name || 'Unnamed Character'}</h1>
            <p className="text-muted-foreground">
              Level {character.level || 1} {character.race?.name || 'Unknown Race'}{' '}
              {character.class?.name || 'Unknown Class'}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="flex items-center gap-1 text-red-600">
                <Heart className="w-4 h-4" />
                <span className="font-bold">
                  {Math.max(
                    1,
                    (character.level || 1) * (character.class?.hitDie || 8) +
                      (character.abilityScores?.constitution?.modifier || 0) *
                        (character.level || 1),
                  )}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">HP</div>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-blue-600">
                <Shield className="w-4 h-4" />
                <span className="font-bold">
                  {
                    // Armor Class calculation with unarmored defense support
                    (() => {
                      const abilityScores = character.abilityScores || {
                        dexterity: { modifier: 0 },
                        constitution: { modifier: 0 },
                        wisdom: { modifier: 0 },
                      };
                      let armorClass = 10 + abilityScores.dexterity.modifier;

                      // Check for unarmored defense (Barbarian/monk without armor)
                      const hasUnarmoredDefense =
                        character.class &&
                        (character.class.name.toLowerCase() === 'barbarian' ||
                          character.class.name.toLowerCase() === 'monk');

                      const isWearingArmor =
                        character.equippedArmor !== undefined && character.equippedArmor !== '';

                      // If character has unarmored defense and is not wearing armor, use unarmored AC
                      if (hasUnarmoredDefense && !isWearingArmor) {
                        switch (character.class!.name.toLowerCase()) {
                          case 'barbarian':
                            armorClass =
                              10 +
                              abilityScores.dexterity.modifier +
                              abilityScores.constitution.modifier;
                            break;
                          case 'monk':
                            armorClass =
                              10 + abilityScores.dexterity.modifier + abilityScores.wisdom.modifier;
                            break;
                        }
                      }

                      return armorClass;
                    })()
                  }
                </span>
              </div>
              <div className="text-xs text-muted-foreground">AC</div>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-green-600">
                <Sword className="w-4 h-4" />
                <span className="font-bold">
                  +{Math.floor(((character.level || 1) - 1) / 4) + 2}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">PROF</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation and Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 h-auto p-2 bg-gradient-to-r from-infinite-dark/10 via-infinite-purple/5 to-infinite-teal/10 backdrop-blur-sm border-2 border-infinite-purple/20 shadow-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={`
                  flex flex-col items-center gap-2 px-3 py-4 text-xs font-semibold rounded-lg transition-all duration-300 ease-in-out
                  data-[state=active]:bg-gradient-to-br data-[state=active]:from-infinite-purple/20 data-[state=active]:to-infinite-purple/10
                  data-[state=active]:text-infinite-purple data-[state=active]:shadow-lg data-[state=active]:shadow-infinite-purple/25
                  data-[state=active]:border-2 data-[state=active]:border-infinite-purple/30 data-[state=active]:transform data-[state=active]:scale-[1.02]
                  hover:bg-infinite-gold/10 hover:text-infinite-gold hover:shadow-md hover:shadow-infinite-gold/20
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-infinite-purple/50 focus-visible:ring-offset-2
                  disabled:opacity-50 disabled:pointer-events-none
                `}
              >
                <Icon className="w-5 h-5 transition-colors duration-200" />
                <span className="font-ui tracking-wide text-center leading-tight">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="mt-4">
          <TabsContent value="main" className="space-y-4">
            <MainTab character={character} onUpdate={onCharacterUpdate} />
          </TabsContent>

          <TabsContent value="abilities" className="space-y-4">
            <AbilitiesTab character={character} onUpdate={onCharacterUpdate} />
          </TabsContent>

          <TabsContent value="advancement" className="space-y-4">
            {character.classLevels && character.classLevels.length > 1 ? (
              <MulticlassManager
                character={character}
                onUpdate={(updatedCharacter) => {
                  // Update character and trigger refresh
                  onCharacterUpdate();
                }}
              />
            ) : (
              <ExperienceManager
                character={character}
                onUpdate={(updatedCharacter) => {
                  // Update character and trigger refresh
                  onCharacterUpdate();
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="spells" className="space-y-4">
            <SpellsTab character={character} onUpdate={onCharacterUpdate} />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <InventoryTab character={character} onUpdate={onCharacterUpdate} />
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <FeaturesTab character={character} onUpdate={onCharacterUpdate} />
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <NotesTab character={character} onUpdate={onCharacterUpdate} />
          </TabsContent>

          <TabsContent value="gallery" className="space-y-4">
            <CharacterGallery
              characterId={character.id}
              avatarUrl={character.avatar_url}
              designSheetUrl={character.image_url}
              backgroundUrl={character.background_image}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default CharacterSheetTabs;

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Character } from '@/types/character';
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
  Users
} from 'lucide-react';

// Tab Components
import MainTab from './tabs/MainTab';
import AbilitiesTab from './tabs/AbilitiesTab';
import SpellsTab from './tabs/SpellsTab';
import InventoryTab from './tabs/InventoryTab';
import FeaturesTab from './tabs/FeaturesTab';
import NotesTab from './tabs/NotesTab';
import ExperienceManager from './ExperienceManager';
import MulticlassManager from './MulticlassManager';

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
  ];

  return (
    <div className="w-full">
      {/* Character Header - Always Visible */}
      <div className="mb-6 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border">
        <div className="flex items-center gap-4">
          {/* Character Portrait */}
          <div className="flex-shrink-0">
            {character.image_url ? (
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary">
                <img
                  src={character.image_url}
                  alt={`${character.name} portrait`}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                {character.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          {/* Character Title */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{character.name}</h1>
            <p className="text-muted-foreground">
              Level {character.level} {character.race?.name} {character.class?.name}
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="flex items-center gap-1 text-red-600">
                <Heart className="w-4 h-4" />
                <span className="font-bold">
                  {Math.max(1, character.level * (character.class?.hitDie || 8) + 
                   character.abilityScores.constitution.modifier * character.level)}
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
                      let armorClass = 10 + character.abilityScores.dexterity.modifier;
                      
                      // Check for unarmored defense (Barbarian/monk without armor)
                      const hasUnarmoredDefense = character.class && 
                        (character.class.name.toLowerCase() === 'barbarian' || 
                         character.class.name.toLowerCase() === 'monk');
                      
                      const isWearingArmor = character.equippedArmor !== undefined && character.equippedArmor !== '';
                      
                      // If character has unarmored defense and is not wearing armor, use unarmored AC
                      if (hasUnarmoredDefense && !isWearingArmor) {
                        switch (character.class!.name.toLowerCase()) {
                          case 'barbarian':
                            armorClass = 10 + character.abilityScores.dexterity.modifier + character.abilityScores.constitution.modifier;
                            break;
                          case 'monk':
                            armorClass = 10 + character.abilityScores.dexterity.modifier + character.abilityScores.wisdom.modifier;
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
                  +{Math.floor((character.level - 1) / 4) + 2}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">PROF</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation and Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 h-auto p-1 bg-muted/50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{tab.label}</span>
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
        </div>
      </Tabs>
    </div>
  );
};

export default CharacterSheetTabs;
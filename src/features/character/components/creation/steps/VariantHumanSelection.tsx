import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCharacter } from '@/contexts/CharacterContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { feats, getFeatsByCategory, Feat } from '@/data/featOptions';
import { AbilityScores } from '@/types/character';
import { Users, Award, Settings, Eye } from 'lucide-react';
import { fadeInUp, cardContainer, cardItem } from '@/utils/animations';

/**
 * VariantHumanSelection component for customizing Variant Human and Custom Lineage
 * Handles ability score selection, feat selection, and additional options
 */
const VariantHumanSelection: React.FC = () => {
  const { state, dispatch } = useCharacter();
  const { toast } = useToast();
  const character = state.character;
  const subrace = character?.subrace;

  const [selectedAbilities, setSelectedAbilities] = useState<string[]>([]);
  const [selectedFeat, setSelectedFeat] = useState<string>('');
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [hasdarkvision, setHasDarkvision] = useState<boolean>(true);
  const [customLineageSize, setCustomLineageSize] = useState<'small' | 'medium'>('medium');

  const isVariantHuman = subrace?.id === 'variant-human';
  const isCustomLineage = subrace?.id === 'custom-lineage';

  // Note: No early returns before hooks to satisfy rules-of-hooks

  const availableAbilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  const availableSkills = [
    'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History',
    'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception',
    'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival'
  ];
  const availableLanguages = [
    'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Halfling', 'Infernal', 'Orc',
    'Abyssal', 'Celestial', 'Deep Speech', 'Draconic', 'Sylvan', 'Undercommon'
  ];
  const availableTools = [
    'Smith\'s Tools', 'Carpenter\'s Tools', 'Cobbler\'s Tools', 'Cook\'s Utensils',
    'Jeweler\'s Tools', 'Leatherworker\'s Tools', 'Mason\'s Tools', 'Painter\'s Supplies',
    'Potter\'s Tools', 'Tinker\'s Tools', 'Weaver\'s Tools', 'Woodcarver\'s Tools'
  ];

  /**
   * Handle ability score selection
   */
  const handleAbilitySelection = (ability: string) => {
    if (isVariantHuman) {
      // Variant Human: Choose 2 different abilities
      if (selectedAbilities.includes(ability)) {
        setSelectedAbilities(selectedAbilities.filter(a => a !== ability));
      } else if (selectedAbilities.length < 2) {
        setSelectedAbilities([...selectedAbilities, ability]);
      }
    } else if (isCustomLineage) {
      // Custom Lineage: Choose 1 ability for +2, or 2 abilities for +1 each
      if (selectedAbilities.includes(ability)) {
        setSelectedAbilities(selectedAbilities.filter(a => a !== ability));
      } else {
        setSelectedAbilities([ability]);
      }
    }
  };

  /**
   * Apply all selections to character
   */
  const applySelections = () => {
    // Validate selections
    if (isVariantHuman && selectedAbilities.length !== 2) {
      toast({
        title: 'Incomplete Selection',
        description: 'Variant Humans must select 2 different ability scores to increase.',
        variant: 'destructive',
      });
      return;
    }

    if (isCustomLineage && selectedAbilities.length !== 1) {
      toast({
        title: 'Incomplete Selection',
        description: 'Custom Lineage must select 1 ability score to increase.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedFeat) {
      toast({
        title: 'No Feat Selected',
        description: 'Please select a feat to continue.',
        variant: 'destructive',
      });
      return;
    }

    if (isVariantHuman && !selectedSkill) {
      toast({
        title: 'No Skill Selected',
        description: 'Variant Humans must select a skill proficiency.',
        variant: 'destructive',
      });
      return;
    }

    // Apply ability score increases
    const updatedAbilityScores = { ...character?.abilityScores };
    selectedAbilities.forEach(ability => {
      if (updatedAbilityScores?.[ability as keyof typeof updatedAbilityScores]) {
        const current = updatedAbilityScores[ability as keyof typeof updatedAbilityScores];
        if (current) {
          if (isVariantHuman) {
            current.score += 1;
          } else if (isCustomLineage) {
            current.score += 2;
          }
          current.modifier = Math.floor((current.score - 10) / 2);
        }
      }
    });

    // Apply feat
    const currentFeats = character?.feats || [];
    const feat = feats.find(f => f.id === selectedFeat);
    
    if (feat?.abilityScoreIncrease) {
      // Apply ASI from feat
      Object.entries(feat.abilityScoreIncrease).forEach(([ability, increase]) => {
        if (increase && updatedAbilityScores?.[ability as keyof typeof updatedAbilityScores]) {
          const current = updatedAbilityScores[ability as keyof typeof updatedAbilityScores];
          if (current) {
            current.score += increase;
            current.modifier = Math.floor((current.score - 10) / 2);
          }
        }
      });
    }

    // Apply skill proficiency (Variant Human)
    let skillProficiencies = character?.skillProficiencies || [];
    if (isVariantHuman && selectedSkill && !skillProficiencies.includes(selectedSkill)) {
      skillProficiencies = [...skillProficiencies, selectedSkill];
    }

    // Apply language or tool proficiency
    let languages = character?.languages || [];
    let toolProficiencies = character?.toolProficiencies || [];
    
    if (selectedLanguage && !languages.includes(selectedLanguage)) {
      languages = [...languages, selectedLanguage];
    }
    
    if (selectedTool && !toolProficiencies.includes(selectedTool)) {
      toolProficiencies = [...toolProficiencies, selectedTool];
    }

    // Update character
    dispatch({
      type: 'UPDATE_CHARACTER',
      payload: {
        abilityScores: updatedAbilityScores as AbilityScores,
        feats: [...currentFeats, selectedFeat],
        skillProficiencies,
        toolProficiencies,
        languages
      }
    });

    toast({
      title: 'Customization Complete',
      description: `Your ${isVariantHuman ? 'Variant Human' : 'Custom Lineage'} has been configured.`,
    });
  };

  // Auto-apply when all required selections are made
  useEffect(() => {
    const requiredSelections = [
      selectedFeat,
      ...(isVariantHuman ? [selectedAbilities.length === 2, selectedSkill] : [selectedAbilities.length === 1])
    ];

    if (requiredSelections.every(Boolean)) {
      applySelections();
    }
  }, [selectedAbilities, selectedFeat, selectedSkill, selectedLanguage, selectedTool]);

  const getFeatCard = (feat: Feat) => (
    <motion.div key={feat.id} variants={cardItem}>
      <Card
        className={`cursor-pointer transition-all hover:shadow-md border-2 ${
          selectedFeat === feat.id ? 'border-primary bg-primary/5' : 'border-muted'
        }`}
        onClick={() => setSelectedFeat(feat.id)}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{feat.name}</CardTitle>
          <Badge variant="outline" className="w-fit text-xs">
            {feat.category}
          </Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{feat.description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    (!isVariantHuman && !isCustomLineage) ? (
      <div className="text-center space-y-4">
        <Users className="w-16 h-16 mx-auto text-muted-foreground" />
        <h2 className="text-2xl font-bold">Standard Human</h2>
        <p className="text-muted-foreground">
          Your standard human receives +1 to all ability scores.
        </p>
        <p className="text-sm text-muted-foreground">
          No additional customization needed.
        </p>
      </div>
    ) : (
    <div className="space-y-6">
      <motion.div className="text-center" variants={fadeInUp} initial="hidden" animate="visible">
        <h2 className="text-3xl font-bold mb-2">
          {isVariantHuman ? 'Variant Human' : 'Custom Lineage'} Customization
        </h2>
        <p className="text-muted-foreground">
          Configure your {isVariantHuman ? 'variant human' : 'custom lineage'} traits and abilities
        </p>
      </motion.div>

      {/* Ability Score Selection */}
      <motion.div variants={fadeInUp} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Ability Score Increases
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isVariantHuman
                ? 'Choose 2 different ability scores to increase by 1 each'
                : 'Choose 1 ability score to increase by 2'
              }
            </p>
          </CardHeader>
          <CardContent>
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 gap-3"
              variants={cardContainer}
              initial="hidden"
              animate="visible"
            >
              {availableAbilities.map(ability => (
                <motion.div
                  key={ability}
                  variants={cardItem}
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    selectedAbilities.includes(ability)
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => handleAbilitySelection(ability)}
                >
                  <div className="font-medium capitalize">{ability}</div>
                  <div className="text-sm text-muted-foreground">
                    {isVariantHuman ? '+1' : '+2'}
                  </div>
                </motion.div>
              ))}
            </motion.div>
            <p className="text-sm text-muted-foreground mt-2">
              Selected: {selectedAbilities.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Feat Selection */}
      <motion.div variants={fadeInUp} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Choose a Feat
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Select a feat to gain at 1st level
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="combat">Combat</TabsTrigger>
                <TabsTrigger value="magic">Magic</TabsTrigger>
                <TabsTrigger value="utility">Utility</TabsTrigger>
                <TabsTrigger value="social">Social</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto"
                  variants={cardContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {feats.map(getFeatCard)}
                </motion.div>
              </TabsContent>

              <TabsContent value="combat" className="mt-4">
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto"
                  variants={cardContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {getFeatsByCategory('combat').map(getFeatCard)}
                </motion.div>
              </TabsContent>

              <TabsContent value="magic" className="mt-4">
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto"
                  variants={cardContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {getFeatsByCategory('magic').map(getFeatCard)}
                </motion.div>
              </TabsContent>

              <TabsContent value="utility" className="mt-4">
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto"
                  variants={cardContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {getFeatsByCategory('utility').map(getFeatCard)}
                </motion.div>
              </TabsContent>

              <TabsContent value="social" className="mt-4">
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto"
                  variants={cardContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {getFeatsByCategory('social').map(getFeatCard)}
                </motion.div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      {/* Variant Human Skill Selection */}
      {isVariantHuman && (
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle>Skill Proficiency</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose one skill to gain proficiency in
              </p>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={selectedSkill}
                onValueChange={setSelectedSkill}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableSkills.map(skill => (
                    <div key={skill} className="flex items-center space-x-2">
                      <RadioGroupItem value={skill} id={skill} />
                      <Label htmlFor={skill} className="text-sm">{skill}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Language/Tool Selection */}
      <motion.div variants={fadeInUp} initial="hidden" animate="visible" transition={{ delay: 0.4 }}>
        <Card>
          <CardHeader>
            <CardTitle>Additional Proficiency</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose an additional language or tool proficiency
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Language</Label>
              <RadioGroup
                value={selectedLanguage}
                onValueChange={setSelectedLanguage}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableLanguages.map(language => (
                    <div key={language} className="flex items-center space-x-2">
                      <RadioGroupItem value={language} id={`lang-${language}`} />
                      <Label htmlFor={`lang-${language}`} className="text-sm">{language}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="text-sm font-medium">Tool Proficiency</Label>
              <RadioGroup
                value={selectedTool}
                onValueChange={setSelectedTool}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {availableTools.map(tool => (
                    <div key={tool} className="flex items-center space-x-2">
                      <RadioGroupItem value={tool} id={`tool-${tool}`} />
                      <Label htmlFor={`tool-${tool}`} className="text-sm">{tool}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Custom Lineage Additional Options */}
      {isCustomLineage && (
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Additional Traits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Size</Label>
                <RadioGroup
                  value={customLineageSize}
                  onValueChange={(value: 'small' | 'medium') => setCustomLineageSize(value)}
                >
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="small" id="small" />
                      <Label htmlFor="small">Small</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium">Medium</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="darkvision"
                  checked={hasdarkvision}
                  onCheckedChange={(checked) => setHasDarkvision(checked === true)}
                />
                <Label htmlFor="darkvision">
                  Darkvision (60 feet) - If not selected, gain an additional skill proficiency instead
                </Label>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Manual Apply Button (fallback) */}
      <div className="flex justify-center">
        <Button onClick={applySelections} className="mt-4">
          Apply Customization
        </Button>
      </div>
    </div>
    )
  );
};

export default VariantHumanSelection;

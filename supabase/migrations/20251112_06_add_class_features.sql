-- Migration: Add Class Features System
-- Date: 2025-11-14
-- Description: Implements D&D 5E class features system including class feature library,
--              character features, subclass tracking, feature usage, and rest-based restoration.
--              Covers Fighter, Rogue, Wizard, and Cleric from PHB.

-- Class Features Library Table
-- Stores all available class features from D&D 5E PHB
CREATE TABLE IF NOT EXISTS class_features_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name TEXT NOT NULL,
  subclass_name TEXT,
  feature_name TEXT NOT NULL,
  level_acquired INTEGER NOT NULL CHECK (level_acquired BETWEEN 1 AND 20),
  description TEXT NOT NULL,
  mechanical_effects TEXT,
  usage_type TEXT CHECK (usage_type IN ('passive', 'action', 'bonus_action', 'reaction', 'limited_use')),
  uses_per_rest TEXT CHECK (uses_per_rest IN ('at_will', 'short_rest', 'long_rest', 'other')),
  uses_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Character Features Table
-- Tracks features granted to individual characters
CREATE TABLE IF NOT EXISTS character_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES class_features_library(id) ON DELETE CASCADE,
  uses_remaining INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  acquired_at_level INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Character Subclasses Table
-- Tracks subclass choices for characters (permanent once chosen)
CREATE TABLE IF NOT EXISTS character_subclasses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  subclass_name TEXT NOT NULL,
  chosen_at_level INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_character_class_subclass UNIQUE (character_id, class_name)
);

-- Feature Usage Log Table
-- Tracks when and how features are used during gameplay
CREATE TABLE IF NOT EXISTS feature_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES class_features_library(id) ON DELETE CASCADE,
  session_id UUID REFERENCES game_sessions(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_features_class ON class_features_library(class_name, level_acquired);
CREATE INDEX IF NOT EXISTS idx_class_features_subclass ON class_features_library(subclass_name);
CREATE INDEX IF NOT EXISTS idx_character_features_character ON character_features(character_id);
CREATE INDEX IF NOT EXISTS idx_character_features_feature ON character_features(feature_id);
CREATE INDEX IF NOT EXISTS idx_character_subclasses_character ON character_subclasses(character_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_character ON feature_usage_log(character_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON feature_usage_log(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_session ON feature_usage_log(session_id);

-- Comments for documentation
COMMENT ON TABLE class_features_library IS 'Library of all D&D 5E class features from PHB';
COMMENT ON TABLE character_features IS 'Features granted to individual characters';
COMMENT ON TABLE character_subclasses IS 'Subclass choices for characters (permanent)';
COMMENT ON TABLE feature_usage_log IS 'Log of feature usage during gameplay';

COMMENT ON COLUMN class_features_library.usage_type IS 'How the feature is activated: passive, action, bonus_action, reaction, limited_use';
COMMENT ON COLUMN class_features_library.uses_per_rest IS 'When feature uses restore: at_will, short_rest, long_rest, other';
COMMENT ON COLUMN class_features_library.uses_count IS 'Number of uses per rest (if limited_use)';

-- ============================================================================
-- FIGHTER CLASS FEATURES (PHB pg. 70-75)
-- ============================================================================

INSERT INTO class_features_library (class_name, feature_name, level_acquired, description, mechanical_effects, usage_type, uses_per_rest, uses_count) VALUES
('Fighter', 'Fighting Style', 1, 'You adopt a particular style of fighting as your specialty. Choose one: Archery, Defense, Dueling, Great Weapon Fighting, Protection, or Two-Weapon Fighting.', 'Choose one fighting style that grants various combat bonuses', 'passive', 'at_will', NULL),
('Fighter', 'Second Wind', 1, 'You have a limited well of stamina that you can draw on to protect yourself from harm. On your turn, you can use a bonus action to regain hit points equal to 1d10 + your fighter level.', 'Regain 1d10 + fighter level HP as a bonus action', 'bonus_action', 'short_rest', 1),
('Fighter', 'Action Surge', 2, 'You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action on top of your regular action and a possible bonus action.', 'Take one additional action on your turn', 'action', 'short_rest', 1),
('Fighter', 'Martial Archetype', 3, 'Choose a martial archetype that you strive to emulate in your combat styles and techniques: Champion, Battle Master, or Eldritch Knight.', 'Gain subclass features based on chosen archetype', 'passive', 'at_will', NULL),
('Fighter', 'Ability Score Improvement', 4, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. You can''t increase an ability score above 20 using this feature.', 'Increase ability scores or take a feat', 'passive', 'at_will', NULL),
('Fighter', 'Extra Attack', 5, 'You can attack twice, instead of once, whenever you take the Attack action on your turn.', 'Make 2 attacks when you take the Attack action', 'passive', 'at_will', NULL),
('Fighter', 'Ability Score Improvement', 6, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. You can''t increase an ability score above 20 using this feature.', 'Increase ability scores or take a feat', 'passive', 'at_will', NULL),
('Fighter', 'Ability Score Improvement', 8, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. You can''t increase an ability score above 20 using this feature.', 'Increase ability scores or take a feat', 'passive', 'at_will', NULL),
('Fighter', 'Indomitable', 9, 'You can reroll a saving throw that you fail. If you do so, you must use the new roll, and you can''t use this feature again until you finish a long rest.', 'Reroll a failed saving throw once per long rest', 'reaction', 'long_rest', 1),
('Fighter', 'Extra Attack (2)', 11, 'You can attack three times whenever you take the Attack action on your turn.', 'Make 3 attacks when you take the Attack action', 'passive', 'at_will', NULL),
('Fighter', 'Ability Score Improvement', 12, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. You can''t increase an ability score above 20 using this feature.', 'Increase ability scores or take a feat', 'passive', 'at_will', NULL),
('Fighter', 'Indomitable (two uses)', 13, 'You can use Indomitable twice between long rests.', 'Reroll failed saving throws twice per long rest', 'reaction', 'long_rest', 2),
('Fighter', 'Ability Score Improvement', 14, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. You can''t increase an ability score above 20 using this feature.', 'Increase ability scores or take a feat', 'passive', 'at_will', NULL),
('Fighter', 'Ability Score Improvement', 16, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. You can''t increase an ability score above 20 using this feature.', 'Increase ability scores or take a feat', 'passive', 'at_will', NULL),
('Fighter', 'Action Surge (two uses)', 17, 'You can use Action Surge twice before a rest, but only once on the same turn.', 'Use Action Surge twice per short rest', 'action', 'short_rest', 2),
('Fighter', 'Indomitable (three uses)', 17, 'You can use Indomitable three times between long rests.', 'Reroll failed saving throws three times per long rest', 'reaction', 'long_rest', 3),
('Fighter', 'Ability Score Improvement', 19, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1. You can''t increase an ability score above 20 using this feature.', 'Increase ability scores or take a feat', 'passive', 'at_will', NULL),
('Fighter', 'Extra Attack (3)', 20, 'You can attack four times whenever you take the Attack action on your turn.', 'Make 4 attacks when you take the Attack action', 'passive', 'at_will', NULL);

-- Fighter Subclass: Champion
INSERT INTO class_features_library (class_name, subclass_name, feature_name, level_acquired, description, mechanical_effects, usage_type, uses_per_rest) VALUES
('Fighter', 'Champion', 'Improved Critical', 3, 'Your weapon attacks score a critical hit on a roll of 19 or 20.', 'Critical hits on 19-20', 'passive', 'at_will'),
('Fighter', 'Champion', 'Remarkable Athlete', 7, 'You can add half your proficiency bonus (rounded up) to any Strength, Dexterity, or Constitution check you make that doesn''t already use your proficiency bonus. In addition, when you make a running long jump, the distance you can cover increases by a number of feet equal to your Strength modifier.', 'Add half proficiency to STR/DEX/CON checks, improved long jump', 'passive', 'at_will'),
('Fighter', 'Champion', 'Additional Fighting Style', 10, 'You can choose a second option from the Fighting Style class feature.', 'Choose a second Fighting Style', 'passive', 'at_will'),
('Fighter', 'Champion', 'Superior Critical', 15, 'Your weapon attacks score a critical hit on a roll of 18-20.', 'Critical hits on 18-20', 'passive', 'at_will'),
('Fighter', 'Champion', 'Survivor', 18, 'You attain the pinnacle of resilience in battle. At the start of each of your turns, you regain hit points equal to 5 + your Constitution modifier if you have no more than half of your hit points left. You don''t gain this benefit if you have 0 hit points.', 'Regain 5 + CON mod HP per turn when below half HP', 'passive', 'at_will');

-- Fighter Subclass: Battle Master
INSERT INTO class_features_library (class_name, subclass_name, feature_name, level_acquired, description, mechanical_effects, usage_type, uses_per_rest, uses_count) VALUES
('Fighter', 'Battle Master', 'Combat Superiority', 3, 'You learn three maneuvers of your choice. You learn two additional maneuvers at 7th, 10th, and 15th level. You have four superiority dice, which are d8s. You regain all expended superiority dice when you finish a short or long rest.', 'Learn 3 maneuvers, gain 4d8 superiority dice', 'limited_use', 'short_rest', 4),
('Fighter', 'Battle Master', 'Student of War', 3, 'You gain proficiency with one type of artisan''s tools of your choice.', 'Gain proficiency in one artisan tool', 'passive', 'at_will', NULL),
('Fighter', 'Battle Master', 'Know Your Enemy', 7, 'If you spend at least 1 minute observing or interacting with another creature outside combat, you can learn certain information about its capabilities compared to your own.', 'Learn enemy capabilities after 1 minute observation', 'action', 'at_will', NULL),
('Fighter', 'Battle Master', 'Improved Combat Superiority', 10, 'Your superiority dice turn into d10s. At 18th level, they turn into d12s.', 'Superiority dice become d10s', 'passive', 'at_will', NULL),
('Fighter', 'Battle Master', 'Relentless', 15, 'When you roll initiative and have no superiority dice remaining, you regain 1 superiority die.', 'Regain 1 superiority die when rolling initiative with none remaining', 'passive', 'at_will', NULL);

-- Fighter Subclass: Eldritch Knight
INSERT INTO class_features_library (class_name, subclass_name, feature_name, level_acquired, description, mechanical_effects, usage_type, uses_per_rest) VALUES
('Fighter', 'Eldritch Knight', 'Spellcasting', 3, 'You augment your martial prowess with the ability to cast spells. You learn two cantrips and three 1st-level spells from the wizard spell list.', 'Cast wizard spells (primarily abjuration and evocation)', 'passive', 'at_will'),
('Fighter', 'Eldritch Knight', 'Weapon Bond', 3, 'You learn a ritual that creates a magical bond between yourself and one weapon. Once bonded, you can''t be disarmed of that weapon unless you are incapacitated.', 'Bond with a weapon, summon as bonus action', 'bonus_action', 'at_will'),
('Fighter', 'Eldritch Knight', 'War Magic', 7, 'When you use your action to cast a cantrip, you can make one weapon attack as a bonus action.', 'Make weapon attack as bonus action after casting cantrip', 'bonus_action', 'at_will'),
('Fighter', 'Eldritch Knight', 'Eldritch Strike', 10, 'When you hit a creature with a weapon attack, that creature has disadvantage on the next saving throw it makes against a spell you cast before the end of your next turn.', 'Impose disadvantage on spell saves after weapon hit', 'passive', 'at_will'),
('Fighter', 'Eldritch Knight', 'Arcane Charge', 15, 'When you use your Action Surge, you can teleport up to 30 feet to an unoccupied space you can see before or after the additional action.', 'Teleport 30 feet when using Action Surge', 'passive', 'at_will'),
('Fighter', 'Eldritch Knight', 'Improved War Magic', 18, 'When you use your action to cast a spell, you can make one weapon attack as a bonus action.', 'Make weapon attack as bonus action after casting any spell', 'bonus_action', 'at_will');

-- ============================================================================
-- ROGUE CLASS FEATURES (PHB pg. 94-98)
-- ============================================================================

INSERT INTO class_features_library (class_name, feature_name, level_acquired, description, mechanical_effects, usage_type, uses_per_rest) VALUES
('Rogue', 'Expertise', 1, 'Choose two of your skill proficiencies, or one of your skill proficiencies and your proficiency with thieves'' tools. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.', 'Double proficiency bonus on two skills', 'passive', 'at_will'),
('Rogue', 'Sneak Attack', 1, 'You know how to strike subtly and exploit a foe''s distraction. Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack if you have advantage on the attack roll. The attack must use a finesse or ranged weapon. You don''t need advantage if another enemy of the target is within 5 feet of it.', 'Deal +1d6 damage once per turn with advantage or ally adjacent (scales with level)', 'passive', 'at_will'),
('Rogue', 'Thieves'' Cant', 1, 'You have learned thieves'' cant, a secret mix of dialect, jargon, and code that allows you to hide messages in seemingly normal conversation.', 'Secret language known only to rogues', 'passive', 'at_will'),
('Rogue', 'Cunning Action', 2, 'Your quick thinking and agility allow you to move and act quickly. You can take a bonus action on each of your turns in combat. This action can be used only to take the Dash, Disengage, or Hide action.', 'Dash, Disengage, or Hide as bonus action', 'bonus_action', 'at_will'),
('Rogue', 'Roguish Archetype', 3, 'Choose an archetype that you emulate in the exercise of your rogue abilities: Thief, Assassin, or Arcane Trickster.', 'Gain subclass features based on chosen archetype', 'passive', 'at_will'),
('Rogue', 'Ability Score Improvement', 4, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1.', 'Increase ability scores or take a feat', 'passive', 'at_will'),
('Rogue', 'Uncanny Dodge', 5, 'When an attacker that you can see hits you with an attack, you can use your reaction to halve the attack''s damage against you.', 'Halve damage from an attack as a reaction', 'reaction', 'at_will'),
('Rogue', 'Expertise', 6, 'Choose two more of your proficiencies to gain the benefit of Expertise.', 'Double proficiency bonus on two more skills', 'passive', 'at_will'),
('Rogue', 'Evasion', 7, 'When you are subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw, and only half damage if you fail.', 'Take no damage on successful DEX save, half on failure', 'passive', 'at_will'),
('Rogue', 'Ability Score Improvement', 8, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1.', 'Increase ability scores or take a feat', 'passive', 'at_will'),
('Rogue', 'Ability Score Improvement', 10, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1.', 'Increase ability scores or take a feat', 'passive', 'at_will'),
('Rogue', 'Reliable Talent', 11, 'Whenever you make an ability check that lets you add your proficiency bonus, you can treat a d20 roll of 9 or lower as a 10.', 'Minimum roll of 10 on proficiency checks', 'passive', 'at_will'),
('Rogue', 'Ability Score Improvement', 12, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1.', 'Increase ability scores or take a feat', 'passive', 'at_will'),
('Rogue', 'Blindsense', 14, 'If you are able to hear, you are aware of the location of any hidden or invisible creature within 10 feet of you.', 'Detect hidden/invisible creatures within 10 feet', 'passive', 'at_will'),
('Rogue', 'Slippery Mind', 15, 'You have acquired greater mental strength. You gain proficiency in Wisdom saving throws.', 'Gain proficiency in Wisdom saving throws', 'passive', 'at_will'),
('Rogue', 'Ability Score Improvement', 16, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1.', 'Increase ability scores or take a feat', 'passive', 'at_will'),
('Rogue', 'Elusive', 18, 'You are so evasive that attackers rarely gain the upper hand against you. No attack roll has advantage against you while you aren''t incapacitated.', 'No attacks have advantage against you', 'passive', 'at_will'),
('Rogue', 'Ability Score Improvement', 19, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1.', 'Increase ability scores or take a feat', 'passive', 'at_will'),
('Rogue', 'Stroke of Luck', 20, 'If your attack misses a target within range, you can turn the miss into a hit. Alternatively, if you fail an ability check, you can treat the d20 roll as a 20.', 'Turn a miss into a hit, or failed check into 20', 'limited_use', 'short_rest');

-- Rogue Subclass: Thief
INSERT INTO class_features_library (class_name, subclass_name, feature_name, level_acquired, description, mechanical_effects, usage_type, uses_per_rest) VALUES
('Rogue', 'Thief', 'Fast Hands', 3, 'You can use the bonus action granted by your Cunning Action to make a Dexterity (Sleight of Hand) check, use your thieves'' tools to disarm a trap or open a lock, or take the Use an Object action.', 'Use Cunning Action to Sleight of Hand, disarm trap, or use object', 'bonus_action', 'at_will'),
('Rogue', 'Thief', 'Second-Story Work', 3, 'You gain the ability to climb faster than normal; climbing no longer costs you extra movement. In addition, when you make a running jump, the distance you cover increases by a number of feet equal to your Dexterity modifier.', 'Climb at normal speed, improved running jump', 'passive', 'at_will'),
('Rogue', 'Thief', 'Supreme Sneak', 9, 'You have advantage on a Dexterity (Stealth) check if you move no more than half your speed on the same turn.', 'Advantage on Stealth when moving half speed or less', 'passive', 'at_will'),
('Rogue', 'Thief', 'Use Magic Device', 13, 'You have learned enough about the workings of magic that you can improvise the use of items even when they are not intended for you. You ignore all class, race, and level requirements on the use of magic items.', 'Ignore requirements on magic items', 'passive', 'at_will'),
('Rogue', 'Thief', 'Thief''s Reflexes', 17, 'You can take two turns during the first round of any combat. You take your first turn at your normal initiative and your second turn at your initiative minus 10.', 'Take two turns in first round of combat', 'passive', 'at_will');

-- Rogue Subclass: Assassin
INSERT INTO class_features_library (class_name, subclass_name, feature_name, level_acquired, description, mechanical_effects, usage_type, uses_per_rest) VALUES
('Rogue', 'Assassin', 'Bonus Proficiencies', 3, 'You gain proficiency with the disguise kit and the poisoner''s kit.', 'Proficiency with disguise kit and poisoner''s kit', 'passive', 'at_will'),
('Rogue', 'Assassin', 'Assassinate', 3, 'You have advantage on attack rolls against any creature that hasn''t taken a turn in the combat yet. In addition, any hit you score against a creature that is surprised is a critical hit.', 'Advantage vs creatures who haven''t acted; auto-crit on surprised creatures', 'passive', 'at_will'),
('Rogue', 'Assassin', 'Infiltration Expertise', 9, 'You can unfailingly create false identities for yourself. You must spend seven days and 25 gp to establish the history, profession, and affiliations for an identity.', 'Create false identities (7 days, 25 gp)', 'passive', 'at_will'),
('Rogue', 'Assassin', 'Impostor', 13, 'You gain the ability to unerringly mimic another person''s speech, writing, and behavior. You must spend at least three hours studying these three components of the person''s behavior, listening to speech, examining handwriting, and observing mannerisms.', 'Mimic person after 3 hours study', 'passive', 'at_will'),
('Rogue', 'Assassin', 'Death Strike', 17, 'When you attack and hit a creature that is surprised, it must make a Constitution saving throw (DC 8 + your Dexterity modifier + your proficiency bonus). On a failed save, double the damage of your attack against the creature.', 'Double damage on surprised creatures (CON save)', 'passive', 'at_will');

-- Rogue Subclass: Arcane Trickster
INSERT INTO class_features_library (class_name, subclass_name, feature_name, level_acquired, description, mechanical_effects, usage_type, uses_per_rest) VALUES
('Rogue', 'Arcane Trickster', 'Spellcasting', 3, 'You augment your martial prowess with the ability to cast spells. You learn three cantrips and three 1st-level spells from the wizard spell list.', 'Cast wizard spells (primarily enchantment and illusion)', 'passive', 'at_will'),
('Rogue', 'Arcane Trickster', 'Mage Hand Legerdemain', 3, 'When you cast mage hand, you can make the spectral hand invisible, and you can perform additional tasks with it.', 'Invisible mage hand with enhanced capabilities', 'bonus_action', 'at_will'),
('Rogue', 'Arcane Trickster', 'Magical Ambush', 9, 'If you are hidden from a creature when you cast a spell on it, the creature has disadvantage on any saving throw it makes against the spell this turn.', 'Impose disadvantage on spell saves when hidden', 'passive', 'at_will'),
('Rogue', 'Arcane Trickster', 'Versatile Trickster', 13, 'You gain the ability to distract targets with your mage hand. As a bonus action on your turn, you can designate a creature within 5 feet of the spectral hand. Doing so gives you advantage on attack rolls against that creature until the end of the turn.', 'Use mage hand to gain advantage on attacks', 'bonus_action', 'at_will'),
('Rogue', 'Arcane Trickster', 'Spell Thief', 17, 'You gain the ability to magically steal the knowledge of how to cast a spell from another spellcaster.', 'Steal spells from other casters when they target you', 'reaction', 'at_will');

-- ============================================================================
-- WIZARD CLASS FEATURES (PHB pg. 112-119)
-- ============================================================================

INSERT INTO class_features_library (class_name, feature_name, level_acquired, description, mechanical_effects, usage_type, uses_per_rest, uses_count) VALUES
('Wizard', 'Spellcasting', 1, 'As a student of arcane magic, you have a spellbook containing spells that show the first glimmerings of your true power.', 'Cast wizard spells using spellbook and prepared spells', 'passive', 'at_will', NULL),
('Wizard', 'Arcane Recovery', 1, 'You have learned to regain some of your magical energy by studying your spellbook. Once per day when you finish a short rest, you can choose expended spell slots to recover. The spell slots can have a combined level that is equal to or less than half your wizard level (rounded up), and none of the slots can be 6th level or higher.', 'Recover spell slots during short rest (once per day)', 'limited_use', 'long_rest', 1),
('Wizard', 'Arcane Tradition', 2, 'You choose an arcane tradition, shaping your practice of magic through one of eight schools: Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, or Transmutation.', 'Gain subclass features based on chosen school', 'passive', 'at_will', NULL),
('Wizard', 'Ability Score Improvement', 4, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1.', 'Increase ability scores or take a feat', 'passive', 'at_will', NULL),
('Wizard', 'Ability Score Improvement', 8, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1.', 'Increase ability scores or take a feat', 'passive', 'at_will', NULL),
('Wizard', 'Ability Score Improvement', 12, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1.', 'Increase ability scores or take a feat', 'passive', 'at_will', NULL),
('Wizard', 'Ability Score Improvement', 16, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1.', 'Increase ability scores or take a feat', 'passive', 'at_will', NULL),
('Wizard', 'Spell Mastery', 18, 'You have achieved such mastery over certain spells that you can cast them at will. Choose a 1st-level wizard spell and a 2nd-level wizard spell that are in your spellbook. You can cast those spells at their lowest level without expending a spell slot when you have them prepared.', 'Cast one 1st-level and one 2nd-level spell at will', 'passive', 'at_will', NULL),
('Wizard', 'Ability Score Improvement', 19, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1.', 'Increase ability scores or take a feat', 'passive', 'at_will', NULL),
('Wizard', 'Signature Spells', 20, 'You gain mastery over two powerful spells and can cast them with little effort. Choose two 3rd-level wizard spells in your spellbook as your signature spells. You always have these spells prepared, they don''t count against the number of spells you have prepared, and you can cast each of them once at 3rd level without expending a spell slot. When you do so, you can''t do so again until you finish a short or long rest.', 'Cast two 3rd-level spells once per short rest without spell slots', 'limited_use', 'short_rest', 2);

-- Wizard Subclass: School of Evocation
INSERT INTO class_features_library (class_name, subclass_name, feature_name, level_acquired, description, mechanical_effects, usage_type, uses_per_rest) VALUES
('Wizard', 'School of Evocation', 'Evocation Savant', 2, 'The gold and time you must spend to copy an evocation spell into your spellbook is halved.', 'Half cost to copy evocation spells', 'passive', 'at_will'),
('Wizard', 'School of Evocation', 'Sculpt Spells', 2, 'You can create pockets of relative safety within the effects of your evocation spells. When you cast an evocation spell that affects other creatures that you can see, you can choose a number of them equal to 1 + the spell''s level. The chosen creatures automatically succeed on their saving throws against the spell, and they take no damage if they would normally take half damage on a successful save.', 'Exclude allies from evocation spell effects', 'passive', 'at_will'),
('Wizard', 'School of Evocation', 'Potent Cantrip', 6, 'Your damaging cantrips affect even creatures that avoid the brunt of the effect. When a creature succeeds on a saving throw against your cantrip, the creature takes half the cantrip''s damage (if any) but suffers no additional effect from the cantrip.', 'Cantrips deal half damage on successful saves', 'passive', 'at_will'),
('Wizard', 'School of Evocation', 'Empowered Evocation', 10, 'You can add your Intelligence modifier to one damage roll of any wizard evocation spell you cast.', 'Add INT modifier to evocation spell damage', 'passive', 'at_will'),
('Wizard', 'School of Evocation', 'Overchannel', 14, 'When you cast a wizard spell of 1st through 5th level that deals damage, you can deal maximum damage with that spell. The first time you do so, you suffer no adverse effect. If you use this feature again before you finish a long rest, you take 2d12 necrotic damage for each level of the spell, immediately after you cast it.', 'Deal maximum damage with spell (risk damage on repeat use)', 'limited_use', 'long_rest');

-- Wizard Subclass: School of Abjuration
INSERT INTO class_features_library (class_name, subclass_name, feature_name, level_acquired, description, mechanical_effects, usage_type, uses_per_rest) VALUES
('Wizard', 'School of Abjuration', 'Abjuration Savant', 2, 'The gold and time you must spend to copy an abjuration spell into your spellbook is halved.', 'Half cost to copy abjuration spells', 'passive', 'at_will'),
('Wizard', 'School of Abjuration', 'Arcane Ward', 2, 'You can weave magic around yourself for protection. When you cast an abjuration spell of 1st level or higher, you can simultaneously use a strand of the spell''s magic to create a magical ward on yourself that lasts until you finish a long rest. The ward has hit points equal to twice your wizard level + your Intelligence modifier. Whenever you take damage, the ward takes the damage instead.', 'Create arcane ward with HP = 2*level + INT', 'passive', 'at_will'),
('Wizard', 'School of Abjuration', 'Projected Ward', 6, 'When a creature that you can see within 30 feet of you takes damage, you can use your reaction to cause your Arcane Ward to absorb that damage.', 'Use Arcane Ward to protect allies within 30 feet', 'reaction', 'at_will'),
('Wizard', 'School of Abjuration', 'Improved Abjuration', 10, 'When you cast an abjuration spell that requires you to make an ability check as a part of casting that spell, you add your proficiency bonus to that ability check.', 'Add proficiency to abjuration spell checks', 'passive', 'at_will'),
('Wizard', 'School of Abjuration', 'Spell Resistance', 14, 'You have advantage on saving throws against spells. Furthermore, you have resistance against the damage of spells.', 'Advantage on spell saves, resistance to spell damage', 'passive', 'at_will');

-- ============================================================================
-- CLERIC CLASS FEATURES (PHB pg. 56-63)
-- ============================================================================

INSERT INTO class_features_library (class_name, feature_name, level_acquired, description, mechanical_effects, usage_type, uses_per_rest, uses_count) VALUES
('Cleric', 'Spellcasting', 1, 'As a conduit for divine power, you can cast cleric spells.', 'Cast cleric spells using prepared spells', 'passive', 'at_will', NULL),
('Cleric', 'Divine Domain', 1, 'Choose one domain related to your deity: Knowledge, Life, Light, Nature, Tempest, Trickery, or War. Your choice grants you domain spells and other features.', 'Gain subclass features based on chosen domain', 'passive', 'at_will', NULL),
('Cleric', 'Channel Divinity', 2, 'You gain the ability to channel divine energy directly from your deity, using that energy to fuel magical effects. You start with two such effects: Turn Undead and an effect determined by your domain. When you use your Channel Divinity, you choose which effect to create.', 'Use divine energy for Turn Undead or domain effect', 'action', 'short_rest', 1),
('Cleric', 'Ability Score Improvement', 4, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1.', 'Increase ability scores or take a feat', 'passive', 'at_will', NULL),
('Cleric', 'Destroy Undead (CR 1/2)', 5, 'When an undead of CR 1/2 or lower fails its saving throw against your Turn Undead feature, the creature is instantly destroyed.', 'Destroy CR 1/2 or lower undead with Turn Undead', 'passive', 'at_will', NULL),
('Cleric', 'Channel Divinity (2/rest)', 6, 'You can use your Channel Divinity twice between rests.', 'Use Channel Divinity twice per short rest', 'action', 'short_rest', 2),
('Cleric', 'Ability Score Improvement', 8, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1.', 'Increase ability scores or take a feat', 'passive', 'at_will', NULL),
('Cleric', 'Destroy Undead (CR 1)', 8, 'When an undead of CR 1 or lower fails its saving throw against your Turn Undead feature, the creature is instantly destroyed.', 'Destroy CR 1 or lower undead with Turn Undead', 'passive', 'at_will', NULL),
('Cleric', 'Divine Intervention', 10, 'You can call on your deity to intervene on your behalf when your need is great. Imploring your deity''s aid requires you to use your action. Roll percentile dice. If you roll a number equal to or lower than your cleric level, your deity intervenes.', 'Call on deity for intervention (% = cleric level)', 'action', 'long_rest', 1),
('Cleric', 'Destroy Undead (CR 2)', 11, 'When an undead of CR 2 or lower fails its saving throw against your Turn Undead feature, the creature is instantly destroyed.', 'Destroy CR 2 or lower undead with Turn Undead', 'passive', 'at_will', NULL),
('Cleric', 'Ability Score Improvement', 12, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1.', 'Increase ability scores or take a feat', 'passive', 'at_will', NULL),
('Cleric', 'Destroy Undead (CR 3)', 14, 'When an undead of CR 3 or lower fails its saving throw against your Turn Undead feature, the creature is instantly destroyed.', 'Destroy CR 3 or lower undead with Turn Undead', 'passive', 'at_will', NULL),
('Cleric', 'Ability Score Improvement', 16, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1.', 'Increase ability scores or take a feat', 'passive', 'at_will', NULL),
('Cleric', 'Destroy Undead (CR 4)', 17, 'When an undead of CR 4 or lower fails its saving throw against your Turn Undead feature, the creature is instantly destroyed.', 'Destroy CR 4 or lower undead with Turn Undead', 'passive', 'at_will', NULL),
('Cleric', 'Channel Divinity (3/rest)', 18, 'You can use your Channel Divinity three times between rests.', 'Use Channel Divinity three times per short rest', 'action', 'short_rest', 3),
('Cleric', 'Ability Score Improvement', 19, 'You can increase one ability score of your choice by 2, or you can increase two ability scores of your choice by 1.', 'Increase ability scores or take a feat', 'passive', 'at_will', NULL),
('Cleric', 'Divine Intervention Improvement', 20, 'Your call for intervention succeeds automatically, no roll required.', 'Divine Intervention auto-succeeds', 'passive', 'at_will', NULL);

-- Cleric Subclass: Life Domain
INSERT INTO class_features_library (class_name, subclass_name, feature_name, level_acquired, description, mechanical_effects, usage_type, uses_per_rest) VALUES
('Cleric', 'Life Domain', 'Bonus Proficiency', 1, 'You gain proficiency with heavy armor.', 'Proficiency with heavy armor', 'passive', 'at_will'),
('Cleric', 'Life Domain', 'Disciple of Life', 1, 'Your healing spells are more effective. Whenever you use a spell of 1st level or higher to restore hit points to a creature, the creature regains additional hit points equal to 2 + the spell''s level.', 'Healing spells restore +2 + spell level HP', 'passive', 'at_will'),
('Cleric', 'Life Domain', 'Channel Divinity: Preserve Life', 2, 'You can use your Channel Divinity to heal the badly injured. As an action, you present your holy symbol and evoke healing energy that can restore a number of hit points equal to five times your cleric level. Choose any creatures within 30 feet of you, and divide those hit points among them.', 'Restore 5*cleric level HP divided among allies', 'action', 'short_rest'),
('Cleric', 'Life Domain', 'Blessed Healer', 6, 'The healing spells you cast on others heal you as well. When you cast a spell of 1st level or higher that restores hit points to a creature other than you, you regain hit points equal to 2 + the spell''s level.', 'Regain 2 + spell level HP when healing others', 'passive', 'at_will'),
('Cleric', 'Life Domain', 'Divine Strike', 8, 'You gain the ability to infuse your weapon strikes with divine energy. Once on each of your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra 1d8 radiant damage to the target. When you reach 14th level, the extra damage increases to 2d8.', 'Deal +1d8 radiant damage with weapon attacks (2d8 at 14th)', 'passive', 'at_will'),
('Cleric', 'Life Domain', 'Supreme Healing', 17, 'When you would normally roll one or more dice to restore hit points with a spell, you instead use the highest number possible for each die.', 'Maximize healing spell rolls', 'passive', 'at_will');

-- Cleric Subclass: War Domain
INSERT INTO class_features_library (class_name, subclass_name, feature_name, level_acquired, description, mechanical_effects, usage_type, uses_per_rest, uses_count) VALUES
('Cleric', 'War Domain', 'Bonus Proficiencies', 1, 'You gain proficiency with martial weapons and heavy armor.', 'Proficiency with martial weapons and heavy armor', 'passive', 'at_will', NULL),
('Cleric', 'War Domain', 'War Priest', 1, 'From 1st level, your god delivers bolts of inspiration to you while you are engaged in battle. When you use the Attack action, you can make one weapon attack as a bonus action. You can use this feature a number of times equal to your Wisdom modifier (minimum of once). You regain all expended uses when you finish a long rest.', 'Make weapon attack as bonus action (WIS mod times per long rest)', 'bonus_action', 'long_rest', NULL),
('Cleric', 'War Domain', 'Channel Divinity: Guided Strike', 2, 'You can use your Channel Divinity to strike with supernatural accuracy. When you make an attack roll, you can use your Channel Divinity to gain a +10 bonus to the roll. You make this choice after you see the roll, but before the DM says whether the attack hits or misses.', 'Gain +10 to attack roll', 'action', 'short_rest', NULL),
('Cleric', 'War Domain', 'Channel Divinity: War God''s Blessing', 6, 'When a creature within 30 feet of you makes an attack roll, you can use your reaction to grant that creature a +10 bonus to the roll, using your Channel Divinity. You make this choice after you see the roll, but before the DM says whether the attack hits or misses.', 'Grant ally +10 to attack roll', 'reaction', 'short_rest', NULL),
('Cleric', 'War Domain', 'Divine Strike', 8, 'You gain the ability to infuse your weapon strikes with divine energy. Once on each of your turns when you hit a creature with a weapon attack, you can cause the attack to deal an extra 1d8 damage of the same type dealt by the weapon to the target. When you reach 14th level, the extra damage increases to 2d8.', 'Deal +1d8 weapon damage with attacks (2d8 at 14th)', 'passive', 'at_will', NULL),
('Cleric', 'War Domain', 'Avatar of Battle', 17, 'You gain resistance to bludgeoning, piercing, and slashing damage from nonmagical weapons.', 'Resistance to nonmagical weapon damage', 'passive', 'at_will', NULL);

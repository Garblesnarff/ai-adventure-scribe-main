/**
 * Class Features System Type Definitions
 *
 * Type-safe interfaces for D&D 5E class features including feature library,
 * character features, subclass tracking, and feature usage.
 */

/**
 * Feature usage type - how the feature is activated
 */
export type FeatureUsageType = 'passive' | 'action' | 'bonus_action' | 'reaction' | 'limited_use';

/**
 * Rest type - when feature uses are restored
 */
export type RestType = 'at_will' | 'short_rest' | 'long_rest' | 'other';

/**
 * Class feature from the library
 */
export interface ClassFeature {
  id: string;
  className: string;
  subclassName: string | null;
  featureName: string;
  levelAcquired: number;
  description: string;
  mechanicalEffects: string | null;
  usageType: FeatureUsageType | null;
  usesPerRest: RestType | null;
  usesCount: number | null;
  createdAt: Date;
}

/**
 * Feature granted to a character
 */
export interface CharacterFeature {
  id: string;
  characterId: string;
  featureId: string;
  usesRemaining: number | null;
  isActive: boolean;
  acquiredAtLevel: number;
  createdAt: Date;
  // Joined data from class_features_library
  feature?: ClassFeature;
}

/**
 * Character's subclass choice
 */
export interface CharacterSubclass {
  id: string;
  characterId: string;
  className: string;
  subclassName: string;
  chosenAtLevel: number;
  createdAt: Date;
}

/**
 * Subclass choice information
 */
export interface SubclassChoice {
  className: string;
  subclassName: string;
  level: number;
}

/**
 * Feature usage log entry
 */
export interface FeatureUsageLog {
  id: string;
  characterId: string;
  featureId: string;
  sessionId: string | null;
  usedAt: Date;
  context: string | null;
  createdAt: Date;
}

/**
 * Input for granting a feature to a character
 */
export interface GrantFeatureInput {
  characterId: string;
  featureId: string;
  acquiredAtLevel: number;
}

/**
 * Input for using a feature
 */
export interface UseFeatureInput {
  characterId: string;
  featureId: string;
  context?: string;
  sessionId?: string;
}

/**
 * Result of using a feature
 */
export interface UseFeatureResult {
  success: boolean;
  usesRemaining: number;
  effect: string;
  message: string;
}

/**
 * Input for restoring features after rest
 */
export interface RestoreFeaturesInput {
  characterId: string;
  restType: 'short' | 'long';
}

/**
 * Result of restoring features
 */
export interface RestoreFeaturesResult {
  featuresRestored: string[];
  restoredCount: number;
}

/**
 * Input for setting a character's subclass
 */
export interface SetSubclassInput {
  characterId: string;
  className: string;
  subclassName: string;
  level: number;
}

/**
 * Result of setting a subclass
 */
export interface SetSubclassResult {
  subclass: string;
  newFeatures: ClassFeature[];
  message: string;
}

/**
 * Query parameters for getting features library
 */
export interface GetFeaturesLibraryParams {
  className?: string;
  subclass?: string;
  level?: number;
}

/**
 * Available subclasses for a class
 */
export interface AvailableSubclasses {
  className: string;
  subclasses: string[];
}

/**
 * Character features with usage information
 */
export interface CharacterFeaturesWithUsage {
  features: CharacterFeature[];
  usesRemaining: Record<string, number>;
}

/**
 * Feature usage history query params
 */
export interface FeatureUsageHistoryParams {
  characterId: string;
  featureId?: string;
  sessionId?: string;
  limit?: number;
}

/**
 * Subclass choice level mapping
 * Most classes choose subclass at level 3, but some differ
 */
export const SUBCLASS_CHOICE_LEVELS: Record<string, number> = {
  'Barbarian': 3,
  'Bard': 3,
  'Cleric': 1,    // Chooses Divine Domain at 1st level
  'Druid': 2,     // Chooses Druid Circle at 2nd level
  'Fighter': 3,
  'Monk': 3,
  'Paladin': 3,
  'Ranger': 3,
  'Rogue': 3,
  'Sorcerer': 1,  // Chooses Sorcerous Origin at 1st level
  'Warlock': 1,   // Chooses Otherworldly Patron at 1st level
  'Wizard': 2,    // Chooses Arcane Tradition at 2nd level
};

/**
 * Available subclasses by class (PHB only)
 */
export const AVAILABLE_SUBCLASSES: Record<string, string[]> = {
  'Fighter': ['Champion', 'Battle Master', 'Eldritch Knight'],
  'Rogue': ['Thief', 'Assassin', 'Arcane Trickster'],
  'Wizard': ['School of Evocation', 'School of Abjuration', 'School of Conjuration', 'School of Divination', 'School of Enchantment', 'School of Illusion', 'School of Necromancy', 'School of Transmutation'],
  'Cleric': ['Life Domain', 'War Domain', 'Knowledge Domain', 'Light Domain', 'Nature Domain', 'Tempest Domain', 'Trickery Domain'],
  'Barbarian': ['Path of the Berserker', 'Path of the Totem Warrior'],
  'Bard': ['College of Lore', 'College of Valor'],
  'Druid': ['Circle of the Land', 'Circle of the Moon'],
  'Monk': ['Way of the Open Hand', 'Way of Shadow', 'Way of the Four Elements'],
  'Paladin': ['Oath of Devotion', 'Oath of the Ancients', 'Oath of Vengeance'],
  'Ranger': ['Hunter', 'Beast Master'],
  'Sorcerer': ['Draconic Bloodline', 'Wild Magic'],
  'Warlock': ['The Archfey', 'The Fiend', 'The Great Old One'],
};

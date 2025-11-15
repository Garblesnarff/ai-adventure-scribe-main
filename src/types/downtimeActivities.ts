/**
 * Downtime Activities System for D&D 5e
 *
 * Data models for downtime activities, their effects, and tracking
 */

import type { Character } from '@/types/character';

// ===========================
// Downtime Activity Types
// ===========================

export type DowntimeActivityType =
  | 'crafting'
  | 'training'
  | 'research'
  | 'buying_magic_items'
  | 'selling_magic_items'
  | 'working'
  | 'carousing'
  | 'crime'
  | 'gambling'
  | 'relaxation'
  | 'religious_service'
  | 'scribing_spells'
  | 'practicing_profession';

// ===========================
// Downtime Activity Data Model
// ===========================

export interface DowntimeActivity {
  id: string;
  name: string;
  type: DowntimeActivityType;
  description: string;
  // Resource requirements
  daysRequired: number;
  goldCost?: number;
  materialCost?: number;
  toolRequirements?: string[];
  skillRequirements?: string[];
  // Prerequisites
  levelRequirement?: number;
  classRequirement?: string;
  // Outcomes
  successDC?: number;
  outcomes: DowntimeOutcome[];
  // Special properties
  repeatable: boolean;
  requiresSupplies: boolean;
  locationRequired?: string;
}

// ===========================
// Downtime Outcome Data Model
// ===========================

export interface DowntimeOutcome {
  id: string;
  description: string;
  // Success criteria
  minRoll?: number;
  maxRoll?: number;
  automatic?: boolean;
  // Effects
  goldGained?: number;
  itemGained?: string;
  experienceGained?: number;
  skillProficiencyGained?: string;
  toolProficiencyGained?: string;
  abilityScoreImprovement?: {
    ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
    improvement: number;
  };
  // Special effects
  specialEffects?: string[];
  // Risk factors
  complicationChance?: number;
  complications?: DowntimeComplication[];
}

// ===========================
// Downtime Complication Data Model
// ===========================

export interface DowntimeComplication {
  id: string;
  description: string;
  // Effect
  goldLost?: number;
  itemLost?: string;
  injury?: boolean;
  legalTrouble?: boolean;
  reputationLoss?: number;
  // Resolution
  resolutionDC?: number;
  resolutionAbility?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
}

// ===========================
// Character Downtime Activity Record
// ===========================

export interface CharacterDowntimeActivity {
  id: string;
  characterId: string;
  activityId: string;
  startDate: string;
  endDate: string;
  status: 'planned' | 'in_progress' | 'completed' | 'failed' | 'interrupted';
  // Progress tracking
  daysCompleted: number;
  goldSpent: number;
  materialsUsed: number;
  // Results
  outcome?: DowntimeOutcome;
  complications?: DowntimeComplication[];
  notes?: string;
}

// ===========================
// Downtime Manager Interface
// ===========================

export interface DowntimeManager {
  // Activity management
  startActivity: (
    character: Character,
    activity: DowntimeActivity,
  ) => Promise<CharacterDowntimeActivity>;
  progressActivity: (
    activityRecord: CharacterDowntimeActivity,
    days: number,
  ) => Promise<CharacterDowntimeActivity>;
  completeActivity: (activityRecord: CharacterDowntimeActivity) => Promise<{
    activityRecord: CharacterDowntimeActivity;
    character: Character;
  }>;

  // Validation
  canStartActivity: (
    character: Character,
    activity: DowntimeActivity,
  ) => {
    canStart: boolean;
    reasons: string[];
  };

  // Calculations
  calculateActivityDuration: (character: Character, activity: DowntimeActivity) => number;
  calculateSuccessChance: (character: Character, activity: DowntimeActivity) => number;

  // Complications
  rollForComplication: (activity: DowntimeActivity) => DowntimeComplication | null;
  resolveComplication: (
    character: Character,
    complication: DowntimeComplication,
  ) => {
    success: boolean;
    effect: string;
  };
}

// ===========================
// Common Downtime Activities
// ===========================

export const commonDowntimeActivities: DowntimeActivity[] = [
  {
    id: 'crafting_1',
    name: 'Craft Simple Item',
    type: 'crafting',
    description: 'Create a simple non-magical item using appropriate tools.',
    daysRequired: 1,
    goldCost: 5,
    toolRequirements: ["Artisan's tools"],
    outcomes: [
      {
        id: 'crafting_success_1',
        description: 'Successfully craft a simple item worth 5 gp.',
        automatic: true,
        goldGained: 5,
      },
    ],
    repeatable: true,
    requiresSupplies: true,
  },
  {
    id: 'training_1',
    name: 'Train Skill',
    type: 'training',
    description: 'Spend time training in a skill with a willing tutor.',
    daysRequired: 10,
    goldCost: 25,
    skillRequirements: ['Any'],
    outcomes: [
      {
        id: 'training_success_1',
        description: 'Gain proficiency in the chosen skill.',
        automatic: true,
        skillProficiencyGained: 'chosen',
      },
    ],
    repeatable: false,
    requiresSupplies: false,
  },
  {
    id: 'research_1',
    name: 'Research Local Legends',
    type: 'research',
    description: 'Spend time in libraries and speaking with locals to uncover lore.',
    daysRequired: 7,
    goldCost: 50,
    outcomes: [
      {
        id: 'research_success_1',
        description: 'Gain valuable information about local legends.',
        minRoll: 1,
        maxRoll: 10,
        experienceGained: 50,
      },
      {
        id: 'research_success_2',
        description: 'Uncover a significant piece of lore.',
        minRoll: 11,
        maxRoll: 20,
        experienceGained: 100,
        itemGained: 'Scroll of Legend',
      },
    ],
    repeatable: true,
    requiresSupplies: false,
  },
  {
    id: 'working_1',
    name: 'Work',
    type: 'working',
    description: 'Perform mundane work to earn money.',
    daysRequired: 1,
    outcomes: [
      {
        id: 'work_success_1',
        description: 'Earn money through honest work.',
        automatic: true,
        goldGained: 2,
      },
    ],
    repeatable: true,
    requiresSupplies: false,
  },
  {
    id: 'relaxation_1',
    name: 'Rest and Relax',
    type: 'relaxation',
    description: 'Take time to rest and recover from your adventures.',
    daysRequired: 7,
    outcomes: [
      {
        id: 'relaxation_success_1',
        description: 'Recover from stress and minor injuries.',
        automatic: true,
      },
    ],
    repeatable: true,
    requiresSupplies: false,
  },
];

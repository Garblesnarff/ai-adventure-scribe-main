/**
 * Mass Combat Types for D&D 5e
 *
 * Data models for handling mass combat between armies and groups
 */

export type ArmyType =
  | 'infantry'
  | 'cavalry'
  | 'archers'
  | 'siege_engines'
  | 'magical_units'
  | 'monsters'
  | 'levies'
  | 'elite_troops';

export type TerrainType =
  | 'open_field'
  | 'forest'
  | 'hills'
  | 'mountains'
  | 'swamp'
  | 'urban'
  | 'underground'
  | 'coastal'
  | 'desert';

export type WeatherCondition = 'clear' | 'rain' | 'snow' | 'fog' | 'wind' | 'storm';

export interface ArmyUnit {
  id: string;
  name: string;
  type: ArmyType;
  size: number; // Number of soldiers/troops
  hitPoints: number; // HP per unit
  armorClass: number;
  speed: number;
  attacks: ArmyAttack[];
  damageThreshold: number; // HP at which unit becomes weakened
  morale: number; // Affects combat effectiveness
  commander?: string; // Name of commanding officer
  description?: string;
}

export interface ArmyAttack {
  name: string;
  attackBonus: number;
  damage: string; // Dice notation (e.g., "2d6+3")
  damageType: string;
  range: number;
  targetsMultiple: boolean; // Can attack multiple units
  specialProperties?: string[]; // Special effects
}

export interface Army {
  id: string;
  name: string;
  faction: string;
  commander: string;
  units: ArmyUnit[];
  supplies: number; // Resource points for maintaining army
  position: { x: number; y: number }; // Position on battlefield
  facing?: string; // Direction army is facing
  status: 'active' | 'routing' | 'destroyed' | 'withdrawn';
  notes?: string;
}

export interface Battlefield {
  id: string;
  name: string;
  dimensions: { width: number; height: number };
  terrain: TerrainType;
  weather: WeatherCondition;
  armies: Army[];
  obstacles?: BattlefieldObstacle[];
  controlZones?: ControlZone[];
}

export interface BattlefieldObstacle {
  id: string;
  name: string;
  type: 'natural' | 'constructed' | 'magical';
  position: { x: number; y: number };
  size: { width: number; height: number };
  effect: string; // Description of how obstacle affects combat
}

export interface ControlZone {
  id: string;
  name: string;
  controllingArmyId: string;
  position: { x: number; y: number };
  radius: number;
  strategicValue: number; // Points awarded for controlling this zone
}

export interface CombatRound {
  roundNumber: number;
  events: CombatEvent[];
  armyStatus: ArmyStatus[];
}

export interface CombatEvent {
  id: string;
  type: 'attack' | 'movement' | 'morale_check' | 'special_ability' | 'casualties';
  description: string;
  affectedArmies: string[]; // Army IDs
  outcome?: string;
  casualties?: CasualtyReport[];
}

export interface CasualtyReport {
  armyId: string;
  unitType: ArmyType;
  initialCount: number;
  losses: number;
  survivors: number;
}

export interface ArmyStatus {
  armyId: string;
  morale: number;
  supplies: number;
  position: { x: number; y: number };
  status: 'active' | 'routing' | 'destroyed' | 'withdrawn';
}

export interface MassCombatResult {
  victor: string | null; // Army ID or null for draw
  survivingArmies: Army[];
  casualtyReports: CasualtyReport[];
  battleLog: CombatRound[];
  strategicPoints: number; // Points awarded to victor
  loot?: string[]; // Items/resources gained
}

export interface TacticalManeuver {
  id: string;
  name: string;
  description: string;
  requiredCommanderLevel: number;
  effect: string; // Description of tactical effect
  cooldownRounds: number; // How many rounds before maneuver can be used again
}

export interface ArmyCommander {
  id: string;
  name: string;
  level: number;
  class: string;
  abilities: CommanderAbility[];
  currentManeuvers: string[]; // IDs of available maneuvers
}

export interface CommanderAbility {
  id: string;
  name: string;
  description: string;
  effect: string; // How ability affects battle
  type: 'tactical' | 'strategic' | 'inspiring' | 'logistical';
}

// Common army units for quick reference
export const commonArmyUnits: ArmyUnit[] = [
  {
    id: 'infantry_1',
    name: 'Light Infantry',
    type: 'infantry',
    size: 100,
    hitPoints: 10,
    armorClass: 14,
    speed: 30,
    attacks: [
      {
        name: 'Spear',
        attackBonus: 4,
        damage: '1d6+2',
        damageType: 'piercing',
        range: 10,
        targetsMultiple: false,
      },
    ],
    damageThreshold: 5,
    morale: 10,
  },
  {
    id: 'cavalry_1',
    name: 'Heavy Cavalry',
    type: 'cavalry',
    size: 50,
    hitPoints: 20,
    armorClass: 18,
    speed: 60,
    attacks: [
      {
        name: 'Lance',
        attackBonus: 6,
        damage: '1d12+4',
        damageType: 'piercing',
        range: 10,
        targetsMultiple: false,
      },
    ],
    damageThreshold: 10,
    morale: 12,
  },
  {
    id: 'archers_1',
    name: 'Longbow Archers',
    type: 'archers',
    size: 80,
    hitPoints: 8,
    armorClass: 12,
    speed: 30,
    attacks: [
      {
        name: 'Longbow',
        attackBonus: 5,
        damage: '1d8+2',
        damageType: 'piercing',
        range: 150,
        targetsMultiple: true,
      },
    ],
    damageThreshold: 4,
    morale: 8,
  },
  {
    id: 'siege_1',
    name: 'Ballista',
    type: 'siege_engines',
    size: 5,
    hitPoints: 50,
    armorClass: 15,
    speed: 0,
    attacks: [
      {
        name: 'Ballista Bolt',
        attackBonus: 8,
        damage: '3d8',
        damageType: 'piercing',
        range: 120,
        targetsMultiple: false,
        specialProperties: ['Siege weapon'],
      },
    ],
    damageThreshold: 25,
    morale: 5,
  },
];

// Common battlefields
export const commonBattlefields: Battlefield[] = [
  {
    id: 'plains_1',
    name: 'Open Plains',
    dimensions: { width: 1000, height: 1000 },
    terrain: 'open_field',
    weather: 'clear',
    armies: [],
    obstacles: [
      {
        id: 'hill_1',
        name: 'Small Hill',
        type: 'natural',
        position: { x: 500, y: 500 },
        size: { width: 100, height: 100 },
        effect: 'Provides advantage to ranged attacks for units on hill',
      },
    ],
  },
  {
    id: 'forest_1',
    name: 'Dense Forest',
    dimensions: { width: 800, height: 800 },
    terrain: 'forest',
    weather: 'fog',
    armies: [],
    obstacles: [
      {
        id: 'trees_1',
        name: 'Dense Trees',
        type: 'natural',
        position: { x: 400, y: 400 },
        size: { width: 300, height: 300 },
        effect: 'Provides half cover to units, reduces movement speed by half',
      },
    ],
  },
];

// Common tactical maneuvers
export const commonTacticalManeuvers: TacticalManeuver[] = [
  {
    id: 'flank_1',
    name: 'Flanking Maneuver',
    description: 'Position forces to attack from the side or rear',
    requiredCommanderLevel: 5,
    effect: 'Grants advantage on attack rolls for one round',
    cooldownRounds: 3,
  },
  {
    id: 'charge_1',
    name: 'Cavalry Charge',
    description: 'Lead mounted units in a devastating charge',
    requiredCommanderLevel: 3,
    effect: 'Doubles damage for cavalry units on next attack',
    cooldownRounds: 2,
  },
  {
    id: 'rally_1',
    name: 'Rally the Troops',
    description: 'Boost morale of nearby units',
    requiredCommanderLevel: 4,
    effect: 'Restores 2 morale points to all friendly units within 100 feet',
    cooldownRounds: 4,
  },
];

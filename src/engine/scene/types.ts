// src/engine/scene/types.ts
export type UUID = string;

export type Skill =
  | 'athletics' | 'acrobatics' | 'sleight_of_hand' | 'stealth'
  | 'arcana' | 'history' | 'investigation' | 'nature' | 'religion'
  | 'animal_handling' | 'insight' | 'medicine' | 'perception' | 'survival'
  | 'deception' | 'intimidation' | 'performance' | 'persuasion';

export interface GridPos { x: number; y: number; }
export type RangeBand = 'melee' | 'short' | 'medium' | 'long';

export type PlayerIntent =
  | { type: 'move'; actorId: UUID; to: GridPos | RangeBand; idempotencyKey: string }
  | { type: 'attack'; actorId: UUID; targetId: UUID; weaponId?: UUID; idempotencyKey: string }
  | { type: 'skill_check'; actorId: UUID; skill: Skill; approach?: string; idempotencyKey: string }
  | { type: 'cast'; actorId: UUID; spellId: string; slot?: number; idempotencyKey: string }
  | { type: 'ooc'; actorId: UUID; message: string; idempotencyKey: string };

export type DMAction =
  | { type: 'call_for_check'; actorId: UUID; skill: Skill; dc: number; reason: string }
  | { type: 'apply_damage'; targetId: UUID; amount: number; source: string }
  | { type: 'advance_clock'; clockId: UUID; ticks: number; reason: string }
  | { type: 'narrate'; text: string }
  | { type: 'pause_scene'; reason?: string }
  | { type: 'resume_scene' }
  | { type: 'veil_content'; topic: string; reason?: string };

export type RulesEvent =
  | { type: 'roll'; actorId: UUID; rollType: 'check' | 'save' | 'attack' | 'damage'; d: number; mod: number; result: number; rationale?: string }
  | { type: 'turn_start'; actorId: UUID }
  | { type: 'turn_end'; actorId: UUID }
  | { type: 'reaction_window'; forActorId: UUID; reason: string };

export interface Clock { id: UUID; name: string; max: number; value: number; }
export interface Hazard { id: UUID; name: string; description: string; }

export interface SceneState {
  id: UUID;
  locationId: UUID;
  time: string; // ISO
  participants: UUID[]; // PC + NPC ids
  initiative: UUID[]; // current ordering
  turnIndex: number;
  clocks: Clock[];
  hazards: Hazard[];
  seed: string; // per-scene RNG seed
  paused: boolean; // safety flag
  metadata?: {
    [key: string]: unknown;
    lastMove?: PlayerIntent;
    moveCount?: number;
    lastAttack?: PlayerIntent;
    attackCount?: number;
    lastSkillCheck?: PlayerIntent;
    skillCheckCount?: number;
  };
  lastSafetyEvent?: {
    kind: 'x' | 'veil' | 'pause' | 'ooc';
    at: number;
    data?: string;
  };
}

export interface EventLogEntry {
  id: UUID;
  sceneId: UUID;
  at: number;
  actorId?: UUID;
  action: PlayerIntent | DMAction | RulesEvent;
  stateHashBefore: string;
  stateHashAfter: string;
}

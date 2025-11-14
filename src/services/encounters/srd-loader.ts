import { defaultMonsters } from './monster-catalog';

import type { MonsterDef } from '@/types/encounters';

import monstersJson from '@/data/srd/monsters.json';

let monsterData: MonsterDef[] | null = null;

export function loadMonsters(): MonsterDef[] {
  if (monsterData) return monsterData;
  try {
    const parsed = monstersJson as unknown as MonsterDef[];
    if (Array.isArray(parsed) && parsed.length) {
      monsterData = parsed;
      return monsterData;
    }
  } catch {
    // fall through to default
  }
  return defaultMonsters;
}

export function setMonsterData(data: MonsterDef[]) {
  monsterData = data;
}

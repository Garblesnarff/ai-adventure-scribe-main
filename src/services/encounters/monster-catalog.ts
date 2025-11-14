import type { MonsterDef } from '@/types/encounters';

// Minimal default catalog; replace with SRD JSON loader later
export const defaultMonsters: MonsterDef[] = [
  { id: 'srd:goblin', name: 'Goblin', cr: 0.25, xp: 50, tags: ['forest', 'caves'] },
  { id: 'srd:wolf', name: 'Wolf', cr: 0.25, xp: 50, tags: ['forest', 'plains'] },
  { id: 'srd:orc', name: 'Orc', cr: 0.5, xp: 100, tags: ['hills', 'forest'] },
  { id: 'srd:bandit', name: 'Bandit', cr: 0.125, xp: 25, tags: ['road'] },
];

// Example usage of Cairn RPG Rules Engine

import { resolveAction } from './rules-engine.js';
import type {
  CairnActor,
  CairnEncounter,
  CairnRulesActionRequest,
  CairnAttackContext,
  CairnSaveContext,
} from './state.js';

// Example: Create a Cairn character
const exampleWarrior: CairnActor = {
  id: 'warrior-1',
  name: 'Bjorn the Bold',
  background: 'Warrior',
  size: 'medium',
  abilities: {
    str: 14,
    dex: 12,
    wil: 10,
  },
  maxHp: 6,
  currentHp: 6,
  armor: {
    name: 'Brigandine',
    value: 2,
    slots: 2,
  },
  maxInventorySlots: 10,
  inventory: [
    {
      name: 'Brigandine',
      slots: 2,
      type: 'armor',
      details: { name: 'Brigandine', value: 2, slots: 2 },
    },
    {
      name: 'Longsword',
      slots: 1,
      type: 'weapon',
      details: { name: 'Longsword', damageDice: '1d8', damageType: 'slashing', slots: 1, hands: 1 },
    },
  ],
};

const exampleGoblin: CairnActor = {
  id: 'goblin-1',
  name: 'Sneaky Goblin',
  background: 'Goblin',
  size: 'small',
  abilities: {
    str: 8,
    dex: 14,
    wil: 6,
  },
  maxHp: 3,
  currentHp: 3,
  armor: {
    name: 'Leather',
    value: 1,
    slots: 1,
  },
  maxInventorySlots: 8,
  inventory: [
    {
      name: 'Leather Armor',
      slots: 1,
      type: 'armor',
    },
    {
      name: 'Dagger',
      slots: 1,
      type: 'weapon',
      details: { name: 'Dagger', damageDice: '1d6', damageType: 'piercing', slots: 1, hands: 1 },
    },
  ],
};

const encounter: CairnEncounter = {
  id: 'test-encounter',
  round: 1,
};

// Example 1: STR Save
const saveRequest: CairnRulesActionRequest = {
  seed: 'test-save-123',
  encounter,
  actors: { [exampleWarrior.id]: exampleWarrior },
  actorId: exampleWarrior.id,
  action: 'save',
  payload: {
    ability: 'str',
    advantage: false,
    disadvantage: false,
  } as CairnSaveContext,
};

console.log('=== STR Save Example ===');
const saveResult = resolveAction(saveRequest);
console.log(saveResult);

// Example 2: Attack
const attackRequest: CairnRulesActionRequest = {
  seed: 'test-attack-456',
  encounter,
  actors: {
    [exampleWarrior.id]: exampleWarrior,
    [exampleGoblin.id]: exampleGoblin,
  },
  actorId: exampleWarrior.id,
  targetId: exampleGoblin.id,
  action: 'attack',
  payload: {
    weapon: {
      name: 'Longsword',
      damageDice: '1d8',
      damageType: 'slashing',
      slots: 1,
      hands: 1,
    },
    targetArmor: exampleGoblin.armor,
    impaired: false,
    enhanced: false,
  } as CairnAttackContext,
};

console.log('\n=== Attack Example ===');
const attackResult = resolveAction(attackRequest);
console.log(attackResult);

// Example 3: Initiative
const initiativeRequest: CairnRulesActionRequest = {
  seed: 'test-initiative-789',
  encounter,
  actors: {
    [exampleWarrior.id]: exampleWarrior,
    [exampleGoblin.id]: exampleGoblin,
  },
  action: 'initiative',
};

console.log('\n=== Initiative Example ===');
const initiativeResult = resolveAction(initiativeRequest);
console.log(initiativeResult);

// Example 4: Rest
const restRequest: CairnRulesActionRequest = {
  seed: 'test-rest-101',
  encounter,
  actors: { [exampleWarrior.id]: { ...exampleWarrior, currentHp: 2 } },
  actorId: exampleWarrior.id,
  action: 'rest',
  payload: { rest: 'short' },
};

console.log('\n=== Short Rest Example ===');
const restResult = resolveAction(restRequest);
console.log(restResult);

// Example 5: Critical Damage
const critRequest: CairnRulesActionRequest = {
  seed: 'test-crit-202',
  encounter,
  actors: { [exampleWarrior.id]: exampleWarrior },
  actorId: exampleWarrior.id,
  action: 'criticalDamage',
  payload: { excessDamage: 3 },
};

console.log('\n=== Critical Damage Example ===');
const critResult = resolveAction(critRequest);
console.log(critResult);

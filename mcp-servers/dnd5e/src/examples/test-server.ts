/**
 * Simple test script to verify the MCP server's tools work correctly
 * This can be run to test the rules engine without connecting to an MCP client
 */

import * as rulesAdapter from '../rules-adapter.js';
import * as dataProvider from '../data-provider.js';
import { Actor, Weapon } from '../types.js';

console.log('=== D&D 5E MCP Server Test ===\n');

// Create test actors
const fighter: Actor = {
  id: 'fighter1',
  name: 'Gregor the Bold',
  class: 'fighter',
  level: 5,
  size: 'medium',
  abilities: {
    str: 16,
    dex: 14,
    con: 14,
    int: 10,
    wis: 12,
    cha: 8,
  },
  proficiencyBonus: 3,
  ac: { base: 18 },
  maxHp: 44,
  currentHp: 44,
  speed: 30,
};

const orc: Actor = {
  id: 'orc1',
  name: 'Orc Warrior',
  level: 2,
  size: 'medium',
  abilities: {
    str: 16,
    dex: 12,
    con: 16,
    int: 7,
    wis: 11,
    cha: 10,
  },
  ac: { base: 13 },
  maxHp: 15,
  currentHp: 15,
  speed: 30,
};

const longsword: Weapon = {
  name: 'Longsword',
  ability: 'str',
  proficient: true,
  damageDice: '1d8',
  damageType: 'slashing',
};

// Test 1: Attack Roll
console.log('--- Test 1: Attack Roll ---');
const attackResult = rulesAdapter.resolveAttack({
  attacker: fighter,
  defender: orc,
  weapon: longsword,
  advantage: false,
  disadvantage: false,
});

console.log(`${fighter.name} attacks ${orc.name} with ${longsword.name}`);
console.log(`Roll: ${attackResult.roll} + modifiers = ${attackResult.total} vs AC ${attackResult.targetAC}`);
console.log(`Result: ${attackResult.hit ? 'HIT' : 'MISS'}${attackResult.critical ? ' (CRITICAL!)' : ''}`);
if (attackResult.damage) {
  console.log(`Damage: ${attackResult.damage.total} ${attackResult.damage.type}`);
}
console.log();

// Test 2: Saving Throw
console.log('--- Test 2: Saving Throw ---');
const saveResult = rulesAdapter.resolveSave({
  actor: orc,
  ability: 'dex',
  dc: 15,
  proficient: false,
});

console.log(`${orc.name} makes a Dexterity saving throw (DC ${saveResult.dc})`);
console.log(`Roll: ${saveResult.roll} + modifiers = ${saveResult.total}`);
console.log(`Result: ${saveResult.success ? 'SUCCESS' : 'FAILURE'}`);
console.log();

// Test 3: Ability Check
console.log('--- Test 3: Ability Check ---');
const checkResult = rulesAdapter.resolveAbilityCheck({
  actor: fighter,
  ability: 'str',
  dc: 15,
  proficient: true,
});

console.log(`${fighter.name} makes a Strength check (DC ${checkResult.dc})`);
console.log(`Roll: ${checkResult.roll} + modifiers = ${checkResult.total}`);
console.log(`Result: ${checkResult.success ? 'SUCCESS' : 'FAILURE'}`);
console.log();

// Test 4: Initiative
console.log('--- Test 4: Initiative ---');
const wizard: Actor = {
  id: 'wizard1',
  name: 'Elara the Wise',
  class: 'wizard',
  level: 5,
  size: 'medium',
  abilities: {
    str: 8,
    dex: 16,
    con: 12,
    int: 18,
    wis: 14,
    cha: 10,
  },
  ac: { base: 13 },
  maxHp: 27,
  currentHp: 27,
  speed: 30,
};

const initiativeResults = rulesAdapter.resolveInitiative([fighter, orc, wizard]);
console.log('Initiative order:');
initiativeResults.forEach((result, index) => {
  console.log(`${index + 1}. ${result.name}: ${result.value}`);
});
console.log();

// Test 5: Death Save
console.log('--- Test 5: Death Saving Throw ---');
const deathSaveResult = rulesAdapter.resolveDeathSave();
console.log(`Death save roll: ${deathSaveResult.roll}`);
console.log(`Result: ${deathSaveResult.success ? 'SUCCESS' : 'FAILURE'}${deathSaveResult.critical ? ' (CRITICAL!)' : ''}`);
console.log();

// Test 6: Damage Calculation with Resistance
console.log('--- Test 6: Damage with Resistance ---');
const fireResistantOrc: Actor = {
  ...orc,
  resistances: {
    resistant: ['fire'],
  },
};

const damageResult = rulesAdapter.calculateDamage({
  damage: 20,
  damageType: 'fire',
  target: fireResistantOrc,
});

console.log(`${orc.name} takes ${damageResult.original} fire damage`);
console.log(`Resistance: ${damageResult.modifier}`);
console.log(`Final damage: ${damageResult.final}`);
console.log();

// Test 7: Resources - Get Classes
console.log('--- Test 7: Get Classes ---');
const classes = dataProvider.getAllClasses();
console.log(`Available classes (${classes.length}):`);
classes.forEach(cls => {
  console.log(`- ${cls.name} (${cls.hitDie})`);
});
console.log();

// Test 8: Resources - Get Spell
console.log('--- Test 8: Get Spell ---');
const magicMissile = dataProvider.getSpell('Magic Missile');
if (magicMissile) {
  console.log(`Spell: ${magicMissile.name}`);
  console.log(`Level: ${magicMissile.level}`);
  console.log(`School: ${magicMissile.school}`);
  console.log(`Description: ${magicMissile.description}`);
}
console.log();

// Test 9: Resources - Get Conditions
console.log('--- Test 9: Get Conditions ---');
const conditions = dataProvider.getAllConditions();
console.log(`Status conditions (${conditions.length}):`);
conditions.forEach(condition => {
  console.log(`- ${condition.name}: ${condition.description}`);
});
console.log();

console.log('=== All Tests Complete ===');

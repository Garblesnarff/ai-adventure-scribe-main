import 'dotenv/config';
import { supabaseService } from '../lib/supabase.js';

/**
 * Comprehensive D&D 5E Bard Spell Data Migration using Supabase
 *
 * This script populates the database with:
 * 1. All Bard cantrips (level 0 spells)
 * 2. All Bard 1st level spells
 * 3. Bard class configuration
 * 4. Class-spell relationships
 * 5. Spell progression data
 *
 * Based on official D&D 5E SRD spell lists
 */

// D&D 5E Bard Class Configuration
const bardClass = {
  name: 'Bard',
  hit_die: 8,
  spellcasting_ability: 'CHA',
  caster_type: 'full',
  spell_slots_start_level: 1,
  ritual_casting: true,
  spellcasting_focus_type: 'arcane'
};

// Complete Bard Cantrips (Level 0 Spells)
const bardCantrips = [
  {
    name: 'Blade Ward',
    level: 0,
    school: 'Abjuration',
    casting_time: '1 action',
    range_text: 'Self',
    duration: '1 round',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: false,
    description: 'You extend your hand and trace a sigil of warding in the air. Until the end of your next turn, you have resistance against bludgeoning, piercing, and slashing damage dealt by weapon attacks.'
  },
  {
    name: 'Friends',
    level: 0,
    school: 'Enchantment',
    casting_time: '1 action',
    range_text: 'Self',
    duration: 'Concentration, up to 1 minute',
    concentration: true,
    ritual: false,
    components_verbal: false,
    components_somatic: true,
    components_material: true,
    material_components: 'a small amount of makeup applied to the face as this spell is cast',
    description: 'For the duration, you have advantage on all Charisma checks directed at one creature of your choice that isn\'t hostile toward you. When the spell ends, the creature realizes that you used magic to influence its mood and becomes hostile toward you.'
  },
  {
    name: 'Mage Hand',
    level: 0,
    school: 'Conjuration',
    casting_time: '1 action',
    range_text: '30 feet',
    duration: 'Concentration, up to 1 minute',
    concentration: true,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: false,
    description: 'A spectral, floating hand appears at a point you choose within range. The hand lasts for the duration or until you dismiss it as an action. The hand vanishes if it is ever more than 30 feet away from you or if you cast this spell again.'
  },
  {
    name: 'Mending',
    level: 0,
    school: 'Transmutation',
    casting_time: '1 minute',
    range_text: 'Touch',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: true,
    material_components: 'two lodestones',
    description: 'This spell repairs a single break or tear in an object you touch, such as a broken chain link, two halves of a broken key, a torn cloak, or a leaking wineskin. As long as the break or tear is no larger than 1 foot in any dimension, you mend it, leaving no trace of the former damage.'
  },
  {
    name: 'Message',
    level: 0,
    school: 'Transmutation',
    casting_time: '1 action',
    range_text: '120 feet',
    duration: '1 round',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: true,
    material_components: 'a short piece of copper wire',
    description: 'You point your finger toward a creature within range and whisper a message. The target (and only the target) hears the message and can reply in a whisper that only you can hear.'
  },
  {
    name: 'Minor Illusion',
    level: 0,
    school: 'Illusion',
    casting_time: '1 action',
    range_text: '30 feet',
    duration: '1 minute',
    concentration: false,
    ritual: false,
    components_verbal: false,
    components_somatic: true,
    components_material: true,
    material_components: 'a bit of fleece',
    description: 'You create a sound or an image of an object within range that lasts for the duration. The illusion also ends if you dismiss it as an action or cast this spell again. If you create a sound, its volume can range from a whisper to a scream. If you create an image of an object, it must be no larger than a 5-foot cube. The image can\'t create sound, light, smell, or any other sensory effect. Physical interaction with the image reveals it to be an illusion.'
  },
  {
    name: 'Prestidigitation',
    level: 0,
    school: 'Transmutation',
    casting_time: '1 action',
    range_text: '10 feet',
    duration: 'Up to 1 hour',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: false,
    description: 'This spell is a minor magical trick that novice spellcasters use for practice. You create one of several minor effects within range: light or snuff a small flame, clean or soil an object, chill/warm/flavor food, make a color/mark/symbol appear on an object for 1 hour, or create a trinket or illusion that fits in your hand for 6 seconds.'
  },
  {
    name: 'True Strike',
    level: 0,
    school: 'Divination',
    casting_time: '1 action',
    range_text: '30 feet',
    duration: 'Concentration, up to 1 round',
    concentration: true,
    ritual: false,
    components_verbal: false,
    components_somatic: true,
    components_material: false,
    description: 'You extend your hand and point a finger at a target in range. Your magic grants you a brief insight into the target\'s defenses. On your next turn, you gain advantage on your first attack roll against the target, provided that this spell hasn\'t ended.'
  },
  {
    name: 'Vicious Mockery',
    level: 0,
    school: 'Enchantment',
    casting_time: '1 action',
    range_text: '60 feet',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: false,
    components_material: false,
    description: 'You unleash a string of insults laced with subtle enchantments at a creature you can see within range. If the target can hear you (though it need not understand you), it must succeed on a Wisdom saving throw or take 1d4 psychic damage and have disadvantage on the next attack roll it makes before the end of its next turn.',
    damage_at_slot_level: {
      "0": "1d4",
      "5": "2d4",
      "11": "3d4",
      "17": "4d4"
    },
    damage_type: 'psychic'
  }
];

// Complete Bard 1st Level Spells
const bardFirstLevelSpells = [
  {
    name: 'Animal Friendship',
    level: 1,
    school: 'Enchantment',
    casting_time: '1 action',
    range_text: '30 feet',
    duration: '24 hours',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: true,
    material_components: 'a morsel of food',
    description: 'This spell lets you convince a beast that you mean it no harm. Choose a beast that you can see within range. It must see and hear you. If the beast\'s Intelligence is 4 or higher, the spell fails. Otherwise, the beast must succeed on a Wisdom saving throw or be charmed by you for the spell\'s duration.'
  },
  {
    name: 'Bane',
    level: 1,
    school: 'Enchantment',
    casting_time: '1 action',
    range_text: '30 feet',
    duration: 'Concentration, up to 1 minute',
    concentration: true,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: true,
    material_components: 'a drop of blood',
    description: 'Up to three creatures of your choice that you can see within range must make Charisma saving throws. Whenever a target that fails this saving throw makes an attack roll or a saving throw before the spell ends, the target must roll a d4 and subtract the number rolled from the attack roll or saving throw.',
    higher_level_text: 'When you cast this spell using a spell slot of 2nd level or higher, you can target one additional creature for each slot level above 1st.'
  },
  {
    name: 'Charm Person',
    level: 1,
    school: 'Enchantment',
    casting_time: '1 action',
    range_text: '30 feet',
    duration: '1 hour',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: false,
    description: 'You attempt to charm a humanoid you can see within range. It must make a Wisdom saving throw, and does so with advantage if you or your companions are fighting it. If it fails the saving throw, it is charmed by you until the spell ends or until you or your companions do anything harmful to it.',
    higher_level_text: 'When you cast this spell using a spell slot of 2nd level or higher, you can target one additional creature for each slot level above 1st. The creatures must be within 30 feet of each other when you target them.'
  },
  {
    name: 'Comprehend Languages',
    level: 1,
    school: 'Divination',
    casting_time: '1 action',
    range_text: 'Self',
    duration: '1 hour',
    concentration: false,
    ritual: true,
    components_verbal: true,
    components_somatic: true,
    components_material: true,
    material_components: 'a pinch of soot and salt',
    description: 'For the duration, you understand the literal meaning of any spoken language that you hear. You also understand any written language that you see, but you must be touching the surface on which the words are written. It takes about 1 minute to read one page of text.'
  },
  {
    name: 'Cure Wounds',
    level: 1,
    school: 'Evocation',
    casting_time: '1 action',
    range_text: 'Touch',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: false,
    description: 'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs.',
    higher_level_text: 'When you cast this spell using a spell slot of 2nd level or higher, the healing increases by 1d8 for each slot level above 1st.',
    heal_at_slot_level: {
      "1": "1d8 + MOD",
      "2": "2d8 + MOD",
      "3": "3d8 + MOD",
      "4": "4d8 + MOD",
      "5": "5d8 + MOD",
      "6": "6d8 + MOD",
      "7": "7d8 + MOD",
      "8": "8d8 + MOD",
      "9": "9d8 + MOD"
    }
  },
  {
    name: 'Detect Magic',
    level: 1,
    school: 'Divination',
    casting_time: '1 action',
    range_text: 'Self',
    duration: 'Concentration, up to 10 minutes',
    concentration: true,
    ritual: true,
    components_verbal: true,
    components_somatic: true,
    components_material: false,
    description: 'For the duration, you sense the presence of magic within 30 feet of you. If you sense magic in this way, you can use your action to see a faint aura around any visible creature or object in the area that bears magic, and you learn its school of magic, if any.'
  },
  {
    name: 'Disguise Self',
    level: 1,
    school: 'Illusion',
    casting_time: '1 action',
    range_text: 'Self',
    duration: '1 hour',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: false,
    description: 'You make yourself--including your clothing, armor, weapons, and other belongings on your person--look different until the spell ends or until you use your action to dismiss it. You can seem 1 foot shorter or taller and can appear thin, fat, or in between. You can\'t change your body type, so you must adopt a form that has the same basic arrangement of limbs.'
  },
  {
    name: 'Dissonant Whispers',
    level: 1,
    school: 'Enchantment',
    casting_time: '1 action',
    range_text: '60 feet',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: false,
    components_material: false,
    description: 'You whisper a discordant melody that only one creature of your choice within range can hear, wracking it with terrible pain. The target must make a Wisdom saving throw. On a failed save, it takes 3d6 psychic damage and must immediately use its reaction, if available, to move as far as its speed allows away from you.',
    higher_level_text: 'When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d6 for each slot level above 1st.',
    damage_at_slot_level: {
      "1": "3d6",
      "2": "4d6",
      "3": "5d6",
      "4": "6d6",
      "5": "7d6",
      "6": "8d6",
      "7": "9d6",
      "8": "10d6",
      "9": "11d6"
    },
    damage_type: 'psychic'
  },
  {
    name: 'Faerie Fire',
    level: 1,
    school: 'Evocation',
    casting_time: '1 action',
    range_text: '60 feet',
    duration: 'Concentration, up to 1 minute',
    concentration: true,
    ritual: false,
    components_verbal: true,
    components_somatic: false,
    components_material: false,
    description: 'Each object in a 20-foot cube within range is outlined in blue, green, or violet light (your choice). Any creature in the area when the spell is cast is also outlined in light if it fails a Dexterity saving throw. For the duration, objects and affected creatures shed dim light in a 10-foot radius.',
    area_of_effect: {
      "type": "cube",
      "size": 20
    }
  },
  {
    name: 'Feather Fall',
    level: 1,
    school: 'Transmutation',
    casting_time: '1 reaction',
    range_text: '60 feet',
    duration: '1 minute',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: false,
    components_material: true,
    material_components: 'a small feather or piece of down',
    description: 'Choose up to five falling creatures within range. A falling creature\'s rate of descent slows to 60 feet per round until the spell ends. If the creature lands before the spell ends, it takes no falling damage and can land on its feet, and the spell ends for that creature.'
  },
  {
    name: 'Healing Word',
    level: 1,
    school: 'Evocation',
    casting_time: '1 bonus action',
    range_text: '60 feet',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: false,
    components_material: false,
    description: 'A creature of your choice that you can see within range regains hit points equal to 1d4 + your spellcasting ability modifier. This spell has no effect on undead or constructs.',
    higher_level_text: 'When you cast this spell using a spell slot of 2nd level or higher, the healing increases by 1d4 for each slot level above 1st.',
    heal_at_slot_level: {
      "1": "1d4 + MOD",
      "2": "2d4 + MOD",
      "3": "3d4 + MOD",
      "4": "4d4 + MOD",
      "5": "5d4 + MOD",
      "6": "6d4 + MOD",
      "7": "7d4 + MOD",
      "8": "8d4 + MOD",
      "9": "9d4 + MOD"
    }
  },
  {
    name: 'Heroism',
    level: 1,
    school: 'Enchantment',
    casting_time: '1 action',
    range_text: 'Touch',
    duration: 'Concentration, up to 1 minute',
    concentration: true,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: false,
    description: 'A willing creature you touch is imbued with bravery. Until the spell ends, the creature is immune to being frightened and gains temporary hit points equal to your spellcasting ability modifier at the start of each of its turns.',
    higher_level_text: 'When you cast this spell using a spell slot of 2nd level or higher, you can target one additional creature for each slot level above 1st.'
  },
  {
    name: 'Identify',
    level: 1,
    school: 'Divination',
    casting_time: '1 minute',
    range_text: 'Touch',
    duration: 'Instantaneous',
    concentration: false,
    ritual: true,
    components_verbal: true,
    components_somatic: true,
    components_material: true,
    material_components: 'a pearl worth at least 100 gp and an owl feather',
    material_cost_gp: 100,
    description: 'You choose one object that you must touch throughout the casting of the spell. If it is a magic item or some other magic-imbued object, you learn its properties and how to use them, whether it requires attunement to use, and how many charges it has, if any.'
  },
  {
    name: 'Illusory Script',
    level: 1,
    school: 'Illusion',
    casting_time: '1 minute',
    range_text: 'Touch',
    duration: '10 days',
    concentration: false,
    ritual: true,
    components_verbal: false,
    components_somatic: true,
    components_material: true,
    material_components: 'a lead-based ink worth at least 10 gp, which the spell consumes',
    material_cost_gp: 10,
    material_consumed: true,
    description: 'You write on parchment, paper, or some other suitable writing material and imbue it with a potent illusion that lasts for the duration. To you and any creatures you designate when you cast the spell, the writing appears normal, written in your hand, and conveys whatever meaning you intended when you wrote the text.'
  },
  {
    name: 'Longstrider',
    level: 1,
    school: 'Transmutation',
    casting_time: '1 action',
    range_text: 'Touch',
    duration: '1 hour',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: true,
    material_components: 'a pinch of dirt',
    description: 'You touch a creature. The target\'s speed increases by 10 feet until the spell ends.',
    higher_level_text: 'When you cast this spell using a spell slot of 2nd level or higher, you can target one additional creature for each slot level above 1st.'
  },
  {
    name: 'Silent Image',
    level: 1,
    school: 'Illusion',
    casting_time: '1 action',
    range_text: '60 feet',
    duration: 'Concentration, up to 10 minutes',
    concentration: true,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: true,
    material_components: 'a bit of fleece',
    description: 'You create the image of an object, a creature, or some other visible phenomenon that is no larger than a 15-foot cube. The image appears at a spot within range and lasts for the duration. The image is purely visual; it isn\'t accompanied by sound, smell, or other sensory effects.'
  },
  {
    name: 'Sleep',
    level: 1,
    school: 'Enchantment',
    casting_time: '1 action',
    range_text: '90 feet',
    duration: '1 minute',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: true,
    material_components: 'a pinch of fine sand, rose petals, or a cricket',
    description: 'This spell sends creatures into a magical slumber. Roll 5d8; the total is how many hit points of creatures this spell can affect. Creatures within 20 feet of a point you choose within range are affected in ascending order of their current hit points.',
    higher_level_text: 'When you cast this spell using a spell slot of 2nd level or higher, roll an additional 2d8 for each slot level above 1st.',
    area_of_effect: {
      "type": "sphere",
      "size": 20
    }
  },
  {
    name: 'Speak with Animals',
    level: 1,
    school: 'Divination',
    casting_time: '1 action',
    range_text: 'Self',
    duration: '10 minutes',
    concentration: false,
    ritual: true,
    components_verbal: true,
    components_somatic: true,
    components_material: false,
    description: 'You gain the ability to comprehend and verbally communicate with beasts for the duration. The knowledge and awareness of many beasts is limited by their intelligence, but at minimum, beasts can give you information about nearby locations and monsters, including whatever they can perceive or have perceived within the past day.'
  },
  {
    name: 'Tasha\'s Hideous Laughter',
    level: 1,
    school: 'Enchantment',
    casting_time: '1 action',
    range_text: '30 feet',
    duration: 'Concentration, up to 1 minute',
    concentration: true,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: true,
    material_components: 'tiny tarts and a feather that is waved in the air',
    description: 'A creature of your choice that you can see within range perceives everything as hilariously funny and falls into fits of laughter if this spell affects it. The target must succeed on a Wisdom saving throw or fall prone, becoming incapacitated and unable to stand up for the duration.'
  },
  {
    name: 'Thunderwave',
    level: 1,
    school: 'Evocation',
    casting_time: '1 action',
    range_text: 'Self (15-foot cube)',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: false,
    description: 'A wave of thunderous force sweeps out from you. Each creature in a 15-foot cube originating from you must make a Constitution saving throw. On a failed save, a creature takes 2d8 thunder damage and is pushed 10 feet away from you. On a successful save, the creature takes half as much damage and isn\'t pushed.',
    higher_level_text: 'When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d8 for each slot level above 1st.',
    damage_at_slot_level: {
      "1": "2d8",
      "2": "3d8",
      "3": "4d8",
      "4": "5d8",
      "5": "6d8",
      "6": "7d8",
      "7": "8d8",
      "8": "9d8",
      "9": "10d8"
    },
    damage_type: 'thunder',
    area_of_effect: {
      "type": "cube",
      "size": 15
    }
  }
];

// Bard Spell Progression by Level (D&D 5E Rules)
const bardSpellProgression = [
  // Level 1
  { character_level: 1, cantrips_known: 2, spells_known: 4, spell_slots_1: 2 },
  { character_level: 2, cantrips_known: 2, spells_known: 5, spell_slots_1: 3 },
  { character_level: 3, cantrips_known: 2, spells_known: 6, spell_slots_1: 4, spell_slots_2: 2 },
  { character_level: 4, cantrips_known: 3, spells_known: 7, spell_slots_1: 4, spell_slots_2: 3 },
  { character_level: 5, cantrips_known: 3, spells_known: 8, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 2 },
  { character_level: 6, cantrips_known: 3, spells_known: 9, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3 },
  { character_level: 7, cantrips_known: 3, spells_known: 10, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 1 },
  { character_level: 8, cantrips_known: 3, spells_known: 11, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 2 },
  { character_level: 9, cantrips_known: 3, spells_known: 12, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 1 },
  { character_level: 10, cantrips_known: 4, spells_known: 14, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 2 },
  { character_level: 11, cantrips_known: 4, spells_known: 15, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 2, spell_slots_6: 1 },
  { character_level: 12, cantrips_known: 4, spells_known: 15, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 2, spell_slots_6: 1 },
  { character_level: 13, cantrips_known: 4, spells_known: 16, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 2, spell_slots_6: 1, spell_slots_7: 1 },
  { character_level: 14, cantrips_known: 4, spells_known: 18, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 2, spell_slots_6: 1, spell_slots_7: 1 },
  { character_level: 15, cantrips_known: 4, spells_known: 19, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 2, spell_slots_6: 1, spell_slots_7: 1, spell_slots_8: 1 },
  { character_level: 16, cantrips_known: 4, spells_known: 19, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 2, spell_slots_6: 1, spell_slots_7: 1, spell_slots_8: 1 },
  { character_level: 17, cantrips_known: 4, spells_known: 20, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 2, spell_slots_6: 1, spell_slots_7: 1, spell_slots_8: 1, spell_slots_9: 1 },
  { character_level: 18, cantrips_known: 4, spells_known: 22, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 3, spell_slots_6: 1, spell_slots_7: 1, spell_slots_8: 1, spell_slots_9: 1 },
  { character_level: 19, cantrips_known: 4, spells_known: 22, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 3, spell_slots_6: 2, spell_slots_7: 1, spell_slots_8: 1, spell_slots_9: 1 },
  { character_level: 20, cantrips_known: 4, spells_known: 22, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 3, spell_slots_6: 2, spell_slots_7: 2, spell_slots_8: 1, spell_slots_9: 1 }
];

async function run() {
  try {
    console.log('Starting Bard spell migration using Supabase...');

    // 1. Insert Bard class
    console.log('Inserting Bard class...');
    const { data: classData, error: classError } = await supabaseService
      .from('classes')
      .upsert(bardClass, { onConflict: 'name' })
      .select('id')
      .single();

    if (classError) {
      throw new Error(`Failed to insert Bard class: ${classError.message}`);
    }

    const bardClassId = classData.id;
    console.log(`Bard class inserted with ID: ${bardClassId}`);

    // 2. Insert all Bard spells (cantrips + 1st level)
    const allBardSpells = [...bardCantrips, ...bardFirstLevelSpells];
    console.log(`Inserting ${allBardSpells.length} Bard spells...`);

    // Convert spell objects to match database schema
    const spellsToInsert = allBardSpells.map(spell => ({
      name: spell.name,
      level: spell.level,
      school: spell.school,
      casting_time: spell.casting_time,
      range_text: spell.range_text,
      duration: spell.duration,
      concentration: spell.concentration,
      ritual: spell.ritual,
      components_verbal: spell.components_verbal,
      components_somatic: spell.components_somatic,
      components_material: spell.components_material,
      material_components: spell.material_components || null,
      material_cost_gp: (spell as any).material_cost_gp || 0,
      material_consumed: (spell as any).material_consumed || false,
      description: spell.description,
      higher_level_text: (spell as any).higher_level_text || null,
      damage_at_slot_level: (spell as any).damage_at_slot_level || null,
      heal_at_slot_level: (spell as any).heal_at_slot_level || null,
      damage_type: (spell as any).damage_type || null,
      area_of_effect: (spell as any).area_of_effect || null
    }));

    const { data: spellData, error: spellError } = await supabaseService
      .from('spells')
      .upsert(spellsToInsert, { onConflict: 'name' })
      .select('id, name');

    if (spellError) {
      throw new Error(`Failed to insert spells: ${spellError.message}`);
    }

    console.log(`Successfully inserted ${spellData.length} spells`);

    // 3. Insert class-spell relationships
    console.log('Creating class-spell relationships...');
    const classSpellRelationships = spellData.map(spell => ({
      class_id: bardClassId,
      spell_id: spell.id,
      spell_level: allBardSpells.find(s => s.name === spell.name)?.level || 0,
      source_feature: 'base'
    }));

    const { error: relationshipError } = await supabaseService
      .from('class_spells')
      .upsert(classSpellRelationships, { onConflict: 'class_id,spell_id,source_feature' });

    if (relationshipError) {
      throw new Error(`Failed to create class-spell relationships: ${relationshipError.message}`);
    }

    // 4. Insert spell progression data
    console.log('Inserting spell progression data...');
    const progressionToInsert = bardSpellProgression.map(progression => ({
      class_id: bardClassId,
      character_level: progression.character_level,
      cantrips_known: progression.cantrips_known,
      spells_known: progression.spells_known,
      spell_slots_1: progression.spell_slots_1 || 0,
      spell_slots_2: progression.spell_slots_2 || 0,
      spell_slots_3: progression.spell_slots_3 || 0,
      spell_slots_4: progression.spell_slots_4 || 0,
      spell_slots_5: progression.spell_slots_5 || 0,
      spell_slots_6: progression.spell_slots_6 || 0,
      spell_slots_7: progression.spell_slots_7 || 0,
      spell_slots_8: progression.spell_slots_8 || 0,
      spell_slots_9: progression.spell_slots_9 || 0
    }));

    const { error: progressionError } = await supabaseService
      .from('spell_progression')
      .upsert(progressionToInsert, { onConflict: 'class_id,character_level' });

    if (progressionError) {
      throw new Error(`Failed to insert spell progression: ${progressionError.message}`);
    }

    console.log('✅ Bard spell migration completed successfully!');
    console.log(`📊 Migration Summary:`);
    console.log(`   • Bard class: ✅ Configured`);
    console.log(`   • Cantrips: ${bardCantrips.length} spells`);
    console.log(`   • 1st Level Spells: ${bardFirstLevelSpells.length} spells`);
    console.log(`   • Total Spells: ${allBardSpells.length} spells`);
    console.log(`   • Spell Progression: 20 levels configured`);
    console.log(`   • Class-Spell Relationships: ${allBardSpells.length} created`);

  } catch (e) {
    console.error('❌ Bard spell migration failed:', e);
    process.exitCode = 1;
  }
}

run();
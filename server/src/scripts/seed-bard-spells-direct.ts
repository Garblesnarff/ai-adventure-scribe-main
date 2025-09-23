import 'dotenv/config';

/**
 * Direct Bard Spell Migration via SQL
 *
 * This script uses direct SQL to populate Bard spells, avoiding TypeScript/import issues.
 * Inserts essential Bard cantrips and 1st level spells for character creation.
 */

// Essential Bard spells data
const bardSpells = [
  // BARD CANTRIPS (Level 0)
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
    damage_type: 'psychic'
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
    description: 'You create a sound or an image of an object within range that lasts for the duration. The illusion also ends if you dismiss it as an action or cast this spell again. If you create a sound, its volume can range from a whisper to a scream. If you create an image of an object, it must be no larger than a 5-foot cube.'
  },
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

  // BARD 1ST LEVEL SPELLS
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
    description: 'You make yourself--including your clothing, armor, weapons, and other belongings on your person--look different until the spell ends or until you use your action to dismiss it. You can seem 1 foot shorter or taller and can appear thin, fat, or in between.'
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
    description: 'Each object in a 20-foot cube within range is outlined in blue, green, or violet light (your choice). Any creature in the area when the spell is cast is also outlined in light if it fails a Dexterity saving throw. For the duration, objects and affected creatures shed dim light in a 10-foot radius.'
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
    higher_level_text: 'When you cast this spell using a spell slot of 2nd level or higher, roll an additional 2d8 for each slot level above 1st.'
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
    damage_type: 'thunder'
  }
];

console.log('🚀 Starting Direct Bard Spell Migration');
console.log('====================================');

// Generate SQL insert statements
function generateSpellInserts() {
  const insertStatements: string[] = [];

  bardSpells.forEach(spell => {
    const values = [
      `'${spell.name.replace(/'/g, "''")}'`, // Escape single quotes
      spell.level,
      `'${spell.school}'`,
      `'${spell.casting_time}'`,
      `'${spell.range_text}'`,
      `'${spell.duration}'`,
      spell.concentration,
      spell.ritual,
      spell.components_verbal,
      spell.components_somatic,
      spell.components_material,
      spell.material_components ? `'${spell.material_components.replace(/'/g, "''")}'` : 'NULL',
      spell.material_cost_gp || 0,
      spell.material_consumed || false,
      `'${spell.description.replace(/'/g, "''")}'`,
      spell.higher_level_text ? `'${spell.higher_level_text.replace(/'/g, "''")}'` : 'NULL',
      'NULL', // attack_type
      spell.damage_type ? `'${spell.damage_type}'` : 'NULL',
      'NULL', // damage_at_slot_level (could be added later)
      'NULL', // heal_at_slot_level
      'NULL'  // area_of_effect
    ];

    const sql = `INSERT INTO spells (
      name, level, school, casting_time, range_text, duration, concentration, ritual,
      components_verbal, components_somatic, components_material, material_components,
      material_cost_gp, material_consumed, description, higher_level_text,
      attack_type, damage_type, damage_at_slot_level, heal_at_slot_level, area_of_effect
    ) VALUES (${values.join(', ')})
    ON CONFLICT (name) DO UPDATE SET
      level = EXCLUDED.level,
      school = EXCLUDED.school,
      description = EXCLUDED.description;`;

    insertStatements.push(sql);
  });

  return insertStatements;
}

// Generate class-spell relationship SQL
function generateClassSpellSQL() {
  return `
    -- Link all Bard spells to the Bard class
    WITH bard_class AS (
      SELECT id FROM classes WHERE name = 'Bard'
    ),
    bard_spells AS (
      SELECT id, level FROM spells WHERE name IN (
        ${bardSpells.map(s => `'${s.name.replace(/'/g, "''")}'`).join(', ')}
      )
    )
    INSERT INTO class_spells (class_id, spell_id, spell_level, source_feature)
    SELECT bc.id, bs.id, bs.level, 'base'
    FROM bard_class bc, bard_spells bs
    ON CONFLICT (class_id, spell_id, source_feature) DO NOTHING;
  `;
}

// Generate spell progression SQL
function generateSpellProgressionSQL() {
  const progressionData = [
    [1, 2, 4, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    [2, 2, 5, 3, 0, 0, 0, 0, 0, 0, 0, 0],
    [3, 2, 6, 4, 2, 0, 0, 0, 0, 0, 0, 0],
    [4, 3, 7, 4, 3, 0, 0, 0, 0, 0, 0, 0],
    [5, 3, 8, 4, 3, 2, 0, 0, 0, 0, 0, 0],
    [6, 3, 9, 4, 3, 3, 0, 0, 0, 0, 0, 0],
    [7, 3, 10, 4, 3, 3, 1, 0, 0, 0, 0, 0],
    [8, 3, 11, 4, 3, 3, 2, 0, 0, 0, 0, 0],
    [9, 3, 12, 4, 3, 3, 3, 1, 0, 0, 0, 0],
    [10, 4, 14, 4, 3, 3, 3, 2, 0, 0, 0, 0],
    [11, 4, 15, 4, 3, 3, 3, 2, 1, 0, 0, 0],
    [12, 4, 15, 4, 3, 3, 3, 2, 1, 0, 0, 0],
    [13, 4, 16, 4, 3, 3, 3, 2, 1, 1, 0, 0],
    [14, 4, 18, 4, 3, 3, 3, 2, 1, 1, 0, 0],
    [15, 4, 19, 4, 3, 3, 3, 2, 1, 1, 1, 0],
    [16, 4, 19, 4, 3, 3, 3, 2, 1, 1, 1, 0],
    [17, 4, 20, 4, 3, 3, 3, 2, 1, 1, 1, 1],
    [18, 4, 22, 4, 3, 3, 3, 3, 1, 1, 1, 1],
    [19, 4, 22, 4, 3, 3, 3, 3, 2, 1, 1, 1],
    [20, 4, 22, 4, 3, 3, 3, 3, 2, 2, 1, 1]
  ];

  const values = progressionData.map(row =>
    `((SELECT id FROM classes WHERE name = 'Bard'), ${row.join(', ')})`
  ).join(',\n    ');

  return `
    -- Insert Bard spell progression for levels 1-20
    INSERT INTO spell_progression (
      class_id, character_level, cantrips_known, spells_known,
      spell_slots_1, spell_slots_2, spell_slots_3, spell_slots_4, spell_slots_5,
      spell_slots_6, spell_slots_7, spell_slots_8, spell_slots_9
    ) VALUES
    ${values}
    ON CONFLICT (class_id, character_level) DO UPDATE SET
      cantrips_known = EXCLUDED.cantrips_known,
      spells_known = EXCLUDED.spells_known,
      spell_slots_1 = EXCLUDED.spell_slots_1,
      spell_slots_2 = EXCLUDED.spell_slots_2,
      spell_slots_3 = EXCLUDED.spell_slots_3,
      spell_slots_4 = EXCLUDED.spell_slots_4,
      spell_slots_5 = EXCLUDED.spell_slots_5,
      spell_slots_6 = EXCLUDED.spell_slots_6,
      spell_slots_7 = EXCLUDED.spell_slots_7,
      spell_slots_8 = EXCLUDED.spell_slots_8,
      spell_slots_9 = EXCLUDED.spell_slots_9;
  `;
}

console.log('📝 Generated SQL Statements:');
console.log('');

// 1. Spell inserts
const spellInserts = generateSpellInserts();
console.log(`-- STEP 1: Insert ${bardSpells.length} Bard Spells`);
console.log('-- Copy and run these SQL commands in your database:');
console.log('');
spellInserts.forEach(sql => console.log(sql + '\n'));

// 2. Class-spell relationships
console.log('-- STEP 2: Link Spells to Bard Class');
console.log(generateClassSpellSQL());

// 3. Spell progression
console.log('-- STEP 3: Insert Bard Spell Progression');
console.log(generateSpellProgressionSQL());

console.log('');
console.log('✅ SQL Generation Complete!');
console.log('📊 Summary:');
console.log(`   • Bard Cantrips: ${bardSpells.filter(s => s.level === 0).length} spells`);
console.log(`   • Bard 1st Level: ${bardSpells.filter(s => s.level === 1).length} spells`);
console.log(`   • Total Spells: ${bardSpells.length} spells`);
console.log('   • Spell Progression: 20 levels (1-20)');
console.log('   • Class-Spell Links: All spells linked to Bard');
console.log('');
console.log('🎯 Next Steps:');
console.log('   1. Copy the SQL statements above');
console.log('   2. Run them in your database console');
console.log('   3. Test Bard character creation');
console.log('   4. Verify spell selections show proper options');
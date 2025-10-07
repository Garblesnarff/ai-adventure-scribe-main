// Essential Spells for Character Creation (Cross-Class Cantrips and 1st Level Spells)
export const essentialSpells = [
  // Common Cantrips
  {
    name: 'Light',
    level: 0,
    school: 'Evocation',
    casting_time: '1 action',
    range_text: 'Touch',
    duration: '1 hour',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: false,
    components_material: true,
    material_components: 'a firefly or phosphorescent moss',
    description: 'You touch one object that is no larger than 10 feet in any dimension. Until the spell ends, the object sheds bright light in a 20-foot radius and dim light for an additional 20 feet.'
  },
  {
    name: 'Guidance',
    level: 0,
    school: 'Divination',
    casting_time: '1 action',
    range_text: 'Touch',
    duration: 'Concentration, up to 1 minute',
    concentration: true,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: false,
    description: 'You touch one willing creature. Once before the spell ends, the target can roll a d4 and add the number rolled to one ability check of its choice.'
  },
  {
    name: 'Sacred Flame',
    level: 0,
    school: 'Evocation',
    casting_time: '1 action',
    range_text: '60 feet',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: false,
    description: 'Flame-like radiance descends on a creature that you can see within range. The target must succeed on a Dexterity saving throw or take 1d8 radiant damage.',
    damage_at_slot_level: {
      "0": "1d8",
      "5": "2d8",
      "11": "3d8",
      "17": "4d8"
    },
    damage_type: 'radiant'
  },
  // Essential 1st Level Spells
  {
    name: 'Bless',
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
    material_components: 'a sprinkling of holy water',
    description: 'You bless up to three creatures of your choice within range. Whenever a target makes an attack roll or a saving throw before the spell ends, the target can roll a d4 and add the number rolled to the attack roll or saving throw.',
    higher_level_text: 'When you cast this spell using a spell slot of 2nd level or higher, you can target one additional creature for each slot level above 1st.'
  },
  {
    name: 'Magic Missile',
    level: 1,
    school: 'Evocation',
    casting_time: '1 action',
    range_text: '120 feet',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: false,
    description: 'You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target.',
    higher_level_text: 'When you cast this spell using a spell slot of 2nd level or higher, the spell creates one more dart for each slot level above 1st.',
    damage_at_slot_level: {
      "1": "3 × (1d4 + 1)",
      "2": "4 × (1d4 + 1)",
      "3": "5 × (1d4 + 1)",
      "4": "6 × (1d4 + 1)",
      "5": "7 × (1d4 + 1)",
      "6": "8 × (1d4 + 1)",
      "7": "9 × (1d4 + 1)",
      "8": "10 × (1d4 + 1)",
      "9": "11 × (1d4 + 1)"
    },
    damage_type: 'force'
  }
];

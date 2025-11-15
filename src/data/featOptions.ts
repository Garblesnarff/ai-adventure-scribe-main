import type { AbilityScores } from '@/types/character';

/**
 * Interface defining D&D 5E feats
 */
export interface Feat {
  id: string;
  name: string;
  description: string;
  prerequisites?: string;
  abilityScoreIncrease?: Partial<Record<keyof AbilityScores, number>>;
  benefits: string[];
  category: 'combat' | 'utility' | 'magic' | 'social';
}

/**
 * Core D&D 5E feats available for character selection
 */
export const feats: Feat[] = [
  {
    id: 'alert',
    name: 'Alert',
    description: 'Always on the lookout for danger, you gain the following benefits.',
    benefits: [
      '+5 bonus to initiative',
      "You can't be surprised while conscious",
      "Other creatures don't gain advantage on attack rolls against you as a result of being unseen by you",
    ],
    category: 'utility',
  },
  {
    id: 'athlete',
    name: 'Athlete',
    description: 'You have undergone extensive physical training to gain the following benefits.',
    abilityScoreIncrease: { strength: 1 },
    benefits: [
      'Increase your Strength or Dexterity score by 1, to a maximum of 20',
      'When you are prone, standing up uses only 5 feet of your movement',
      "Climbing doesn't cost you extra movement",
      'You can make a running long jump or a running high jump after moving only 5 feet on foot',
    ],
    category: 'utility',
  },
  {
    id: 'actor',
    name: 'Actor',
    description: 'Skilled at mimicry and dramatics, you gain the following benefits.',
    abilityScoreIncrease: { charisma: 1 },
    benefits: [
      'Increase your Charisma score by 1, to a maximum of 20',
      'You have advantage on Charisma (Deception) and Charisma (Performance) checks when trying to pass yourself off as a different person',
      'You can mimic the speech of another person or the sounds made by other creatures',
    ],
    category: 'social',
  },
  {
    id: 'charger',
    name: 'Charger',
    description:
      'When you use your action to Dash, you can use a bonus action to make one melee weapon attack or to shove a creature.',
    benefits: [
      'When you use your action to Dash, you can use a bonus action to make one melee weapon attack or to shove a creature',
      "If you move at least 10 feet in a straight line immediately before taking this bonus action, you either gain a +5 bonus to the attack's damage roll (if you chose to make a melee attack and hit) or push the target up to 10 feet away from you (if you chose to shove and you succeed)",
    ],
    category: 'combat',
  },
  {
    id: 'crossbow-expert',
    name: 'Crossbow Expert',
    description: 'Thanks to extensive practice with the crossbow, you gain the following benefits.',
    benefits: [
      'You ignore the loading quality of crossbows with which you are proficient',
      "Being within 5 feet of a hostile creature doesn't impose disadvantage on your ranged attack rolls",
      'When you use the Attack action and attack with a one-handed weapon, you can use a bonus action to attack with a hand crossbow you are holding',
    ],
    category: 'combat',
  },
  {
    id: 'defensive-duelist',
    name: 'Defensive Duelist',
    description:
      'When you are wielding a finesse weapon with which you are proficient and another creature hits you with a melee attack, you can use your reaction to add your proficiency bonus to your AC for that attack, potentially causing the attack to miss you.',
    prerequisites: 'Dexterity 13 or higher',
    benefits: [
      'When wielding a finesse weapon and hit by a melee attack, you can use your reaction to add your proficiency bonus to your AC for that attack',
    ],
    category: 'combat',
  },
  {
    id: 'dual-wielder',
    name: 'Dual Wielder',
    description: 'You master fighting with two weapons, gaining the following benefits.',
    benefits: [
      'You gain a +1 bonus to AC while you are wielding a separate melee weapon in each hand',
      "You can use two-weapon fighting even when the one-handed melee weapons you are wielding aren't light",
      'You can draw or stow two one-handed weapons when you would normally be able to draw or stow only one',
    ],
    category: 'combat',
  },
  {
    id: 'dungeon-delver',
    name: 'Dungeon Delver',
    description:
      'Alert to the hidden traps and secret doors found in many dungeons, you gain the following benefits.',
    benefits: [
      'You have advantage on Wisdom (Perception) and Intelligence (Investigation) checks made to detect the presence of secret doors',
      'You have advantage on saving throws made to avoid or resist traps',
      'You have resistance to the damage dealt by traps',
      "Traveling at a fast pace doesn't impose the normal -5 penalty on your passive Wisdom (Perception) score",
    ],
    category: 'utility',
  },
  {
    id: 'durable',
    name: 'Durable',
    description: 'Hardy and resilient, you gain the following benefits.',
    abilityScoreIncrease: { constitution: 1 },
    benefits: [
      'Increase your Constitution score by 1, to a maximum of 20',
      'When you roll a Hit Die to regain hit points, the minimum number you roll is twice your Constitution modifier (minimum of 2)',
    ],
    category: 'utility',
  },
  {
    id: 'elemental-adept',
    name: 'Elemental Adept',
    description:
      'When you gain this feat, choose one of the following damage types: acid, cold, fire, lightning, or thunder.',
    prerequisites: 'The ability to cast at least one spell',
    benefits: [
      'Spells you cast ignore resistance to damage of the chosen type',
      'When you roll damage for a spell you cast that deals damage of that type, you can treat any 1 on a damage die as a 2',
    ],
    category: 'magic',
  },
  {
    id: 'fey-touched',
    name: 'Fey Touched',
    description:
      "Your exposure to the Feywild's magic has changed you, granting you the following benefits.",
    abilityScoreIncrease: { intelligence: 1, wisdom: 1, charisma: 1 },
    benefits: [
      'Increase your Intelligence, Wisdom, or Charisma score by 1, to a maximum of 20',
      'You learn the misty step spell and one 1st-level spell of your choice. The 1st-level spell must be from the divination or enchantment school of magic',
      "You can cast each of these spells without expending a spell slot. Once you cast either spell in this way, you can't do so again until you finish a long rest",
      'You can also cast these spells using spell slots you have of the appropriate level',
    ],
    category: 'magic',
  },
  {
    id: 'great-weapon-master',
    name: 'Great Weapon Master',
    description:
      "You've learned to put the weight of a weapon to your advantage, letting its momentum empower your strikes.",
    benefits: [
      'On your turn, when you score a critical hit with a melee weapon or reduce a creature to 0 hit points with one, you can make one melee weapon attack as a bonus action',
      "Before you make a melee attack with a heavy weapon that you are proficient with, you can choose to take a -5 penalty to the attack roll. If the attack hits, you add +10 to the attack's damage",
    ],
    category: 'combat',
  },
  {
    id: 'healer',
    name: 'Healer',
    description:
      'You are an able physician, allowing you to mend wounds quickly and get your allies back in the fight.',
    benefits: [
      "When you use a healer's kit to stabilize a dying creature, that creature also regains 1 hit point",
      "As an action, you can spend one use of a healer's kit to tend to a creature and restore 1d4 + 4 hit points to it, plus additional hit points equal to the creature's maximum number of Hit Dice",
    ],
    category: 'utility',
  },
  {
    id: 'heavily-armored',
    name: 'Heavily Armored',
    description:
      'You have trained to master the use of heavy armor, gaining the following benefits.',
    prerequisites: 'Proficiency with medium armor',
    abilityScoreIncrease: { strength: 1 },
    benefits: [
      'Increase your Strength score by 1, to a maximum of 20',
      'You gain proficiency with heavy armor',
    ],
    category: 'combat',
  },
  {
    id: 'heavy-armor-master',
    name: 'Heavy Armor Master',
    description: 'You can use your armor to deflect strikes that would kill others.',
    prerequisites: 'Proficiency with heavy armor',
    abilityScoreIncrease: { strength: 1 },
    benefits: [
      'Increase your Strength score by 1, to a maximum of 20',
      'While you are wearing heavy armor, bludgeoning, piercing, and slashing damage that you take from non-magical attacks is reduced by 3',
    ],
    category: 'combat',
  },
  {
    id: 'inspiring-leader',
    name: 'Inspiring Leader',
    description:
      'You can spend 10 minutes inspiring your companions, shoring up their resolve to fight.',
    prerequisites: 'Charisma 13 or higher',
    benefits: [
      'You can spend 10 minutes inspiring your companions, shoring up their resolve to fight',
      'When you do so, choose up to six friendly creatures (which can include yourself) within 30 feet of you who can see or hear you and who can understand you',
      'Each creature can gain temporary hit points equal to your level + your Charisma modifier',
    ],
    category: 'social',
  },
  {
    id: 'keen-mind',
    name: 'Keen Mind',
    description:
      'You have a mind that can track time, direction, and detail with uncanny precision.',
    abilityScoreIncrease: { intelligence: 1 },
    benefits: [
      'Increase your Intelligence score by 1, to a maximum of 20',
      'You always know which way is north',
      'You always know the number of hours left before the next sunrise or sunset',
      'You can accurately recall anything you have seen or heard within the past month',
    ],
    category: 'utility',
  },
  {
    id: 'lucky',
    name: 'Lucky',
    description: 'You have inexplicable luck that seems to kick in at just the right moment.',
    benefits: [
      'You have 3 luck points. Whenever you make an attack roll, an ability check, or a saving throw, you can spend one luck point to roll an additional d20',
      'You can choose to spend one of your luck points after you roll the die, but before the outcome is determined',
      'You choose which of the d20s is used for the attack roll, ability check, or saving throw',
      'You regain your expended luck points when you finish a long rest',
    ],
    category: 'utility',
  },
  {
    id: 'magic-initiate',
    name: 'Magic Initiate',
    description:
      'Choose a class: bard, cleric, druid, sorcerer, warlock, or wizard. You learn magic from that class.',
    benefits: [
      "You learn two cantrips of your choice from that class's spell list",
      'You learn one 1st-level spell of your choice from that same list',
      'You can cast this spell once without expending a spell slot, and you regain the ability to do so when you finish a long rest',
    ],
    category: 'magic',
  },
  {
    id: 'martial-adept',
    name: 'Martial Adept',
    description: 'You have martial training that allows you to perform special combat maneuvers.',
    benefits: [
      'You learn two maneuvers of your choice from among those available to the Battle Master archetype',
      "If a maneuver you use requires your target to make a saving throw to resist the maneuver's effects, the saving throw DC equals 8 + your proficiency bonus + your Strength or Dexterity modifier",
      'You gain one superiority die, which is a d6',
    ],
    category: 'combat',
  },
  {
    id: 'medium-armor-master',
    name: 'Medium Armor Master',
    description: 'You have practiced moving in medium armor to gain the following benefits.',
    prerequisites: 'Proficiency with medium armor',
    benefits: [
      "Wearing medium armor doesn't impose disadvantage on your Dexterity (Stealth) checks",
      'When you wear medium armor, you can add 3, rather than 2, to your AC if you have a Dexterity of 16 or higher',
    ],
    category: 'combat',
  },
  {
    id: 'mobile',
    name: 'Mobile',
    description: 'You are exceptionally speedy and agile.',
    benefits: [
      'Your speed increases by 10 feet',
      "When you use the Dash action, difficult terrain doesn't cost you extra movement on that turn",
      "When you make a melee attack against a creature, you don't provoke opportunity attacks from that creature for the rest of the turn, whether you hit or not",
    ],
    category: 'utility',
  },
  {
    id: 'moderately-armored',
    name: 'Moderately Armored',
    description: 'You have trained to master the use of medium armor and shields.',
    prerequisites: 'Proficiency with light armor',
    abilityScoreIncrease: { strength: 1, dexterity: 1 },
    benefits: [
      'Increase your Strength or Dexterity score by 1, to a maximum of 20',
      'You gain proficiency with medium armor and shields',
    ],
    category: 'combat',
  },
  {
    id: 'observant',
    name: 'Observant',
    description: 'Quick to notice details of your environment, you gain the following benefits.',
    abilityScoreIncrease: { intelligence: 1, wisdom: 1 },
    benefits: [
      'Increase your Intelligence or Wisdom score by 1, to a maximum of 20',
      "If you can see a creature's mouth and know the language, you can interpret what it's saying by reading its lips",
      'You have a +5 bonus to your passive Perception and passive Investigation scores',
    ],
    category: 'utility',
  },
  {
    id: 'polearm-master',
    name: 'Polearm Master',
    description: 'You can keep your enemies at bay with reach weapons.',
    benefits: [
      'When you wield a glaive, halberd, pike, or quarterstaff, you can use a bonus action to make a melee attack with the opposite end of the weapon',
      'While you are wielding a glaive, halberd, pike, or quarterstaff, other creatures provoke an opportunity attack from you when they enter the reach you have with that weapon',
    ],
    category: 'combat',
  },
  {
    id: 'resilient',
    name: 'Resilient',
    description: 'Choose one ability score. You gain the following benefits.',
    abilityScoreIncrease: {
      strength: 1,
      dexterity: 1,
      constitution: 1,
      intelligence: 1,
      wisdom: 1,
      charisma: 1,
    },
    benefits: [
      'Increase the chosen ability score by 1, to a maximum of 20',
      'You gain proficiency in saving throws using the chosen ability',
    ],
    category: 'utility',
  },
  {
    id: 'ritual-caster',
    name: 'Ritual Caster',
    description: 'You have learned a number of spells that you can cast as rituals.',
    prerequisites: 'Intelligence or Wisdom 13 or higher',
    benefits: [
      'Choose one of the following classes: bard, cleric, druid, sorcerer, warlock, or wizard',
      'You acquire a ritual book holding two 1st-level spells of your choice',
      "Choose one of the following classes: bard, cleric, druid, sorcerer, warlock, or wizard. You must choose your spells from that class's spell list, and the spells you choose must have the ritual tag",
    ],
    category: 'magic',
  },
  {
    id: 'savage-attacker',
    name: 'Savage Attacker',
    description:
      "Once per turn when you roll damage for a melee weapon attack, you can reroll the weapon's damage dice and use either total.",
    benefits: [
      "Once per turn when you roll damage for a melee weapon attack, you can reroll the weapon's damage dice and use either total",
    ],
    category: 'combat',
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    description:
      "You have mastered techniques to take advantage of every drop in any enemy's guard.",
    benefits: [
      "When you hit a creature with an opportunity attack, the creature's speed becomes 0 for the rest of the turn",
      'Creatures provoke opportunity attacks from you even if they take the Disengage action before leaving your reach',
      "When a creature within 5 feet of you makes an attack against a target other than you (and that target doesn't have this feat), you can use your reaction to make a melee weapon attack against the attacking creature",
    ],
    category: 'combat',
  },
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'You have mastered ranged weapons and can make shots that others find impossible.',
    benefits: [
      "Attacking at long range doesn't impose disadvantage on your ranged weapon attack rolls",
      'Your ranged weapon attacks ignore half cover and three-quarters cover',
      "Before you make an attack with a ranged weapon that you are proficient with, you can choose to take a -5 penalty to the attack roll. If the attack hits, you add +10 to the attack's damage",
    ],
    category: 'combat',
  },
  {
    id: 'shield-master',
    name: 'Shield Master',
    description: 'You use shields not just for protection but also for offense.',
    benefits: [
      'If you take the Attack action on your turn, you can use a bonus action to try to shove a creature within 5 feet of you with your shield',
      "If you aren't incapacitated, you can add your shield's AC bonus to any Dexterity saving throw you make against a spell or other harmful effect that targets only you",
      'If you are subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you can use your reaction to take no damage if you succeed on the saving throw, interposing your shield between yourself and the source of the effect',
    ],
    category: 'combat',
  },
  {
    id: 'skilled',
    name: 'Skilled',
    description: 'You gain proficiency in any combination of three skills or tools of your choice.',
    benefits: ['You gain proficiency in any combination of three skills or tools of your choice'],
    category: 'utility',
  },
  {
    id: 'skulker',
    name: 'Skulker',
    description: 'You are expert at slinking through shadows.',
    prerequisites: 'Dexterity 13 or higher',
    benefits: [
      'You can try to hide when you are lightly obscured from the creature from which you are hiding',
      "When you are hidden from a creature and miss it with a ranged weapon attack, making the attack doesn't reveal your position",
      "Dim light doesn't impose disadvantage on your Wisdom (Perception) checks relying on sight",
    ],
    category: 'utility',
  },
  {
    id: 'spell-sniper',
    name: 'Spell Sniper',
    description:
      'You have learned techniques to enhance your attacks with certain kinds of spells.',
    prerequisites: 'The ability to cast at least one spell',
    benefits: [
      "When you cast a spell that requires you to make an attack roll, the spell's range is doubled",
      'Your ranged spell attacks ignore half cover and three-quarters cover',
      'You learn one cantrip that requires an attack roll',
    ],
    category: 'magic',
  },
  {
    id: 'tavern-brawler',
    name: 'Tavern Brawler',
    description:
      'Accustomed to rough-and-tumble fighting using whatever weapons happen to be at hand.',
    abilityScoreIncrease: { strength: 1, constitution: 1 },
    benefits: [
      'Increase your Strength or Constitution score by 1, to a maximum of 20',
      'You are proficient with improvised weapons',
      'Your unarmed strike uses a d4 for damage',
      'When you hit a creature with an unarmed strike or an improvised weapon on your turn, you can use a bonus action to attempt to grapple the target',
    ],
    category: 'combat',
  },
  {
    id: 'telekinetic',
    name: 'Telekinetic',
    description: 'You learn to move things with your mind, granting you the following benefits.',
    abilityScoreIncrease: { intelligence: 1, wisdom: 1, charisma: 1 },
    benefits: [
      'Increase your Intelligence, Wisdom, or Charisma score by 1, to a maximum of 20',
      'You learn the mage hand cantrip. You can cast it without verbal or somatic components, and you can make the spectral hand invisible',
      'As a bonus action, you can try to shove one creature within 30 feet of you. When you do so, the target must succeed on a Strength saving throw (DC 8 + your proficiency bonus + the ability modifier of the score increased by this feat) or be moved 5 feet toward you or away from you',
    ],
    category: 'magic',
  },
  {
    id: 'tough',
    name: 'Tough',
    description:
      'Your hit point maximum increases by an amount equal to twice your level when you gain this feat.',
    benefits: [
      'Your hit point maximum increases by an amount equal to twice your level when you gain this feat',
      'Whenever you gain a level thereafter, your hit point maximum increases by an additional 2 hit points',
    ],
    category: 'utility',
  },
  {
    id: 'war-caster',
    name: 'War Caster',
    description: 'You have practiced casting spells in the midst of combat.',
    prerequisites: 'The ability to cast at least one spell',
    benefits: [
      'You have advantage on Constitution saving throws that you make to maintain your concentration on a spell when you take damage',
      'You can perform the somatic components of spells even when you have weapons or a shield in one or both hands',
      "When a hostile creature's movement provokes an opportunity attack from you, you can use your reaction to cast a spell at the creature, rather than making an opportunity attack",
    ],
    category: 'magic',
  },
  {
    id: 'weapon-master',
    name: 'Weapon Master',
    description: 'You have practiced extensively with a variety of weapons.',
    abilityScoreIncrease: { strength: 1, dexterity: 1 },
    benefits: [
      'Increase your Strength or Dexterity score by 1, to a maximum of 20',
      'You gain proficiency with four weapons of your choice. Each one must be a simple or a martial weapon',
    ],
    category: 'combat',
  },
];

/**
 * Get feats by category for easier filtering
 */
export const getFeatsByCategory = (category: Feat['category']): Feat[] => {
  return feats.filter((feat) => feat.category === category);
};

/**
 * Get all available feats
 */
export const getAllFeats = (): Feat[] => {
  return feats;
};

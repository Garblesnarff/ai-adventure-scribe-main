import type { Character } from '@/types/character';

type Maybe<T> = T | null | undefined;

type AbilityScoreRecord = Record<string, number>;

export interface EnhancementSelection {
  optionId: string;
  value: string | string[] | number;
  customValue?: string;
  aiGenerated?: boolean;
}

export interface EnhancementEffects {
  traits?: string[];
  skillBonus?: string[];
  abilityBonus?: Record<string, number>;
  languages?: string[];
  equipment?: string[];
}

export interface CharacterPromptData {
  name?: string | null;
  description?: string | null;
  race?: string | null;
  subrace?: string | null;
  class?: string | null;
  background?: string | null;
  level?: number | null;
  ability_scores?: AbilityScoreRecord | null;
  alignment?: string | null;
  personalityTraits?: string[];
  ideals?: string[];
  bonds?: string[];
  flaws?: string[];
  personality_notes?: string | null;
  enhancementSelections?: EnhancementSelection[];
  enhancementEffects?: EnhancementEffects;
  appearance?: string | null;
  personality_traits?: string | null;
  theme?: string | null;
  height?: number | null;
  weight?: number | null;
  eyes?: string | null;
  skin?: string | null;
  hair?: string | null;
}

export interface DescriptionPromptOptions {
  enhanceExisting?: boolean;
  includeBackstory?: boolean;
  includePersonality?: boolean;
  includeAppearance?: boolean;
  tone?: 'heroic' | 'dark' | 'comedic' | 'serious' | 'mysterious';
}

export interface ImagePromptOptions {
  style: 'portrait' | 'action' | 'full-body' | 'character-sheet' | 'expression-sheet';
  artStyle:
    | 'fantasy-art'
    | 'anime'
    | 'realistic'
    | 'comic-book'
    | 'watercolor'
    | 'sketch'
    | 'oil-painting';
  theme: string;
}

interface ExtractedDetails {
  physicalFeatures: string[];
  equipment: string[];
  distinguishingMarks: string[];
}

const INCH_TO_CM = 2.54;
const POUND_TO_KG = 0.45359237;

const isPositiveNumber = (value: Maybe<number>): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const formatHeightForPrompt = (height: Maybe<number>): string | null => {
  if (!isPositiveNumber(height)) return null;
  const totalInches = Math.round(height);
  const feet = Math.floor(totalInches / 12);
  const remainingInches = totalInches - feet * 12;
  const cm = Math.round(totalInches * INCH_TO_CM);
  const imperial = `${feet}'${remainingInches}"`;
  const metric = `${cm} cm`;
  return `${imperial} (${metric})`;
};

const formatWeightForPrompt = (weight: Maybe<number>): string | null => {
  if (!isPositiveNumber(weight)) return null;
  const lbs = Math.round(weight);
  const kg = Math.round(weight * POUND_TO_KG);
  return `${lbs} lbs (${kg} kg)`;
};

const buildPhysicalTraitLines = (data: CharacterPromptData): string[] => {
  const lines: string[] = [];
  const height = formatHeightForPrompt(data.height);
  const weight = formatWeightForPrompt(data.weight);

  if (height) lines.push(`Height: ${height}`);
  if (weight) lines.push(`Weight: ${weight}`);
  if (data.eyes?.trim()) lines.push(`Eye Color: ${data.eyes.trim()}`);
  if (data.skin?.trim()) lines.push(`Skin Tone: ${data.skin.trim()}`);
  if (data.hair?.trim()) lines.push(`Hair: ${data.hair.trim()}`);
  return lines;
};

const appendPhysicalTraitsDescriptionPrompt = (parts: string[], data: CharacterPromptData) => {
  const lines = buildPhysicalTraitLines(data);
  if (lines.length === 0) return;

  parts.push('\nPhysical Traits (MANDATORY):');
  lines.forEach((line) => parts.push(`- ${line}`));
  parts.push(
    'IMPORTANT: The APPEARANCE section must exactly match these mandatory physical traits, including measurements and colors. Do not invent alternatives.',
  );
};

const appendPhysicalTraitsImagePrompt = (parts: string[], data: CharacterPromptData) => {
  const lines = buildPhysicalTraitLines(data);
  if (lines.length === 0) return;

  parts.push(
    `exact physical traits: ${lines.join('; ')}. strictly follow these measurements and colors without deviation.`,
  );
};

const sanitize = (value: Maybe<string>): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const listFrom = (values: Maybe<string[] | string>): string[] => {
  if (!values) return [];
  if (Array.isArray(values))
    return values
      .filter((item) => typeof item === 'string' && item.trim())
      .map((item) => item.trim());
  return values
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const extractCharacterDetails = (characterData: CharacterPromptData): ExtractedDetails => {
  const details: ExtractedDetails = {
    physicalFeatures: [],
    equipment: [],
    distinguishingMarks: [],
  };

  if (characterData.appearance) {
    const appearance = characterData.appearance.toLowerCase();

    if (appearance.includes('tall')) details.physicalFeatures.push('tall stature');
    if (appearance.includes('short')) details.physicalFeatures.push('short stature');
    if (appearance.includes('muscular')) details.physicalFeatures.push('muscular build');
    if (appearance.includes('lean')) details.physicalFeatures.push('lean build');
    if (appearance.includes('stocky')) details.physicalFeatures.push('stocky build');

    if (appearance.includes('brown hair')) details.physicalFeatures.push('brown hair');
    if (appearance.includes('black hair')) details.physicalFeatures.push('black hair');
    if (appearance.includes('blonde hair')) details.physicalFeatures.push('blonde hair');
    if (appearance.includes('red hair')) details.physicalFeatures.push('red hair');
    if (appearance.includes('white hair')) details.physicalFeatures.push('white hair');
    if (appearance.includes('braid')) details.physicalFeatures.push('braided hair');

    if (appearance.includes('blue eyes')) details.physicalFeatures.push('blue eyes');
    if (appearance.includes('green eyes')) details.physicalFeatures.push('green eyes');
    if (appearance.includes('brown eyes')) details.physicalFeatures.push('brown eyes');
    if (appearance.includes('piercing eyes')) details.physicalFeatures.push('piercing gaze');

    if (appearance.includes('scar')) details.distinguishingMarks.push('battle scars');
    if (appearance.includes('tattoo')) details.distinguishingMarks.push('tattoos');

    if (appearance.includes('leather armor')) details.equipment.push('leather armor');
    if (appearance.includes('plate armor')) details.equipment.push('plate armor');
    if (appearance.includes('chainmail')) details.equipment.push('chainmail');
    if (appearance.includes('surcoat')) details.equipment.push('surcoat');
  }

  const traits = buildPhysicalTraitLines(characterData);
  traits.forEach((trait) => details.physicalFeatures.push(trait.toLowerCase()));

  return details;
};

const getRacePrompt = (race: string): string => {
  const raceMap: Record<string, string> = {
    human: 'human features with varied skin tones and expressive face',
    elf: 'elven features with pointed ears, graceful build, and ethereal beauty',
    dwarf: 'dwarven features with stocky build, beard, and sturdy appearance',
    halfling: 'halfling features with small stature and cheerful expression',
    dragonborn: 'dragonborn features with draconic scales and proud bearing',
    gnome: 'gnomish features with small size and mischievous expression',
    'half-elf': 'half-elf features blending human and elven traits',
    'half-orc': 'half-orc features with tusks and muscular build',
    tiefling: 'tiefling features with horns, tail, and infernal heritage',
    celestialborn: 'celestialborn features with divine radiance',
    elementalborn: 'elementalborn features with elemental manifestations',
    catfolk: 'catfolk features with feline characteristics and agility',
    ravenfolk: 'ravenfolk features with avian characteristics',
    lizardfolk: 'lizardfolk features with reptilian scales',
    tortle: 'tortle features with turtle shell and wise expression',
    'high elf': 'high elven features with pointed ears, refined bearing, and arcane elegance',
    'wood elf':
      'wood elven features with pointed ears, natural grace, and forest-dwelling appearance',
    'dark elf': 'dark elven features with pointed ears, pale or dark skin, and mysterious aura',
    drow: 'drow features with pointed ears, dark skin, white hair, and underground nobility',
    'mountain dwarf':
      'mountain dwarven features with stocky build, thick beard, and hardy mountain appearance',
    'hill dwarf':
      'hill dwarven features with stocky build, well-groomed beard, and pastoral strength',
    'lightfoot halfling':
      'lightfoot halfling features with small stature, nimble build, and wandering spirit',
    'stout halfling':
      'stout halfling features with small but robust build and determined expression',
    'variant human':
      'human features with varied skin tones, expressive face, and adaptable appearance',
    'forest gnome':
      'forest gnomish features with small size, nature-connected appearance, and woodland charm',
    'rock gnome':
      'rock gnomish features with small size, tinker-focused hands, and inventive expression',
    'asmodeus tiefling':
      'tiefling features with prominent horns, forked tail, and regal infernal heritage',
    'zariel tiefling':
      'tiefling features with warrior-like horns, strong tail, and martial infernal bearing',
  };

  return raceMap[race.toLowerCase()] || `${race.toLowerCase()} racial features`;
};

const getClassPrompt = (characterClass: string): string => {
  const classMap: Record<string, string> = {
    barbarian: 'wearing animal pelts and tribal markings',
    bard: 'wearing colorful clothing with artistic accessories',
    cleric: 'wearing religious vestments with holy symbol',
    druid: 'wearing natural materials in earth tones',
    fighter: 'wearing practical armor with martial equipment',
    monk: 'wearing simple robes for martial arts',
    paladin: 'wearing shining armor with holy symbols',
    ranger: 'wearing leather armor with nature camouflage',
    rogue: 'wearing dark clothing with stealth tools',
    sorcerer: 'with innate magic aura and arcane symbols',
    warlock: 'with eldritch energy and occult accessories',
    wizard: 'wearing scholarly robes with spellbook',
    artificer: 'with mechanical gadgets and crafting tools',
    'blood hunter': 'with scarred appearance and hunter gear',
  };

  return classMap[characterClass.toLowerCase()] || `${characterClass.toLowerCase()} class attire`;
};

const getAlignmentPrompt = (alignment: string): string => {
  const alignmentMap: Record<string, string> = {
    'lawful good': 'noble and righteous expression',
    'neutral good': 'kind and compassionate expression',
    'chaotic good': 'free-spirited and good-hearted expression',
    'lawful neutral': 'disciplined and orderly expression',
    'true neutral': 'balanced and pragmatic expression',
    'chaotic neutral': 'unpredictable and wild expression',
    'lawful evil': 'controlled and calculating expression',
    'neutral evil': 'selfish and opportunistic expression',
    'chaotic evil': 'malevolent and destructive expression',
  };

  return alignmentMap[alignment.toLowerCase()] || 'balanced expression';
};

const extractEnhancementVisuals = (enhancementSelections: EnhancementSelection[]): string[] => {
  const visualElements: string[] = [];

  enhancementSelections.forEach((selection) => {
    const value = Array.isArray(selection.value)
      ? selection.value.join(' ')
      : String(selection.value);
    const combined = `${value} ${selection.customValue || ''}`.toLowerCase();

    if (combined.includes('scar')) visualElements.push('distinctive scars');
    if (combined.includes('tattoo')) visualElements.push('meaningful tattoos');
    if (combined.includes('piercing')) visualElements.push('piercings');
    if (combined.includes('jewelry') || combined.includes('ring') || combined.includes('necklace'))
      visualElements.push('distinctive jewelry');
    if (
      combined.includes('weapon') ||
      combined.includes('sword') ||
      combined.includes('axe') ||
      combined.includes('bow')
    )
      visualElements.push('special weapon');
    if (combined.includes('armor') || combined.includes('shield'))
      visualElements.push('unique armor');
    if (combined.includes('cloak') || combined.includes('cape') || combined.includes('robe'))
      visualElements.push('distinctive clothing');
    if (combined.includes('mark') || combined.includes('brand') || combined.includes('symbol'))
      visualElements.push('mystical markings');
    if (combined.includes('aura') || combined.includes('glow') || combined.includes('magic'))
      visualElements.push('magical aura');
    if (combined.includes('eye') || combined.includes('gaze')) visualElements.push('striking eyes');
    if (combined.includes('hair') || combined.includes('beard'))
      visualElements.push('distinctive hair');
    if (combined.includes('posture') || combined.includes('stance'))
      visualElements.push('unique posture');
    if (combined.includes('familiar') || combined.includes('companion') || combined.includes('pet'))
      visualElements.push('animal companion');
  });

  return [...new Set(visualElements)];
};

const extractVisualPersonalityTraits = (personalityText: Maybe<string>): string[] => {
  if (!personalityText) return [];
  const notes = personalityText.toLowerCase();
  const visualTraits: string[] = [];

  if (notes.includes('tourettes') || notes.includes('tics'))
    visualTraits.push('subtle facial tics');
  if (notes.includes('fidgety') || notes.includes('restless')) visualTraits.push('fidgety posture');
  if (notes.includes('anxious') || notes.includes('nervous'))
    visualTraits.push('anxious expression');

  if (notes.includes('confident') || notes.includes('bold')) visualTraits.push('confident stance');
  if (notes.includes('proud') || notes.includes('arrogant')) visualTraits.push('proud bearing');

  if (notes.includes('shy') || notes.includes('timid')) visualTraits.push('shy demeanor');
  if (notes.includes('friendly') || notes.includes('warm')) visualTraits.push('warm expression');

  if (notes.includes('scar')) visualTraits.push('visible scars');
  if (notes.includes('tattoo')) visualTraits.push('tattoos');

  return visualTraits;
};

const extractWeaponsFromClass = (characterClass: string): string[] => {
  const classWeaponsMap: Record<string, string[]> = {
    barbarian: ['greataxe', 'battleaxe'],
    fighter: ['longsword', 'shield'],
    paladin: ['longsword', 'mace', 'shield'],
    ranger: ['longbow', 'shortsword'],
    rogue: ['rapier', 'dagger'],
    bard: ['rapier', 'dagger'],
    cleric: ['mace', 'shield'],
    druid: ['quarterstaff', 'scimitar'],
    monk: ['quarterstaff', 'unarmed strikes'],
    sorcerer: ['light crossbow', 'dagger'],
    warlock: ['light crossbow', 'eldritch blast'],
    wizard: ['quarterstaff', 'dagger'],
    artificer: ['hand crossbow', 'simple weapon'],
    'blood hunter': ['greatsword', 'hand crossbow'],
  };

  const weapons = classWeaponsMap[characterClass.toLowerCase()] || ['appropriate weapons'];
  return weapons;
};

const extractWeaponsFromEnhancements = (
  enhancementSelections: EnhancementSelection[],
): string[] => {
  const weapons: string[] = [];

  enhancementSelections.forEach((selection) => {
    const value = Array.isArray(selection.value)
      ? selection.value.join(' ')
      : String(selection.value);
    const combined = `${value} ${selection.customValue || ''}`.toLowerCase();

    if (combined.includes('sword') || combined.includes('blade')) weapons.push('sword');
    if (combined.includes('axe')) weapons.push('axe');
    if (combined.includes('bow') || combined.includes('arrow')) weapons.push('bow');
    if (combined.includes('dagger') || combined.includes('knife')) weapons.push('dagger');
    if (combined.includes('mace') || combined.includes('hammer')) weapons.push('mace');
    if (combined.includes('staff') || combined.includes('quarterstaff'))
      weapons.push('quarterstaff');
    if (combined.includes('crossbow')) weapons.push('crossbow');
    if (combined.includes('spear') || combined.includes('lance')) weapons.push('spear');
  });

  return [...new Set(weapons)];
};

const summarizeOutfit = (outfitParts: string[]): string => {
  if (outfitParts.length === 0) return '';

  const armorTypes = outfitParts.filter(
    (part) =>
      part.includes('armor') ||
      part.includes('chainmail') ||
      part.includes('plate') ||
      part.includes('leather'),
  );
  const clothingTypes = outfitParts.filter(
    (part) =>
      part.includes('robe') ||
      part.includes('cloak') ||
      part.includes('vestments') ||
      part.includes('clothing'),
  );
  const accessories = outfitParts.filter(
    (part) =>
      part.includes('symbol') ||
      part.includes('focus') ||
      part.includes('instrument') ||
      part.includes('book'),
  );

  const summaryParts: string[] = [];

  if (armorTypes.length > 0) summaryParts.push(armorTypes[0].split(' with ')[0]);
  if (clothingTypes.length > 0) summaryParts.push(clothingTypes[0]);
  if (accessories.length > 0) summaryParts.push(accessories[0]);

  return summaryParts.length > 0 ? `wearing ${summaryParts.join(' and ')}` : '';
};

const summarizeWeapons = (weaponParts: string[]): string => {
  if (weaponParts.length === 0) return '';

  const primaryWeapons = weaponParts.filter(
    (w) => w.includes('sword') || w.includes('axe') || w.includes('staff') || w.includes('bow'),
  );
  const summary =
    primaryWeapons.length > 0
      ? `armed with ${primaryWeapons.join(' and ')}`
      : `armed with ${weaponParts[0]}`;

  return summary;
};

const buildCharacterDescriptionSegment = (
  characterData: CharacterPromptData,
  extracted: ExtractedDetails,
): string => {
  const descParts: string[] = [];

  const raceDescription = characterData.subrace
    ? `${characterData.subrace} ${characterData.race || ''}`.trim()
    : characterData.race;

  if (raceDescription && characterData.class) {
    descParts.push(`${raceDescription} ${characterData.class}`);
  } else if (raceDescription) {
    descParts.push(raceDescription);
  } else if (characterData.class) {
    descParts.push(characterData.class);
  }

  if (extracted.physicalFeatures.length > 0) {
    descParts.push(extracted.physicalFeatures.join(', '));
  }

  const raceForPrompt = characterData.subrace || characterData.race;
  if (raceForPrompt) {
    descParts.push(getRacePrompt(raceForPrompt));
  }

  if (characterData.class) {
    descParts.push(getClassPrompt(characterData.class));
  }

  if (extracted.equipment.length > 0) {
    descParts.push(extracted.equipment.join(', '));
  }

  if (extracted.distinguishingMarks.length > 0) {
    descParts.push(extracted.distinguishingMarks.join(', '));
  }

  if (characterData.enhancementSelections && characterData.enhancementSelections.length > 0) {
    const enhancementVisuals = extractEnhancementVisuals(characterData.enhancementSelections);
    if (enhancementVisuals.length > 0) descParts.push(enhancementVisuals.join(', '));
  }

  if (characterData.enhancementEffects?.equipment?.length) {
    descParts.push(characterData.enhancementEffects.equipment.join(', '));
  }

  if (characterData.alignment) {
    descParts.push(getAlignmentPrompt(characterData.alignment));
  }

  const personalityVisuals = extractVisualPersonalityTraits(
    characterData.personality_notes || characterData.personality_traits,
  );
  if (personalityVisuals.length > 0) {
    descParts.push(personalityVisuals.join(', '));
  }

  return descParts.join(', ');
};

const buildCharacterConcept = (
  characterData: CharacterPromptData,
  extracted: ExtractedDetails,
  theme: string,
): string => {
  const conceptParts: string[] = [];

  if (characterData.race && characterData.class) {
    conceptParts.push(`${characterData.race} ${characterData.class}`);
  } else if (characterData.race) {
    conceptParts.push(characterData.race);
  } else if (characterData.class) {
    conceptParts.push(characterData.class);
  }

  if (characterData.appearance) {
    conceptParts.push(characterData.appearance);
  }

  if (extracted.physicalFeatures.length > 0) {
    conceptParts.push(extracted.physicalFeatures.join(' '));
  }

  const outfitParts: string[] = [];
  if (characterData.class) {
    outfitParts.push(getClassPrompt(characterData.class));
  }
  if (extracted.equipment.length > 0) {
    outfitParts.push(...extracted.equipment);
  }
  if (characterData.enhancementEffects?.equipment?.length) {
    outfitParts.push(...characterData.enhancementEffects.equipment);
  }
  const outfitSummary = summarizeOutfit(outfitParts);
  if (outfitSummary) conceptParts.push(outfitSummary);

  const weaponParts: string[] = [];
  if (characterData.class) {
    weaponParts.push(...extractWeaponsFromClass(characterData.class));
  }
  if (characterData.enhancementSelections?.length) {
    weaponParts.push(...extractWeaponsFromEnhancements(characterData.enhancementSelections));
  }
  const weaponSummary = summarizeWeapons(weaponParts);
  if (weaponSummary) conceptParts.push(weaponSummary);

  const personalityVisuals = extractVisualPersonalityTraits(
    characterData.personality_traits || characterData.personality_notes,
  );
  if (personalityVisuals.length > 0) conceptParts.push(...personalityVisuals);

  if (extracted.distinguishingMarks.length > 0) conceptParts.push(...extracted.distinguishingMarks);

  const fullConcept = conceptParts.join(', ');
  return `${fullConcept}, rendered in ${theme} theme, professional concept art style`;
};

const getArtStylePrompt = (artStyle: ImagePromptOptions['artStyle']): string => {
  const styleMap: Record<ImagePromptOptions['artStyle'], string> = {
    'fantasy-art': 'fantasy art style, detailed digital painting, epic fantasy aesthetic',
    anime: 'anime art style, cel-shaded, Japanese animation style, vibrant colors',
    realistic: 'photorealistic style, highly detailed, lifelike rendering',
    'comic-book': 'comic book art style, bold lines, dynamic shading, superhero aesthetic',
    watercolor: 'watercolor painting style, soft washes, artistic brushstrokes',
    sketch: 'pencil sketch style, hand-drawn, artistic line work, monochromatic',
    'oil-painting': 'oil painting style, classical art, rich textures, masterwork quality',
  };

  return styleMap[artStyle];
};

export const buildCharacterDescriptionPrompt = (
  characterData: CharacterPromptData,
  options: DescriptionPromptOptions = {},
): string => {
  const {
    enhanceExisting = false,
    includeBackstory = true,
    includePersonality = true,
    includeAppearance = true,
    tone = 'heroic',
  } = options;

  const promptParts: string[] = [];

  if (enhanceExisting && characterData.description) {
    promptParts.push(
      'Enhance and expand the following D&D character description with rich details:',
    );
    promptParts.push(`Current description: "${characterData.description}"`);
  } else {
    promptParts.push('Create a detailed D&D character description for the following character:');
  }

  const name = sanitize(characterData.name) || 'Unnamed Character';
  promptParts.push(`Character Name: ${name}`);
  const race = sanitize(characterData.race);
  const subrace = sanitize(characterData.subrace);
  const charClass = sanitize(characterData.class);
  const background = sanitize(characterData.background);
  const alignment = sanitize(characterData.alignment);

  if (race) promptParts.push(`Race: ${race}`);
  if (subrace) promptParts.push(`Subrace: ${subrace}`);
  if (charClass) promptParts.push(`Class: ${charClass}`);
  if (background) promptParts.push(`Background: ${background}`);
  if (characterData.level) promptParts.push(`Level: ${characterData.level}`);
  if (alignment) promptParts.push(`Alignment: ${alignment}`);

  const traits = listFrom(characterData.personalityTraits);
  if (traits.length > 0) promptParts.push(`Personality Traits: ${traits.join('; ')}`);

  const ideals = listFrom(characterData.ideals);
  if (ideals.length > 0) promptParts.push(`Ideals: ${ideals.join('; ')}`);

  const bonds = listFrom(characterData.bonds);
  if (bonds.length > 0) promptParts.push(`Bonds: ${bonds.join('; ')}`);

  const flaws = listFrom(characterData.flaws);
  if (flaws.length > 0) promptParts.push(`Flaws: ${flaws.join('; ')}`);

  const personalityNotes = sanitize(characterData.personality_notes);
  if (personalityNotes) promptParts.push(`Additional Personality Notes: ${personalityNotes}`);

  if (
    traits.length > 0 ||
    ideals.length > 0 ||
    bonds.length > 0 ||
    flaws.length > 0 ||
    personalityNotes
  ) {
    promptParts.push(
      "(IMPORTANT: Use the provided personality traits, ideals, bonds, and flaws EXACTLY as given. These are the character's defining characteristics and should be incorporated prominently into the description and personality section)",
    );
  }

  if (characterData.enhancementSelections && characterData.enhancementSelections.length > 0) {
    promptParts.push('\nCharacter Enhancements:');
    characterData.enhancementSelections.forEach((selection) => {
      if (Array.isArray(selection.value)) {
        promptParts.push(`- ${selection.value.join(', ')}`);
      } else {
        promptParts.push(`- ${selection.value}`);
      }
      if (selection.customValue) promptParts.push(`  Note: ${selection.customValue}`);
    });
    promptParts.push(
      "(These enhancements are core parts of the character's identity and should be prominently featured in the description, personality, and backstory)",
    );
  }

  if (characterData.enhancementEffects) {
    const effects = characterData.enhancementEffects;
    if (effects.traits?.length) promptParts.push(`Special Traits: ${effects.traits.join(', ')}`);
    if (effects.languages?.length)
      promptParts.push(`Additional Languages: ${effects.languages.join(', ')}`);
    if (effects.equipment?.length)
      promptParts.push(`Special Equipment: ${effects.equipment.join(', ')}`);
    if (effects.skillBonus?.length)
      promptParts.push(`Skill Bonuses: ${effects.skillBonus.join(', ')}`);
  }

  if (characterData.ability_scores) {
    const scores = characterData.ability_scores;
    promptParts.push('Notable ability scores:');
    if ((scores.strength ?? 0) >= 15) promptParts.push('- Strong and powerful');
    if ((scores.dexterity ?? 0) >= 15) promptParts.push('- Agile and quick');
    if ((scores.constitution ?? 0) >= 15) promptParts.push('- Hardy and resilient');
    if ((scores.intelligence ?? 0) >= 15) promptParts.push('- Intelligent and clever');
    if ((scores.wisdom ?? 0) >= 15) promptParts.push('- Wise and perceptive');
    if ((scores.charisma ?? 0) >= 15) promptParts.push('- Charismatic and compelling');
  }

  appendPhysicalTraitsDescriptionPrompt(promptParts, characterData);

  promptParts.push(`Tone: Write in a ${tone} style appropriate for D&D fantasy setting.`);

  promptParts.push(
    '\nPlease provide the following sections with EXACT formatting using bold markdown headers:',
  );
  promptParts.push('');
  promptParts.push('**DESCRIPTION:** A comprehensive overview of the character (2-3 sentences)');
  promptParts.push('');

  if (includeAppearance) {
    promptParts.push(
      '**APPEARANCE:** Detailed physical description including height, build, facial features, hair, eyes, scars, tattoos, and clothing style (3-4 sentences)',
    );
    promptParts.push('');
  }

  if (includePersonality) {
    promptParts.push(
      '**PERSONALITY:** Character traits, mannerisms, speech patterns, motivations, fears, and quirks (3-4 sentences)',
    );
    promptParts.push('');
  }

  if (includeBackstory) {
    promptParts.push(
      '**BACKSTORY:** Brief background story explaining how they became who they are, their origins, and what drives them to adventure (3-4 sentences)',
    );
    promptParts.push('');
  }

  promptParts.push(
    'IMPORTANT: Always start each section with the bold header format shown above (e.g., **DESCRIPTION:**). Include all four section headers even if some sections are brief.',
  );

  promptParts.push('\nGuidelines:');
  promptParts.push('- Use D&D 5E lore and terminology');
  promptParts.push(
    '- Make the character feel authentic to their SPECIFIED race and subrace (if provided)',
  );
  promptParts.push('- Include specific details that make the character unique');
  promptParts.push('- Ensure the personality matches their background and alignment');
  promptParts.push('- Create hooks for future roleplay and storytelling');
  promptParts.push(
    '- NEVER assume details not explicitly provided (e.g., do not assume Hill Dwarf if only Dwarf is specified)',
  );
  promptParts.push('- Only use the specific subrace if explicitly provided in the character data');
  promptParts.push(
    '- Base descriptions strictly on the provided information without making assumptions',
  );

  return promptParts.join('\n');
};

export const buildCharacterImagePrompt = (
  characterData: CharacterPromptData,
  options: ImagePromptOptions,
): string => {
  const { style, artStyle, theme } = options;
  const promptParts: string[] = [];
  const extracted = extractCharacterDetails(characterData);

  switch (style) {
    case 'portrait':
      promptParts.push(
        'D&D character portrait, head and shoulders view, facing forward or at slight angle',
      );
      break;
    case 'action':
      promptParts.push(
        'Dynamic D&D character action pose, showing character in combat or using abilities',
      );
      break;
    case 'full-body':
      promptParts.push(
        'Full body D&D character portrait, standing pose, complete outfit and equipment visible',
      );
      break;
    case 'character-sheet': {
      const characterConcept = buildCharacterConcept(characterData, extracted, theme);
      promptParts.push(
        `Character design sheet for ${characterConcept}, detailed with front, back, and side views, including close-up sketches of facial features and accessories, annotated with design notes and labeled components, drawn in blueprint style with glowing trim in ${theme}. Detailed line work on the face and hands, detailed anatomy of the character, detailed lines around the edges. Detailed character sketches with flat color and detailed line art illustration. Professional concept art style.`,
      );
      break;
    }
    case 'expression-sheet':
      promptParts.push(
        'D&D character expression sheet, same character with multiple facial expressions, happy, serious, angry, surprised, consistent character',
      );
      break;
  }

  if (style !== 'character-sheet') {
    const characterDesc = buildCharacterDescriptionSegment(characterData, extracted);
    if (characterDesc) promptParts.push(characterDesc);
    promptParts.push(getArtStylePrompt(artStyle));
  }

  if (style === 'character-sheet' || style === 'expression-sheet') {
    promptParts.push(
      'Clean white background, organized layout, professional character reference, consistent character design across all views',
    );
  } else {
    promptParts.push('Clean background, character as main focus, professional composition');
  }

  promptParts.push(
    'High detail, sharp focus, excellent lighting, rich colors, digital illustration quality',
  );

  appendPhysicalTraitsImagePrompt(promptParts, characterData);

  return promptParts.join(', ');
};

const mapAbilityScores = (character: Character): AbilityScoreRecord | null => {
  if (!character.abilityScores) return null;
  const record: AbilityScoreRecord = {};
  (Object.entries(character.abilityScores) as Array<[string, { score?: number }]>).forEach(
    ([key, ability]) => {
      if (typeof ability?.score === 'number' && Number.isFinite(ability.score)) {
        record[key] = ability.score;
      }
    },
  );
  return Object.keys(record).length > 0 ? record : null;
};

export const toCharacterPromptData = (
  character: Character | null | undefined,
): CharacterPromptData => {
  if (!character) {
    return { name: 'Unnamed Character' };
  }

  return {
    name: character.name,
    description: character.description,
    race: character.race?.name || character.race?.id || null,
    subrace: character.subrace?.name || character.subrace?.id || null,
    class: character.class?.name || character.class?.id || null,
    background: character.background?.name || character.background?.id || null,
    level: character.level ?? null,
    ability_scores: mapAbilityScores(character),
    alignment: character.alignment ?? null,
    personalityTraits: character.personalityTraits,
    ideals: character.ideals,
    bonds: character.bonds,
    flaws: character.flaws,
    personality_notes: character.personality_notes ?? character.personalityNotes ?? null,
    enhancementSelections: character.enhancementSelections,
    enhancementEffects: character.enhancementEffects,
    appearance: character.appearance,
    personality_traits: character.personality_traits,
    theme: character.theme,
    height: character.height ?? null,
    weight: character.weight ?? null,
    eyes: character.eyes ?? null,
    skin: character.skin ?? null,
    hair: character.hair ?? null,
  };
};

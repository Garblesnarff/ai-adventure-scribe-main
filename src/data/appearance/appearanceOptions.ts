export interface AppearanceOptions {
  eyeColors: string[];
  skinColors: string[];
  hairColors: string[];
}

type RaceKey =
  | 'human'
  | 'elf'
  | 'high-elf'
  | 'wood-elf'
  | 'drow'
  | 'eladrin'
  | 'sea-elf'
  | 'shadar-kai'
  | 'dwarf'
  | 'hill-dwarf'
  | 'mountain-dwarf'
  | 'halfling'
  | 'lightfoot-halfling'
  | 'stout-halfling'
  | 'gnome'
  | 'forest-gnome'
  | 'rock-gnome'
  | 'half-elf'
  | 'half-orc'
  | 'tiefling'
  | 'dragonborn';

const defaultOptions: AppearanceOptions = {
  eyeColors: ['brown', 'blue', 'green', 'hazel', 'gray'],
  skinColors: ['pale', 'fair', 'tan', 'olive', 'brown', 'dark'],
  hairColors: ['black', 'brown', 'blonde', 'red', 'white', 'gray'],
};

const APPEARANCE_BY_RACE: Partial<Record<RaceKey, AppearanceOptions>> = {
  human: {
    eyeColors: ['amber', 'blue', 'brown', 'gray', 'green', 'hazel'],
    skinColors: [
      'dark brown',
      'deep tan',
      'golden tan',
      'light brown',
      'olive',
      'pale',
      'ruddy',
      'very fair',
    ],
    hairColors: ['auburn', 'black', 'blonde', 'brown', 'chestnut', 'gray', 'red', 'sandy', 'white'],
  },
  elf: {
    eyeColors: ['amber', 'blue', 'emerald', 'hazel', 'silver', 'violet'],
    skinColors: ['bronze', 'copper', 'fair', 'golden', 'olive', 'pale'],
    hairColors: ['black', 'blonde', 'copper', 'gold', 'silver', 'straw'],
  },
  'high-elf': {
    eyeColors: ['blue', 'green', 'silver', 'violet'],
    skinColors: ['alabaster', 'bronze', 'golden'],
    hairColors: ['blonde', 'gold', 'silver', 'white'],
  },
  'wood-elf': {
    eyeColors: ['brown', 'green', 'hazel'],
    skinColors: ['copper', 'earthy brown', 'tan'],
    hairColors: ['brown', 'copper', 'dark green', 'hazel', 'tan'],
  },
  drow: {
    eyeColors: ['crimson', 'lavender', 'pale pink', 'white'],
    skinColors: ['charcoal', 'ebony', 'obsidian'],
    hairColors: ['silver', 'white'],
  },
  eladrin: {
    eyeColors: ['amber', 'cyan', 'emerald', 'magenta', 'sapphire'],
    skinColors: ['autumnal copper', 'spring blossom', 'summer bronze', 'winter pale'],
    hairColors: ['autumn red', 'ice blue', 'spring green', 'summer gold'],
  },
  'sea-elf': {
    eyeColors: ['aquamarine', 'blue', 'green'],
    skinColors: ['sea green', 'turquoise'],
    hairColors: ['blue-green', 'deep green', 'seaweed brown'],
  },
  'shadar-kai': {
    eyeColors: ['ashen gray', 'black', 'pale blue'],
    skinColors: ['ashen', 'gray', 'pale'],
    hairColors: ['black', 'silver', 'white'],
  },
  dwarf: {
    eyeColors: ['brown', 'gray', 'hazel'],
    skinColors: ['bronzed', 'earthy brown', 'ruddy', 'tan'],
    hairColors: ['auburn', 'black', 'brown', 'copper', 'gray', 'red'],
  },
  'hill-dwarf': {
    skinColors: ['earthy brown', 'ruddy', 'tan'],
    hairColors: ['auburn', 'brown', 'red'],
  },
  'mountain-dwarf': {
    skinColors: ['bronzed', 'deep tan'],
    hairColors: ['black', 'brown', 'gray'],
  },
  halfling: {
    eyeColors: ['brown', 'hazel'],
    skinColors: ['ruddy', 'tan'],
    hairColors: ['brown', 'sandy', 'tan'],
  },
  'lightfoot-halfling': {
    hairColors: ['brown', 'sandy', 'tan'],
  },
  'stout-halfling': {
    hairColors: ['dark brown', 'black'],
  },
  gnome: {
    eyeColors: ['blue', 'green', 'hazel'],
    skinColors: ['fair', 'tan'],
    hairColors: ['auburn', 'brown', 'gray'],
  },
  'forest-gnome': {
    eyeColors: ['green', 'hazel'],
    hairColors: ['brown', 'green-tinted'],
  },
  'rock-gnome': {
    eyeColors: ['blue', 'brown'],
    hairColors: ['auburn', 'gray'],
  },
  'half-elf': {
    eyeColors: ['amber', 'blue', 'green', 'hazel', 'violet'],
    skinColors: ['fair', 'olive', 'tan'],
    hairColors: ['blonde', 'brown', 'chestnut', 'silver'],
  },
  'half-orc': {
    eyeColors: ['gray', 'green', 'yellow'],
    skinColors: ['ashen gray', 'dull brown', 'green-gray'],
    hairColors: ['black', 'brown', 'dark green', 'gray'],
  },
  tiefling: {
    eyeColors: ['black', 'gold', 'red', 'silver', 'white'],
    skinColors: ['deep crimson', 'dusky purple', 'indigo', 'maroon', 'obsidian'],
    hairColors: ['black', 'blue-black', 'dark purple', 'red'],
  },
  dragonborn: {
    eyeColors: ['brass', 'bronze', 'copper', 'gold', 'silver'],
    skinColors: [
      'black',
      'blue',
      'brass',
      'bronze',
      'copper',
      'gold',
      'green',
      'red',
      'silver',
      'white',
    ],
    hairColors: [
      'crest - black',
      'crest - blue',
      'crest - bronze',
      'crest - copper',
      'crest - gold',
      'crest - green',
      'crest - red',
      'crest - silver',
      'crest - white',
    ],
  },
};

function normalizeKey(key?: string | null): RaceKey | undefined {
  if (!key) return undefined;
  const normalized = key.toLowerCase().replace(/\s+/g, '-');
  return normalized as RaceKey;
}

function mergeOptions(
  base: AppearanceOptions,
  override?: Partial<AppearanceOptions>,
): AppearanceOptions {
  if (!override) return base;
  return {
    eyeColors: override.eyeColors ?? base.eyeColors,
    skinColors: override.skinColors ?? base.skinColors,
    hairColors: override.hairColors ?? base.hairColors,
  };
}

export function getAppearanceOptions(raceName?: string, subraceId?: string): AppearanceOptions {
  const raceKey = normalizeKey(raceName);
  const base =
    raceKey && APPEARANCE_BY_RACE[raceKey] ? APPEARANCE_BY_RACE[raceKey]! : defaultOptions;
  const subraceKey = normalizeKey(subraceId);
  const subraceOptions =
    subraceKey && APPEARANCE_BY_RACE[subraceKey] ? APPEARANCE_BY_RACE[subraceKey] : undefined;
  return mergeOptions(base, subraceOptions);
}

export const AVAILABLE_RACE_KEYS = Object.keys(APPEARANCE_BY_RACE) as RaceKey[];

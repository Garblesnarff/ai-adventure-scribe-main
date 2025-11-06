import allowListsRaw from '@/data/srd/allowLists.json';

type AllowLists = typeof allowListsRaw;
export type SrdCategory = Exclude<keyof AllowLists, 'license'>;

const DIACRITIC_REGEX = /\p{Diacritic}/gu;

type CanonicalLists = Record<SrdCategory, readonly string[]>;
type NormalizedLookup = Record<SrdCategory, Map<string, string>>;

const canonicalLists = Object.create(null) as CanonicalLists;
const normalizedLookup = Object.create(null) as NormalizedLookup;

const categories = (Object.keys(allowListsRaw) as Array<keyof AllowLists>).filter(
  (key): key is SrdCategory => key !== 'license',
);

for (const category of categories) {
  const values = Array.isArray(allowListsRaw[category])
    ? (allowListsRaw[category] as string[])
    : [];

  canonicalLists[category] = Object.freeze([...values]);

  const lookup = new Map<string, string>();
  for (const value of values) {
    const key = normalizeName(value);
    if (!key) continue;
    if (!lookup.has(key)) {
      lookup.set(key, value);
    }
  }
  normalizedLookup[category] = lookup;
}

export function listSrdCategories(): readonly SrdCategory[] {
  return categories;
}

export function getSrdEntries(category: SrdCategory): readonly string[] {
  return canonicalLists[category] ?? [];
}

export function isSrdEntity(category: SrdCategory, candidate: string | null | undefined): boolean {
  return getCanonicalSrdName(category, candidate) !== null;
}

export function getCanonicalSrdName(
  category: SrdCategory,
  candidate: string | null | undefined,
): string | null {
  if (!candidate) return null;
  const lookup = normalizedLookup[category];
  if (!lookup) return null;

  const key = normalizeName(candidate);
  if (!key) return null;

  const directMatch = lookup.get(key);
  if (directMatch) return directMatch;

  // Try matching after stripping common annotations such as parentheses or variant labels.
  const stripped = stripAnnotations(key);
  if (stripped !== key) {
    const strippedMatch = lookup.get(stripped);
    if (strippedMatch) return strippedMatch;
  }

  return null;
}

export interface SrdValidationReport {
  allowed: string[];
  disallowed: string[];
  canonical: string[];
}

export function validateSrdEntities(
  category: SrdCategory,
  values: Iterable<string | null | undefined>,
): SrdValidationReport {
  const allowed: string[] = [];
  const disallowed: string[] = [];
  const canonical: string[] = [];

  for (const value of values) {
    if (!value) continue;
    if (isSrdEntity(category, value)) {
      allowed.push(value);
      const canonicalValue = getCanonicalSrdName(category, value);
      if (canonicalValue) canonical.push(canonicalValue);
    } else {
      disallowed.push(value);
    }
  }

  return { allowed, disallowed, canonical };
}

export class SrdViolationError extends Error {
  constructor(category: SrdCategory, value: string) {
    super(`"${value}" is not part of the SRD 5.1 allow list for ${category}.`);
    this.name = 'SrdViolationError';
  }
}

export function ensureSrdEntity(category: SrdCategory, value: string): string {
  const canonical = getCanonicalSrdName(category, value);
  if (!canonical) {
    throw new SrdViolationError(category, value);
  }
  return canonical;
}

export function filterToSrd(category: SrdCategory, values: readonly string[]): string[] {
  return values
    .map((value) => getCanonicalSrdName(category, value))
    .filter((value): value is string => Boolean(value));
}

function normalizeName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(DIACRITIC_REGEX, '')
    .replace(/[’']/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function stripAnnotations(value: string): string {
  // Remove common qualifiers like "variant", parentheses content, or alternate forms.
  let stripped = value.replace(/\bvariant\b/g, '').trim();
  stripped = stripped.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  return stripped.replace(/\s+/g, ' ');
}

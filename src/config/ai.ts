const primary = (import.meta.env.VITE_GEMINI_TEXT_MODEL || '').trim();
const fallback = (import.meta.env.VITE_GEMINI_TEXT_FALLBACK || '').trim();
const variantRaw = (import.meta.env.VITE_GEMINI_MODEL_VARIANTS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

const DEFAULT_PRIMARY = 'gemini-2.5-flash-lite';
const DEFAULT_FALLBACK = 'gemini-2.0-flash-lite';

const autoVariants: string[] = [];
const preferred = primary || DEFAULT_PRIMARY;
if (/^gemini-2\.5-flash-lite$/i.test(preferred)) {
  autoVariants.push('gemini-2.5-flash-lite-001', 'gemini-2.5-flash-lite-preview');
}

const candidates = new Set<string>();
const addCandidate = (value?: string) => {
  if (!value) return;
  const normalized = value.trim();
  if (normalized) candidates.add(normalized);
};

addCandidate(preferred);
for (const variant of variantRaw) addCandidate(variant);
for (const variant of autoVariants) addCandidate(variant);
addCandidate(fallback || DEFAULT_FALLBACK);

export const GEMINI_TEXT_MODEL = preferred;
export const GEMINI_TEXT_MODEL_FALLBACK = fallback || DEFAULT_FALLBACK;
export const GEMINI_MODEL_CANDIDATES = Array.from(candidates);

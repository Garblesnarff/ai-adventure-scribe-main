/*
 Splits cantrips from src/data/spellOptions.ts into per-class files under src/data/spells/cantrips/
 and rewrites spellOptions.ts to import the aggregated cantrips.
*/

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const spellOptionsPath = path.join(repoRoot, 'src', 'data', 'spellOptions.ts');
const outDir = path.join(repoRoot, 'src', 'data', 'spells', 'cantrips');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function extractCantripsSections(source) {
  const startMarker = 'export const cantrips: Spell[] = [';
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) throw new Error('cantrips array not found');

  // Find the matching end of the cantrips array by locating the next array export or the firstLevelSpells export
  const afterStart = source.slice(startIdx);
  const endIdxRel = afterStart.indexOf('\n];');
  if (endIdxRel === -1) throw new Error('end of cantrips array not found');
  const endIdx = startIdx + endIdxRel + 3; // include closing bracket

  const arrayBlock = source.slice(startIdx, endIdx + 1);
  // Extract only the inside of the array (between first '[' and the closing '];')
  const innerStart = arrayBlock.indexOf('[') + 1;
  const innerEnd = arrayBlock.lastIndexOf(']');
  const inner = arrayBlock.slice(innerStart, innerEnd);

  // Split by class comment sections
  const sectionRegex = /\n\s*\/\/\s*([A-Z]+)\s+CANTRIPS[^\n]*\n([\s\S]*?)(?=\n\s*\/\/\s*[A-Z]+\s+CANTRIPS|$)/g;
  const sections = {};

  let m;
  while ((m = sectionRegex.exec(inner)) !== null) {
    const label = m[1].toLowerCase();
    const content = m[2].trim();
    if (!content) continue; // skip empty sections (e.g., sorcerer shares with wizard)
    sections[label] = content.replace(/\s+$/, '');
  }

  return sections;
}

function writePerClassFiles(sections) {
  ensureDir(outDir);
  const header = "import { Spell } from '@/types/character';\n";
  const files = [];

  Object.entries(sections).forEach(([cls, content]) => {
    const fname = `${cls}.ts`;
    const fpath = path.join(outDir, fname);
    // Ensure content ends with a comma between objects
    const normalized = content.trim().replace(/\n\s*\],?\s*$/m, '');
    const ts = `${header}\nexport const ${cls}Cantrips: Spell[] = [\n${normalized}\n];\n`;
    fs.writeFileSync(fpath, ts, 'utf8');
    files.push({ cls, fname });
  });

  // Create index.ts aggregator
  const imports = files
    .map(({ cls }) => `import { ${cls}Cantrips } from './${cls}';`)
    .join('\n');
  const spread = files.map(({ cls }) => `  ...${cls}Cantrips`).join(',\n');
  const indexTs = `${header}\n${imports}\n\nexport const cantrips: Spell[] = [\n${spread}\n];\n`;
  fs.writeFileSync(path.join(outDir, 'index.ts'), indexTs, 'utf8');
}

function rewriteSpellOptions(source) {
  const startMarker = 'export const cantrips: Spell[] = [';
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) throw new Error('cantrips array not found while rewriting');
  const afterStart = source.slice(startIdx);
  const endIdxRel = afterStart.indexOf('\n];');
  if (endIdxRel === -1) throw new Error('end of cantrips array not found while rewriting');
  const endIdx = startIdx + endIdxRel + 3; // include closing bracket

  const before = source.slice(0, startIdx);
  const after = source.slice(endIdx + 1);
  const replacement = "export { cantrips } from './spells/cantrips';\n";
  return before + replacement + after;
}

function main() {
  const src = fs.readFileSync(spellOptionsPath, 'utf8');
  const sections = extractCantripsSections(src);
  writePerClassFiles(sections);
  const rewritten = rewriteSpellOptions(src);
  fs.writeFileSync(spellOptionsPath, rewritten, 'utf8');
  console.log('Cantrips split and spellOptions.ts updated.');
}

main();

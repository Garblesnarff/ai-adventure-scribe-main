/*
 Splits 1st-level spells from src/data/spellOptions.ts into per-class files under src/data/spells/level1/
 and rewrites spellOptions.ts to import the aggregated firstLevelSpells.
*/

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const spellOptionsPath = path.join(repoRoot, 'src', 'data', 'spellOptions.ts');
const outDir = path.join(repoRoot, 'src', 'data', 'spells', 'level1');

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function extractLevel1Sections(source) {
  const startMarker = 'export const firstLevelSpells: Spell[] = [';
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) throw new Error('firstLevelSpells array not found');
  const afterStart = source.slice(startIdx);
  const endIdxRel = afterStart.indexOf('\n];');
  if (endIdxRel === -1) throw new Error('end of firstLevelSpells array not found');
  const endIdx = startIdx + endIdxRel + 3;
  const arrayBlock = source.slice(startIdx, endIdx + 1);
  const innerStart = arrayBlock.indexOf('[') + 1;
  const innerEnd = arrayBlock.lastIndexOf(']');
  const inner = arrayBlock.slice(innerStart, innerEnd);

  const sectionRegex = /\n\s*\/\/\s*([A-Z]+)\s+1ST\s+LEVEL\s+SPELLS[^\n]*\n([\s\S]*?)(?=\n\s*\/\/\s*[A-Z]+\s+1ST\s+LEVEL\s+SPELLS|$)/g;
  const sections = {};
  let m;
  while ((m = sectionRegex.exec(inner)) !== null) {
    const label = m[1].toLowerCase();
    const content = m[2].trim();
    if (!content) continue;
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
    const ts = `${header}\nexport const ${cls}Level1Spells: Spell[] = [\n${content}\n];\n`;
    fs.writeFileSync(fpath, ts, 'utf8');
    files.push({ cls, fname });
  });
  const imports = files.map(({ cls }) => `import { ${cls}Level1Spells } from './${cls}';`).join('\n');
  const spread = files.map(({ cls }) => `  ...${cls}Level1Spells`).join(',\n');
  const indexTs = `${header}\n${imports}\n\nexport const firstLevelSpells: Spell[] = [\n${spread}\n];\n`;
  fs.writeFileSync(path.join(outDir, 'index.ts'), indexTs, 'utf8');
}

function rewriteSpellOptions(source) {
  const startMarker = 'export const firstLevelSpells: Spell[] = [';
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) throw new Error('firstLevelSpells array not found while rewriting');
  const afterStart = source.slice(startIdx);
  const endIdxRel = afterStart.indexOf('\n];');
  if (endIdxRel === -1) throw new Error('end of firstLevelSpells array not found while rewriting');
  const endIdx = startIdx + endIdxRel + 3;
  const before = source.slice(0, startIdx);
  const after = source.slice(endIdx + 1);
  const replacement = "export { firstLevelSpells } from './spells/level1';\n";
  return before + replacement + after;
}

function main() {
  const src = fs.readFileSync(spellOptionsPath, 'utf8');
  const sections = extractLevel1Sections(src);
  writePerClassFiles(sections);
  const rewritten = rewriteSpellOptions(src);
  fs.writeFileSync(spellOptionsPath, rewritten, 'utf8');
  console.log('Level 1 spells split and spellOptions.ts updated.');
}

main();

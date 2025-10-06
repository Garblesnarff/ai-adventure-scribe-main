#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd(), 'src');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    if (e.isDirectory()) files = files.concat(walk(path.join(dir, e.name)));
    else files.push(path.join(dir, e.name));
  }
  return files;
}

function main() {
  if (!fs.existsSync(ROOT)) {
    console.error('src directory not found');
    process.exit(0);
  }
  const files = walk(ROOT);
  const map = new Map();
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    const key = rel.toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(rel);
  }
  const dups = [...map.entries()].filter(([, v]) => v.length > 1);
  if (dups.length) {
    console.error('Duplicate files differing only by case detected:');
    for (const [, v] of dups) console.error(' -', v.join(' , '));
    process.exit(1);
  }
  process.exit(0);
}

main();

#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

interface DirectoryInfo {
  path: string;
  tier: number;
  files: string[];
}

// Tier 1: High priority directories (agents, services, features, server routes/services)
const TIER_1_PATTERNS = [
  /^src\/agents/,
  /^src\/services/,
  /^src\/features/,
  /^server\/src\/routes/,
  /^server\/src\/services/,
];

// Tier 2: Medium priority directories (components, hooks, utils, contexts)
const TIER_2_PATTERNS = [
  /^src\/components/,
  /^src\/hooks/,
  /^src\/utils/,
  /^src\/contexts/,
  /^src\/shared/,
];

// Directories to skip
const SKIP_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /__tests__/,
  /\.next/,
  /coverage/,
  /\.vscode/,
  /\.idea/,
];

function generateReadmeTemplate(dirInfo: DirectoryInfo): string {
  const dirName = path.basename(dirInfo.path);
  const relativePath = dirInfo.path;

  // Generate key files list
  const keyFilesSection = dirInfo.files.length > 0
    ? dirInfo.files.slice(0, 10).map(f => `- \`${f}\` - [Brief description]`).join('\n')
    : '- [List key files]';

  return `# ${dirName}

## Purpose
[1-2 sentence description of what this directory contains and why it exists]

## Key Files
${keyFilesSection}

## How It Works
[2-3 paragraphs explaining the main concepts, patterns, or architecture]

## Usage Examples
\`\`\`typescript
// Example code showing how to use the main exports
\`\`\`

## Dependencies
- [Dependency 1] - Why it's used
- [Dependency 2] - Why it's used

## Related Documentation
- Link to related READMEs
- Link to external docs
- Link to ADRs (if applicable)

## Maintenance Notes
- [Any gotchas, known issues, or maintenance considerations]
`;
}

function getTier(relativePath: string): number {
  for (const pattern of TIER_1_PATTERNS) {
    if (pattern.test(relativePath)) {
      return 1;
    }
  }

  for (const pattern of TIER_2_PATTERNS) {
    if (pattern.test(relativePath)) {
      return 2;
    }
  }

  return 3;
}

function shouldSkip(dirPath: string): boolean {
  return SKIP_PATTERNS.some(pattern => pattern.test(dirPath));
}

function findUndocumentedDirs(rootDir: string): DirectoryInfo[] {
  const undocumented: DirectoryInfo[] = [];

  function traverse(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      // Skip if this directory should be ignored
      if (shouldSkip(dir)) {
        return;
      }

      const hasReadme = entries.some(e =>
        e.isFile() && e.name.toLowerCase() === 'readme.md'
      );

      const tsFiles = entries
        .filter(e => e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx')))
        .map(e => e.name);

      // If directory has TypeScript files but no README, add it to the list
      if (!hasReadme && tsFiles.length > 0) {
        const relativePath = path.relative(rootDir, dir);
        const tier = getTier(relativePath);

        undocumented.push({
          path: relativePath,
          tier,
          files: tsFiles,
        });
      }

      // Recursively traverse subdirectories
      entries
        .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
        .forEach(e => traverse(path.join(dir, e.name)));
    } catch (error) {
      // Skip directories we can't read
      console.error(`Error reading ${dir}:`, error);
    }
  }

  traverse(rootDir);

  // Sort by tier, then by path
  return undocumented.sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }
    return a.path.localeCompare(b.path);
  });
}

function generateReadmes(rootDir: string, tier: number | 'all', dryRun: boolean = false): number {
  const undocumented = findUndocumentedDirs(rootDir);

  const filtered = tier === 'all'
    ? undocumented
    : undocumented.filter(d => d.tier === tier);

  let generated = 0;

  for (const dirInfo of filtered) {
    const fullPath = path.join(rootDir, dirInfo.path);
    const readmePath = path.join(fullPath, 'README.md');

    if (dryRun) {
      console.log(`[Tier ${dirInfo.tier}] Would create: ${dirInfo.path}/README.md (${dirInfo.files.length} files)`);
    } else {
      const content = generateReadmeTemplate(dirInfo);
      fs.writeFileSync(readmePath, content, 'utf-8');
      console.log(`[Tier ${dirInfo.tier}] Created: ${dirInfo.path}/README.md`);
      generated++;
    }
  }

  return generated;
}

function reportCoverage(rootDir: string) {
  // Count all directories with TypeScript files
  let totalDirs = 0;
  let dirsWithReadme = 0;

  function traverse(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      if (shouldSkip(dir)) {
        return;
      }

      const tsFiles = entries.filter(e =>
        e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx'))
      );

      const hasReadme = entries.some(e =>
        e.isFile() && e.name.toLowerCase() === 'readme.md'
      );

      if (tsFiles.length > 0) {
        totalDirs++;
        if (hasReadme) {
          dirsWithReadme++;
        }
      }

      entries
        .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
        .forEach(e => traverse(path.join(dir, e.name)));
    } catch (error) {
      // Skip directories we can't read
    }
  }

  traverse(rootDir);

  const percentage = totalDirs > 0 ? ((dirsWithReadme / totalDirs) * 100).toFixed(1) : '0.0';

  console.log('\n=== Documentation Coverage ===');
  console.log(`Total directories with TypeScript: ${totalDirs}`);
  console.log(`Directories with README.md: ${dirsWithReadme}`);
  console.log(`Coverage: ${percentage}%`);
  console.log('==============================\n');

  return { totalDirs, dirsWithReadme, percentage: parseFloat(percentage) };
}

// Main execution
const rootDir = path.resolve(process.cwd());
const args = process.argv.slice(2);

const command = args[0] || 'report';

switch (command) {
  case 'report':
    reportCoverage(rootDir);
    const undocumented = findUndocumentedDirs(rootDir);
    console.log('\n=== Undocumented Directories by Tier ===');

    for (let tier = 1; tier <= 3; tier++) {
      const tierDirs = undocumented.filter(d => d.tier === tier);
      console.log(`\nTier ${tier}: ${tierDirs.length} directories`);
      tierDirs.forEach(d => {
        console.log(`  - ${d.path} (${d.files.length} files)`);
      });
    }
    break;

  case 'generate':
    const tier = args[1];
    const dryRun = args.includes('--dry-run');

    console.log('\n=== Before Generation ===');
    reportCoverage(rootDir);

    let generated = 0;
    if (tier === 'all') {
      generated = generateReadmes(rootDir, 'all', dryRun);
    } else if (tier === '1' || tier === '2' || tier === '3') {
      generated = generateReadmes(rootDir, parseInt(tier), dryRun);
    } else {
      console.error('Usage: generate [1|2|3|all] [--dry-run]');
      process.exit(1);
    }

    if (!dryRun) {
      console.log(`\n✓ Generated ${generated} README templates\n`);
      console.log('=== After Generation ===');
      reportCoverage(rootDir);
    }
    break;

  default:
    console.log('Usage:');
    console.log('  ts-node scripts/generate-readme-templates.ts report');
    console.log('  ts-node scripts/generate-readme-templates.ts generate [1|2|3|all] [--dry-run]');
    break;
}

export { generateReadmeTemplate, findUndocumentedDirs, reportCoverage, generateReadmes };

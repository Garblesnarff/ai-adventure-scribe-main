#!/usr/bin/env node

/**
 * Automated script to replace console.* statements with centralized logger utility
 *
 * Replaces:
 * - console.log( -> logger.info(
 * - console.warn( -> logger.warn(
 * - console.error( -> logger.error(
 * - console.debug( -> logger.debug(
 *
 * Adds appropriate import statement if not present
 */

const fs = require('fs');
const path = require('path');

// Track statistics
const stats = {
  filesProcessed: 0,
  filesModified: 0,
  consoleCalls: 0,
  importsAdded: 0,
  errors: [],
  manualReviewNeeded: []
};

// Files to skip (development-only or special cases)
const SKIP_FILES = [
  'logger.ts', // The logger itself
  '.test.ts', // Test files might need console for debugging
  '.test.tsx',
  '__tests__'
];

/**
 * Check if file should be skipped
 */
function shouldSkip(filePath) {
  return SKIP_FILES.some(skip => filePath.includes(skip));
}

/**
 * Recursively get all files in directory
 */
function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and archive directories
      if (file === 'node_modules' || file === 'archive' || file === 'dist' || file === 'build') {
        return;
      }
      getFiles(filePath, fileList);
    } else if ((file.endsWith('.ts') || file.endsWith('.tsx')) && !shouldSkip(filePath)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Determine the correct import path based on file location
 */
function getImportPath(filePath) {
  const dir = path.dirname(filePath);
  const loggerPath = path.join(process.cwd(), 'src', 'lib', 'logger.ts');
  const relativePath = path.relative(dir, loggerPath);

  // Convert to posix-style path and ensure it starts with ./
  let importPath = relativePath.split(path.sep).join('/');
  if (!importPath.startsWith('.')) {
    importPath = './' + importPath;
  }

  // Remove .ts extension
  importPath = importPath.replace(/\.ts$/, '');

  return importPath;
}

/**
 * Check if file already imports logger
 */
function hasLoggerImport(content) {
  const importPatterns = [
    /import\s+\{\s*logger\s*\}\s+from\s+['"].*logger['"]/,
    /import\s+logger\s+from\s+['"].*logger['"]/,
    /import\s+.*logger.*from\s+['"].*logger['"]/
  ];

  return importPatterns.some(pattern => pattern.test(content));
}

/**
 * Add logger import to file content
 */
function addLoggerImport(content, filePath) {
  const importPath = getImportPath(filePath);
  const importStatement = `import { logger } from '${importPath}';`;

  // Find where to insert the import
  // 1. After existing imports
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('import ') || line.startsWith('import{')) {
      lastImportIndex = i;
    } else if (line && !line.startsWith('//') && !line.startsWith('/*') && lastImportIndex >= 0) {
      // Found first non-import, non-comment line after imports
      break;
    }
  }

  if (lastImportIndex >= 0) {
    // Insert after last import
    lines.splice(lastImportIndex + 1, 0, importStatement);
    return lines.join('\n');
  } else {
    // No imports found, add at the top
    const firstNonCommentIndex = lines.findIndex(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*');
    });

    if (firstNonCommentIndex >= 0) {
      lines.splice(firstNonCommentIndex, 0, importStatement, '');
    } else {
      lines.unshift(importStatement, '');
    }

    return lines.join('\n');
  }
}

/**
 * Replace console statements with logger calls
 */
function replaceConsoleCalls(content) {
  let modified = content;
  let callCount = 0;

  const replacements = [
    { from: /console\.log\(/g, to: 'logger.info(' },
    { from: /console\.warn\(/g, to: 'logger.warn(' },
    { from: /console\.error\(/g, to: 'logger.error(' },
    { from: /console\.debug\(/g, to: 'logger.debug(' }
  ];

  replacements.forEach(({ from, to }) => {
    const matches = modified.match(from);
    if (matches) {
      callCount += matches.length;
      modified = modified.replace(from, to);
    }
  });

  return { content: modified, callCount };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  stats.filesProcessed++;

  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check if file has console calls
    const hasConsoleCalls = /console\.(log|warn|error|debug)\(/.test(content);

    if (!hasConsoleCalls) {
      return; // Nothing to do
    }

    // Replace console calls
    const { content: replacedContent, callCount } = replaceConsoleCalls(content);

    if (callCount === 0) {
      return; // No replacements made
    }

    stats.consoleCalls += callCount;

    // Add import if needed
    let finalContent = replacedContent;
    if (!hasLoggerImport(replacedContent)) {
      finalContent = addLoggerImport(replacedContent, filePath);
      stats.importsAdded++;
    }

    // Write back to file
    fs.writeFileSync(filePath, finalContent, 'utf8');
    stats.filesModified++;

    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`✓ ${relativePath} - ${callCount} replacements`);

  } catch (error) {
    const relativePath = path.relative(process.cwd(), filePath);
    stats.errors.push({ file: relativePath, error: error.message });
    console.error(`✗ ${relativePath} - Error: ${error.message}`);
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Scanning for console statements...\n');

  const srcDir = path.join(process.cwd(), 'src');
  const files = getFiles(srcDir);

  console.log(`Found ${files.length} files to check\n`);

  // Process each file
  files.forEach(processFile);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Files modified: ${stats.filesModified}`);
  console.log(`Console calls replaced: ${stats.consoleCalls}`);
  console.log(`Imports added: ${stats.importsAdded}`);

  if (stats.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`  ${file}: ${error}`);
    });
  }

  if (stats.manualReviewNeeded.length > 0) {
    console.log('\n⚠️  MANUAL REVIEW NEEDED:');
    stats.manualReviewNeeded.forEach(file => {
      console.log(`  ${file}`);
    });
  }

  console.log('\n✅ Done!');

  // Exit with error code if there were errors
  if (stats.errors.length > 0) {
    process.exit(1);
  }
}

main();

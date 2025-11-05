#!/usr/bin/env node

/**
 * Security Linting Script
 *
 * Automatically detects common security issues in the codebase.
 * Run this as part of CI/CD pipeline to catch security issues early.
 *
 * Usage: node scripts/security-lint.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

// Findings storage
const findings = {
  critical: [],
  high: [],
  medium: [],
  low: [],
  info: []
};

/**
 * Recursively get all files matching pattern
 */
function getFiles(dir, pattern, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, dist, build directories
      if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
        getFiles(filePath, pattern, fileList);
      }
    } else if (pattern.test(file)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Check for routes without authentication
 */
function checkMissingAuth(filePath, content) {
  const relPath = path.relative(rootDir, filePath);

  // Skip if this is not a route file
  if (!relPath.includes('routes/')) return;

  // Skip utility files that aren't route handlers
  const basename = path.basename(filePath);
  const utilityFiles = ['mappers.ts', 'schemas.ts', 'types.ts', 'index.ts', 'blog.tsx'];
  if (utilityFiles.some(util => basename.endsWith(util))) return;

  // Skip auth.ts (deprecated), observability.ts (public by design), seo.ts (public)
  if (['auth.ts', 'observability.ts', 'seo.ts'].includes(basename)) return;

  // Skip blog.ts - has public endpoints with custom rate limiting
  if (basename === 'blog.ts') return;

  const lines = content.split('\n');

  // Check if file imports requireAuth
  const hasRequireAuthImport = lines.some(line =>
    line.includes("import") && line.includes("requireAuth")
  );

  // Check if file uses requireAuth
  const hasRequireAuthUsage = lines.some(line =>
    line.includes("requireAuth") && !line.trim().startsWith('//')
  );

  if (!hasRequireAuthImport || !hasRequireAuthUsage) {
    findings.high.push({
      file: relPath,
      line: 1,
      rule: 'MISSING_AUTH',
      message: 'Route file does not import or use requireAuth middleware',
      suggestion: 'Add: import { requireAuth } from "../../middleware/auth.js" and router.use(requireAuth)'
    });
  }
}

/**
 * Check for missing rate limiting
 */
function checkMissingRateLimit(filePath, content) {
  const relPath = path.relative(rootDir, filePath);

  // Skip if this is not a route file
  if (!relPath.includes('routes/')) return;

  // Skip utility files that aren't route handlers
  const basename = path.basename(filePath);
  const utilityFiles = ['mappers.ts', 'schemas.ts', 'types.ts', 'index.ts', 'blog.tsx'];
  if (utilityFiles.some(util => basename.endsWith(util))) return;

  // Skip auth.ts (deprecated)
  if (basename === 'auth.ts') return;

  const lines = content.split('\n');

  // Check if file imports rate limiting
  const hasRateLimitImport = lines.some(line =>
    (line.includes("import") && line.includes("planRateLimit")) ||
    (line.includes("import") && line.includes("createRateLimiter"))
  );

  // Check if file uses rate limiting
  const hasRateLimitUsage = lines.some(line =>
    (line.includes("planRateLimit") || line.includes("createRateLimiter")) &&
    !line.trim().startsWith('//')
  );

  if (!hasRateLimitImport || !hasRateLimitUsage) {
    findings.medium.push({
      file: relPath,
      line: 1,
      rule: 'MISSING_RATE_LIMIT',
      message: 'Route file does not implement rate limiting',
      suggestion: 'Add: import { planRateLimit } from "../../middleware/rate-limit.js" and router.use(planRateLimit("default"))'
    });
  }
}

/**
 * Check for unbounded parseInt
 */
function checkUnboundedParseInt(filePath, content) {
  const relPath = path.relative(rootDir, filePath);
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;

    // Look for parseInt without Math.min/Math.max
    if (line.includes('parseInt(') && !line.includes('Math.min') && !line.includes('Math.max')) {
      // Check if this parseInt is already bounded on previous or next line
      const prevLine = index > 0 ? lines[index - 1] : '';
      const nextLine = index < lines.length - 1 ? lines[index + 1] : '';

      if (prevLine.includes('Math.min') || prevLine.includes('Math.max') ||
          nextLine.includes('Math.min') || nextLine.includes('Math.max')) {
        return; // Already bounded
      }

      findings.medium.push({
        file: relPath,
        line: index + 1,
        rule: 'UNBOUNDED_PARSEINT',
        message: 'parseInt without bounds can cause resource exhaustion',
        suggestion: 'Wrap with Math.min/Math.max: Math.max(min, Math.min(parseInt(...) || default, max))',
        code: line.trim()
      });
    }
  });
}

/**
 * Check for dangerouslySetInnerHTML without sanitization
 */
function checkDangerousHTML(filePath, content) {
  const relPath = path.relative(rootDir, filePath);

  // Only check React/TSX files
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) return;

  // Skip server-side rendering views - these are controlled by application, not user input
  if (relPath.includes('server/src/views/')) return;

  const lines = content.split('\n');

  lines.forEach((line, index) => {
    if (line.includes('dangerouslySetInnerHTML')) {
      // Check if sanitizeHtml is imported in this file
      const hasSanitizeImport = content.includes('sanitize-html') || content.includes('sanitizeHtml');

      if (!hasSanitizeImport) {
        findings.high.push({
          file: relPath,
          line: index + 1,
          rule: 'DANGEROUS_HTML_WITHOUT_SANITIZATION',
          message: 'dangerouslySetInnerHTML used without sanitization',
          suggestion: 'Import and use sanitize-html library to sanitize content before rendering',
          code: line.trim()
        });
      } else {
        // Check if the content being set is sanitized (basic heuristic)
        const varName = line.match(/dangerouslySetInnerHTML={{.*__html:\s*(\w+)/);
        if (varName && varName[1]) {
          const contentVar = varName[1];
          // Look for sanitizeHtml usage with this variable
          if (!content.includes(`sanitizeHtml(`) || !content.includes(contentVar)) {
            findings.medium.push({
              file: relPath,
              line: index + 1,
              rule: 'POSSIBLY_UNSANITIZED_HTML',
              message: 'dangerouslySetInnerHTML content may not be sanitized',
              suggestion: 'Verify that content is sanitized with sanitizeHtml before rendering',
              code: line.trim()
            });
          }
        }
      }
    }
  });
}

/**
 * Check for error messages that might leak information
 */
function checkErrorLeakage(filePath, content) {
  const relPath = path.relative(rootDir, filePath);

  // Only check server-side files
  if (!relPath.includes('server/src')) return;

  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Look for res.json or res.status().json with error objects
    if ((line.includes('res.json') || line.includes('res.status')) &&
        line.includes('error') &&
        !line.trim().startsWith('//')) {

      // Check for patterns that might leak info
      const leakyPatterns = [
        /error\.message/,
        /error\.stack/,
        /err\.message/,
        /err\.stack/,
        /error:\s*error(?!\s*:)/, // error: error (passing whole error object)
        /error:\s*err(?!\s*:)/     // error: err (passing whole error object)
      ];

      const hasLeakyPattern = leakyPatterns.some(pattern => pattern.test(line));

      if (hasLeakyPattern) {
        findings.medium.push({
          file: relPath,
          line: index + 1,
          rule: 'ERROR_INFORMATION_LEAKAGE',
          message: 'Error response may expose sensitive information',
          suggestion: 'Use generic error messages. Log detailed errors server-side with console.error',
          code: line.trim()
        });
      }
    }
  });
}

/**
 * Check for hardcoded secrets
 */
function checkHardcodedSecrets(filePath, content) {
  const relPath = path.relative(rootDir, filePath);

  // Skip test files, example files, and this script
  if (relPath.includes('test') ||
      relPath.includes('spec') ||
      relPath.includes('example') ||
      relPath.includes('scripts/security-lint.js')) {
    return;
  }

  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;

    // Look for patterns like:
    // - API_KEY = "sk_live_..."
    // - password: "..."
    // - secret = "..."
    const secretPatterns = [
      { pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*['"](?!.*process\.env)[^'"]{20,}['"]/i, name: 'API Key' },
      { pattern: /(?:secret|token)\s*[=:]\s*['"](?!.*process\.env)[^'"]{20,}['"]/i, name: 'Secret/Token' },
      { pattern: /password\s*[=:]\s*['"][^'"]{8,}['"]/i, name: 'Password' },
      { pattern: /sk_live_[a-zA-Z0-9]{20,}/, name: 'Stripe Live Key' },
      { pattern: /sk_test_[a-zA-Z0-9]{20,}/, name: 'Stripe Test Key (info only)' }
    ];

    secretPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(line)) {
        const severity = name.includes('Test') ? 'info' : 'critical';

        findings[severity].push({
          file: relPath,
          line: index + 1,
          rule: 'HARDCODED_SECRET',
          message: `Possible hardcoded ${name} detected`,
          suggestion: 'Use environment variables: process.env.SECRET_NAME',
          code: line.trim().substring(0, 80) + '...' // Truncate to avoid exposing secret
        });
      }
    });
  });
}

/**
 * Check for SQL injection risks
 */
function checkSQLInjection(filePath, content) {
  const relPath = path.relative(rootDir, filePath);

  // Only check server-side files
  if (!relPath.includes('server/src')) return;

  // Skip seed scripts and one-time utilities
  if (relPath.includes('server/src/scripts/')) return;

  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Look for template literals that might contain SQL
    if (line.includes('SELECT') || line.includes('INSERT') || line.includes('UPDATE') || line.includes('DELETE')) {
      // Check if it's a template literal with variables
      if (line.includes('`') && line.includes('${')) {
        findings.high.push({
          file: relPath,
          line: index + 1,
          rule: 'POSSIBLE_SQL_INJECTION',
          message: 'Template literal with SQL query detected - possible SQL injection',
          suggestion: 'Use parameterized queries with Supabase query builder instead of raw SQL',
          code: line.trim()
        });
      }
    }

    // Check for .or() with string interpolation (Supabase filter injection)
    if (line.includes('.or(') && (line.includes('${') || line.includes('`'))) {
      findings.medium.push({
        file: relPath,
        line: index + 1,
        rule: 'FILTER_INJECTION_RISK',
        message: 'Supabase .or() filter with string interpolation may be vulnerable',
        suggestion: 'Validate and sanitize filter parameters before using in .or() clauses',
        code: line.trim()
      });
    }
  });
}

/**
 * Main scanning function
 */
function scanFiles() {
  console.log(`${colors.blue}🔍 Security Linting - AI Adventure Scribe${colors.reset}\n`);

  // Get all TypeScript and TSX files
  const tsFiles = getFiles(path.join(rootDir, 'server/src'), /\.(ts|tsx)$/);
  const clientFiles = getFiles(path.join(rootDir, 'src'), /\.(ts|tsx)$/);
  const allFiles = [...tsFiles, ...clientFiles];

  console.log(`${colors.gray}Scanning ${allFiles.length} files...${colors.reset}\n`);

  // Run all checks
  allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');

    checkMissingAuth(file, content);
    checkMissingRateLimit(file, content);
    checkUnboundedParseInt(file, content);
    checkDangerousHTML(file, content);
    checkErrorLeakage(file, content);
    checkHardcodedSecrets(file, content);
    checkSQLInjection(file, content);
  });

  // Print results
  printResults();
}

/**
 * Print results with color coding
 */
function printResults() {
  const totalFindings =
    findings.critical.length +
    findings.high.length +
    findings.medium.length +
    findings.low.length +
    findings.info.length;

  if (totalFindings === 0) {
    console.log(`${colors.green}✅ No security issues found!${colors.reset}\n`);
    process.exit(0);
  }

  // Print by severity
  const severityConfig = {
    critical: { color: colors.red, icon: '🚨', label: 'CRITICAL' },
    high: { color: colors.red, icon: '❌', label: 'HIGH' },
    medium: { color: colors.yellow, icon: '⚠️ ', label: 'MEDIUM' },
    low: { color: colors.yellow, icon: '⚡', label: 'LOW' },
    info: { color: colors.blue, icon: 'ℹ️ ', label: 'INFO' }
  };

  Object.entries(severityConfig).forEach(([severity, config]) => {
    if (findings[severity].length === 0) return;

    console.log(`${config.color}${config.icon} ${config.label} (${findings[severity].length})${colors.reset}\n`);

    findings[severity].forEach(finding => {
      console.log(`  ${colors.gray}${finding.file}:${finding.line}${colors.reset}`);
      console.log(`  ${finding.message}`);
      if (finding.code) {
        console.log(`  ${colors.gray}Code: ${finding.code}${colors.reset}`);
      }
      console.log(`  ${colors.blue}→ ${finding.suggestion}${colors.reset}`);
      console.log('');
    });
  });

  // Summary
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.red}Total Issues: ${totalFindings}${colors.reset}`);
  console.log(`  Critical: ${findings.critical.length}`);
  console.log(`  High: ${findings.high.length}`);
  console.log(`  Medium: ${findings.medium.length}`);
  console.log(`  Low: ${findings.low.length}`);
  console.log(`  Info: ${findings.info.length}`);
  console.log('');

  // Exit with error if critical or high severity issues found
  if (findings.critical.length > 0 || findings.high.length > 0) {
    console.log(`${colors.red}❌ Security linting failed - critical or high severity issues found${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.yellow}⚠️  Security linting passed with warnings${colors.reset}\n`);
    process.exit(0);
  }
}

// Run the scanner
scanFiles();

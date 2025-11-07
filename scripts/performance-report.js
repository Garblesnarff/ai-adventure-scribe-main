#!/usr/bin/env node

/**
 * Performance Report Generator
 *
 * Generates a summary of performance metrics from Lighthouse CI results
 * and Web Vitals data.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatTime(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function getScoreColor(score) {
  if (score >= 0.9) return colors.green;
  if (score >= 0.5) return colors.yellow;
  return colors.red;
}

function getRating(value, thresholds) {
  if (value <= thresholds.good) return { rating: 'GOOD', color: colors.green };
  if (value <= thresholds.needsImprovement) return { rating: 'NEEDS IMPROVEMENT', color: colors.yellow };
  return { rating: 'POOR', color: colors.red };
}

async function generateReport() {
  console.log(`\n${colors.bright}${colors.cyan}=== Performance Report ===${colors.reset}\n`);

  // Check for Lighthouse results
  const lhciDir = path.join(__dirname, '..', '.lighthouseci');

  if (!fs.existsSync(lhciDir)) {
    console.log(`${colors.yellow}No Lighthouse CI results found.${colors.reset}`);
    console.log(`Run ${colors.cyan}npm run lighthouse${colors.reset} to generate performance data.\n`);
    return;
  }

  // Find the latest run
  const runs = fs.readdirSync(lhciDir)
    .filter(file => file.startsWith('lhr-'))
    .sort()
    .reverse();

  if (runs.length === 0) {
    console.log(`${colors.yellow}No Lighthouse results found in .lighthouseci directory.${colors.reset}\n`);
    return;
  }

  // Read the latest result
  const latestRun = path.join(lhciDir, runs[0]);
  const lhr = JSON.parse(fs.readFileSync(latestRun, 'utf8'));

  // Display Lighthouse Scores
  console.log(`${colors.bright}Lighthouse Scores${colors.reset}`);
  console.log('─────────────────────────────────────────\n');

  const categories = lhr.categories;
  Object.entries(categories).forEach(([key, category]) => {
    const score = category.score || 0;
    const color = getScoreColor(score);
    const percentage = Math.round(score * 100);

    console.log(`${category.title.padEnd(20)} ${color}${percentage}${colors.reset}/100`);
  });

  // Display Core Web Vitals
  console.log(`\n${colors.bright}Core Web Vitals${colors.reset}`);
  console.log('─────────────────────────────────────────\n');

  const metrics = {
    'first-contentful-paint': { name: 'FCP', thresholds: { good: 1800, needsImprovement: 3000 } },
    'largest-contentful-paint': { name: 'LCP', thresholds: { good: 2500, needsImprovement: 4000 } },
    'total-blocking-time': { name: 'TBT', thresholds: { good: 200, needsImprovement: 600 } },
    'cumulative-layout-shift': { name: 'CLS', thresholds: { good: 0.1, needsImprovement: 0.25 } },
    'speed-index': { name: 'Speed Index', thresholds: { good: 3400, needsImprovement: 5800 } },
    'interactive': { name: 'TTI', thresholds: { good: 3800, needsImprovement: 7300 } },
  };

  Object.entries(metrics).forEach(([key, config]) => {
    const audit = lhr.audits[key];
    if (audit && audit.numericValue !== undefined) {
      let value = audit.numericValue;

      // CLS is already in the correct format
      if (key !== 'cumulative-layout-shift') {
        value = Math.round(value);
      }

      const { rating, color } = getRating(value, config.thresholds);
      const displayValue = key === 'cumulative-layout-shift'
        ? value.toFixed(3)
        : formatTime(value);

      console.log(`${config.name.padEnd(15)} ${color}${displayValue.padEnd(10)}${colors.reset} [${rating}]`);
    }
  });

  // Display Resource Summary
  console.log(`\n${colors.bright}Resource Summary${colors.reset}`);
  console.log('─────────────────────────────────────────\n');

  const resourceSummary = lhr.audits['resource-summary'];
  if (resourceSummary && resourceSummary.details && resourceSummary.details.items) {
    resourceSummary.details.items.forEach(item => {
      const size = formatBytes(item.transferSize);
      const requests = item.requestCount;
      console.log(`${item.label.padEnd(20)} ${size.padStart(12)} (${requests} requests)`);
    });
  }

  // Display Opportunities
  console.log(`\n${colors.bright}Top Opportunities${colors.reset}`);
  console.log('─────────────────────────────────────────\n');

  const opportunities = Object.entries(lhr.audits)
    .filter(([_, audit]) => audit.details && audit.details.type === 'opportunity')
    .map(([key, audit]) => ({
      title: audit.title,
      savings: audit.numericValue || 0,
      score: audit.score || 0,
    }))
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 5);

  if (opportunities.length > 0) {
    opportunities.forEach((opp, i) => {
      const savings = formatTime(opp.savings);
      console.log(`${(i + 1)}. ${opp.title}`);
      console.log(`   Potential savings: ${colors.cyan}${savings}${colors.reset}\n`);
    });
  } else {
    console.log(`${colors.green}No major optimization opportunities found!${colors.reset}\n`);
  }

  // Display Diagnostics
  console.log(`${colors.bright}Key Diagnostics${colors.reset}`);
  console.log('─────────────────────────────────────────\n');

  const diagnostics = {
    'bootup-time': 'JavaScript Execution Time',
    'mainthread-work-breakdown': 'Main Thread Work',
    'dom-size': 'DOM Size',
    'network-rtt': 'Network RTT',
  };

  Object.entries(diagnostics).forEach(([key, label]) => {
    const audit = lhr.audits[key];
    if (audit) {
      const value = audit.displayValue || audit.numericValue;
      const color = audit.score >= 0.9 ? colors.green : audit.score >= 0.5 ? colors.yellow : colors.red;
      console.log(`${label.padEnd(30)} ${color}${value}${colors.reset}`);
    }
  });

  console.log(`\n${colors.bright}Report Location:${colors.reset} ${latestRun}`);
  console.log(`${colors.bright}Tested URL:${colors.reset} ${lhr.finalUrl}`);
  console.log(`${colors.bright}Timestamp:${colors.reset} ${new Date(lhr.fetchTime).toLocaleString()}\n`);

  // Budget Status
  console.log(`${colors.bright}Performance Budget Status${colors.reset}`);
  console.log('─────────────────────────────────────────\n');

  const budgetTargets = {
    performance: 0.85,
    accessibility: 0.90,
    'best-practices': 0.85,
  };

  let passing = true;
  Object.entries(budgetTargets).forEach(([key, target]) => {
    const score = categories[key]?.score || 0;
    const status = score >= target ? '✓ PASS' : '✗ FAIL';
    const color = score >= target ? colors.green : colors.red;

    if (score < target) passing = false;

    console.log(`${key.padEnd(20)} ${color}${status}${colors.reset} (${Math.round(score * 100)}/100, target: ${Math.round(target * 100)})`);
  });

  console.log();

  if (passing) {
    console.log(`${colors.green}${colors.bright}✓ All performance budgets met!${colors.reset}\n`);
  } else {
    console.log(`${colors.red}${colors.bright}✗ Some performance budgets not met${colors.reset}\n`);
    process.exit(1);
  }
}

generateReport().catch(error => {
  console.error(`${colors.red}Error generating report:${colors.reset}`, error);
  process.exit(1);
});

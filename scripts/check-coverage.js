#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const summaryPath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');

if (!fs.existsSync(summaryPath)) {
  console.error('coverage-summary.json not found. Run the tests with coverage first (npm run test:coverage).');
  process.exit(2);
}

const data = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const total = data.total || {};

const defaultThreshold = process.env.COVERAGE_THRESHOLD ? Number(process.env.COVERAGE_THRESHOLD) : 80;
const thresholds = {
  statements: process.env.COVERAGE_STATEMENTS ? Number(process.env.COVERAGE_STATEMENTS) : defaultThreshold,
  lines: process.env.COVERAGE_LINES ? Number(process.env.COVERAGE_LINES) : defaultThreshold,
  branches: process.env.COVERAGE_BRANCHES ? Number(process.env.COVERAGE_BRANCHES) : defaultThreshold,
  functions: process.env.COVERAGE_FUNCTIONS ? Number(process.env.COVERAGE_FUNCTIONS) : defaultThreshold,
};

let failed = false;
for (const key of Object.keys(thresholds)) {
  const actual = total[key] && total[key].pct;
  const need = thresholds[key];
  if (typeof actual !== 'number') continue;
  if (actual < need) {
    console.error(`Coverage for ${key} (${actual}%) is below threshold (${need}%)`);
    failed = true;
  } else {
    console.log(`Coverage for ${key} (${actual}%) meets threshold (${need}%)`);
  }
}

if (failed) {
  console.error('Coverage checks failed.');
  process.exit(1);
}

console.log('All coverage checks passed.');
process.exit(0);

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// This fork serves Vietcap manual QC without access to the product codebase; these upstream skills need code, automation, or Testomat.io, do another role's work, or cover the whole product at once, which is too big to run.
const REMOVED = [
  'automate-manual-test-cases',
  'catalog-features',
  'debug-fix-failed-flaky-autotests',
  'detect-product-mismatches',
  'detect-useless-tests',
  'epic-requirement-reviewer',
  'epic-requirements-specification',
  'explorbot-fundamentals',
  'explorbot-plan',
  'explorbot-setup',
  'migrate-to-testomatio',
  'prima',
  'pull-request-diff-analyzer',
  'qa-automation-test-consolidation',
  'qa-data-seeder',
  'qa-e2e-tests-reporting',
  'qa-explain-behavior',
  'qa-lead-strategy-advisor',
  'qa-pr-requirements-analyzer',
  'qa-review-pr',
  'qa-split-testing-levels-pyramid',
  'qa-sprint-report-by-testomatio',
  'qa-test-code-coverage',
  'qa-thinking',
  'run-tests-with-testomatio-reporter',
  'scan-automation-project',
  'setup-change-aware-pr-testing',
  'setup-ci-automation',
  'sync-test-cases-with-tms',
  'testomat-allure-adapter',
  'testomatio-mcp',
  'wiki-from-code',
  'write-user-story',
];

const walk = (dir) =>
  readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name));

const textFiles = [
  ...walk('skills'),
  ...walk('docs'),
  ...['README.md', 'SKILL-GUIDE.md', '.claude-plugin/marketplace.json', '.claude-plugin/plugin.json'].map((f) => join(ROOT, f)),
].filter((f) => /\.(md|json|mjs|js|ya?ml|txt)$/.test(f));

const rel = (f) => relative(ROOT, f);

test('removed skills are not in skills/', () => {
  assert.deepEqual(REMOVED.filter((name) => existsSync(join(ROOT, 'skills', name))), []);
});

test('no file mentions a removed skill', () => {
  const pattern = new RegExp(`(?<![\\w-])(${REMOVED.join('|')})(?![\\w-])`, 'g');
  const hits = textFiles.flatMap((f) =>
    readFileSync(f, 'utf8')
      .split('\n')
      .flatMap((line, i) => [...line.matchAll(pattern)].map((m) => `${rel(f)}:${i + 1} ${m[1]}`)),
  );
  assert.deepEqual(hits, []);
});

test('the marketplace ships one plugin from the repository root', () => {
  const { plugins } = JSON.parse(readFileSync(join(ROOT, '.claude-plugin/marketplace.json'), 'utf8'));
  assert.deepEqual(plugins.map((p) => p.source), ['./']);
  assert.equal(existsSync(join(ROOT, 'plugins')), false);
});

test('relative links inside skills resolve', () => {
  const broken = walk('skills')
    .filter((f) => f.endsWith('.md'))
    .flatMap((f) => {
      const targets = [...readFileSync(f, 'utf8').replace(/^```[\s\S]*?^```/gm, '').matchAll(/\]\(([^)\s]+)\)/g)]
        .map((m) => m[1].split('#')[0])
        .filter((target) => /[./]/.test(target) && !/^[a-z]+:/i.test(target));
      return targets
        .filter((target) => !existsSync(join(dirname(f), target)))
        .map((target) => `${rel(f)} -> ${target}`);
    });
  assert.deepEqual(broken, []);
});

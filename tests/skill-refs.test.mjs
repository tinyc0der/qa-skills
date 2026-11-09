import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// This fork serves manual QC without access to the product codebase; these upstream skills need code, automation, or Testomat.io.
const REMOVED = [
  'automate-manual-test-cases',
  'debug-fix-failed-flaky-autotests',
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
  'qa-pr-requirements-analyzer',
  'qa-review-pr',
  'qa-split-testing-levels-pyramid',
  'qa-sprint-report-by-testomatio',
  'qa-test-code-coverage',
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

const plugins = readdirSync(join(ROOT, 'plugins'));

const textFiles = [
  ...walk('skills'),
  ...walk('docs'),
  ...['README.md', 'SKILL-GUIDE.md', '.claude-plugin/marketplace.json'].map((f) => join(ROOT, f)),
  ...plugins.map((p) => join(ROOT, 'plugins', p, '.claude-plugin/plugin.json')),
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

test('every plugin skill link resolves', () => {
  const broken = plugins.flatMap((p) =>
    readdirSync(join(ROOT, 'plugins', p, 'skills'))
      .map((s) => join(ROOT, 'plugins', p, 'skills', s))
      .filter((s) => !existsSync(s))
      .map(rel),
  );
  assert.deepEqual(broken, []);
});

test('every marketplace plugin bundles at least one skill', () => {
  const { plugins: listed } = JSON.parse(readFileSync(join(ROOT, '.claude-plugin/marketplace.json'), 'utf8'));
  const empty = listed.filter((p) => readdirSync(join(ROOT, p.source, 'skills')).length === 0).map((p) => p.name);
  assert.deepEqual(empty, []);
  assert.deepEqual(listed.map((p) => p.source.replace('./plugins/', '')).sort(), [...plugins].sort());
});

test('relative links inside skills resolve', () => {
  const broken = walk('skills')
    .filter((f) => f.endsWith('.md'))
    .flatMap((f) =>
      [...readFileSync(f, 'utf8').replace(/^```[\s\S]*?^```/gm, '').matchAll(/\]\(([^)\s]+)\)/g)]
        .map((m) => m[1].split('#')[0])
        .filter((target) => /[./]/.test(target) && !/^[a-z]+:/i.test(target))
        .filter((target) => !existsSync(join(dirname(f), target)))
        .map((target) => `${rel(f)} -> ${target}`),
    );
  assert.deepEqual(broken, []);
});

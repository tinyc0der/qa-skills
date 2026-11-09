import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildPriorityMap, parseTestMd, toCasePayload, writeBackIds } from '../../skills/sync-test-cases-with-testrail/scripts/testrail.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(here, '../../skills/sync-test-cases-with-testrail/scripts/testrail.mjs');
const FIXTURES = join(here, 'fixtures');

const FULL_SUITE = `<!-- suite
id: @S380c64db
emoji: 🔐
tags: smoke, regression
assignee: qa@example.com
-->

# Login Functionality

This suite contains manual tests for the login process.

<!-- test
id: @T12345678
type: manual
priority: high
assignee: qa@example.com
tags: critical
-->

# Successful Login

A user should be able to log in with valid credentials.

## Steps

- Navigate to the login page
  *Expected*: Login form is displayed with username and password fields
- Enter a valid username and password
  *Expected*: Credentials are entered without errors
- Click the "Login" button
  *Expected*: User is redirected to the dashboard

<!-- example -->

| Username | Password | Role  |
| -------- | -------- | ----- |
| admin    | admin123 | admin |
| user     | user123  | user  |
`;

const MULTI_SUITE = `<!-- suite
id: @S12345678
-->

# Suite One

Description for suite one

<!-- test
id: @Ta1b2c3d4
-->

# Test One

Description

<!-- suite
id: @S98765432
-->

# Suite Two

Description for suite two
`;

test('parseTestMd reads a full suite with metadata, bulleted steps and examples', () => {
  const { suites } = parseTestMd(FULL_SUITE);
  assert.equal(suites.length, 1);
  const [suite] = suites;
  assert.equal(suite.title, 'Login Functionality');
  assert.equal(suite.description, 'This suite contains manual tests for the login process.');
  assert.deepEqual(suite.meta, {
    id: '@S380c64db',
    emoji: '🔐',
    tags: 'smoke, regression',
    assignee: 'qa@example.com',
  });
  const [t] = suite.tests;
  assert.equal(t.title, 'Successful Login');
  assert.equal(t.description, 'A user should be able to log in with valid credentials.');
  assert.equal(t.meta.priority, 'high');
  assert.equal(t.steps.length, 3);
  assert.deepEqual(t.steps[0], {
    content: 'Navigate to the login page',
    expected: 'Login form is displayed with username and password fields',
  });
  assert.equal(t.steps[2].expected, 'User is redirected to the dashboard');
  assert.equal(
    t.examples,
    '| Username | Password | Role  |\n| -------- | -------- | ----- |\n| admin    | admin123 | admin |\n| user     | user123  | user  |',
  );
});

test('parseTestMd reads numbered steps', () => {
  const md = `<!-- suite
id: @S33333333
-->

# API Testing

<!-- test
priority: critical
-->

# Create new user via API

Verify creation.

## Steps

1. Send POST request to \`/api/users\` with valid user data
   *Expected*: Response status code is 201
2. Verify response contains user ID and created timestamp
   *Expected*: Response includes \`id\` and \`createdAt\` fields
`;
  const [t] = parseTestMd(md).suites[0].tests;
  assert.deepEqual(t.steps, [
    { content: 'Send POST request to `/api/users` with valid user data', expected: 'Response status code is 201' },
    {
      content: 'Verify response contains user ID and created timestamp',
      expected: 'Response includes `id` and `createdAt` fields',
    },
  ]);
});

test('parseTestMd joins several expected lines and keeps code blocks on the step', () => {
  const md = `<!-- suite
-->

# S

<!-- test
-->

# T

## Steps

- Send the request
  \`\`\`json
  { "a": 1 }
  \`\`\`
  *Expected*: Status is 200
  *Expected result*: Body echoes the payload
- Plain step
  - *Expected*: Nested bullet expectation
`;
  const [t] = parseTestMd(md).suites[0].tests;
  assert.equal(t.steps[0].content, 'Send the request\n```json\n{ "a": 1 }\n```');
  assert.equal(t.steps[0].expected, 'Status is 200\nBody echoes the payload');
  assert.deepEqual(t.steps[1], { content: 'Plain step', expected: 'Nested bullet expectation' });
});

test('parseTestMd strips inline tags and reads examples without a standalone suite', () => {
  const md = `<!-- test
-->

# API test with multiple endpoints @smoke @regression

Test API endpoints with different parameters

<!-- example -->

| Endpoint | Method | Status |
| -------- | ------ | ------ |
| /users   | GET    | 200    |
| /posts   | POST   | 201    |
`;
  const [t] = parseTestMd(md).suites[0].tests;
  assert.equal(t.title, 'API test with multiple endpoints');
  assert.equal(t.description, 'Test API endpoints with different parameters');
  assert.match(t.examples, /^\| Endpoint \| Method \| Status \|\n/);
  assert.equal(t.steps.length, 0);
});

test('parseTestMd keeps a headerless example table', () => {
  const md = `<!-- test
-->

# Test with Examples No Params

Test description

<!-- example
-->

| Value1 | Value2 |
`;
  assert.equal(parseTestMd(md).suites[0].tests[0].examples, '| Value1 | Value2 |');
});

const TABLE = '| User | Password |\n| --- | --- |\n| ann | pw1 |';
const STEPS_MD = `## Steps

1. Open the login page
   **Expected:** form is shown
2. Submit credentials
   **Expected:** dashboard opens
`;
const TEST_HEAD = `<!-- test
priority: high
-->

# Login with data

Checks login.

## Preconditions

- Account exists
`;
const EXAMPLE_MD = `<!-- example
-->

${TABLE}
`;
const tableAfterSteps = `${TEST_HEAD}\n${STEPS_MD}\n${EXAMPLE_MD}`;
const tableBeforeSteps = `${TEST_HEAD}\n${EXAMPLE_MD}\n${STEPS_MD}`;

test('parseTestMd keeps steps when the example table comes before Steps', () => {
  const t = parseTestMd(tableBeforeSteps).suites[0].tests[0];
  assert.equal(t.title, 'Login with data');
  assert.equal(t.description, 'Checks login.\n\n## Preconditions\n\n- Account exists');
  assert.equal(t.examples, TABLE);
  assert.deepEqual(t.steps, [
    { content: 'Open the login page', expected: 'form is shown' },
    { content: 'Submit credentials', expected: 'dashboard opens' },
  ]);
});

test('parseTestMd gives the same test whether the example table is before or after Steps', () => {
  const before = parseTestMd(tableBeforeSteps).suites[0].tests[0];
  const after = parseTestMd(tableAfterSteps).suites[0].tests[0];
  assert.deepEqual(before, after);
  assert.deepEqual(
    toCasePayload(before, emptySuite, ctx),
    toCasePayload(after, emptySuite, ctx),
  );
});

test('parseTestMd ends the example table at the first non-table line', () => {
  const md = `${TEST_HEAD}\n${EXAMPLE_MD}\nNote: ann is locked out\n\n| stray |\n\n${STEPS_MD}`;
  const t = parseTestMd(md).suites[0].tests[0];
  assert.equal(t.examples, TABLE);
  assert.equal(t.steps.length, 2);
  assert.match(t.description, /Note: ann is locked out/);
});

test('parseTestMd handles several suites in one file', () => {
  const { suites } = parseTestMd(MULTI_SUITE);
  assert.deepEqual(
    suites.map((s) => [s.title, s.description, s.tests.length]),
    [
      ['Suite One', 'Description for suite one', 1],
      ['Suite Two', 'Description for suite two', 0],
    ],
  );
  assert.equal(suites[0].tests[0].title, 'Test One');
  assert.equal(suites[0].tests[0].meta.id, '@Ta1b2c3d4');
});

const priorities = buildPriorityMap([
  { id: 1, name: 'Low', short_name: 'Low' },
  { id: 2, name: 'Medium', short_name: 'Med' },
  { id: 3, name: 'High', short_name: 'High' },
  { id: 4, name: 'Critical', short_name: 'Crit' },
]);
const ctx = { priorityIdByName: priorities, templateId: 7 };
const emptySuite = { meta: {} };
const mkTest = (over = {}) => ({ title: 'T', description: '', meta: {}, steps: [], examples: null, ...over });

test('toCasePayload resolves priority names, short names and aliases case-insensitively', () => {
  const cases = { HIGH: 3, med: 2, normal: 2, important: 3, Critical: 4, low: 1 };
  for (const [value, id] of Object.entries(cases)) {
    assert.equal(toCasePayload(mkTest({ meta: { priority: value } }), emptySuite, ctx).priority_id, id, value);
  }
});

test('toCasePayload falls back to the suite priority and omits unknown or missing values', () => {
  assert.equal(toCasePayload(mkTest(), { meta: { priority: 'critical' } }, ctx).priority_id, 4);
  assert.equal(toCasePayload(mkTest({ meta: { priority: 'low' } }), { meta: { priority: 'critical' } }, ctx).priority_id, 1);
  assert.ok(!('priority_id' in toCasePayload(mkTest({ meta: { priority: 'urgent' } }), emptySuite, ctx)));
  assert.ok(!('priority_id' in toCasePayload(mkTest(), emptySuite, ctx)));
});

test('toCasePayload builds preconditions, refs and steps and omits empty fields', () => {
  const bare = toCasePayload(mkTest(), emptySuite, ctx);
  assert.deepEqual(bare, { title: 'T', template_id: 7 });

  const full = toCasePayload(
    mkTest({
      description: 'Why this matters',
      meta: { refs: 'JIRA-1' },
      steps: [{ content: 'Do', expected: 'A\nB' }],
      examples: '| a |\n| --- |\n| 1 |',
    }),
    emptySuite,
    ctx,
  );
  assert.equal(full.refs, 'JIRA-1');
  assert.equal(full.custom_preconds, 'Why this matters\n\nTest data:\n| a |\n| --- |\n| 1 |');
  assert.deepEqual(full.custom_steps_separated, [{ content: 'Do', expected: 'A\nB' }]);

  const onlyExamples = toCasePayload(mkTest({ examples: '| a |' }), { meta: { refs: 'S-9' } }, ctx);
  assert.equal(onlyExamples.custom_preconds, 'Test data:\n| a |');
  assert.equal(onlyExamples.refs, 'S-9');
});

const ids = {
  sections: [{ suiteIndex: 0, sectionId: 12 }],
  cases: [{ suiteIndex: 0, testIndex: 0, caseId: 345 }],
};

test('writeBackIds inserts ids before the closing marker and changes nothing else', () => {
  const out = writeBackIds(FULL_SUITE, ids);
  assert.match(out, /tags: smoke, regression\nassignee: qa@example.com\ntestrail_section_id: 12\n-->/);
  assert.match(out, /tags: critical\ntestrail_id: C345\n-->/);
  assert.equal(out.replace(/^testrail_[a-z_]+: .*\n/gm, ''), FULL_SUITE);
});

test('writeBackIds replaces existing values and is idempotent', () => {
  const once = writeBackIds(FULL_SUITE, ids);
  assert.equal(writeBackIds(once, ids), once);
  const changed = writeBackIds(once, { sections: [{ suiteIndex: 0, sectionId: 99 }], cases: [{ suiteIndex: 0, testIndex: 0, caseId: 'C7' }] });
  assert.equal(changed.match(/testrail_section_id/g).length, 1);
  assert.equal(changed.match(/testrail_id/g).length, 1);
  assert.match(changed, /testrail_section_id: 99\n/);
  assert.match(changed, /testrail_id: C7\n/);
});

test('writeBackIds targets the right block in multi-suite files and handles one-line markers', () => {
  const out = writeBackIds(MULTI_SUITE, {
    sections: [{ suiteIndex: 1, sectionId: 8 }],
    cases: [{ suiteIndex: 0, testIndex: 0, caseId: 5 }],
  });
  assert.match(out, /id: @S98765432\ntestrail_section_id: 8\n-->/);
  assert.match(out, /id: @Ta1b2c3d4\ntestrail_id: C5\n-->/);
  assert.doesNotMatch(out, /@S12345678\ntestrail/);

  const inline = '<!-- suite -->\n\n# S\n\n<!-- test -->\n\n# T\n';
  const res = writeBackIds(inline, { sections: [{ suiteIndex: 0, sectionId: 1 }], cases: [{ suiteIndex: 0, testIndex: 0, caseId: 2 }] });
  assert.equal(res, '<!-- suite\ntestrail_section_id: 1\n-->\n\n# S\n\n<!-- test\ntestrail_id: C2\n-->\n\n# T\n');
  assert.equal(writeBackIds(res, { sections: [{ suiteIndex: 0, sectionId: 1 }], cases: [{ suiteIndex: 0, testIndex: 0, caseId: 2 }] }), res);
});

const STATUSES = [
  { id: 1, label: 'Passed' },
  { id: 2, label: 'Blocked' },
  { id: 3, label: 'Untested' },
  { id: 4, label: 'Retest' },
  { id: 5, label: 'Failed' },
  { id: 6, label: 'In Progress' },
  { id: 7, label: 'Skipped' },
];

function startMock(opts = {}) {
  const state = {
    requests: [],
    suites: opts.suites ?? [{ id: 1, name: 'Master' }],
    sections: [...(opts.sections ?? [])],
    cases: [...(opts.cases ?? [])],
    nextSection: 10,
    nextCase: 100,
    limited: 0,
  };
  const json = (res, status, body, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
    res.end(JSON.stringify(body));
  };
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const m = req.url.match(/^\/index\.php\?\/api\/v2\/([a-z_]+)\/?([^&]*)(?:&(.*))?$/);
      const [, name, id, qs] = m ?? [];
      const query = new URLSearchParams(qs ?? '');
      const body = raw ? JSON.parse(raw) : undefined;
      state.requests.push({ method: req.method, name, id, query, body });
      const expected = `Basic ${Buffer.from('qa@example.com:secret-key').toString('base64')}`;
      if (req.headers.authorization !== expected) return json(res, 401, { error: 'bad auth' });
      if (opts.rateLimitFirst === name && !state.limited++) {
        return json(res, 429, { error: 'slow down' }, { 'Retry-After': '0' });
      }
      switch (name) {
        case 'get_suites':
          return json(res, 200, state.suites);
        case 'get_priorities':
          return json(res, 200, [
            { id: 1, name: 'Low', short_name: 'Low' },
            { id: 2, name: 'Medium', short_name: 'Medium' },
            { id: 3, name: 'High', short_name: 'High' },
            { id: 4, name: 'Critical', short_name: 'Critical' },
          ]);
        case 'get_templates':
          return json(res, 200, [
            { id: 1, name: 'Test Case (Text)', is_default: true },
            { id: 2, name: 'Test Case (Steps)', is_default: false },
          ]);
        case 'get_sections': {
          if (!opts.pageSize) return json(res, 200, state.sections);
          const offset = Number(query.get('offset') ?? 0);
          const slice = state.sections.slice(offset, offset + opts.pageSize);
          const more = offset + opts.pageSize < state.sections.length;
          return json(res, 200, {
            offset,
            limit: opts.pageSize,
            size: slice.length,
            _links: {
              next: more ? `/api/v2/get_sections/${id}&suite_id=1&limit=${opts.pageSize}&offset=${offset + opts.pageSize}` : null,
              prev: null,
            },
            sections: slice,
          });
        }
        case 'get_cases':
          return json(res, 200, { offset: 0, limit: 250, size: state.cases.length, _links: { next: null, prev: null }, cases: state.cases });
        case 'add_section': {
          const s = { id: state.nextSection++, suite_id: body.suite_id, name: body.name, parent_id: body.parent_id ?? null };
          state.sections.push(s);
          return json(res, 200, s);
        }
        case 'add_case': {
          const c = { id: state.nextCase++, section_id: Number(id), title: body.title };
          state.cases.push(c);
          return json(res, 200, c);
        }
        case 'update_case':
          return json(res, 200, { id: Number(id), ...body });
        case 'get_statuses':
          return json(res, 200, STATUSES);
        case 'get_milestones':
          return json(res, 200, { _links: { next: null }, milestones: opts.milestones ?? [] });
        case 'get_runs':
          return json(res, 200, { _links: { next: null }, runs: opts.runs ?? [] });
        case 'get_plans':
          return json(res, 200, { _links: { next: null }, plans: (opts.plans ?? []).map(({ entries, ...p }) => p) });
        case 'get_plan':
          return json(res, 200, opts.plans.find((p) => p.id === Number(id)));
        case 'get_tests': {
          const wanted = query.get('status_id').split(',').map(Number);
          const tests = (opts.tests?.[id] ?? []).filter((t) => wanted.includes(t.status_id));
          return json(res, 200, { _links: { next: null }, tests });
        }
        case 'get_results_for_run': {
          const wanted = query.get('status_id').split(',').map(Number);
          const results = (opts.results?.[id] ?? []).filter((r) => wanted.includes(r.status_id));
          return json(res, 200, { _links: { next: null }, results });
        }
        default:
          return json(res, 400, { error: `unknown endpoint ${req.url}` });
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ state, port: server.address().port, close: () => new Promise((r) => server.close(r)) });
    });
  });
}

function runCli(args, { env = {}, cwd }) {
  return new Promise((resolve) => {
    execFile(process.execPath, [SCRIPT, ...args], { cwd, env: { PATH: process.env.PATH, ...env } }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
  });
}

const baseEnv = (port, extra = {}) => ({
  TESTRAIL_URL: `http://127.0.0.1:${port}`,
  TESTRAIL_USER: 'qa@example.com',
  TESTRAIL_API_KEY: 'secret-key',
  TESTRAIL_PROJECT_ID: '1',
  ...extra,
});

function workdir() {
  const dir = mkdtempSync(join(tmpdir(), 'testrail-'));
  copyFileSync(join(FIXTURES, 'login.test.md'), join(dir, 'login.test.md'));
  return dir;
}

const posts = (state) => state.requests.filter((r) => r.method === 'POST');
const named = (state, name) => state.requests.filter((r) => r.name === name);

test('push creates the section and cases, writes ids back, then only updates on re-run', async () => {
  const mock = await startMock();
  const cwd = workdir();
  const file = join(cwd, 'login.test.md');
  const original = readFileSync(file, 'utf8');
  try {
    const first = await runCli(['push', 'login.test.md'], { env: baseEnv(mock.port), cwd });
    assert.equal(first.code, 0, first.stderr);
    assert.equal(named(mock.state, 'add_section').length, 1);
    assert.deepEqual(named(mock.state, 'add_section')[0].body, {
      name: 'Login Functionality',
      suite_id: 1,
      description: 'Tests for the login process.',
    });
    const adds = named(mock.state, 'add_case');
    assert.equal(adds.length, 2);
    assert.equal(adds[0].id, '10');
    assert.equal(adds[0].body.title, 'User can log in with valid credentials');
    assert.equal(adds[0].body.template_id, 2);
    assert.equal(adds[0].body.priority_id, 2);
    assert.equal(adds[0].body.custom_steps_separated.length, 2);
    assert.match(adds[0].body.custom_preconds, /Test data:\n\| Username \| Password \|/);
    assert.equal(adds[1].body.priority_id, 3);
    assert.deepEqual(adds[1].body.custom_steps_separated[1], { content: 'Submit a wrong password', expected: 'Error message is shown' });
    assert.match(first.stdout, /sections created 1, reused 0; cases added 2, updated 0/);

    const written = readFileSync(file, 'utf8');
    assert.match(written, /testrail_section_id: 10\n-->/);
    assert.match(written, /testrail_id: C100\n-->/);
    assert.match(written, /testrail_id: C101\n-->/);
    assert.equal(written.replace(/^testrail_[a-z_]+: .*\n/gm, ''), original);
    assert.doesNotMatch(first.stdout + first.stderr, /secret-key/);

    mock.state.requests.length = 0;
    const second = await runCli(['push', 'login.test.md'], { env: baseEnv(mock.port), cwd });
    assert.equal(second.code, 0, second.stderr);
    assert.equal(named(mock.state, 'add_section').length, 0);
    assert.equal(named(mock.state, 'add_case').length, 0);
    assert.deepEqual(named(mock.state, 'update_case').map((r) => r.id), ['100', '101']);
    assert.equal(readFileSync(file, 'utf8'), written);
    assert.match(second.stdout, /cases added 0, updated 2/);
  } finally {
    await mock.close();
  }
});

test('push --dry-run sends no POST and leaves the file untouched', async () => {
  const mock = await startMock();
  const cwd = workdir();
  const file = join(cwd, 'login.test.md');
  const before = readFileSync(file, 'utf8');
  try {
    const run = await runCli(['push', 'login.test.md', '--dry-run', '--parent-section', 'Web'], { env: baseEnv(mock.port), cwd });
    assert.equal(run.code, 0, run.stderr);
    assert.equal(posts(mock.state).length, 0);
    assert.equal(readFileSync(file, 'utf8'), before);
    assert.match(run.stdout, /create section "Web"/);
    assert.match(run.stdout, /create section "Login Functionality"/);
    assert.match(run.stdout, /add case "User can log in with valid credentials"/);
  } finally {
    await mock.close();
  }
});

test('push follows paginated get_sections and reuses a section found on page two', async () => {
  const mock = await startMock({
    pageSize: 1,
    sections: [
      { id: 5, name: 'Other', parent_id: null },
      { id: 6, name: 'Login Functionality', parent_id: null },
    ],
  });
  const cwd = workdir();
  try {
    const run = await runCli(['push', 'login.test.md'], { env: baseEnv(mock.port), cwd });
    assert.equal(run.code, 0, run.stderr);
    assert.equal(named(mock.state, 'get_sections').length, 2);
    assert.equal(named(mock.state, 'add_section').length, 0);
    assert.equal(named(mock.state, 'add_case')[0].id, '6');
    assert.match(readFileSync(join(cwd, 'login.test.md'), 'utf8'), /testrail_section_id: 6\n/);
    assert.match(run.stdout, /sections created 0, reused 1/);
  } finally {
    await mock.close();
  }
});

test('push retries a 429 and succeeds', async () => {
  const mock = await startMock({ rateLimitFirst: 'get_priorities' });
  const cwd = workdir();
  try {
    const run = await runCli(['push', 'login.test.md'], { env: baseEnv(mock.port), cwd });
    assert.equal(run.code, 0, run.stderr);
    assert.equal(named(mock.state, 'get_priorities').length, 2);
    assert.equal(named(mock.state, 'add_case').length, 2);
  } finally {
    await mock.close();
  }
});

test('push exits 1 and lists suites when several exist and no suite id is set', async () => {
  const mock = await startMock({ suites: [{ id: 1, name: 'Master' }, { id: 2, name: 'Regression' }] });
  const cwd = workdir();
  try {
    const run = await runCli(['push', 'login.test.md'], { env: baseEnv(mock.port), cwd });
    assert.equal(run.code, 1);
    assert.match(run.stderr, /1 Master/);
    assert.match(run.stderr, /2 Regression/);
    assert.equal(posts(mock.state).length, 0);

    const withSuite = await runCli(['push', 'login.test.md'], { env: baseEnv(mock.port, { TESTRAIL_SUITE_ID: '2' }), cwd });
    assert.equal(withSuite.code, 0, withSuite.stderr);
    assert.equal(named(mock.state, 'add_section')[0].body.suite_id, 2);
  } finally {
    await mock.close();
  }
});

test('API errors exit 2 with endpoint, status and the TestRail error', async () => {
  const mock = await startMock();
  const cwd = workdir();
  try {
    const run = await runCli(['push', 'login.test.md'], { env: baseEnv(mock.port, { TESTRAIL_API_KEY: 'wrong-key' }), cwd });
    assert.equal(run.code, 2);
    assert.match(run.stderr, /get_suites/);
    assert.match(run.stderr, /401/);
    assert.match(run.stderr, /bad auth/);
    assert.doesNotMatch(run.stderr, /wrong-key/);
  } finally {
    await mock.close();
  }
});

test('missing config exits 1 naming the variables; .env supplies config for list', async () => {
  const cwd = workdir();
  const missing = await runCli(['push', 'login.test.md'], { env: {}, cwd });
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /TESTRAIL_URL/);
  assert.match(missing.stderr, /TESTRAIL_API_KEY/);

  const mock = await startMock({
    sections: [
      { id: 6, name: 'Login Functionality', parent_id: null },
      { id: 7, name: 'Nested', parent_id: 6 },
    ],
    cases: [{ id: 100, section_id: 6, title: 'Existing case' }, { id: 101, section_id: 7, title: 'Deep case' }],
  });
  try {
    const dotenv = Object.entries(baseEnv(mock.port)).map(([k, v]) => `${k}="${v}"`).join('\n');
    writeFileSync(join(cwd, '.env'), `# creds\n${dotenv}\n`);
    const list = await runCli(['list'], { env: {}, cwd });
    assert.equal(list.code, 0, list.stderr);
    assert.match(list.stdout, /Login Functionality/);
    assert.match(list.stdout, /C100 Existing case/);
    assert.match(list.stdout, /Nested/);

    const scoped = await runCli(['list', '--section', 'nested'], { env: {}, cwd });
    assert.match(scoped.stdout, /C101 Deep case/);
    assert.doesNotMatch(scoped.stdout, /C100/);
  } finally {
    await mock.close();
  }
});

test('no arguments or an unknown command print usage and exit 1', async () => {
  const cwd = workdir();
  for (const args of [[], ['bogus']]) {
    const run = await runCli(args, { cwd });
    assert.equal(run.code, 1);
    assert.match(run.stderr, /Usage:/);
  }
});

test('check passes a valid fixture offline and fails broken or empty files', async () => {
  const ok = await runCli(['check', join(FIXTURES, 'login.test.md')], { cwd: here });
  assert.equal(ok.code, 0, ok.stderr);
  assert.match(ok.stdout, /1 suites, 2 tests/);
  assert.doesNotMatch(ok.stdout, /without/);

  const broken = await runCli(['check', join(FIXTURES, 'broken.test.md')], { cwd: here });
  assert.equal(broken.code, 1);
  assert.match(broken.stdout, /tests without title: 1/);
  assert.match(broken.stdout, /unknown priority "urgent"/);
  assert.match(broken.stdout, /tests without steps/);

  const empty = await runCli(['check', join(FIXTURES, 'empty.test.md')], { cwd: here });
  assert.equal(empty.code, 1);
  assert.match(empty.stdout, /0 tests/);
});

const PULL_SECTIONS = [
  { id: 6, name: 'Web Login', parent_id: null, description: 'Login flows.' },
  { id: 7, name: 'SSO', parent_id: 6, description: '' },
  { id: 8, name: 'Empty', parent_id: null, description: '' },
];
const PULL_CASES = [
  {
    id: 100,
    section_id: 6,
    title: 'Log in with valid credentials',
    template_id: 2,
    priority_id: 3,
    refs: 'JIR-1, JIR-2',
    custom_preconds: 'User exists.\n\nTest data:\n| User | Pass |\n| --- | --- |\n| a | b |',
    custom_steps_separated: [
      { content: 'Open the login page', expected: 'Form is shown' },
      { content: 'Submit\n```json\n{ "a": 1 }\n```', expected: 'Redirected\nSession cookie set' },
    ],
  },
  { id: 101, section_id: 6, title: 'Text template case', template_id: 1, priority_id: 2, custom_steps: 'Do it', custom_expected: 'It works' },
  {
    id: 102,
    section_id: 7,
    title: 'SSO login',
    template_id: 2,
    priority_id: 4,
    custom_steps_separated: [{ content: 'Click SSO', expected: 'IdP page opens' }],
  },
];

test('pull writes one file per section that round-trips through check and push --dry-run', async () => {
  const mock = await startMock({ sections: PULL_SECTIONS, cases: PULL_CASES });
  const cwd = mkdtempSync(join(tmpdir(), 'testrail-'));
  try {
    const run = await runCli(['pull'], { env: baseEnv(mock.port), cwd });
    assert.equal(run.code, 0, run.stderr);
    assert.deepEqual(readdirSync(join(cwd, 'test-cases')).sort(), ['web-login--sso.test.md', 'web-login.test.md']);
    const text = readFileSync(join(cwd, 'test-cases/web-login.test.md'), 'utf8');
    assert.match(text, /^<!-- suite\ntestrail_section_id: 6\n-->\n\n# Web Login\n\nLogin flows\.\n/);
    assert.match(text, /testrail_id: C100\npriority: high\nrefs: JIR-1, JIR-2\n-->/);
    assert.match(text, /\*Expected\*: Redirected\n {2}Session cookie set/);
    const sso = readFileSync(join(cwd, 'test-cases/web-login--sso.test.md'), 'utf8');
    assert.match(sso, /# SSO\n/);
    assert.match(sso, /priority: critical/);

    const files = ['test-cases/web-login.test.md', 'test-cases/web-login--sso.test.md'];
    const check = await runCli(['check', ...files], { cwd });
    assert.equal(check.code, 0, check.stdout + check.stderr);

    const [first] = parseTestMd(text).suites[0].tests;
    assert.equal(first.steps[1].content, 'Submit\n```json\n{ "a": 1 }\n```');
    assert.equal(first.steps[1].expected, 'Redirected\nSession cookie set');

    mock.state.requests.length = 0;
    const dry = await runCli(['push', ...files, '--dry-run'], { env: baseEnv(mock.port), cwd });
    assert.equal(dry.code, 0, dry.stderr);
    assert.equal(posts(mock.state).length, 0);
    assert.doesNotMatch(dry.stdout, /add case|create section/);
    assert.doesNotMatch(dry.stdout, /update case C100|update case C102/);
    assert.match(dry.stdout, /update case C101/);
    assert.match(dry.stdout, /web-login--sso\.test\.md: sections created 0, reused 1; cases added 0, updated 0, unchanged 1/);

    const again = await runCli(['pull'], { env: baseEnv(mock.port), cwd });
    assert.equal(again.code, 0, again.stderr);
    assert.match(again.stdout, /unchanged web-login\.test\.md/);
  } finally {
    await mock.close();
  }
});

test('pull refuses to overwrite a differing local file unless --overwrite is given', async () => {
  const mock = await startMock({ sections: PULL_SECTIONS, cases: PULL_CASES });
  const cwd = mkdtempSync(join(tmpdir(), 'testrail-'));
  try {
    await runCli(['pull'], { env: baseEnv(mock.port), cwd });
    const file = join(cwd, 'test-cases/web-login.test.md');
    writeFileSync(file, `${readFileSync(file, 'utf8')}\nlocal edit\n`);
    const sso = join(cwd, 'test-cases/web-login--sso.test.md');
    writeFileSync(sso, 'stale');

    const refused = await runCli(['pull'], { env: baseEnv(mock.port), cwd });
    assert.equal(refused.code, 1);
    assert.match(refused.stderr, /Refusing to overwrite/);
    assert.match(refused.stderr, /web-login\.test\.md/);
    assert.match(readFileSync(file, 'utf8'), /local edit/);
    assert.equal(readFileSync(sso, 'utf8'), 'stale');

    const forced = await runCli(['pull', '--overwrite'], { env: baseEnv(mock.port), cwd });
    assert.equal(forced.code, 0, forced.stderr);
    assert.doesNotMatch(readFileSync(file, 'utf8'), /local edit/);
    assert.match(readFileSync(sso, 'utf8'), /# SSO/);
  } finally {
    await mock.close();
  }
});

test('pull --section limits output to that section and its children, and honors --out', async () => {
  const mock = await startMock({ sections: PULL_SECTIONS, cases: PULL_CASES });
  const cwd = mkdtempSync(join(tmpdir(), 'testrail-'));
  try {
    const run = await runCli(['pull', '--section', 'sso', '--out', 'out'], { env: baseEnv(mock.port), cwd });
    assert.equal(run.code, 0, run.stderr);
    assert.deepEqual(readdirSync(join(cwd, 'out')), ['web-login--sso.test.md']);

    const missing = await runCli(['pull', '--section', 'nope'], { env: baseEnv(mock.port), cwd });
    assert.equal(missing.code, 1);
    assert.match(missing.stderr, /Section not found: nope/);
  } finally {
    await mock.close();
  }
});

const counts = (passed, failed, blocked, retest, untested, extra = {}) => ({
  passed_count: passed,
  failed_count: failed,
  blocked_count: blocked,
  retest_count: retest,
  untested_count: untested,
  custom_status1_count: 0,
  custom_status2_count: 0,
  ...extra,
});

const RUNS_DATA = {
  milestones: [
    { id: 1, name: 'Release 2.0', parent_id: null, milestones: [{ id: 2, name: 'Sprint 42', parent_id: 1 }] },
    { id: 3, name: 'Sprint 41', parent_id: null },
  ],
  runs: [
    { id: 11, name: 'Login | SSO', refs: 'ABC-1', milestone_id: 2, is_completed: false, ...counts(6, 2, 1, 0, 1, { custom_status1_count: 2 }) },
    { id: 12, name: 'Old checkout', refs: 'ABC-9', milestone_id: 3, is_completed: true, ...counts(5, 0, 0, 0, 0) },
  ],
  plans: [
    {
      id: 50,
      name: 'Regression',
      milestone_id: 1,
      entries: [{ refs: 'abc-2', runs: [{ id: 13, name: 'Cart', is_completed: false, ...counts(4, 0, 0, 1, 0) }] }],
    },
  ],
  tests: {
    11: [
      { id: 101, case_id: 900, title: 'Log in with SSO', status_id: 5 },
      { id: 102, case_id: 901, title: 'Log out', status_id: 2 },
      { id: 103, case_id: 902, title: 'Remember me', status_id: 5 },
      { id: 104, case_id: 903, title: 'Log in', status_id: 1 },
    ],
  },
  results: {
    11: [
      { id: 1, test_id: 101, status_id: 5, created_on: 1700000000, defects: 'ABC-7', version: '1.0', comment: 'old failure' },
      { id: 2, test_id: 101, status_id: 5, created_on: 1700086400, defects: 'ABC-8', version: '1.1', comment: 'Error toast\nshows | twice' },
      { id: 3, test_id: 102, status_id: 2, created_on: 1700086400, defects: '', version: '1.1', comment: 'No SSO test account. Owner: PO' },
      { id: 4, test_id: 102, status_id: 5, created_on: 1700090000, defects: 'ABC-6', version: '1.1', comment: 'failed before it was blocked' },
    ],
  },
};

const runsCli = async (args) => {
  const mock = await startMock(RUNS_DATA);
  try {
    const run = await runCli(['runs', ...args], { env: baseEnv(mock.port), cwd: mkdtempSync(join(tmpdir(), 'testrail-')) });
    return { ...run, requests: mock.state.requests };
  } finally {
    await mock.close();
  }
};

test('runs selects by refs across plain and plan runs and computes executed and pass rate without blocked or untested', async () => {
  const run = await runsCli(['--refs', 'ABC-1, ABC-2']);
  assert.equal(run.code, 0, run.stderr);
  assert.match(run.stdout, /^Cut-off: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/m);
  assert.match(run.stdout, /\| Run \| Milestone \| Refs \| Total \| Passed \| Failed \| Blocked \| Retest \| Untested \| In Progress \| Executed \| Pass rate \|/);
  assert.match(run.stdout, /\| \[R11\]\(http:\/\/127\.0\.0\.1:\d+\/index\.php\?\/runs\/view\/11\) Login \\\| SSO \| Sprint 42 \| ABC-1 \| 12 \| 6 \| 2 \| 1 \| 0 \| 1 \| 2 \| 75% \(9\/12\) \| 75% \(6\/8\) \|/);
  assert.match(run.stdout, /\| \[R13\]\([^)]+\) Cart \(plan Regression\) \| Release 2\.0 \| abc-2 \| 5 \| 4 \| 0 \| 0 \| 1 \| 0 \| 0 \| 80% \(4\/5\) \| 100% \(4\/4\) \|/);
  assert.match(run.stdout, /\| \*\*Total\*\* \|  \|  \| 17 \| 10 \| 2 \| 1 \| 1 \| 1 \| 2 \| 76% \(13\/17\) \| 83% \(10\/12\) \|/);
  assert.doesNotMatch(run.stdout, /R12|Skipped/);
});

test('runs --milestone includes sub-milestones; --active and --since become API filters', async () => {
  const release = await runsCli(['--milestone', 'release 2.0']);
  assert.equal(release.code, 0, release.stderr);
  assert.match(release.stdout, /R11/);
  assert.match(release.stdout, /R13/);
  assert.doesNotMatch(release.stdout, /R12/);

  const sprint = await runsCli(['--milestone', 'Sprint 42', '--active', '--since', '2026-01-05']);
  assert.equal(sprint.code, 0, sprint.stderr);
  assert.match(sprint.stdout, /R11/);
  assert.doesNotMatch(sprint.stdout, /R13|R12/);
  const getRuns = sprint.requests.find((r) => r.name === 'get_runs').query;
  assert.equal(getRuns.get('is_completed'), '0');
  assert.equal(getRuns.get('created_after'), String(new Date('2026-01-05T00:00:00').getTime() / 1000));
  assert.equal(sprint.requests.filter((r) => r.name === 'get_plan').length, 0);
});

test('runs refuses to run without a scope, with a bad date, or with an unknown milestone', async () => {
  const none = await runsCli([]);
  assert.equal(none.code, 1);
  assert.match(none.stderr, /--refs, --milestone, --since, or --active/);
  assert.equal(none.requests.length, 0);

  const badDate = await runsCli(['--since', '05/01/2026']);
  assert.equal(badDate.code, 1);
  assert.match(badDate.stderr, /YYYY-MM-DD/);

  const unknown = await runsCli(['--milestone', 'Sprint 99']);
  assert.equal(unknown.code, 1);
  assert.match(unknown.stderr, /Milestone not found: Sprint 99/);
  assert.match(unknown.stderr, /Sprint 41/);
});

test('runs --details lists non-passed tests with the latest result that set their current status', async () => {
  const run = await runsCli(['--refs', 'ABC-1', '--details']);
  assert.equal(run.code, 0, run.stderr);
  assert.match(run.stdout, /### R11 Login \\\| SSO/);
  assert.match(run.stdout, /\| C900 \| Log in with SSO \| Failed \| ABC-8 \| 1\.1 \| 2023-11-15 \| Error toast shows \\\| twice \|/);
  assert.match(run.stdout, /\| C902 \| Remember me \| Failed \|  \|  \|  \|  \|/);
  assert.match(run.stdout, /\| C901 \| Log out \| Blocked \|  \| 1\.1 \| 2023-11-15 \| No SSO test account\. Owner: PO \|/);
  assert.ok(run.stdout.indexOf('C900') < run.stdout.indexOf('C902') && run.stdout.indexOf('C902') < run.stdout.indexOf('C901'));
  assert.doesNotMatch(run.stdout, /C903|old failure|ABC-6/);
  assert.equal(run.requests.find((r) => r.name === 'get_tests').query.get('status_id'), '5,2,4,6');
});

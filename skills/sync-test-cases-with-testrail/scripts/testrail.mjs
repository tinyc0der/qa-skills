import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const MARKER_RE = /<!--\s*(suite|test|example)\b([\s\S]*?)-->/g;
const FENCE_RE = /^\s*(```|~~~)/;
const EXPECTED_RE = /^\s*(?:[-*+]\s+)?\*{1,2}Expected(?:\s+results?)?:?\*{1,2}:?\s*(.*)$/i;
const ITEM_RE = /^(?:[-+*]|\d+[.)])\s+/;
const PRIORITY_ALIASES = { normal: 'medium', important: 'high' };
const KNOWN_PRIORITIES = ['critical', 'high', 'medium', 'low', 'normal', 'important'];
const YES_RE = /^(yes|true|1)$/i;
const NO_RE = /^(no|false|0)$/i;
const YES_NO_KEYS = ['smoke', 'automation'];
const STANDARD_KEYS = ['smoke', 'automation', 'platform'];
const FIELD_KINDS = { 5: 'checkbox', 6: 'dropdown', 12: 'multiselect' };

const USAGE = `Usage: node testrail.mjs <command> [options]

Commands:
  check <files...>                          Parse .test.md files offline and report problems
  list [--section <name>]                   Print sections and cases (C<id>) of the resolved suite
  list --run <id>                           Print the cases of a test run with their status
  push <files...> [--dry-run]               Create or update cases in TestRail and write IDs back
       [--parent-section <name>]
  pull [--section <name>] [--out <dir>]     Download cases into .test.md files (default dir test-cases/)
       [--run <id>] [--overwrite]           --run keeps only the run's cases; --overwrite replaces differing files
  runs [--refs <keys>] [--milestone <name>] Print status counts of matching test runs, plan runs included
       [--since <YYYY-MM-DD>] [--active]    At least one filter is required; filters combine with AND
       [--details]                          Also list non-passed tests with their latest result
  results <file> [--dry-run]                Create the run of a results file if needed, add its results
                                            and attach its evidence, then write the IDs back

Environment (or .env in the current directory):
  TESTRAIL_URL, TESTRAIL_USER, TESTRAIL_API_KEY, TESTRAIL_PROJECT_ID
  TESTRAIL_SUITE_ID, TESTRAIL_TEMPLATE_ID (optional)
  TESTRAIL_FIELDS (optional) metadata keys sent as case fields, e.g.
    smoke:custom_case_smoketest,automation:custom_automation_type,platform:custom_case_platform

Exit codes: 0 ok, 1 usage/validation/config error, 2 API error`;

class CliError extends Error {}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function scanBlocks(text) {
  const marks = [...text.matchAll(MARKER_RE)];
  let suiteIndex = -1;
  let testIndex = -1;
  return marks.map((m, i) => {
    const start = m.index;
    const end = start + m[0].length;
    const bodyEnd = i + 1 < marks.length ? marks[i + 1].index : text.length;
    if (m[1] === 'suite') {
      suiteIndex++;
      testIndex = -1;
    } else if (m[1] === 'test') {
      if (suiteIndex < 0) suiteIndex = 0;
      testIndex++;
    }
    return { kind: m[1], start, end, inner: m[2], body: text.slice(end, bodyEnd), suiteIndex, testIndex };
  });
}

function parseMeta(inner) {
  const meta = {};
  for (const line of inner.split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    if (key) meta[key] = line.slice(i + 1).trim();
  }
  return meta;
}

function stripTags(title) {
  return title.replace(/(^|\s)@[\w=\-().:&]+/g, '$1').replace(/\s+/g, ' ').trim();
}

function parseSuiteBody(body) {
  const lines = body.split(/\r?\n/);
  let fence = false;
  let at = -1;
  for (let i = 0; i < lines.length && at < 0; i++) {
    if (FENCE_RE.test(lines[i])) fence = !fence;
    else if (!fence && /^#\s+/.test(lines[i])) at = i;
  }
  if (at < 0) return { title: '', description: lines.join('\n').trim() };
  return {
    title: stripTags(lines[at].replace(/^#\s+/, '')),
    description: lines.slice(at + 1).join('\n').trim(),
  };
}

function parseSteps(lines) {
  const steps = [];
  let cur = null;
  let target = null;
  let fence = false;
  for (const line of lines) {
    const isFence = FENCE_RE.test(line);
    if (!fence) {
      if (!line.trim()) continue;
      const exp = line.match(EXPECTED_RE);
      const item = !exp && line.match(ITEM_RE);
      if (item) {
        cur = { content: [line.slice(item[0].length)], expected: [], indent: item[0].length };
        steps.push(cur);
        target = cur.content;
        continue;
      }
      if (!cur) continue;
      if (exp) {
        if (exp[1]) cur.expected.push(exp[1]);
        target = cur.expected;
        continue;
      }
    }
    if (cur) {
      const lead = line.match(/^ */)[0].length;
      target.push(line.slice(Math.min(lead, cur.indent)));
    }
    if (isFence) fence = !fence;
  }
  return steps.map((s) => ({
    content: s.content.join('\n').trim(),
    expected: s.expected.join('\n').trim(),
  }));
}

function parseTestBody(body) {
  let title = '';
  let mode = 'pre';
  let fence = false;
  const description = [];
  const stepLines = [];
  for (const line of body.split(/\r?\n/)) {
    const isFence = FENCE_RE.test(line);
    const h = !fence && line.match(/^(#{1,6})\s+(.*?)\s*$/);
    const isStepsHeading = h && h[1].length === 2 && /^steps$/i.test(h[2]);
    if (mode === 'pre') {
      if (isStepsHeading) mode = 'steps';
      else if (h && h[1].length <= 2) {
        title = stripTags(h[2]);
        mode = 'desc';
      }
    } else if (mode === 'desc') {
      if (isStepsHeading) mode = 'steps';
      else description.push(line);
    } else if (mode === 'steps') {
      if (h && h[1].length <= 2) mode = 'after';
      else stepLines.push(line);
    }
    if (isFence) fence = !fence;
  }
  return { title, description: description.join('\n').trim(), steps: parseSteps(stepLines) };
}

function splitExampleBody(body) {
  const lines = body.split(/\r?\n/);
  let from = 0;
  while (from < lines.length && !lines[from].trim()) from++;
  let to = from;
  while (to < lines.length && lines[to].trim().startsWith('|')) to++;
  return {
    table: lines.slice(from, to).map((l) => l.trim()).join('\n'),
    rest: lines.slice(to).join('\n'),
  };
}

export function parseTestMd(text) {
  const suites = [];
  for (const b of scanBlocks(text)) {
    if (b.kind === 'suite') {
      suites.push({ ...parseSuiteBody(b.body), meta: parseMeta(b.inner), tests: [] });
    } else if (b.kind === 'test') {
      if (!suites.length) suites.push({ title: '', description: '', meta: {}, tests: [] });
      suites.at(-1).tests.push({ body: b.body, meta: parseMeta(b.inner), examples: null });
    } else {
      const last = suites.at(-1)?.tests.at(-1);
      const { table, rest } = splitExampleBody(b.body);
      if (last && table) {
        last.examples = table;
        last.body += `\n${rest}`;
      }
    }
  }
  for (const suite of suites) {
    suite.tests = suite.tests.map(({ body, meta, examples }) => ({ ...parseTestBody(body), meta, examples }));
  }
  return { suites };
}

function resolvePriority(map, value) {
  if (!value || !map) return undefined;
  const v = String(value).trim().toLowerCase();
  for (const want of [v, PRIORITY_ALIASES[v]]) {
    if (!want) continue;
    for (const [name, id] of map) if (String(name).toLowerCase() === want) return id;
  }
  return undefined;
}

export function parseFieldSpec(spec) {
  const map = new Map();
  for (const part of String(spec ?? '').split(',')) {
    if (!part.trim()) continue;
    const i = part.indexOf(':');
    const key = i > 0 ? part.slice(0, i).trim() : '';
    const name = i > 0 ? part.slice(i + 1).trim() : '';
    if (!key || !name) throw new CliError(`TESTRAIL_FIELDS expects key:field_name pairs separated by commas, got "${part.trim()}"`);
    map.set(key, name);
  }
  return map;
}

const parseItems = (items) =>
  String(items ?? '')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*(\d+)\s*,\s*(.*?)\s*$/))
    .filter(Boolean)
    .map((m) => [Number(m[1]), m[2]]);

export function buildFieldMap(spec, fields, projectId) {
  const out = new Map();
  const bare = (name) => String(name ?? '').replace(/^custom_/, '');
  for (const [key, name] of spec) {
    const field = fields.find((f) => bare(f.system_name) === bare(name));
    if (!field) {
      throw new CliError(`TESTRAIL_FIELDS: TestRail has no case field "${name}"; fields: ${fields.map((f) => f.system_name).join(', ')}`);
    }
    const config = (field.configs ?? []).find(
      (c) => c.context?.is_global || (c.context?.project_ids ?? []).map(Number).includes(Number(projectId)),
    );
    if (!config) throw new CliError(`TESTRAIL_FIELDS: case field "${name}" is not enabled for project ${projectId}`);
    out.set(key, { key, systemName: field.system_name, kind: FIELD_KINDS[field.type_id] ?? 'text', options: parseItems(config.options?.items) });
  }
  return out;
}

function toFieldValue(field, value, title) {
  const v = String(value).trim();
  const invalid = (hint) => new CliError(`invalid ${field.key} "${v}" in ${JSON.stringify(title)}; ${hint}`);
  if (field.kind === 'checkbox') {
    if (YES_RE.test(v)) return true;
    if (NO_RE.test(v)) return false;
    throw invalid('use yes or no');
  }
  if (field.kind === 'dropdown' || field.kind === 'multiselect') {
    const names = field.kind === 'multiselect' ? v.split(',').map((n) => n.trim()).filter(Boolean) : [v];
    const ids = names.map((n) => {
      const hit = field.options.find(([, label]) => label.toLowerCase() === n.toLowerCase());
      if (!hit) throw invalid(`TestRail options: ${field.options.map(([, label]) => label).join(', ')}`);
      return hit[0];
    });
    return field.kind === 'multiselect' ? ids : ids[0];
  }
  return v;
}

function fromFieldValue(field, raw) {
  if (raw === null || raw === undefined || raw === '') return '';
  if (field.kind === 'checkbox') return raw ? 'yes' : '';
  const label = (id) => field.options.find(([oid]) => oid === Number(id))?.[1] ?? String(id);
  if (field.kind === 'dropdown') return label(raw);
  if (field.kind === 'multiselect') return (Array.isArray(raw) ? raw : [raw]).map(label).join(', ');
  return String(raw).replace(/\s*\r?\n\s*/g, ' ').trim();
}

export function toCasePayload(test, suite, ctx) {
  const payload = { title: test.title, template_id: ctx.templateId };
  const priority = test.meta?.priority ?? suite.meta?.priority;
  if (priority) {
    const priorityId = resolvePriority(ctx.priorityIdByName, priority);
    if (priorityId === undefined) {
      const known = [...ctx.priorityIdByName.keys()].join(', ');
      throw new CliError(`unknown priority "${priority}" in ${JSON.stringify(test.title)}; TestRail priorities: ${known}`);
    }
    payload.priority_id = priorityId;
  }
  payload.refs = test.meta?.refs ?? suite.meta?.refs ?? '';
  for (const field of ctx.fields?.values() ?? []) {
    const value = test.meta?.[field.key] ?? suite.meta?.[field.key];
    if (value !== undefined && String(value).trim()) payload[field.systemName] = toFieldValue(field, value, test.title);
  }
  payload.custom_preconds = [test.description?.trim(), test.examples ? `Test data:\n${test.examples}` : '']
    .filter(Boolean)
    .join('\n\n');
  payload.custom_steps_separated = (test.steps ?? []).map((s) => ({ content: s.content, expected: s.expected }));
  return payload;
}

function setMetaLine(raw, key, value) {
  const head = raw.slice(0, -3);
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const line = `${key}: ${value}`;
  const keyRe = new RegExp(`^([ \\t]*${key}[ \\t]*:)[^\\r\\n]*`, 'm');
  if (keyRe.test(head)) return `${head.replace(keyRe, (_, k) => `${k} ${value}`)}-->`;
  const nl = head.lastIndexOf('\n');
  if (nl >= 0 && !head.slice(nl + 1).trim()) {
    return `${head.slice(0, nl + 1)}${line}${eol}${head.slice(nl + 1)}-->`;
  }
  return `${head.trimEnd()}${eol}${line}${eol}-->`;
}

export function writeBackIds(text, { sections = [], cases = [] } = {}) {
  const edits = [];
  for (const b of scanBlocks(text)) {
    if (b.kind === 'suite') {
      const s = sections.find((x) => x.suiteIndex === b.suiteIndex);
      if (s) edits.push({ b, key: 'testrail_section_id', value: String(s.sectionId) });
    } else if (b.kind === 'test') {
      const c = cases.find((x) => x.suiteIndex === b.suiteIndex && x.testIndex === b.testIndex);
      if (c) edits.push({ b, key: 'testrail_id', value: `C${String(c.caseId).replace(/^C/i, '')}` });
    }
  }
  let out = text;
  for (const { b, key, value } of edits.reverse()) {
    out = out.slice(0, b.start) + setMetaLine(out.slice(b.start, b.end), key, value) + out.slice(b.end);
  }
  return out;
}

export function buildPriorityMap(priorities) {
  const map = new Map();
  for (const p of priorities) {
    if (p.name) map.set(p.name, p.id);
    if (p.short_name) map.set(p.short_name, p.id);
  }
  return map;
}

const normText = (v) => String(v ?? '').replace(/\r\n/g, '\n').replace(/\n\s*\n+/g, '\n').trim();

export function caseMatches(payload, remote) {
  if (!remote) return false;
  for (const key of ['title', 'refs', 'custom_preconds']) {
    if (key in payload && normText(payload[key]) !== normText(remote[key])) return false;
  }
  for (const key of ['template_id', 'priority_id']) {
    if (key in payload && Number(payload[key]) !== Number(remote[key])) return false;
  }
  const sortedIds = (v) => JSON.stringify([...(Array.isArray(v) ? v : [v ?? []].flat())].map(Number).sort((a, b) => a - b));
  for (const [key, want] of Object.entries(payload)) {
    if (!key.startsWith('custom_') || key === 'custom_preconds' || key === 'custom_steps_separated') continue;
    const have = remote[key];
    const same =
      typeof want === 'boolean'
        ? Boolean(have) === want
        : Array.isArray(want)
          ? sortedIds(want) === sortedIds(have)
          : typeof want === 'number'
            ? Number(have) === want
            : normText(want) === normText(have);
    if (!same) return false;
  }
  if (payload.custom_steps_separated) {
    const have = remote.custom_steps_separated ?? [];
    const want = payload.custom_steps_separated;
    if (want.length !== have.length) return false;
    return want.every((s, i) => normText(s.content) === normText(have[i].content) && normText(s.expected) === normText(have[i].expected));
  }
  return true;
}

function indentLines(text, pad) {
  return text.split('\n').map((l, i) => (i === 0 || !l ? l : pad + l)).join('\n');
}

export function serializeSection(section, cases, priorityNames = new Map(), fields = new Map()) {
  const clean = (v) => String(v ?? '').replace(/\r\n/g, '\n').trim();
  const out = [`<!-- suite\ntestrail_section_id: ${section.id}\n-->\n\n# ${section.name}\n`];
  if (clean(section.description)) out.push(`${clean(section.description)}\n`);
  for (const c of cases) {
    const meta = [`testrail_id: C${c.id}`];
    const priority = priorityNames.get(c.priority_id);
    if (priority) meta.push(`priority: ${priority.toLowerCase()}`);
    if (clean(c.refs)) meta.push(`refs: ${clean(c.refs)}`);
    for (const field of fields.values()) {
      const value = fromFieldValue(field, c[field.systemName]);
      if (value) meta.push(`${field.key}: ${value}`);
    }
    out.push(`<!-- test\n${meta.join('\n')}\n-->\n\n# ${c.title}\n`);
    if (clean(c.custom_preconds)) out.push(`${clean(c.custom_preconds)}\n`);
    let steps = (c.custom_steps_separated ?? []).map((s) => ({ content: clean(s.content), expected: clean(s.expected) }));
    if (!steps.length && (clean(c.custom_steps) || clean(c.custom_expected))) {
      steps = [{ content: clean(c.custom_steps), expected: clean(c.custom_expected) }];
    }
    if (steps.length) {
      const lines = steps.map((s) => {
        const exp = s.expected ? `\n  *Expected*: ${indentLines(s.expected, '  ')}` : '';
        return `- ${indentLines(s.content, '  ')}${exp}`;
      });
      out.push(`## Steps\n\n${lines.join('\n')}\n`);
    }
  }
  return `${out.join('\n').trimEnd()}\n`;
}

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createClient({ url, user, apiKey, sleep = defaultSleep }) {
  const base = url.replace(/\/+$/, '');
  const authorization = `Basic ${Buffer.from(`${user}:${apiKey}`).toString('base64')}`;

  async function send(method, target, label, body) {
    const unsure = method === 'POST' ? '. TestRail may have saved this change; check TestRail before running the command again' : '';
    const form = body instanceof FormData;
    let rateTries = 0;
    let serverTries = 0;
    for (;;) {
      let res;
      try {
        res = await fetch(target, {
          method,
          headers: form ? { Authorization: authorization } : { Authorization: authorization, 'Content-Type': 'application/json' },
          body: body === undefined || form ? body : JSON.stringify(body),
        });
      } catch (e) {
        throw new ApiError(`${method} ${label} failed: ${e.cause?.code ?? e.message}${unsure}`);
      }
      if (res.status === 429 && ++rateTries < 3) {
        const wait = Number(res.headers.get('retry-after'));
        await sleep((Number.isFinite(wait) ? wait : 1) * 1000);
        continue;
      }
      if (res.status >= 500 && method === 'GET' && ++serverTries < 2) {
        await sleep(500 * serverTries);
        continue;
      }
      const raw = await res.text();
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }
      if (!res.ok) {
        const detail = data?.error ?? raw.slice(0, 200);
        throw new ApiError(`${method} ${label} failed with HTTP ${res.status}: ${detail}${res.status >= 500 ? unsure : ''}`, res.status);
      }
      return data;
    }
  }

  const get = (endpoint) => send('GET', `${base}/index.php?/api/v2/${endpoint}`, endpoint);
  const post = (endpoint, body) => send('POST', `${base}/index.php?/api/v2/${endpoint}`, endpoint, body ?? {});
  const upload = (endpoint, file) => {
    const form = new FormData();
    form.append('attachment', new Blob([readFileSync(file)]), basename(file));
    return post(endpoint, form);
  };

  async function getAll(endpoint, key) {
    let data = await get(endpoint);
    if (Array.isArray(data)) return data;
    const items = [...(data?.[key] ?? [])];
    const followed = new Set();
    while (data?._links?.next) {
      const next = data._links.next;
      if (followed.has(next)) throw new ApiError(`GET ${endpoint} failed: TestRail repeated the next page ${next}`);
      followed.add(next);
      data = await send('GET', `${base}/index.php?${next}`, next);
      items.push(...(data?.[key] ?? []));
    }
    return items;
  }

  return { get, post, upload, getAll };
}

function loadDotEnv(dir) {
  const file = resolve(dir, '.env');
  if (!existsSync(file)) return {};
  const out = {};
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = raw.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let value = m[2];
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    out[m[1]] = value;
  }
  return out;
}

function readConfig(env) {
  const required = ['TESTRAIL_URL', 'TESTRAIL_USER', 'TESTRAIL_API_KEY', 'TESTRAIL_PROJECT_ID'];
  const missing = required.filter((k) => !env[k]);
  if (missing.length) throw new CliError(`Missing required environment variables: ${missing.join(', ')}`);
  return {
    url: env.TESTRAIL_URL,
    user: env.TESTRAIL_USER,
    apiKey: env.TESTRAIL_API_KEY,
    projectId: env.TESTRAIL_PROJECT_ID,
    suiteId: env.TESTRAIL_SUITE_ID || null,
    templateId: env.TESTRAIL_TEMPLATE_ID || null,
    fieldSpec: parseFieldSpec(env.TESTRAIL_FIELDS),
  };
}

async function loadFields(client, cfg) {
  if (!cfg.fieldSpec.size) return new Map();
  return buildFieldMap(cfg.fieldSpec, await client.get('get_case_fields'), cfg.projectId);
}

function loadFile(file, cwd) {
  const path = resolve(cwd, file);
  if (!existsSync(path)) throw new CliError(`File not found: ${file}`);
  const text = readFileSync(path, 'utf8');
  return { file, path, text, doc: parseTestMd(text) };
}

async function resolveSuite(client, cfg) {
  if (cfg.suiteId) return Number(cfg.suiteId);
  const suites = await client.getAll(`get_suites/${cfg.projectId}`, 'suites');
  if (suites.length === 1) return suites[0].id;
  if (!suites.length) throw new CliError('The project has no suites');
  const listing = suites.map((s) => `  ${s.id} ${s.name}`).join('\n');
  throw new CliError(`Several suites found, set TESTRAIL_SUITE_ID to one of:\n${listing}`);
}

async function resolveTemplate(client, cfg) {
  if (cfg.templateId) return Number(cfg.templateId);
  const templates = await client.get(`get_templates/${cfg.projectId}`);
  const steps = templates.find((t) => /steps/i.test(t.name));
  if (steps) return steps.id;
  const listing = templates.map((t) => `  ${t.id} ${t.name}`).join('\n');
  throw new CliError(`No template with "steps" in its name, set TESTRAIL_TEMPLATE_ID to one of:\n${listing}`);
}

async function loadSections(client, cfg, suiteId) {
  const raw = await client.getAll(`get_sections/${cfg.projectId}&suite_id=${suiteId}`, 'sections');
  return raw.map((s) => ({ id: s.id, name: s.name, parent_id: s.parent_id ?? null }));
}

function cmdCheck(files, cwd) {
  if (!files.length) throw new CliError('check needs at least one file');
  let failed = false;
  for (const file of files) {
    const { doc } = loadFile(file, cwd);
    const tests = doc.suites.flatMap((s) => s.tests.map((t) => ({ s, t })));
    const untitled = tests.filter(({ t }) => !t.title);
    const noSteps = tests.filter(({ t }) => !t.steps.length);
    const unknown = tests
      .map(({ s, t }) => ({ t, p: t.meta.priority ?? s.meta.priority }))
      .filter(({ p }) => p && !KNOWN_PRIORITIES.includes(p.trim().toLowerCase()));
    const badFlags = tests
      .flatMap(({ s, t }) => YES_NO_KEYS.map((key) => ({ t, key, v: t.meta[key] ?? s.meta[key] })))
      .filter(({ v }) => v !== undefined && !YES_RE.test(v.trim()) && !NO_RE.test(v.trim()));
    console.log(`${file}: ${doc.suites.length} suites, ${tests.length} tests`);
    for (const { t, key, v } of badFlags) console.log(`  invalid ${key} "${v}" in ${JSON.stringify(t.title || '(untitled)')}; use yes or no`);
    if (noSteps.length) console.log(`  tests without steps: ${noSteps.map(({ t }) => JSON.stringify(t.title || '(untitled)')).join(', ')}`);
    if (untitled.length) console.log(`  tests without title: ${untitled.length}`);
    for (const { t, p } of unknown) console.log(`  unknown priority "${p}" in ${JSON.stringify(t.title || '(untitled)')}`);
    if (!tests.length) console.log('  no tests found');
    if (!tests.length || untitled.length || badFlags.length) failed = true;
  }
  return failed ? 1 : 0;
}

const runIdOf = (value) => {
  const m = String(value ?? '').match(/^R?(\d+)$/i);
  if (!m) throw new CliError(`Invalid run ID "${value}"; use the number from runs/view/<id>, e.g. R123`);
  return m[1];
};

async function loadRunCases(client, runId) {
  const run = await client.get(`get_run/${runId}`);
  const tests = await client.getAll(`get_tests/${runId}`, 'tests');
  return { run, tests, caseIds: new Set(tests.map((t) => t.case_id)) };
}

async function cmdList(opts, cfg) {
  const client = createClient(cfg);
  if (opts.run) {
    const { run, tests } = await loadRunCases(client, runIdOf(opts.run));
    const labels = new Map((await client.get('get_statuses')).map((s) => [s.id, s.label]));
    console.log(`R${run.id} ${run.name}${run.is_completed ? ' (closed)' : ''}`);
    for (const t of tests) console.log(`  C${t.case_id} [${labels.get(t.status_id) ?? t.status_id}] ${t.title}`);
    return 0;
  }
  const suiteId = await resolveSuite(client, cfg);
  const sections = await loadSections(client, cfg, suiteId);
  const cases = await client.getAll(`get_cases/${cfg.projectId}&suite_id=${suiteId}`, 'cases');
  const children = (id) => sections.filter((s) => s.parent_id === id);
  let roots = children(null);
  if (opts.section) {
    const want = opts.section.trim().toLowerCase();
    roots = sections.filter((s) => s.name.trim().toLowerCase() === want);
    if (!roots.length) throw new CliError(`Section not found: ${opts.section}`);
  }
  const print = (section, depth) => {
    const pad = '  '.repeat(depth);
    console.log(`${pad}${section.name} [section ${section.id}]`);
    for (const c of cases.filter((c) => c.section_id === section.id)) console.log(`${pad}  C${c.id} ${c.title}`);
    for (const child of children(section.id)) print(child, depth + 1);
  };
  for (const root of roots) print(root, 0);
  return 0;
}

const slug = (name) => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');

async function cmdPull(opts, cfg, cwd) {
  const client = createClient(cfg);
  const fromRun = opts.run ? await loadRunCases(client, runIdOf(opts.run)) : null;
  const suiteId = fromRun ? fromRun.run.suite_id : await resolveSuite(client, cfg);
  const priorityNames = new Map((await client.get('get_priorities')).map((p) => [p.id, p.name]));
  const fields = await loadFields(client, cfg);
  const raw = await client.getAll(`get_sections/${cfg.projectId}&suite_id=${suiteId}`, 'sections');
  const sections = raw.map((s) => ({ id: s.id, name: s.name, parent_id: s.parent_id ?? null, description: s.description }));
  const byId = new Map(sections.map((s) => [s.id, s]));
  const children = (id) => sections.filter((s) => s.parent_id === id);
  let selected = sections;
  if (opts.section) {
    const want = opts.section.trim().toLowerCase();
    const roots = sections.filter((s) => s.name.trim().toLowerCase() === want);
    if (!roots.length) throw new CliError(`Section not found: ${opts.section}`);
    selected = [];
    const walk = (s) => {
      selected.push(s);
      children(s.id).forEach(walk);
    };
    roots.forEach(walk);
  }
  const cases = (await client.getAll(`get_cases/${cfg.projectId}&suite_id=${suiteId}`, 'cases')).filter(
    (c) => !fromRun || fromRun.caseIds.has(c.id),
  );
  const pathOf = (s) => (s.parent_id !== null && byId.has(s.parent_id) ? `${pathOf(byId.get(s.parent_id))}--${slug(s.name)}` : slug(s.name));
  const targets = selected
    .map((s) => ({ section: s, cases: cases.filter((c) => c.section_id === s.id), base: pathOf(s) || `section-${s.id}` }))
    .filter((t) => t.cases.length);
  const dir = resolve(cwd, opts.out ?? 'test-cases');
  const files = targets.map((t) => {
    const clash = targets.filter((o) => o.base === t.base).length > 1;
    const name = `${clash ? `${t.base}-${t.section.id}` : t.base}.test.md`;
    return { name, path: resolve(dir, name), text: serializeSection(t.section, t.cases, priorityNames, fields), count: t.cases.length };
  });
  const differing = files.filter((f) => existsSync(f.path) && readFileSync(f.path, 'utf8') !== f.text);
  if (differing.length && !opts.overwrite) {
    const list = differing.map((f) => `  ${f.name}`).join('\n');
    throw new CliError(`Refusing to overwrite local files that differ from TestRail:\n${list}\nMove them away, pull into another --out directory, or pass --overwrite. Nothing was written.`);
  }
  mkdirSync(dir, { recursive: true });
  for (const f of files) {
    if (existsSync(f.path) && readFileSync(f.path, 'utf8') === f.text) {
      console.log(`unchanged ${f.name} (${f.count} cases)`);
      continue;
    }
    writeFileSync(f.path, f.text);
    console.log(`wrote ${f.name} (${f.count} cases)`);
  }
  if (!files.length) console.log('No cases found');
  return 0;
}

const PASSED = 1;
const BLOCKED = 2;
const UNTESTED = 3;
const RETEST = 4;
const FAILED = 5;
const SYSTEM_STATUSES = { [PASSED]: 'passed', [BLOCKED]: 'blocked', [UNTESTED]: 'untested', [RETEST]: 'retest', [FAILED]: 'failed' };
const countKey = (statusId) => `${SYSTEM_STATUSES[statusId] ?? `custom_status${statusId - FAILED}`}_count`;
const splitKeys = (value) => String(value ?? '').split(/[\s,]+/).filter(Boolean).map((k) => k.toUpperCase());
const cell = (value) => String(value ?? '').replace(/\s*\r?\n\s*/g, ' ').replace(/\|/g, '\\|').trim();
const percent = (n, d) => (d ? `${Math.round((100 * n) / d)}% (${n}/${d})` : 'n/a');

function sinceToUnix(value) {
  const ms = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`).getTime() : NaN;
  if (Number.isNaN(ms)) throw new CliError(`--since must be a date as YYYY-MM-DD, got "${value}"`);
  return Math.floor(ms / 1000);
}

function flattenMilestones(list) {
  return list.flatMap((m) => [m, ...flattenMilestones(m.milestones ?? [])]);
}

function milestoneScope(milestones, name) {
  const want = name.trim().toLowerCase();
  const ids = new Set(milestones.filter((m) => m.name.trim().toLowerCase() === want).map((m) => m.id));
  for (let grew = true; grew; ) {
    const before = ids.size;
    for (const m of milestones) if (ids.has(m.parent_id)) ids.add(m.id);
    grew = ids.size > before;
  }
  return ids;
}

async function loadRuns(client, cfg, opts) {
  const all = flattenMilestones(await client.getAll(`get_milestones/${cfg.projectId}`, 'milestones'));
  const milestones = [...new Map(all.map((m) => [m.id, m])).values()];
  let inMilestone = () => true;
  if (opts.milestone) {
    const ids = milestoneScope(milestones, opts.milestone);
    if (!ids.size) {
      const listing = milestones.map((m) => `  ${m.name}`).join('\n');
      throw new CliError(`Milestone not found: ${opts.milestone}. Milestones:\n${listing}`);
    }
    inMilestone = (id) => ids.has(id);
  }
  const query = [opts.since && `&created_after=${sinceToUnix(opts.since)}`, opts.active && '&is_completed=0'].filter(Boolean).join('');
  const runs = (await client.getAll(`get_runs/${cfg.projectId}${query}`, 'runs')).map((r) => ({ ...r, plan: null }));
  for (const plan of await client.getAll(`get_plans/${cfg.projectId}${query}`, 'plans')) {
    if (!inMilestone(plan.milestone_id)) continue;
    const detail = await client.get(`get_plan/${plan.id}`);
    for (const entry of detail.entries ?? []) {
      for (const run of entry.runs ?? []) {
        runs.push({ ...run, refs: run.refs ?? entry.refs, milestone_id: run.milestone_id ?? plan.milestone_id, plan: plan.name });
      }
    }
  }
  const refs = splitKeys(opts.refs);
  const selected = runs.filter(
    (r) =>
      inMilestone(r.milestone_id) &&
      !(opts.active && r.is_completed) &&
      (!refs.length || splitKeys(r.refs).some((k) => refs.includes(k))),
  );
  const milestoneName = new Map(milestones.map((m) => [m.id, m.name]));
  return selected.map((r) => ({ ...r, milestone: milestoneName.get(r.milestone_id) ?? '' }));
}

function latestResultByTest(tests, results) {
  const status = new Map(tests.map((t) => [t.id, t.status_id]));
  const latest = new Map();
  for (const r of results) {
    if (status.get(r.test_id) !== r.status_id) continue;
    const seen = latest.get(r.test_id);
    if (!seen || r.created_on > seen.created_on || (r.created_on === seen.created_on && r.id > seen.id)) latest.set(r.test_id, r);
  }
  return latest;
}

async function cmdRuns(opts, cfg) {
  if (!opts.refs && !opts.milestone && !opts.since && !opts.active) {
    throw new CliError('runs needs a scope: --refs, --milestone, --since, or --active');
  }
  const client = createClient(cfg);
  const labels = new Map((await client.get('get_statuses')).map((s) => [s.id, s.label]));
  const runs = await loadRuns(client, cfg, opts);
  console.log(`Cut-off: ${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}`);
  if (!runs.length) {
    console.log('No runs match');
    return 0;
  }

  const base = cfg.url.replace(/\/+$/, '');
  const count = (run, id) => Number(run[countKey(id)] ?? 0);
  const custom = [...labels.keys()].filter((id) => id > FAILED && runs.some((r) => count(r, id)));
  const columns = [PASSED, FAILED, BLOCKED, RETEST, UNTESTED, ...custom];
  const label = (id) => labels.get(id) ?? SYSTEM_STATUSES[id];
  const row = (cells) => `| ${cells.join(' | ')} |`;
  const numbers = (counts) => {
    const total = columns.reduce((sum, id) => sum + counts(id), 0);
    const executed = counts(PASSED) + counts(FAILED) + counts(BLOCKED);
    return [total, ...columns.map(counts), percent(executed, total), percent(counts(PASSED), counts(PASSED) + counts(FAILED))];
  };

  console.log(`\n${row(['Run', 'Milestone', 'Refs', 'Total', ...columns.map(label), 'Executed', 'Pass rate'])}`);
  console.log(row(Array(columns.length + 6).fill('---')));
  for (const r of runs) {
    const name = `[R${r.id}](${base}/index.php?/runs/view/${r.id}) ${cell(r.name)}${r.plan ? ` (plan ${cell(r.plan)})` : ''}`;
    console.log(row([name, cell(r.milestone), cell(r.refs), ...numbers((id) => count(r, id))]));
  }
  console.log(row(['**Total**', '', '', ...numbers((id) => runs.reduce((sum, r) => sum + count(r, id), 0))]));
  console.log(
    `\nExecuted = (${label(PASSED)} + ${label(FAILED)} + ${label(BLOCKED)}) / Total. ` +
      `Pass rate = ${label(PASSED)} / (${label(PASSED)} + ${label(FAILED)}). Other statuses are in neither.`,
  );

  if (!opts.details) return 0;
  const detailed = columns.filter((id) => id !== PASSED && id !== UNTESTED);
  for (const r of runs.filter((run) => detailed.some((id) => count(run, id)))) {
    const ids = detailed.join(',');
    const tests = await client.getAll(`get_tests/${r.id}&status_id=${ids}`, 'tests');
    const latest = latestResultByTest(tests, await client.getAll(`get_results_for_run/${r.id}&status_id=${ids}`, 'results'));
    tests.sort((a, b) => detailed.indexOf(a.status_id) - detailed.indexOf(b.status_id) || a.case_id - b.case_id);
    console.log(`\n### R${r.id} ${cell(r.name)}\n`);
    console.log(row(['Case', 'Title', 'Status', 'Defects', 'Version', 'Date', 'Comment']));
    console.log(row(Array(7).fill('---')));
    for (const t of tests) {
      const res = latest.get(t.id);
      const date = res?.created_on ? new Date(res.created_on * 1000).toISOString().slice(0, 10) : '';
      console.log(row([`C${t.case_id}`, cell(t.title), label(t.status_id), cell(res?.defects), cell(res?.version), date, cell(res?.comment)]));
    }
  }
  return 0;
}

async function cmdPush(files, opts, cfg, cwd) {
  if (!files.length) throw new CliError('push needs at least one file');
  const byPath = new Map();
  for (const f of files) {
    const loadedFile = loadFile(f, cwd);
    const real = realpathSync(loadedFile.path);
    if (!byPath.has(real)) byPath.set(real, loadedFile);
  }
  const loaded = [...byPath.values()];
  const owners = new Map();
  for (const { file, doc } of loaded) {
    for (const suite of doc.suites) {
      if (!suite.title) throw new CliError(`${file}: a test appears before any suite or a suite has no title`);
      const sid = suite.meta.testrail_section_id;
      if (sid && !/^\d+$/.test(sid)) throw new CliError(`${file}: invalid testrail_section_id "${sid}"`);
      for (const t of suite.tests) {
        if (!t.title) throw new CliError(`${file}: a test in suite "${suite.title}" has no title`);
        if (!t.meta.testrail_id) continue;
        if (!/^C?\d+$/i.test(t.meta.testrail_id)) {
          throw new CliError(`${file}: invalid testrail_id "${t.meta.testrail_id}" in "${t.title}"`);
        }
        const id = Number(t.meta.testrail_id.replace(/^C/i, ''));
        const owner = owners.get(id);
        if (owner) {
          throw new CliError(
            `${file}: ${JSON.stringify(t.title)} has testrail_id C${id}, which ${JSON.stringify(owner.title)} in ${owner.file} already has. ` +
              'Remove the testrail_id from the test that is not that case, so push creates a new case for it',
          );
        }
        owners.set(id, { file, title: t.title });
      }
    }
  }

  const dry = Boolean(opts['dry-run']);
  const tag = dry ? '[dry-run] ' : '';
  const client = createClient(cfg);
  const suiteId = await resolveSuite(client, cfg);
  const templateId = await resolveTemplate(client, cfg);
  const ctx = { templateId, priorityIdByName: buildPriorityMap(await client.get('get_priorities')), fields: await loadFields(client, cfg) };
  const usedKeys = new Set(loaded.flatMap(({ doc }) => doc.suites.flatMap((s) => [s.meta, ...s.tests.map((t) => t.meta)]).flatMap(Object.keys)));
  const unmapped = STANDARD_KEYS.filter((key) => usedKeys.has(key) && !ctx.fields.has(key));
  if (unmapped.length) console.log(`warning: ${unmapped.join(', ')} not sent; map them to TestRail case fields in TESTRAIL_FIELDS`);
  const payloads = loaded.map(({ file, doc }) => {
    try {
      return doc.suites.map((suite) => suite.tests.map((test) => toCasePayload(test, suite, ctx)));
    } catch (e) {
      throw new CliError(`${file}: ${e.message}`);
    }
  });
  const sections = await loadSections(client, cfg, suiteId);
  let placeholders = 0;
  let remoteCases = null;
  const remoteCase = async (id) => {
    remoteCases ??= new Map(
      (await client.getAll(`get_cases/${cfg.projectId}&suite_id=${suiteId}`, 'cases')).map((c) => [String(c.id), c]),
    );
    return remoteCases.get(String(id));
  };

  async function ensureSection(name, parentId, description) {
    const found = sections.find((s) => s.parent_id === parentId && s.name === name);
    if (found) return { id: found.id, created: false };
    console.log(`${tag}create section ${JSON.stringify(name)}`);
    let id = `new-${++placeholders}`;
    if (!dry) {
      const body = { name, suite_id: suiteId };
      if (parentId !== null) body.parent_id = parentId;
      if (description) body.description = description;
      id = (await client.post(`add_section/${cfg.projectId}`, body)).id;
    }
    sections.push({ id, name, parent_id: parentId });
    return { id, created: true };
  }

  let parentId = null;
  if (opts['parent-section']) {
    const parent = await ensureSection(opts['parent-section'], null);
    parentId = parent.id;
  }

  for (const [fileIndex, { file, path, text, doc }] of loaded.entries()) {
    const stats = { created: 0, reused: 0, added: 0, updated: 0, unchanged: 0 };
    const ids = { sections: [], cases: [] };
    try {
      for (const [suiteIndex, suite] of doc.suites.entries()) {
        let sectionId;
        if (suite.meta.testrail_section_id) {
          sectionId = Number(suite.meta.testrail_section_id);
          stats.reused++;
        } else {
          const section = await ensureSection(suite.title, parentId, suite.description);
          sectionId = section.id;
          stats[section.created ? 'created' : 'reused']++;
        }
        if (!dry) ids.sections.push({ suiteIndex, sectionId });
        for (const [testIndex, test] of suite.tests.entries()) {
          const payload = payloads[fileIndex][suiteIndex][testIndex];
          if (test.meta.testrail_id) {
            const caseId = test.meta.testrail_id.replace(/^C/i, '');
            if (!dry) ids.cases.push({ suiteIndex, testIndex, caseId });
            if (caseMatches(payload, await remoteCase(caseId))) {
              stats.unchanged++;
              continue;
            }
            console.log(`${tag}update case C${caseId} ${JSON.stringify(test.title)}`);
            if (!dry) await client.post(`update_case/${caseId}`, payload);
            stats.updated++;
          } else {
            console.log(`${tag}add case ${JSON.stringify(test.title)} in section ${JSON.stringify(suite.title)}`);
            if (!dry) {
              const created = await client.post(`add_case/${sectionId}`, payload);
              ids.cases.push({ suiteIndex, testIndex, caseId: created.id });
            }
            stats.added++;
          }
        }
      }
    } finally {
      if (!dry) {
        const next = writeBackIds(text, ids);
        if (next !== text) writeFileSync(path, next);
      }
    }
    console.log(
      `${tag}${file}: sections created ${stats.created}, reused ${stats.reused}; cases added ${stats.added}, updated ${stats.updated}, unchanged ${stats.unchanged}`,
    );
  }
  return 0;
}

const RESULT_MARKER_RE = /<!--\s*(run|result)\b([\s\S]*?)-->/g;
const ELAPSED_RE = /^(?=\d)(?:\d+h\s*)?(?:\d+m\s*)?(?:\d+s)?$/;
const STATUS_ORDER = ['passed', 'failed', 'blocked', 'retest', 'untested'];
const listOf = (value) => String(value ?? '').split(',').map((v) => v.trim()).filter(Boolean);
const caseNum = (value) => Number(String(value).replace(/^C/i, ''));

function splitTitle(body) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const i = lines.findIndex((l) => l.trim());
  if (i < 0 || !/^#{1,2}\s/.test(lines[i])) return { title: '', text: body.trim() };
  return { title: lines[i].replace(/^#+\s*/, '').trim(), text: lines.slice(i + 1).join('\n').trim() };
}

export function parseResultsMd(text) {
  const marks = [...text.matchAll(RESULT_MARKER_RE)];
  const blocks = marks.map((m, i) => {
    const end = m.index + m[0].length;
    const body = text.slice(end, i + 1 < marks.length ? marks[i + 1].index : text.length);
    return { kind: m[1], start: m.index, end, meta: parseMeta(m[2]), ...splitTitle(body) };
  });
  return { runs: blocks.filter((b) => b.kind === 'run'), results: blocks.filter((b) => b.kind === 'result') };
}

export function checkResults(doc, dir) {
  const problems = [];
  const [run] = doc.runs;
  if (doc.runs.length !== 1) problems.push(`needs exactly one <!-- run --> block, found ${doc.runs.length}`);
  const runId = run?.meta.testrail_run_id;
  if (runId && !/^R?\d+$/i.test(runId)) problems.push(`invalid testrail_run_id "${runId}"`);
  if (run && !runId && !run.title) problems.push('the run needs a # title to name the TestRail run');
  if (!doc.results.some((r) => r.meta.case)) problems.push('no <!-- result --> blocks with a case');
  const seen = new Set();
  for (const r of doc.results.filter((x) => x.meta.case)) {
    const where = r.meta.case;
    const status = (r.meta.status ?? '').toLowerCase();
    if (!/^C?\d+$/i.test(r.meta.case)) problems.push(`${where}: case must be a TestRail case ID like C123`);
    else if (seen.has(caseNum(r.meta.case))) problems.push(`${where}: duplicate case`);
    else seen.add(caseNum(r.meta.case));
    if (!status) problems.push(`${where}: missing status`);
    if (r.meta.elapsed && !ELAPSED_RE.test(r.meta.elapsed)) problems.push(`${where}: elapsed must look like 1m 30s, got "${r.meta.elapsed}"`);
    if (r.meta.testrail_result_id && !runId) problems.push(`${where}: has testrail_result_id but the run has no testrail_run_id`);
    if (r.meta.testrail_result_id && status === 'untested') problems.push(`${where}: TestRail cannot set a posted result back to untested`);
    for (const f of listOf(r.meta.evidence)) {
      const path = resolve(dir, f);
      if (!existsSync(path)) {
        problems.push(`${where}: evidence file not found: ${f}`);
        continue;
      }
      const rel = relative(realpathSync(dir), realpathSync(path));
      if (rel.split(sep)[0] === '..' || isAbsolute(rel)) problems.push(`${where}: evidence must be a file in the results folder: ${f}`);
    }
  }
  return problems;
}

export function writeBackResults(text, { run = {}, results = [] } = {}) {
  const doc = parseResultsMd(text);
  const edits = new Map();
  const add = (block, key, value) => edits.set(block, [...(edits.get(block) ?? []), [key, value]]);
  for (const [key, value] of Object.entries(run)) add(doc.runs[0], key, value);
  for (const { index, key, value } of results) add(doc.results[index], key, value);
  let out = text;
  for (const [b, pairs] of [...edits].sort(([x], [y]) => y.start - x.start)) {
    const raw = pairs.reduce((acc, [key, value]) => setMetaLine(acc, key, value), out.slice(b.start, b.end));
    out = out.slice(0, b.start) + raw + out.slice(b.end);
  }
  return out;
}

async function resolveMilestone(client, cfg, name) {
  const all = flattenMilestones(await client.getAll(`get_milestones/${cfg.projectId}`, 'milestones'));
  const found = [...new Map(all.map((m) => [m.id, m])).values()].filter((m) => m.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (found.length === 1) return found[0].id;
  const listing = all.map((m) => `  ${m.name}`).join('\n');
  throw new CliError(`${found.length ? 'Several milestones' : 'No milestone'} named ${JSON.stringify(name)}. Milestones:\n${listing}`);
}

async function cmdResults(files, opts, cfg, cwd) {
  if (files.length !== 1) throw new CliError('results needs exactly one results file');
  const path = resolve(cwd, files[0]);
  if (!existsSync(path)) throw new CliError(`File not found: ${files[0]}`);
  const dir = dirname(path);
  let text = readFileSync(path, 'utf8');
  const doc = parseResultsMd(text);
  const problems = checkResults(doc, dir);
  if (problems.length) throw new CliError(`${files[0]}:\n${problems.map((p) => `  ${p}`).join('\n')}`);

  const dry = Boolean(opts['dry-run']);
  const tag = dry ? '[dry-run] ' : '';
  const persist = (edits) => {
    text = writeBackResults(text, edits);
    if (!dry) writeFileSync(path, text);
  };
  const client = createClient(cfg);
  const statuses = await client.get('get_statuses');
  const statusIdOf = (name) => statuses.find((s) => [s.name, s.label].some((v) => v?.toLowerCase() === name))?.id;
  const local = doc.results.filter((r) => !r.meta.case);
  for (const r of local) console.log(`${tag}skip ${JSON.stringify(r.title)}: no TestRail case`);
  const unknown = [...new Set(doc.results.filter((r) => r.meta.case).map((r) => r.meta.status.toLowerCase()))].filter((s) => s !== 'untested' && !statusIdOf(s));
  if (unknown.length) {
    throw new CliError(`Unknown status ${unknown.map((s) => `"${s}"`).join(', ')}; TestRail statuses: ${statuses.map((s) => s.label).join(', ')}`);
  }

  const [run] = doc.runs;
  const caseIds = doc.results.filter((r) => r.meta.case).map((r) => caseNum(r.meta.case));
  let runId = run.meta.testrail_run_id ? runIdOf(run.meta.testrail_run_id) : null;
  let tests = [];
  let posted = new Map();
  if (runId) {
    const loaded = await loadRunCases(client, runId);
    if (loaded.run.is_completed) throw new CliError(`Run R${runId} is closed; TestRail does not take results for a closed run`);
    const missing = caseIds.filter((id) => !loaded.caseIds.has(id));
    if (missing.length) throw new CliError(`Not in run R${runId}: ${missing.map((id) => `C${id}`).join(', ')}`);
    tests = loaded.tests;
    if (doc.results.some((r) => r.meta.testrail_result_id)) {
      posted = new Map((await client.getAll(`get_results_for_run/${runId}`, 'results')).map((r) => [String(r.id), r]));
    }
  } else {
    const body = { suite_id: await resolveSuite(client, cfg), name: run.title, include_all: false, case_ids: caseIds };
    if (run.text) body.description = run.text;
    if (run.meta.refs) body.refs = run.meta.refs;
    if (run.meta.milestone) body.milestone_id = await resolveMilestone(client, cfg, run.meta.milestone);
    const extras = [run.meta.refs && `refs ${run.meta.refs}`, run.meta.milestone && `milestone ${run.meta.milestone}`].filter(Boolean);
    console.log(`${tag}create run ${JSON.stringify(run.title)} with ${caseIds.length} cases${extras.length ? ` (${extras.join(', ')})` : ''}`);
    if (!dry) {
      runId = String((await client.post(`add_run/${cfg.projectId}`, body)).id);
      persist({ run: { testrail_run_id: `R${runId}` } });
      tests = (await loadRunCases(client, runId)).tests;
    }
  }

  const plan = doc.results.flatMap((r, index) => (r.meta.case ? [{ r, index }] : [])).map(({ r, index }) => {
    const status = r.meta.status.toLowerCase();
    const attached = listOf(r.meta.testrail_attachments);
    const item = { index, caseId: caseNum(r.meta.case), status, attached, resultId: r.meta.testrail_result_id };
    if (status === 'untested') return { ...item, action: 'untested', files: [] };
    item.files = listOf(r.meta.evidence).filter((f) => !attached.includes(f));
    const result = { case_id: item.caseId, status_id: statusIdOf(status) };
    const version = r.meta.build || run.meta.build;
    if (version) result.version = version;
    if (r.meta.defects) result.defects = r.meta.defects;
    if (!item.resultId) {
      if (r.text) result.comment = r.text;
      if (r.meta.elapsed) result.elapsed = r.meta.elapsed;
      return { ...item, action: 'add', result };
    }
    const prev = posted.get(item.resultId);
    if (!prev) throw new CliError(`C${item.caseId}: result ${item.resultId} is not in run R${runId}`);
    if (prev.status_id !== result.status_id) {
      item.attached = [];
      item.files = listOf(r.meta.evidence);
      return { ...item, action: 'correct', result: { ...result, comment: ['Corrected result.', r.text].filter(Boolean).join('\n\n') } };
    }
    const keys = (v) => splitKeys(v).sort().join();
    if (keys(prev.defects) !== keys(r.meta.defects)) return { ...item, action: 'defects', result: { ...result, comment: 'Defects updated.' } };
    return { ...item, action: 'in sync' };
  });

  const verbs = { add: 'add', correct: 'correct', defects: 'update defects of' };
  for (const p of plan) {
    const parts = [];
    if (verbs[p.action]) parts.push(`${verbs[p.action]} C${p.caseId} ${p.status}${p.result.defects ? ` (defects ${p.result.defects})` : ''}`);
    if (p.files.length) parts.push(`attach ${p.files.join(', ')}${verbs[p.action] ? '' : ` to C${p.caseId}`}`);
    if (parts.length) console.log(`${tag}${parts.join(', ')}`);
  }

  const toPost = plan.filter((p) => verbs[p.action]);
  if (!dry && toPost.length) {
    const created = await client.post(`add_results_for_cases/${runId}`, { results: toPost.map((p) => p.result) });
    const caseOfTest = new Map(tests.map((t) => [t.id, t.case_id]));
    for (const res of created ?? []) {
      const p = toPost.find((x) => x.caseId === caseOfTest.get(res.test_id));
      if (p) p.resultId = String(res.id);
    }
    const lost = toPost.filter((p) => !(created ?? []).some((res) => String(res.id) === p.resultId));
    const saved = toPost.filter((p) => !lost.includes(p));
    persist({
      results: saved.flatMap((p) => [
        { index: p.index, key: 'testrail_result_id', value: p.resultId },
        ...(p.action === 'correct' ? [{ index: p.index, key: 'testrail_attachments', value: '' }] : []),
      ]),
    });
    if (lost.length) throw new ApiError(`TestRail returned no result for ${lost.map((p) => `C${p.caseId}`).join(', ')}; check run R${runId} before running again`);
  }
  if (!dry) {
    for (const p of plan) {
      for (const f of p.files) {
        await client.upload(`add_attachment_to_result/${p.resultId}`, resolve(dir, f));
        p.attached.push(f);
        persist({ results: [{ index: p.index, key: 'testrail_attachments', value: p.attached.join(', ') }] });
      }
    }
  }

  const count = (action) => plan.filter((p) => p.action === action).length;
  const seen = [...new Set(plan.map((p) => p.status))].sort((a, b) => (STATUS_ORDER.indexOf(a) + 1 || 99) - (STATUS_ORDER.indexOf(b) + 1 || 99));
  console.log(
    `${tag}${files[0]}: ${seen.map((s) => `${s} ${plan.filter((p) => p.status === s).length}`).join(', ')}; ` +
      `results added ${count('add')}, corrected ${count('correct')}, defects updated ${count('defects')}, in sync ${count('in sync')}; ` +
      `files attached ${plan.reduce((n, p) => n + p.files.length, 0)}${local.length ? `; skipped without a case ${local.length}` : ''}`,
  );
  if (runId) console.log(`${cfg.url.replace(/\/+$/, '')}/index.php?/runs/view/${runId}`);
  return 0;
}

export async function main(argv = process.argv.slice(2), env = process.env, cwd = process.cwd()) {
  const [command, ...rest] = argv;
  if (!['check', 'list', 'push', 'pull', 'runs', 'results'].includes(command)) {
    console.error(USAGE);
    return 1;
  }
  try {
    let parsed;
    try {
      parsed = parseArgs({
        args: rest,
        allowPositionals: true,
        options: {
          'dry-run': { type: 'boolean' },
          'parent-section': { type: 'string' },
          section: { type: 'string' },
          out: { type: 'string' },
          overwrite: { type: 'boolean' },
          refs: { type: 'string' },
          milestone: { type: 'string' },
          since: { type: 'string' },
          active: { type: 'boolean' },
          details: { type: 'boolean' },
          run: { type: 'string' },
        },
      });
    } catch (e) {
      throw new CliError(`${e.message}\n\n${USAGE}`);
    }
    const { values, positionals } = parsed;
    if (command === 'check') return cmdCheck(positionals, cwd);
    const cfg = readConfig({ ...loadDotEnv(cwd), ...env });
    if (command === 'list') return await cmdList(values, cfg);
    if (command === 'pull') return await cmdPull(values, cfg, cwd);
    if (command === 'runs') return await cmdRuns(values, cfg);
    if (command === 'results') return await cmdResults(positionals, values, cfg, cwd);
    return await cmdPush(positionals, values, cfg, cwd);
  } catch (e) {
    console.error(e.message);
    return e instanceof ApiError ? 2 : 1;
  }
}

const invokedDirectly =
  process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (invokedDirectly) process.exitCode = await main();

import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const MARKER_RE = /<!--\s*(suite|test|example)\b([\s\S]*?)-->/g;
const FENCE_RE = /^\s*(```|~~~)/;
const EXPECTED_RE = /^\s*(?:[-*+]\s+)?\*{1,2}Expected(?:\s+results?)?:?\*{1,2}:?\s*(.*)$/i;
const ITEM_RE = /^(?:[-+*]|\d+[.)])\s+/;
const PRIORITY_ALIASES = { normal: 'medium', important: 'high' };
const KNOWN_PRIORITIES = ['critical', 'high', 'medium', 'low', 'normal', 'important'];

const USAGE = `Usage: node testrail.mjs <command> [options]

Commands:
  check <files...>                          Parse .test.md files offline and report problems
  list [--section <name>]                   Print sections and cases (C<id>) of the resolved suite
  push <files...> [--dry-run]               Create or update cases in TestRail and write IDs back
       [--parent-section <name>]
  pull [--section <name>] [--out <dir>]     Download cases into .test.md files (default dir test-cases/)
       [--overwrite]                        Replace local files that differ from the download

Environment (or .env in the current directory):
  TESTRAIL_URL, TESTRAIL_USER, TESTRAIL_API_KEY, TESTRAIL_PROJECT_ID
  TESTRAIL_SUITE_ID, TESTRAIL_TEMPLATE_ID (optional)

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

export function parseTestMd(text) {
  const suites = [];
  for (const b of scanBlocks(text)) {
    if (b.kind === 'suite') {
      suites.push({ ...parseSuiteBody(b.body), meta: parseMeta(b.inner), tests: [] });
    } else if (b.kind === 'test') {
      if (!suites.length) suites.push({ title: '', description: '', meta: {}, tests: [] });
      suites.at(-1).tests.push({ ...parseTestBody(b.body), meta: parseMeta(b.inner), examples: null });
    } else {
      const last = suites.at(-1)?.tests.at(-1);
      const rows = b.body.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('|'));
      if (last && rows.length) last.examples = rows.join('\n');
    }
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

export function toCasePayload(test, suite, ctx) {
  const payload = { title: test.title, template_id: ctx.templateId };
  const priorityId = resolvePriority(ctx.priorityIdByName, test.meta?.priority ?? suite.meta?.priority);
  if (priorityId !== undefined) payload.priority_id = priorityId;
  const refs = test.meta?.refs ?? suite.meta?.refs;
  if (refs) payload.refs = refs;
  const preconds = [test.description?.trim(), test.examples ? `Test data:\n${test.examples}` : '']
    .filter(Boolean)
    .join('\n\n');
  if (preconds) payload.custom_preconds = preconds;
  if (test.steps?.length) {
    payload.custom_steps_separated = test.steps.map((s) => ({ content: s.content, expected: s.expected }));
  }
  return payload;
}

function setMetaLine(raw, key, value) {
  const head = raw.slice(0, -3);
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const line = `${key}: ${value}`;
  const keyRe = new RegExp(`^([ \\t]*${key}[ \\t]*:)[^\\r\\n]*`, 'm');
  if (keyRe.test(head)) return `${head.replace(keyRe, `$1 ${value}`)}-->`;
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

export function serializeSection(section, cases, priorityNames = new Map()) {
  const clean = (v) => String(v ?? '').replace(/\r\n/g, '\n').trim();
  const out = [`<!-- suite\ntestrail_section_id: ${section.id}\n-->\n\n# ${section.name}\n`];
  if (clean(section.description)) out.push(`${clean(section.description)}\n`);
  for (const c of cases) {
    const meta = [`testrail_id: C${c.id}`];
    const priority = priorityNames.get(c.priority_id);
    if (priority) meta.push(`priority: ${priority.toLowerCase()}`);
    if (clean(c.refs)) meta.push(`refs: ${clean(c.refs)}`);
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
    let rateTries = 0;
    let serverTries = 0;
    for (;;) {
      let res;
      try {
        res = await fetch(target, {
          method,
          headers: { Authorization: authorization, 'Content-Type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch (e) {
        throw new ApiError(`${method} ${label} failed: ${e.cause?.code ?? e.message}`);
      }
      if (res.status === 429 && ++rateTries < 3) {
        const wait = Number(res.headers.get('retry-after'));
        await sleep((Number.isFinite(wait) ? wait : 1) * 1000);
        continue;
      }
      if (res.status >= 500 && ++serverTries < 2) {
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
        throw new ApiError(`${method} ${label} failed with HTTP ${res.status}: ${detail}`, res.status);
      }
      return data;
    }
  }

  const get = (endpoint) => send('GET', `${base}/index.php?/api/v2/${endpoint}`, endpoint);
  const post = (endpoint, body) => send('POST', `${base}/index.php?/api/v2/${endpoint}`, endpoint, body ?? {});

  async function getAll(endpoint, key) {
    let data = await get(endpoint);
    if (Array.isArray(data)) return data;
    const items = [...(data?.[key] ?? [])];
    while (data?._links?.next) {
      const next = data._links.next;
      data = await send('GET', `${base}/index.php?${next}`, next);
      items.push(...(data?.[key] ?? []));
    }
    return items;
  }

  return { get, post, getAll };
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
  };
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
    console.log(`${file}: ${doc.suites.length} suites, ${tests.length} tests`);
    if (noSteps.length) console.log(`  tests without steps: ${noSteps.map(({ t }) => JSON.stringify(t.title || '(untitled)')).join(', ')}`);
    if (untitled.length) console.log(`  tests without title: ${untitled.length}`);
    for (const { t, p } of unknown) console.log(`  unknown priority "${p}" in ${JSON.stringify(t.title || '(untitled)')}`);
    if (!tests.length) console.log('  no tests found');
    if (!tests.length || untitled.length) failed = true;
  }
  return failed ? 1 : 0;
}

async function cmdList(opts, cfg) {
  const client = createClient(cfg);
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
  const suiteId = await resolveSuite(client, cfg);
  const priorityNames = new Map((await client.get('get_priorities')).map((p) => [p.id, p.name]));
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
  const cases = await client.getAll(`get_cases/${cfg.projectId}&suite_id=${suiteId}`, 'cases');
  const pathOf = (s) => (s.parent_id !== null && byId.has(s.parent_id) ? `${pathOf(byId.get(s.parent_id))}--${slug(s.name)}` : slug(s.name));
  const targets = selected
    .map((s) => ({ section: s, cases: cases.filter((c) => c.section_id === s.id), base: pathOf(s) || `section-${s.id}` }))
    .filter((t) => t.cases.length);
  const dir = resolve(cwd, opts.out ?? 'test-cases');
  const files = targets.map((t) => {
    const clash = targets.filter((o) => o.base === t.base).length > 1;
    const name = `${clash ? `${t.base}-${t.section.id}` : t.base}.test.md`;
    return { name, path: resolve(dir, name), text: serializeSection(t.section, t.cases, priorityNames), count: t.cases.length };
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

async function cmdPush(files, opts, cfg, cwd) {
  if (!files.length) throw new CliError('push needs at least one file');
  const loaded = files.map((f) => loadFile(f, cwd));
  for (const { file, doc } of loaded) {
    for (const suite of doc.suites) {
      if (!suite.title) throw new CliError(`${file}: a test appears before any suite or a suite has no title`);
      const sid = suite.meta.testrail_section_id;
      if (sid && !/^\d+$/.test(sid)) throw new CliError(`${file}: invalid testrail_section_id "${sid}"`);
      for (const t of suite.tests) {
        if (!t.title) throw new CliError(`${file}: a test in suite "${suite.title}" has no title`);
        if (t.meta.testrail_id && !/^C?\d+$/i.test(t.meta.testrail_id)) {
          throw new CliError(`${file}: invalid testrail_id "${t.meta.testrail_id}" in "${t.title}"`);
        }
      }
    }
  }

  const dry = Boolean(opts['dry-run']);
  const tag = dry ? '[dry-run] ' : '';
  const client = createClient(cfg);
  const suiteId = await resolveSuite(client, cfg);
  const templateId = await resolveTemplate(client, cfg);
  const ctx = { templateId, priorityIdByName: buildPriorityMap(await client.get('get_priorities')) };
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

  for (const { file, path, text, doc } of loaded) {
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
          const payload = toCasePayload(test, suite, ctx);
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

export async function main(argv = process.argv.slice(2), env = process.env, cwd = process.cwd()) {
  const [command, ...rest] = argv;
  if (!['check', 'list', 'push', 'pull'].includes(command)) {
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
    return await cmdPush(positionals, values, cfg, cwd);
  } catch (e) {
    console.error(e.message);
    return e instanceof ApiError ? 2 : 1;
  }
}

const invokedDirectly =
  process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (invokedDirectly) process.exitCode = await main();

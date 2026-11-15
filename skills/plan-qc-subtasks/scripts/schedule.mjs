#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const USAGE = `Usage:
  node schedule.mjs settings
  node schedule.mjs plan <stories.json>
  node schedule.mjs verify <plan.json> <readback.json>

stories.json: [{ "story": "PROJ-10",
                 "dev": [{ "key": "PROJ-11", "due": "2026-10-02" }],
                 "qc":  [{ "key": "PROJ-12", "start": null, "due": null, "sp": 5 }] }]
Dates are YYYY-MM-DD or Jira timestamps; empty is null.

Environment (or .env in the current directory), defaults in brackets:
  QC_SP_HOURS       story points to hours, SP:HOURS pairs [1:2,2:4,3:8,5:16,8:24,13:40]
  QC_HOURS_PER_DAY  working hours in a day [8]
  QC_WORKDAYS       working weekdays [mon,tue,wed,thu,fri]
  QC_HOLIDAYS       days off, YYYY-MM-DD list []`;

const DEFAULTS = {
  QC_SP_HOURS: '1:2,2:4,3:8,5:16,8:24,13:40',
  QC_HOURS_PER_DAY: '8',
  QC_WORKDAYS: 'mon,tue,wed,thu,fri',
  QC_HOLIDAYS: '',
};
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_MS = 86_400_000;

class InputError extends Error {}

const list = (value) =>
  String(value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

function parseDate(value, where) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const m = String(value).match(/^\s*(\d{4})-(\d{2})-(\d{2})/);
  const date = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (!date || date.getUTCMonth() !== +m[2] - 1 || date.getUTCDate() !== +m[3]) {
    throw new InputError(`${where}: not a YYYY-MM-DD date or Jira timestamp: ${JSON.stringify(value)}`);
  }
  return date;
}

const iso = (date) => date.toISOString().slice(0, 10);
const addDays = (date, n) => new Date(date.getTime() + n * DAY_MS);

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

export function readSettings(env = {}) {
  const get = (key) => (env[key] !== undefined && env[key] !== '' ? env[key] : DEFAULTS[key]);
  const spHours = {};
  for (const pair of list(get('QC_SP_HOURS'))) {
    const [sp, hours] = pair.split(':').map(Number);
    if (!(sp > 0) || !(hours > 0)) throw new InputError(`QC_SP_HOURS: expected SP:HOURS pairs, got "${pair}"`);
    if (sp in spHours) throw new InputError(`QC_SP_HOURS: SP ${sp} is listed twice`);
    spHours[sp] = hours;
  }
  const hoursPerDay = Number(get('QC_HOURS_PER_DAY'));
  if (!(hoursPerDay > 0 && hoursPerDay <= 24)) throw new InputError('QC_HOURS_PER_DAY: expected a number of hours from 1 to 24');
  const workdays = list(get('QC_WORKDAYS')).map((d) => d.toLowerCase());
  const unknown = workdays.filter((d) => !WEEKDAYS.includes(d));
  if (!workdays.length || unknown.length) throw new InputError(`QC_WORKDAYS: use names from ${WEEKDAYS.join(',')}`);
  const holidays = list(get('QC_HOLIDAYS')).map((d) => iso(parseDate(d, 'QC_HOLIDAYS')));
  return { spHours, hoursPerDay, workdays, holidays };
}

export function plan(stories, settings) {
  if (!Array.isArray(stories)) throw new InputError('Input must be a JSON list of stories');
  const workdays = new Set(settings.workdays.map((d) => WEEKDAYS.indexOf(d)));
  const holidays = new Set(settings.holidays);
  const isWorkday = (date) => workdays.has(date.getUTCDay()) && !holidays.has(iso(date));
  const nextWorkday = (date) => {
    let day = addDays(date, 1);
    while (!isWorkday(day)) day = addDays(day, 1);
    return day;
  };
  const nthWorkday = (start, n) => {
    let day = isWorkday(start) ? start : nextWorkday(start);
    for (let i = 1; i < n; i++) day = nextWorkday(day);
    return day;
  };

  const seen = new Set();
  return stories.flatMap(({ story, dev = [], qc = [] }) => {
    if (!story) throw new InputError('Every story needs "story", its key');
    const devDues = dev.map((d) => ({ key: d.key, due: parseDate(d.due, `${d.key} due`) }));
    const missing = devDues.filter((d) => !d.due).map((d) => d.key);
    const latest = devDues.length && !missing.length ? devDues.reduce((a, b) => (b.due > a.due ? b : a)) : null;
    const devProblem = !devDues.length
      ? 'the story has no Dev subtask'
      : missing.length
        ? `Dev subtask without a Due date: ${missing.join(', ')}`
        : null;

    return qc.map((sub) => {
      if (!sub.key || seen.has(sub.key)) throw new InputError(`QC subtask key missing or repeated: ${sub.key}`);
      seen.add(sub.key);
      const current = { start: parseDate(sub.start, `${sub.key} start`), due: parseDate(sub.due, `${sub.key} due`) };
      const row = { story, key: sub.key, set: {}, basis: {}, notes: [], problem: null };
      if (devProblem) {
        if (!current.start || !current.due) row.problem = devProblem;
        return row;
      }

      const computedStart = nextWorkday(latest.due);
      row.basis = { devKey: latest.key, devDue: iso(latest.due), sp: sub.sp ?? null };
      if (!current.start) row.set.start = iso(computedStart);
      else if (iso(current.start) !== iso(computedStart)) row.notes.push(`kept Start date; computed ${iso(computedStart)}`);
      const start = current.start ?? computedStart;

      const hours = settings.spHours[sub.sp];
      if (hours) {
        const days = Math.max(1, Math.ceil(+(hours / settings.hoursPerDay).toFixed(6)));
        Object.assign(row.basis, { hours, days });
        const due = nthWorkday(start, days);
        if (!current.due) row.set.due = iso(due);
        else if (iso(current.due) !== iso(due)) row.notes.push(`kept Due date; computed ${iso(due)}`);
      } else if (!current.due) {
        row.problem = sub.sp === null || sub.sp === undefined ? 'no story points' : `SP ${sub.sp} is not in QC_SP_HOURS`;
      }
      if (!isWorkday(start)) row.notes.push('Start date is not a working day; day 1 is the next working day');
      return row;
    });
  });
}

export function verify(rows, stories) {
  const found = new Map(stories.flatMap((s) => (s.qc ?? []).map((q) => [q.key, q])));
  return rows.flatMap((row) =>
    Object.entries(row.set).flatMap(([field, value]) => {
      const sub = found.get(row.key);
      if (!sub) return [`${row.key}: not in the read-back`];
      const actual = parseDate(sub[field], `${row.key} ${field}`);
      return actual && iso(actual) === value ? [] : [`${row.key} ${field}: wrote ${value}, Jira has ${actual ? iso(actual) : 'nothing'}`];
    }),
  );
}

const readJson = (path, cwd) => JSON.parse(readFileSync(resolve(cwd, path), 'utf8'));

export function main(argv = process.argv.slice(2), env = process.env, cwd = process.cwd()) {
  const [command, ...files] = argv;
  try {
    const settings = readSettings({ ...loadDotEnv(cwd), ...env });
    if (command === 'settings' && files.length === 0) {
      console.log(JSON.stringify(settings, null, 2));
      return 0;
    }
    if (command === 'plan' && files.length === 1) {
      console.log(JSON.stringify({ settings, rows: plan(readJson(files[0], cwd), settings) }, null, 2));
      return 0;
    }
    if (command === 'verify' && files.length === 2) {
      const approved = readJson(files[0], cwd);
      const mismatches = verify(approved.rows ?? approved, readJson(files[1], cwd));
      console.log(mismatches.length ? mismatches.join('\n') : 'All written dates match.');
      return mismatches.length ? 1 : 0;
    }
    console.error(USAGE);
    return 2;
  } catch (e) {
    if (!(e instanceof InputError) && !(e instanceof SyntaxError) && e.code !== 'ENOENT') throw e;
    console.error(e.message);
    return 2;
  }
}

const invokedDirectly =
  process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (invokedDirectly) process.exitCode = main();

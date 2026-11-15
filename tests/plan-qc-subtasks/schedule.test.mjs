import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { main, plan, readSettings, verify } from '../../skills/plan-qc-subtasks/scripts/schedule.mjs';

const FRIDAY = '2026-10-02';
const defaults = readSettings();

const story = (qc, dev = [{ key: 'P-11', due: FRIDAY }]) => [{ story: 'P-10', dev, qc: [{ key: 'P-12', start: null, due: null, ...qc }] }];
const row = (qc, dev, settings = defaults) => plan(story(qc, dev), settings)[0];

test('QC starts the working day after the latest Dev Due date and the start counts as day 1', () => {
  const dev = [
    { key: 'P-11', due: '2026-09-30' },
    { key: 'P-13', due: `${FRIDAY}T17:00:00.000+0700` },
  ];
  const r = row({ sp: 5 }, dev);
  assert.deepEqual(r.set, { start: '2026-10-05', due: '2026-10-06' });
  assert.deepEqual(r.basis, { devKey: 'P-13', devDue: FRIDAY, sp: 5, hours: 16, days: 2 });
  assert.equal(r.problem, null);
  assert.equal(row({ sp: 3 }).set.due, '2026-10-05');
  assert.equal(row({ sp: 13 }).set.due, '2026-10-09');
});

test('weekends and holidays are skipped for both dates', () => {
  const settings = readSettings({ QC_HOLIDAYS: '2026-10-05, 2026-10-07' });
  assert.deepEqual(row({ sp: 5 }, undefined, settings).set, { start: '2026-10-06', due: '2026-10-08' });
});

test('an existing Start date is kept and the Due date counts from it', () => {
  const r = row({ sp: 5, start: '2026-10-07' });
  assert.deepEqual(r.set, { due: '2026-10-08' });
  assert.ok(r.notes.some((n) => n.includes('2026-10-05')));
});

test('an existing Start date on a weekend makes the next working day day 1', () => {
  const r = row({ sp: 3, start: '2026-10-10' });
  assert.deepEqual(r.set, { due: '2026-10-12' });
  assert.ok(r.notes.some((n) => n.includes('not a working day')));
});

test('an existing Due date is kept and the computed one is only noted', () => {
  const r = row({ sp: 5, due: '2026-10-20' });
  assert.deepEqual(r.set, { start: '2026-10-05' });
  assert.ok(r.notes.some((n) => n.includes('2026-10-06')));
  assert.deepEqual(row({ sp: 5, start: '2026-10-05', due: '2026-10-06' }).set, {});
});

test('a Dev subtask without a Due date, or no Dev subtask, leaves the QC subtask unchanged', () => {
  const missing = row({ sp: 5, start: '2026-10-05' }, [{ key: 'P-11', due: FRIDAY }, { key: 'P-14', due: null }]);
  assert.deepEqual(missing.set, {});
  assert.match(missing.problem, /P-14/);
  const none = row({ sp: 5 }, []);
  assert.deepEqual(none.set, {});
  assert.match(none.problem, /no Dev subtask/);
});

test('missing or unknown story points set the Start date only', () => {
  const none = row({ sp: null });
  assert.deepEqual(none.set, { start: '2026-10-05' });
  assert.equal(none.problem, 'no story points');
  assert.match(row({ sp: 4 }).problem, /SP 4/);
});

test('bad input stops before planning', () => {
  assert.throws(() => row({ sp: 5, start: '2026-02-30' }), /P-12 start/);
  assert.throws(() => plan([{ story: 'P-10', dev: [], qc: [{ key: 'A' }, { key: 'A' }] }], defaults), /repeated/);
  assert.throws(() => readSettings({ QC_SP_HOURS: '1:2,1:4' }), /twice/);
  assert.throws(() => readSettings({ QC_WORKDAYS: 'mon,funday' }), /QC_WORKDAYS/);
});

test('verify reports each written date Jira does not hold', () => {
  const rows = plan(story({ sp: 5 }), defaults);
  const readback = (start, due) => [{ story: 'P-10', qc: [{ key: 'P-12', start, due }] }];
  assert.deepEqual(verify(rows, readback('2026-10-05', '2026-10-06T00:00:00.000+0700')), []);
  assert.deepEqual(verify(rows, readback('2026-10-05', '2026-10-07')), ['P-12 due: wrote 2026-10-06, Jira has 2026-10-07']);
  assert.deepEqual(verify(rows, []), ['P-12: not in the read-back', 'P-12: not in the read-back']);
});

test('the CLI reads settings from .env, lets the environment override them, and exits 2 on bad input', () => {
  const dir = mkdtempSync(join(tmpdir(), 'plan-qc-subtasks-'));
  writeFileSync(join(dir, '.env'), 'QC_HOURS_PER_DAY=4\nQC_HOLIDAYS="2026-10-05"\n');
  writeFileSync(join(dir, 'stories.json'), JSON.stringify(story({ sp: 3 })));
  const out = [];
  const log = console.log;
  console.log = (text) => out.push(text);
  try {
    assert.equal(main(['plan', 'stories.json'], {}, dir), 0);
    assert.deepEqual(JSON.parse(out[0]).rows[0].set, { start: '2026-10-06', due: '2026-10-07' });
    assert.equal(main(['plan', 'stories.json'], { QC_HOURS_PER_DAY: '8' }, dir), 0);
    assert.deepEqual(JSON.parse(out[1]).rows[0].set, { start: '2026-10-06', due: '2026-10-06' });
  } finally {
    console.log = log;
  }
  const error = console.error;
  console.error = () => {};
  try {
    assert.equal(main(['plan', 'missing.json'], {}, dir), 2);
    assert.equal(main(['plan'], {}, dir), 2);
  } finally {
    console.error = error;
  }
});

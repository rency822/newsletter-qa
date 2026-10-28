import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseEml} from '../src/eml.js';
import {parseNewsletter, detectProgram} from '../src/newsletter.js';
import {parseSchedule} from '../src/schedule.js';
import {computeWindow} from '../src/windowCalc.js';
import {DEFAULT_MAPPING} from '../src/mapping.js';
import {checkSchedule, assign} from '../src/matcher.js';

const fx = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');
const RC = fx('radicalcash-2026-10-26.eml');
const KP = fx('kennyspennies-2026-10-26.eml');
const SCHED = fx('schedule-2026-10.html');

function run(program, emlText) {
  const eml = parseEml(emlText);
  const newsletter = parseNewsletter(eml.html);
  const {entries, coveredDays} = parseSchedule([SCHED]);
  const window = computeWindow(newsletter.releaseDate);
  return checkSchedule({newsletter, entries, coveredDays, mapping: DEFAULT_MAPPING, program, window});
}

const WIN = computeWindow('2026-10-26');
function synthetic({nlTitle = 'Some Scene', nlTitles, nlHeader = 'AD4X', entry, entries, coveredDays} = {}) {
  const titles = nlTitles ?? [nlTitle];
  const newsletter = {
    releaseDate: '2026-10-26',
    sections: [{header: nlHeader, scenes: titles.map((t) => ({title: t, slug: null, fhg: null, models: [], clips: []}))}],
  };
  const list = entries ?? (entry ? [{
    siteKey: 'AD4X - admin.ad4x.com', label: 'AD4X', adminHost: 'admin.ad4x.com',
    title: nlTitle, status: 'published', date: '2026-10-12', id: '1', hasVideo: true, hasPhoto: false, ...entry,
  }] : []);
  return checkSchedule({
    newsletter, entries: list, coveredDays: coveredDays ?? new Set(WIN.days),
    mapping: DEFAULT_MAPPING, program: 'radicalcash', window: WIN,
  });
}

test('radicalcash fixture: missing rows', () => {
  const r = run('radicalcash', RC);
  const missing = r.rows.filter((x) => x.status === 'missing').map((x) => `${x.studio}|${x.scheduleTitle}`).sort();
  assert.deepEqual(missing, [
    'AmazingFilms|Jazz Gives Great Service', 'Bemefi|StepSisterLove 6 Scene 2', 'BigGulpGirls|Bad Bella',
    'DoggVision|Misty Rein Threesome Behind the Scenes', 'LaBellaDX|The Lesbian Animation Session',
    'WankItNow|SENSUAL GROOVE', 'WankItNow|SEXY VIDERO', 'WankItNow|VERY HAPPY ENDING', 'WankItNow|WORK ME OUT'].sort());
});
test('radicalcash fixture: matched/fuzzy count and Roberts Cock', () => {
  const r = run('radicalcash', RC);
  assert.equal(r.rows.filter((x) => ['matched', 'fuzzy'].includes(x.status)).length, 38);
  assert.equal(r.rows.find((x) => /Roberts Cock/.test(x.newsletterTitle)).status !== 'not-found', true);
});
test('kennyspennies fixture', () => {
  const k = run('kennyspennies', KP);
  assert.equal(k.rows.filter((x) => ['matched', 'fuzzy'].includes(x.status)).length, 13);
  assert.deepEqual(k.rows.filter((x) => x.status === 'missing').map((x) => x.scheduleTitle), ['Wife Saves Your Job']);
  assert.ok(!k.rows.some((x) => x.scheduleTitle === 'Resist Temptation.'));
});
test('rows have the full shape', () => {
  const r = run('kennyspennies', KP);
  for (const row of r.rows) {
    assert.deepEqual(Object.keys(row).sort(), ['code', 'date', 'fhg', 'newsletterTitle', 'note', 'scheduleTitle', 'score', 'status', 'studio']);
  }
});
test('outside-window', () => assert.equal(synthetic({nlTitle: 'Old Scene', entry: {date: '2026-10-01', status: 'published'}}).rows[0].status, 'outside-window'));
test('not-published', () => assert.equal(synthetic({nlTitle: 'Soon', entry: {date: '2026-10-12', status: 'scheduled'}}).rows[0].status, 'not-published'));
test('unknown-studio', () => {
  const row = synthetic({nlHeader: 'NEW STUDIO'}).rows[0];
  assert.equal(row.status, 'unknown-studio');
  assert.equal(row.studio, 'NEW STUDIO');
});
test('not-found', () => {
  const row = synthetic({nlTitle: 'Nothing Like It'}).rows[0];
  assert.equal(row.status, 'not-found');
  assert.equal(row.studio, 'AD4X');
  assert.equal(row.scheduleTitle, null);
});
test('exact title is matched, near title is fuzzy', () => {
  assert.equal(synthetic({nlTitle: 'Hot Scene', entry: {title: 'Hot Scene'}}).rows[0].status, 'matched');
  assert.equal(synthetic({nlTitle: 'My Hot Stepsister Scene', entry: {title: 'My Hot Stepsister Scenes'}}).rows[0].status, 'fuzzy');
});
test('Review Focus 3: duplicate newsletter titles, one entry', () => {
  const r = synthetic({nlTitles: ['Twin Scene', 'Twin Scene'], entry: {title: 'Twin Scene'}});
  assert.deepEqual(r.rows.map((x) => x.status).sort(), ['matched', 'not-found']);
});
test('Review Focus 1: uncovered day yields no missing row', () => {
  const coveredDays = new Set(WIN.days.filter((d) => d !== '2026-10-15'));
  const r = synthetic({nlTitle: 'Unrelated', entry: {title: 'Hidden Gem', date: '2026-10-15'}, coveredDays});
  assert.deepEqual(r.uncoveredDays, ['2026-10-15']);
  assert.ok(!r.rows.some((x) => x.status === 'missing' && x.date === '2026-10-15'));
});
test('assign is greedy one-to-one', () => {
  const kept = assign([{a: 1, b: 'x', score: 0.9}, {a: 2, b: 'x', score: 0.95}, {a: 1, b: 'y', score: 0.5}], 0.85);
  assert.deepEqual(kept.map((p) => p.a), [2]);
});

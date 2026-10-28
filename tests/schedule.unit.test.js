import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseSchedule, isTestTitle} from '../src/schedule.js';

const SCHED = readFileSync(new URL('./fixtures/schedule-2026-10.html', import.meta.url), 'utf8');
const {entries, coveredDays} = parseSchedule([SCHED]);

test('coveredDays has every day heading', () => assert.equal(coveredDays.size, 31));
test('sticky duplicate merged', () => {
  const da = entries.filter(e => e.label === 'Dirty Auditions' && e.date === '2026-10-02');
  assert.equal(da.length, 1);
});
test('test titles dropped', () => {
  assert.ok(!entries.some(e => /^test\d$/.test(e.title)));
  assert.ok(!entries.some(e => e.title.startsWith('TEST_')));
  assert.ok(!entries.some(e => e.title.startsWith('Carlo Test')));
});
test('flags and status parsed', () => {
  const resist = entries.find(e => e.title === 'Resist Temptation.');
  assert.deepEqual([resist.hasVideo, resist.hasPhoto, resist.status], [false, true, 'published']);
});
test('admin hosts split from label', () => {
  const st = entries.filter(e => e.label === 'Sex Tapes').map(e => e.adminHost);
  assert.ok(st.includes('admin.sextapes.com') && st.includes('admin.studiovanniall.com'));
});
test('isTestTitle keeps real TEST DRIVE', () => assert.equal(isTestTitle('Test Drive'), false));
test('non-schedule page throws', () => {
  assert.throws(() => parseSchedule(['<p>hello</p>']), /no calendar entries/);
});

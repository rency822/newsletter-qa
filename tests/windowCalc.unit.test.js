import test from 'node:test';
import assert from 'node:assert/strict';
import { computeWindow } from '../src/windowCalc.js';

const pick = (w) => ({ generation: w.generation, start: w.start, end: w.end });

test('Monday release 2026-10-26', () => {
  assert.deepEqual(pick(computeWindow('2026-10-26')), { generation: '2026-10-22', start: '2026-10-09', end: '2026-10-15' });
});
test('Wednesday release uses previous Thursday', () => {
  assert.equal(computeWindow('2026-10-21').generation, '2026-10-15');
});
test('Thursday release is strictly before', () => {
  assert.equal(computeWindow('2026-10-22').generation, '2026-10-15');
});
test('window crossing month boundary', () => {
  assert.deepEqual(pick(computeWindow('2026-11-09')), { generation: '2026-11-05', start: '2026-10-23', end: '2026-10-29' });
});
test('days has 7 entries from start to end', () => {
  const w = computeWindow('2026-10-26');
  assert.equal(w.days.length, 7);
  assert.equal(w.days[0], w.start);
  assert.equal(w.days[6], w.end);
});

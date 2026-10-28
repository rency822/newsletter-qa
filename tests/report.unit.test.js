import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize, toCopyText, toCsv} from '../src/report.js';

const rows = [
  {status:'missing', studio:'WankItNow', scheduleTitle:'Sensual Groove', newsletterTitle:null, date:'2026-10-13'},
  {status:'not-found', studio:'PSMTICKLING', newsletterTitle:'Ticklish Sub', scheduleTitle:null, date:null},
  {status:'matched', studio:'AD4X', newsletterTitle:'Quebecers On Vacation', scheduleTitle:'Quebecers on Vacation', date:'2026-10-15'}];

test('summarize counts ok/missing/review', () => {
  assert.deepEqual(summarize(rows), {ok:1, missing:1, review:1});
  assert.deepEqual(summarize([{status:'fuzzy'}, {status:'matched'}, {status:'outside-window'}]), {ok:2, missing:0, review:1});
  assert.deepEqual(summarize([]), {ok:0, missing:0, review:0});
});

test('copy text lists problem rows only, with icons and optional date', () => {
  assert.equal(toCopyText(rows), '❌ WankItNow – Sensual Groove (Oct 13)\n⚠️ PSMTICKLING – Ticklish Sub');
  assert.equal(toCopyText([rows[2], {status:'fuzzy', studio:'X', newsletterTitle:'a'}]), '');
});

test('copy text date is computed without timezone shift', () => {
  assert.equal(toCopyText([{status:'missing', studio:'S', scheduleTitle:'T', date:'2026-10-13'}]), '❌ S – T (Oct 13)');
  assert.equal(toCopyText([{status:'missing', studio:'S', scheduleTitle:'T', date:'2026-01-01'}]), '❌ S – T (Jan 1)');
  assert.equal(toCopyText([{status:'missing', studio:'S', scheduleTitle:'T', date:'2026-12-31'}]), '❌ S – T (Dec 31)');
});

test('copy text orders by studio then title within missing/other groups', () => {
  const r = [
    {status:'missing', studio:'B', scheduleTitle:'Z'},
    {status:'missing', studio:'A', scheduleTitle:'Y'},
    {status:'missing', studio:'A', scheduleTitle:'X'},
    {status:'title-mismatch', studio:'A', newsletterTitle:'Q'}];
  assert.equal(toCopyText(r), '❌ A – X\n❌ A – Y\n❌ B – Z\n⚠️ A – Q');
});

test('csv header and RFC 4180 quoting', () => {
  assert.equal(toCsv(rows).split('\n')[0], 'status,studio,newsletter_title,schedule_title,date,code,note,fhg');
  assert.ok(toCsv([{...rows[0], scheduleTitle:'A, "B"'}]).includes('"A, ""B"""'));
  assert.ok(toCsv([{status:'missing', note:'a\nb'}]).includes('"a\nb"'));
  assert.equal(toCsv(rows).split('\n').length, 4);
  assert.equal(toCsv([{status:'missing', fhg:'F1', code:'C'}]).split('\n')[1], 'missing,,,,,C,,F1');
});

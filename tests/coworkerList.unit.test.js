import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseCoworkerList} from '../src/coworkerList.js';

const LIST = readFileSync(new URL('./fixtures/indiebucks-list-2026-10-21.txt', import.meta.url), 'utf8');

test('parses the fixture list', () => {
  const rows = parseCoworkerList(LIST);
  assert.equal(rows.length, 17);
  assert.deepEqual(rows.find(r=>r.code==='bbbc0167_blazemaxwell_jr'),
    {code:'bbbc0167_blazemaxwell_jr', title:'Finally Getting His Load Off', note:'No 10 min tube for this scene', modelTokens:['blazemaxwell','jr']});
  assert.deepEqual(rows.find(r=>r.code.startsWith('boyn1253')).modelTokens, ['romeotwink','mitchschif']);
});

test('line without code uses right part as note', () => {
  assert.deepEqual(parseCoworkerList('Boyfriend experience - CSW')[0], {code:null, title:'Boyfriend experience', note:'CSW', modelTokens:[]});
});

test('blank input yields no rows', () => {
  assert.equal(parseCoworkerList('\n\n  \n').length, 0);
});

test('accepts CRLF line endings', () => {
  const rows = parseCoworkerList(LIST.replace(/\r?\n/g, '\r\n'));
  assert.equal(rows.length, 17);
  assert.equal(rows[0].title, 'Tickle me, coach: I can take it!');
});

test('empty model tokens are dropped', () => {
  assert.deepEqual(parseCoworkerList('abc1_ - T')[0].modelTokens, []);
  assert.deepEqual(parseCoworkerList('abc1__x_ - T')[0].modelTokens, ['x']);
});

test('code followed by a space but no " - " still splits code and title', () => {
  assert.deepEqual(parseCoworkerList("tkc0232_redblack_matt Red Black's Revenge")[0],
    {code:'tkc0232_redblack_matt', title:"Red Black's Revenge", note:null, modelTokens:['redblack','matt']});
});

test('a title-only line starting with a short code-like word is not split', () => {
  assert.deepEqual(parseCoworkerList('B2 Bomber Night')[0], {code:null, title:'B2 Bomber Night', note:null, modelTokens:[]});
});

test('repeated identical lines are kept once', () => {
  const twice = "ffd0235_tan_franco - Tan\nffdhq0157_jeff - Jeff\nffd0235_tan_franco - Tan\n  ffdhq0157_jeff - Jeff  \n";
  assert.deepEqual(parseCoworkerList(twice).map(r=>r.code), ['ffd0235_tan_franco','ffdhq0157_jeff']);
});

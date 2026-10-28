import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseEml} from '../src/eml.js';
import {parseNewsletter} from '../src/newsletter.js';
import {parseCoworkerList} from '../src/coworkerList.js';
import {checkIndieBucks} from '../src/matcher.js';

const fx = (n) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');
const IB = fx('indiebucks-2026-10-21.eml');
const LIST = fx('indiebucks-list-2026-10-21.txt');
const r = checkIndieBucks({newsletter: parseNewsletter(parseEml(IB).html), list: parseCoworkerList(LIST)});
const by = (s) => r.rows.filter((x) => x.status === s);

test('matched + fuzzy count', () => assert.equal(by('matched').length + by('fuzzy').length, 16));
test('title-mismatch', () => assert.deepEqual(by('title-mismatch').map((x) => [x.code.split('_')[0], x.newsletterTitle]), [['boyn1253', 'Using A New Sub Boy - Part 4']]));
test('not-found', () => assert.deepEqual(by('not-found').map((x) => x.newsletterTitle), ['Ticklish Sub Surrenders To Master Teko pure Tickling']));
test('no missing', () => assert.equal(by('missing').length, 0));
test('boyn1195 title', () => assert.equal(r.rows.find((x) => x.code?.startsWith('boyn1195')).newsletterTitle, 'Cute Boy Gets Punished & Fucked - Part 1'));
test('bsmhq0175 fuzzy', () => assert.equal(r.rows.find((x) => x.code?.startsWith('bsmhq0175')).status, 'fuzzy'));
test('bbbc0167 note', () => assert.equal(r.rows.find((x) => x.code?.startsWith('bbbc0167')).note, 'No 10 min tube for this scene'));

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseEml } from '../src/eml.js';
import { parseNewsletter, detectProgram } from '../src/newsletter.js';

const rd = (n) => fs.readFileSync(new URL('./fixtures/' + n, import.meta.url), 'utf8');
const RC = rd('radicalcash-2026-10-26.eml');
const KP = rd('kennyspennies-2026-10-26.eml');
const IB = rd('indiebucks-2026-10-21.eml');

test('RadicalCash release date and counts', () => {
  const rc = parseNewsletter(parseEml(RC).html);
  assert.equal(rc.releaseDate, '2026-10-26');
  assert.equal(rc.sections.length, 32);
  assert.equal(rc.sections.flatMap(s => s.scenes).length, 38);
});

test('RadicalCash WANKITNOW section', () => {
  const rc = parseNewsletter(parseEml(RC).html);
  const wank = rc.sections.find(s => s.header === 'WANKITNOW');
  assert.deepEqual(wank.scenes.map(s => s.title), ['Birthday Surprise', 'Boss Pleasure', 'Main Event', 'My New Toy', 'Naughty Heighbor']);
  assert.equal(wank.scenes[0].slug, 'birthday-surprise');
  assert.deepEqual(wank.scenes[0].models, ['Honour May']);
});

test('RadicalCash http FHG slug', () => {
  const rc = parseNewsletter(parseEml(RC).html);
  const bgg = rc.sections.find(s => s.header === 'BIG GULP GIRLS');
  assert.deepEqual(bgg.scenes.map(s => s.title), ['Kayliana Nova', 'Tori Cummings']);
  assert.equal(bgg.scenes[0].slug, 'kayliana-nova');
});

test('quoted-printable en dash decoded', () => {
  const rc = parseNewsletter(parseEml(RC).html);
  assert.ok(rc.sections.flatMap(s => s.scenes).some(s => s.title === 'Lia Lin – Eye-rolling Orgasm'));
});

test('detectProgram', () => {
  assert.equal(detectProgram(parseEml(RC).subject), 'radicalcash');
  assert.equal(detectProgram(parseEml(KP).subject), 'kennyspennies');
  assert.equal(detectProgram(parseEml(IB).subject), 'indiebucks');
  assert.equal(detectProgram('Re: something'), null);
});

test('KennysPennies scene count', () => {
  const kp = parseNewsletter(parseEml(KP).html);
  assert.equal(kp.sections.flatMap(s => s.scenes).length, 13);
});

test('IndieBucks parsing', () => {
  const ib = parseNewsletter(parseEml(IB).html);
  assert.equal(ib.releaseDate, '2026-10-21');
  assert.equal(ib.sections.flatMap(s => s.scenes).length, 18);
  const sub = ib.sections.flatMap(s => s.scenes).find(s => s.title === 'Using A New Sub Boy - Part 4');
  assert.deepEqual(sub.models, ['Mitch Schif', 'Romeo Twink']);
  assert.deepEqual(sub.clips, ['5 Minutes', '10 Minutes']);
  assert.equal(sub.slug, null);
});

test('LF line endings (pasted text)', () => {
  assert.equal(parseEml(RC.replace(/\r\n/g, '\n')).html.length > 1000, true);
});

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

test('release date is the one after the newsletter heading, not a forwarding header', () => {
  const html = '<html><body><p>Sent: Thursday, October 22, 2026 3:00 AM</p><p>Date: October 21, 2026</p>'
    + '<table><tr><td>AFFILIATE NEWSLETTER</td></tr><tr><td>October 26, 2026</td></tr></table></body></html>';
  assert.equal(parseNewsletter(html).releaseDate, '2026-10-26');
});

test('release date falls back to first date when no heading exists', () => {
  assert.equal(parseNewsletter('<p>Sent: May 1, 2026</p><p>June 2, 2026</p>').releaseDate, '2026-06-02');
});

// ---- new template (Nov 2026): labelled with Site_Name / Scene_Title / Scene_Models / Scene_Video_FHG ----
const KP2 = rd('kennyspennies-2026-11-09.eml');
const RC2 = rd('radicalcash-2026-11-09.eml');

test('new template: Kenny\'s Pennies studios, scenes and date', () => {
  const kp = parseNewsletter(parseEml(KP2).html);
  assert.equal(kp.releaseDate, '2026-11-09');
  assert.equal(kp.sections.length, 10);
  assert.equal(kp.sections.flatMap(s => s.scenes).length, 13);
  assert.deepEqual(kp.sections.map(s => s.header).slice(0, 3), ['MARISKA X', 'YUMMY COUPLE', 'RED XXX']);
  const yc = kp.sections.find(s => s.header === 'YUMMY COUPLE');
  assert.deepEqual(yc.scenes.map(s => s.title), ['Dinner Is Served', 'Favorite Facial', 'Skinny Dancer Drenched In Five Loads']);
  const mx = kp.sections[0].scenes[0];
  assert.deepEqual(mx.models, ['Calisi Ink', 'Dries Breyne']);
  assert.equal(mx.slug, 'calisi-fucking-dries-during-meeting-at-work');
  assert.equal(mx.fhg, 'https://vipmembers.yourpornpartner.com/gallery/6ae46b6f3fe81/calisi-fucking-dries-during-meeting-at-work');
  assert.equal(detectProgram(parseEml(KP2).subject), 'kennyspennies');
});

test('new template: RadicalCash studios, scenes, tracked links', () => {
  const rc = parseNewsletter(parseEml(RC2).html);
  assert.equal(rc.releaseDate, '2026-11-09');
  assert.equal(rc.sections.length, 24);
  assert.equal(rc.sections.flatMap(s => s.scenes).length, 30);
  const wank = rc.sections.find(s => s.header === 'WANKITNOW');
  assert.deepEqual(wank.scenes.map(s => s.title), ['Cinema Date', 'Date Night', 'Evening Relax', 'Helping Hand', 'Stay and Wank']);
  const hw = rc.sections.find(s => s.header === 'HARDWERK').scenes[0];
  assert.equal(hw.title, 'Session Laia Femme, E.urko, Tallo');
  assert.deepEqual(hw.models, ['Laia Femme', 'E.Urko', 'Tallo']);
  // the href goes through an awstrack.me redirect; the visible address is the real FHG
  assert.ok(hw.fhg.startsWith('https://hardwerk.yourpornpartner.com/gallery/'));
  assert.equal(hw.slug, 'session-laia-femme-eurko-tallo');
  assert.ok(rc.sections.some(s => s.header === "LIL D'S PLAYHOUSE"));
});

// ---- new IndieBucks template (Nov 2026): labelled, but no Scene_Video_FHG; clips are Video_N_Minutes links ----
const IB2 = rd('indiebucks-2026-11-11.eml');
const MFF = rd('myfriendsfeet-2026-11-10.eml');

test('new template: IndieBucksFetish studios, scenes, models and clips', () => {
  const ib = parseNewsletter(parseEml(IB2).html);
  assert.equal(ib.releaseDate, '2026-11-11');
  assert.deepEqual(ib.sections.map(s => s.header).slice(0, 3), ['BADBOYBONDAGE', 'BADBOYSBOOTCAMP', 'BOYNAPPED']);
  const bn = ib.sections.find(s => s.header === 'BOYNAPPED');
  assert.deepEqual(bn.scenes.map(s => s.title), ['2 Boys For Mitch To Use - Part 3', 'Using A Twinky Fuck Boy - Part 1']);
  assert.deepEqual(bn.scenes[0].models, ['Jonny Montero', 'Mitch Schif', 'Johnny Hakson']);
  assert.deepEqual(bn.scenes[0].clips, ['5 Minutes', '10 Minutes']);
  const ff = ib.sections.find(s => s.header === 'FOOTFRIENDS');
  assert.deepEqual(ff.scenes.map(s => s.title), ['Mickey', 'Kelly']);
  assert.deepEqual(ff.scenes[0].models, []);
  assert.deepEqual(ff.scenes[0].clips, []);
});

test('old IndieBucks template parses the same through the labelled reader', () => {
  const ib = parseNewsletter(parseEml(IB).html);
  assert.equal(ib.sections.length, 10);
  assert.equal(ib.sections.flatMap(s => s.scenes).length, 18);
});

test('MyFriendsFeet newsletter is an IndieBucks program', () => {
  const eml = parseEml(MFF);
  assert.equal(detectProgram(eml.subject, eml.from), 'indiebucks');
  const nl = parseNewsletter(eml.html);
  assert.equal(nl.releaseDate, '2026-11-10');
  assert.deepEqual(nl.sections.map(s => s.header), ['MYFRIENDSFEET']);
  assert.deepEqual(nl.sections[0].scenes.map(s => s.title),
    ["Pedro M's Tickling Audition", "Tripp Talon's Size 14 Feet Worshiped", "Enzo's Size 13's"]);
  assert.deepEqual(nl.sections[0].scenes[1].models, ['Riley', 'Tripp Tallon']);
});

test('detectProgram falls back to the IndieBucks sender for other IndieBucks sites', () => {
  assert.equal(detectProgram('SomeNewSite - New Tube Clips & Content available!', 'IndieBucks <support@westbill.com>'), 'indiebucks');
  assert.equal(detectProgram('SomeNewSite - New Tube Clips & Content available!', 'Someone <x@example.com>'), null);
});

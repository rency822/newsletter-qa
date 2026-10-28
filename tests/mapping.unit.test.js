import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MAPPING, studioForSite, studioForHeader } from '../src/mapping.js';

const m = DEFAULT_MAPPING;
const site = (label, adminHost) => ({ label, adminHost });

test('row counts per program', () => {
  assert.equal(m.filter((r) => r.program === 'radicalcash').length, 66);
  assert.equal(m.filter((r) => r.program === 'kennyspennies').length, 14);
});
test('five Kenny guesses flagged', () => {
  assert.deepEqual(
    m.filter((r) => r.guess).map((r) => r.studio),
    ['Lady-Sonia', 'Katerina Hartlova', 'MasterNico', 'MeanFeetFetish', 'MissMalorieSwitch'],
  );
});
test('host-qualified Sextapes', () => {
  assert.equal(studioForSite(m, 'radicalcash', site('Sex Tapes', 'admin.sextapes.com')), 'Sextapes');
  assert.equal(studioForSite(m, 'radicalcash', site('Sex Tapes', 'admin.studiovanniall.com')), null);
});
test('sub-sites combine into parent', () => {
  assert.equal(studioForSite(m, 'radicalcash', site('RickysResort Season 2', 'admin.rickysresort.com')), "Ricky's Resort");
  assert.equal(studioForSite(m, 'radicalcash', site('BJ Raw BTS', 'admin.bjraw.com')), 'BJRaw');
  assert.equal(studioForSite(m, 'radicalcash', site('Reels', 'admin.gotfilled.com')), 'GotFilled');
});
test('generic labels on other hosts and sibling brands do not match', () => {
  assert.equal(studioForSite(m, 'radicalcash', site('mobile content MA', 'admin.pawgemily.com')), null);
  assert.equal(studioForSite(m, 'radicalcash', site('UpskirtJerk', 'admin.wankitnow.com')), null);
});
test('other program excluded', () => {
  assert.equal(studioForSite(m, 'radicalcash', site('Yummy Couple', 'admin.yummycouple.com')), null);
  assert.equal(studioForSite(m, 'kennyspennies', site('Yummy Couple', 'admin.yummycouple.com')), 'YummyCouple');
});
test('alterotic model labels are host-qualified', () => {
  assert.equal(studioForSite(m, 'radicalcash', site('Kyla Keys', 'admin.alterotic.com')), 'Alterotic');
  assert.equal(studioForSite(m, 'radicalcash', site('Kyla Keys', 'admin.other.com')), null);
  assert.equal(studioForSite(m, 'radicalcash', site('Alterotic', 'admin.alterotic.com')), 'Alterotic');
  assert.equal(studioForSite(m, 'radicalcash', site('Alterotic', 'admin.any.com')), null);
});
test('header matching is normalized', () => {
  assert.equal(studioForHeader(m, 'radicalcash', "LIL D'S PLAYHOUSE"), 'LildPlayHouse');
  assert.equal(studioForHeader(m, 'radicalcash', 'Lil Ds Playhouse'), 'LildPlayHouse');
  assert.equal(studioForHeader(m, 'kennyspennies', 'RED XXX'), 'Red-XXX');
  assert.equal(studioForHeader(m, 'radicalcash', 'RED XXX'), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const {chromium} = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sdd = path.join(root, '.superpowers/sdd/2026-10-28-newsletter-checker');
const fx = (n) => path.join(root, 'tests/fixtures', n);

test('checker page end to end', async (t) => {
  execSync('npm run build', {cwd: root, stdio: 'pipe'});
  const fragment = readFileSync(path.join(root, 'dist/checker.html'), 'utf8');
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({viewport: {width: 1280, height: 900}});
  const requests = [];
  page.on('request', (r) => { if (!r.url().startsWith('about:') && !r.url().startsWith('data:')) requests.push(r.url()); });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.setContent('<!doctype html><html><head><meta charset=utf-8></head><body>' + fragment + '</body></html>');

  await t.test('RadicalCash run', async () => {
    await page.fill('#schedule-input', readFileSync(fx('schedule-2026-10.html'), 'utf8'));
    await page.setInputFiles('#eml-file', fx('radicalcash-2026-10-26.eml'));
    await page.waitForFunction(() => document.querySelector('#release-date').value === '2026-10-26');
    assert.equal(await page.inputValue('#program'), 'radicalcash');
    await page.click('#run');
    assert.equal((await page.textContent('[data-count=ok]')).trim(), '38');
    assert.equal((await page.textContent('[data-count=missing]')).trim(), '9');
    const label = await page.textContent('#window-label');
    assert.match(label, /Oct 9/);
    assert.match(label, /Oct 15/);
    await page.click('#filters [data-filter=missing]');
    const visible = await page.$$eval('#results tr[data-status]', (trs) => trs.filter((tr) => tr.offsetParent !== null).length);
    assert.equal(visible, 9);
    await page.click('#filters [data-filter=all]');
  });

  await t.test('loading another eml invalidates the previous results', async () => {
    assert.ok(await page.isVisible('#output'));
    await page.setInputFiles('#eml-file', fx('kennyspennies-2026-10-26.eml'));
    await page.waitForFunction(() => document.querySelector('#program').value === 'kennyspennies');
    assert.ok(!(await page.isVisible('#output')));
    assert.ok(await page.isVisible('#empty-state'));
    await page.click('#run');
    assert.ok(await page.isVisible('#output'));
    assert.match(await page.textContent('#run-header'), /KennysPennies · release Oct 26 · generated Oct 22 · window Oct 9 – Oct 15, 2026/);
    // back to RadicalCash for the later steps
    await page.setInputFiles('#eml-file', fx('radicalcash-2026-10-26.eml'));
    await page.waitForFunction(() => document.querySelector('#program').value === 'radicalcash');
    await page.click('#run');
    assert.equal((await page.textContent('[data-count=ok]')).trim(), '38');
  });

  await t.test('clearing the release date blocks the run', async () => {
    await page.fill('#release-date', '');
    assert.ok(!(await page.isVisible('#output')));
    assert.equal(await page.getAttribute('#release-date', 'aria-invalid'), 'true');
    await page.click('#run');
    assert.match(await page.textContent('#errors'), /Enter the release date/);
    assert.ok(!(await page.isVisible('#output')));
    await page.fill('#release-date', '2026-10-26');
    assert.equal(await page.getAttribute('#release-date', 'aria-invalid'), null);
    await page.click('#run');
    assert.equal((await page.textContent('[data-count=ok]')).trim(), '38');
  });

  await t.test('copy falls back to a textarea when the clipboard is denied', async () => {
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: () => Promise.reject(new Error('denied'))}});
    });
    assert.ok(!(await page.isVisible('#copy-fallback')));
    await page.click('#copy-problems');
    await page.waitForSelector('#copy-fallback', {state: 'visible'});
    assert.match(await page.inputValue('#copy-fallback'), /^❌/);
    assert.match(await page.textContent('#copy-status'), /Select and copy the text below/);
    await page.click('#copy-csv');
    assert.match(await page.inputValue('#copy-fallback'), /^status,studio,/);
    await page.evaluate(() => {
      window.__copied = null;
      Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: (t) => { window.__copied = t; return Promise.resolve(); }}});
    });
    await page.click('#copy-csv');
    await page.waitForFunction(() => window.__copied);
    assert.match(await page.textContent('#copy-status'), /^Copied 47 lines$/);
    assert.ok(!(await page.isVisible('#copy-fallback')));
  });

  await t.test('IndieBucks run', async () => {
    await page.setInputFiles('#eml-file', fx('indiebucks-2026-10-21.eml'));
    await page.waitForFunction(() => document.querySelector('#program').value === 'indiebucks');
    await page.fill('#coworker-list', readFileSync(fx('indiebucks-list-2026-10-21.txt'), 'utf8'));
    await page.click('#run');
    assert.equal((await page.textContent('[data-count=review]')).trim(), '2');
    assert.equal((await page.textContent('[data-count=missing]')).trim(), '0');
    assert.match(await page.textContent('#run-header'), /^IndieBucks · release Oct 21$/);
    assert.ok(!/Schedule: /.test(await page.textContent('#results')));
  });

  await t.test('Error run', async () => {
    await page.selectOption('#program', 'radicalcash');
    assert.ok(!(await page.isVisible('#output')));
    await page.fill('#schedule-input', '<p>x</p>');
    await page.click('#run');
    assert.match(await page.textContent('#errors'), /no calendar entries/);
  });

  await t.test('empty generation date does not hang', async () => {
    await page.fill('#generation-date', '');
    await page.fill('#release-date', '');
    assert.ok(await page.isVisible('#run'));
  });

  await t.test('360px layout with results, Problems filter and mapping editor', async () => {
    await page.fill('#schedule-input', readFileSync(fx('schedule-2026-10.html'), 'utf8'));
    await page.setInputFiles('#eml-file', fx('radicalcash-2026-10-26.eml'));
    await page.waitForFunction(() => document.querySelector('#release-date').value === '2026-10-26');
    await page.click('#run');
    await page.click('#filter-problems');
    await page.evaluate(() => { document.querySelector('#mapping-editor').open = true; });
    await page.setViewportSize({width: 360, height: 800});
    assert.ok(await page.isVisible('#output'));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth) <= 360);
    await page.screenshot({path: path.join(sdd, 'final-360-light.png'), fullPage: true});
    await page.setViewportSize({width: 390, height: 844});
    await page.emulateMedia({colorScheme: 'dark'});
    await page.click('#filter-all');
    await page.evaluate(() => { document.querySelector('#mapping-editor').open = false; });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth) <= 390);
    await page.screenshot({path: path.join(sdd, 'final-390-dark-results.png'), fullPage: true});
    await page.emulateMedia({colorScheme: 'light'});
    await page.setViewportSize({width: 1280, height: 900});
    await page.screenshot({path: path.join(sdd, 'final-1280-light-results.png'), fullPage: true});
  });

  assert.deepEqual(errs, []);
  assert.deepEqual(requests, []);
});

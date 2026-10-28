import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const {chromium} = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

  await t.test('IndieBucks run', async () => {
    await page.setInputFiles('#eml-file', fx('indiebucks-2026-10-21.eml'));
    await page.waitForFunction(() => document.querySelector('#program').value === 'indiebucks');
    await page.fill('#coworker-list', readFileSync(fx('indiebucks-list-2026-10-21.txt'), 'utf8'));
    await page.click('#run');
    assert.equal((await page.textContent('[data-count=review]')).trim(), '2');
    assert.equal((await page.textContent('[data-count=missing]')).trim(), '0');
  });

  await t.test('Error run', async () => {
    await page.selectOption('#program', 'radicalcash');
    await page.fill('#schedule-input', '<p>x</p>');
    await page.click('#run');
    assert.match(await page.textContent('#errors'), /no calendar entries/);
  });

  await t.test('empty generation date does not hang', async () => {
    await page.fill('#generation-date', '');
    await page.fill('#release-date', '');
    assert.ok(await page.isVisible('#run'));
  });

  await t.test('360px layout', async () => {
    await page.setViewportSize({width: 360, height: 800});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth) <= 360);
  });

  assert.deepEqual(errs, []);
  assert.deepEqual(requests, []);
});

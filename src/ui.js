import {parseEml} from './eml.js';
import {parseNewsletter, detectProgram} from './newsletter.js';
import {parseSchedule} from './schedule.js';
import {parseCoworkerList} from './coworkerList.js';
import {DEFAULT_MAPPING, studioForSite} from './mapping.js';
import {computeWindow, windowFromGeneration} from './windowCalc.js';
import {checkSchedule, checkIndieBucks} from './matcher.js';
import {summarize, toCopyText, toCsv} from './report.js';

const $ = (id) => document.getElementById(id);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  return m && MONTHS[+m[2] - 1] ? `${MONTHS[+m[2] - 1]} ${+m[3]}` : '';
};
const STATUS = {
  matched: ['Matched', 'ok'], fuzzy: ['Fuzzy match', 'ok'], missing: ['Missing', 'bad'],
  'outside-window': ['Outside window', 'warn'], 'not-published': ['Not published', 'warn'],
  'not-found': ['Not found', 'warn'], 'unknown-studio': ['Unknown studio', 'neutral'],
  'title-mismatch': ['Title mismatch', 'warn'],
};
const isOk = (s) => s === 'matched' || s === 'fuzzy';
const FILTERS = {
  all: () => true,
  problems: (s) => !isOk(s),
  missing: (s) => s === 'missing',
  review: (s) => !isOk(s) && s !== 'missing',
};
const SEVERITY = (s) => (s === 'missing' ? 0 : isOk(s) ? 2 : 1);

const MAP_KEY = 'nlc.mapping.v1';
const cloneDefault = () => JSON.parse(JSON.stringify(DEFAULT_MAPPING));
function loadMapping() {
  try {
    const raw = localStorage.getItem(MAP_KEY);
    if (raw) {
      const m = JSON.parse(raw);
      if (Array.isArray(m) && m.every((r) => r && Array.isArray(r.labels) && Array.isArray(r.headers))) return m;
    }
  } catch { /* storage unavailable */ }
  return cloneDefault();
}
function saveMapping() {
  try { localStorage.setItem(MAP_KEY, JSON.stringify(mapping)); } catch { /* ignore */ }
}
function clearSavedMapping() {
  try { localStorage.removeItem(MAP_KEY); } catch { /* ignore */ }
}

let mapping = loadMapping();
let emlRaw = '';
let lastRows = [];
let lastProgram = '';
let lastRelease = '';

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v);
  }
  for (const k of kids) if (k != null) n.append(k);
  return n;
}

// ---- window ----
let genManual = false;
function currentWindow() {
  const g = $('generation-date').value;
  return DATE_RE.test(g) ? windowFromGeneration(g) : null;
}
function updateWindowLabel() {
  const w = currentWindow();
  $('window-label').textContent = w
    ? `Window: ${fmtDate(w.start)} – ${fmtDate(w.end)}, ${w.end.slice(0, 4)} (generated ${fmtDate(w.generation)})`
    : 'Enter a valid generation date to see the window.';
}
function onReleaseChange() {
  const r = $('release-date').value;
  if (DATE_RE.test(r)) {
    genManual = false;
    $('generation-date').value = computeWindow(r).generation;
  }
  updateWindowLabel();
}
function updateProgramUi() {
  const ib = $('program').value === 'indiebucks';
  $('coworker-wrap').hidden = !ib;
  $('schedule-card').hidden = ib;
  $('generation-wrap').hidden = ib;
  $('window-label').hidden = ib;
  $('window-hint').hidden = ib;
}

// ---- inputs ----
async function onEml(raw) {
  emlRaw = raw;
  try {
    const eml = parseEml(raw);
    const p = detectProgram(eml.subject);
    if (p) $('program').value = p;
    const nl = parseNewsletter(eml.html);
    if (nl.releaseDate) $('release-date').value = nl.releaseDate;
    updateProgramUi();
    onReleaseChange();
  } catch (e) {
    showErrors([{kind: 'error', text: 'Could not read that email: ' + e.message}]);
  }
}
function showErrors(list) {
  const box = $('errors');
  box.replaceChildren(...list.map((m) => el('div', {class: 'msg ' + m.kind, text: m.text})));
}

async function collectSchedules() {
  const htmls = [];
  for (const slot of document.querySelectorAll('#schedule-slots .slot')) {
    const ta = slot.querySelector('textarea');
    if (ta && ta.value.trim()) htmls.push(ta.value);
    const fi = slot.querySelector('input[type=file]');
    for (const f of fi ? Array.from(fi.files || []) : []) htmls.push(await f.text());
  }
  return htmls;
}

// ---- results ----
let activeFilter = 'all';
function applyFilter() {
  const test = FILTERS[activeFilter];
  let shown = 0;
  let group = null;
  let groupShown = 0;
  const closeGroup = () => { if (group) group.hidden = groupShown === 0; };
  for (const tr of $('results').children) {
    if (tr.classList.contains('group')) {
      closeGroup();
      group = tr; groupShown = 0;
    } else {
      const vis = test(tr.dataset.status);
      tr.hidden = !vis;
      if (vis) { shown++; groupShown++; }
    }
  }
  closeGroup();
  $('no-rows').hidden = shown > 0;
  for (const b of $('filters').querySelectorAll('button')) {
    b.setAttribute('aria-pressed', String(b.dataset.filter === activeFilter));
  }
}

function renderRows(rows) {
  const groups = new Map();
  for (const r of rows) {
    const k = r.studio || 'Unassigned';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const body = $('results');
  body.replaceChildren();
  for (const [studio, list] of groups) {
    body.append(el('tr', {class: 'group'}, el('td', {colspan: '5', text: studio})));
    const sorted = list.map((r, i) => [r, i]).sort((a, b) => SEVERITY(a[0].status) - SEVERITY(b[0].status) || a[1] - b[1]);
    for (const [r] of sorted) {
      const [label, tone] = STATUS[r.status] || [r.status, 'neutral'];
      const title = r.newsletterTitle || r.scheduleTitle || '';
      const tdTitle = el('td', {}, el('div', {text: title}));
      if (r.newsletterTitle && r.scheduleTitle && r.scheduleTitle !== r.newsletterTitle) {
        tdTitle.append(el('div', {class: 'sched', text: 'Schedule: ' + r.scheduleTitle}));
      }
      const tdFhg = el('td', {'data-label': 'FHG'});
      if (r.fhg) {
        if (/^https?:\/\//i.test(r.fhg)) tdFhg.append(el('a', {class: 'nowrap', href: r.fhg, target: '_blank', rel: 'noopener noreferrer', text: 'FHG link'}));
        else tdFhg.textContent = r.fhg;
      }
      const tdDetail = el('td', {'data-label': 'Details'});
      if (r.code) tdDetail.append(el('span', {class: 'code', text: r.code}));
      if (r.note) tdDetail.append(el('div', {class: 'note', text: r.note}));
      body.append(el('tr', {'data-status': r.status},
        el('td', {}, el('span', {class: 'chip ' + tone, text: label})),
        tdTitle,
        el('td', {class: 'nowrap', 'data-label': 'Date', text: fmtDate(r.date)}),
        tdFhg, tdDetail));
    }
  }
  const s = summarize(rows);
  for (const k of ['ok', 'missing', 'review']) document.querySelector(`#summary [data-count=${k}]`).textContent = String(s[k]);
  $('output').hidden = false;
  applyFilter();
}

function renderExpected(entries, program, win, rows) {
  const ul = $('expected-items');
  const inNl = new Set(rows.filter((r) => isOk(r.status)).map((r) => (r.scheduleTitle || '').toLowerCase()));
  const items = entries
    .filter((e) => e.status === 'published' && e.hasVideo && e.date >= win.start && e.date <= win.end)
    .map((e) => ({e, studio: studioForSite(mapping, program, e)}))
    .filter((x) => x.studio)
    .sort((a, b) => a.studio.localeCompare(b.studio) || a.e.date.localeCompare(b.e.date));
  ul.replaceChildren(...(items.length
    ? items.map(({e, studio}) => el('li', {text: `${inNl.has(e.title.toLowerCase()) ? '✓' : '✗'} ${studio} – ${e.title} (${fmtDate(e.date)})`}))
    : [el('li', {text: 'No expected entries in this window.'})]));
}

async function run() {
  showErrors([]);
  const program = $('program').value;
  const release = $('release-date').value;
  const raw = $('eml-paste').value.trim() ? $('eml-paste').value : emlRaw;
  try {
    if (!raw) throw new Error('Load or paste the newsletter .eml first.');
    const newsletter = parseNewsletter(parseEml(raw).html);
    if (!newsletter.sections.length) throw new Error('No scenes were found in that newsletter.');
    let rows;
    const msgs = [];
    if (program === 'indiebucks') {
      const list = parseCoworkerList($('coworker-list').value);
      if (!list.length) throw new Error('Paste the coworker list first.');
      rows = checkIndieBucks({newsletter, list}).rows;
      $('expected-items').replaceChildren(el('li', {text: 'Not used for IndieBucks.'}));
    } else {
      const win = currentWindow();
      if (!win) throw new Error('Enter a valid generation date.');
      const htmls = await collectSchedules();
      if (!htmls.length) throw new Error('Paste or choose the schedule page first.');
      const {entries, coveredDays} = parseSchedule(htmls);
      const res = checkSchedule({newsletter, entries, coveredDays, mapping, program, window: win});
      rows = res.rows;
      if (res.uncoveredDays.length) {
        const dates = res.uncoveredDays.map(fmtDate).join(', ');
        msgs.push({kind: 'warn', text: `Schedule doesn't cover ${dates} — add the other month's page.`});
      }
      renderExpected(entries, program, win, rows);
    }
    lastRows = rows; lastProgram = program; lastRelease = release || newsletter.releaseDate || 'unknown';
    showErrors(msgs);
    renderRows(rows);
  } catch (e) {
    $('output').hidden = true;
    lastRows = [];
    showErrors([{kind: 'error', text: e.message}]);
  }
}

// ---- export ----
function flash(msg) {
  $('copy-status').textContent = msg;
  setTimeout(() => { $('copy-status').textContent = ''; }, 2500);
}
async function copyProblems() {
  const text = toCopyText(lastRows);
  if (!text) return flash('No problems to copy.');
  try {
    await navigator.clipboard.writeText(text);
    flash('Copied.');
  } catch {
    const ta = el('textarea', {'aria-hidden': 'true', style: 'position:fixed;opacity:0'});
    ta.value = text;
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
    flash(ok ? 'Copied.' : 'Copy failed.');
  }
}
function downloadCsv() {
  const blob = new Blob([toCsv(lastRows)], {type: 'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = el('a', {href: url, download: `newsletter-check-${lastProgram}-${lastRelease}.csv`});
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---- mapping editor ----
const lines = (s) => s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
function renderMapping() {
  const body = $('mapping-body');
  body.replaceChildren();
  mapping.forEach((r, i) => {
    const studio = el('td', {'data-label': 'Studio', text: r.studio});
    if (r.guess) studio.append(el('span', {class: 'tag', text: 'guess'}));
    const labels = el('textarea', {'aria-label': `${r.studio} schedule labels`, 'data-i': String(i), 'data-f': 'labels', rows: '3'});
    labels.value = r.labels.join('\n');
    const headers = el('textarea', {'aria-label': `${r.studio} newsletter headers`, 'data-i': String(i), 'data-f': 'headers', rows: '2'});
    headers.value = r.headers.join('\n');
    body.append(el('tr', {}, studio, el('td', {'data-label': 'Program', text: r.program}),
      el('td', {}, labels), el('td', {}, headers)));
  });
}

// ---- wiring ----
function addSlot() {
  const n = document.querySelectorAll('#schedule-slots .slot').length + 1;
  const ta = el('textarea', {'aria-label': `Schedule page ${n} HTML`, placeholder: `Schedule page ${n}: paste HTML`, spellcheck: 'false'});
  const fi = el('input', {type: 'file', accept: '.html,.htm,text/html', multiple: '', 'aria-label': `Schedule page ${n} file(s)`});
  $('schedule-slots').append(el('div', {class: 'slot'}, ta, fi));
  ta.focus();
}

$('add-month').addEventListener('click', addSlot);
$('eml-file').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  $('eml-paste').value = '';
  await onEml(await f.text());
});
$('eml-paste').addEventListener('input', () => { if ($('eml-paste').value.trim()) onEml($('eml-paste').value); });
$('program').addEventListener('change', updateProgramUi);
$('release-date').addEventListener('input', onReleaseChange);
$('release-date').addEventListener('change', onReleaseChange);
$('generation-date').addEventListener('input', () => { genManual = true; updateWindowLabel(); });
$('run').addEventListener('click', run);
$('filters').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-filter]');
  if (b) { activeFilter = b.dataset.filter; applyFilter(); }
});
$('copy-problems').addEventListener('click', copyProblems);
$('download-csv').addEventListener('click', downloadCsv);
$('mapping-body').addEventListener('input', (e) => {
  const t = e.target;
  if (!t.dataset || t.dataset.i == null) return;
  mapping[+t.dataset.i][t.dataset.f] = lines(t.value);
  saveMapping();
});
$('reset-mapping').addEventListener('click', () => {
  mapping = cloneDefault();
  clearSavedMapping();
  renderMapping();
});

renderMapping();
updateProgramUi();
updateWindowLabel();

# Newsletter Release Checker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single self-contained web page that checks an affiliate newsletter (.eml) against either the pasted schedule HTML (RadicalCash, Kenny's Pennies) or a coworker's `code - Title` list (IndieBucks). It reports matched, missing, and needs-review scenes.

**Architecture:** Pure ES modules in `src/`, one responsibility each, unit-tested in Node with `node:test`. A `linkedom` `DOMParser` stands in for the browser's. `build.mjs` bundles `src/ui.js` with esbuild into one IIFE and inlines it, together with the CSS and markup, into `dist/checker.html`, an artifact body fragment with no doctype or head. Playwright runs the end-to-end check, and the page is published as a private artifact.

**Tech Stack:** Node 18+, ES modules, `node:test`, `linkedom` (dev), `esbuild` (dev), Playwright (preinstalled; do not reinstall).

**Spec:** `docs/superpowers/specs/2026-10-28-newsletter-checker-design.md`

## Global Constraints

- Everything runs in the browser. The page makes no network requests. Nothing is persisted except the mapping edits, which use `localStorage` key `nlc.mapping.v1` with every access wrapped in try/catch.
- Window: generation = the last Thursday strictly before the release date; window = generation − 13 days … generation − 7 days, inclusive. All date math uses UTC on `YYYY-MM-DD` strings.
- Expected set (schedule mode): status `published` AND date in window AND `hasVideo` AND the site maps to a studio of the selected program.
- Fuzzy threshold: Dice on character bigrams ≥ **0.85**. The IndieBucks model bonus is **+0.15 per matching token**, uncapped, and used for ranking only.
- Statuses, as exact string ids: `matched`, `fuzzy`, `missing`, `outside-window`, `not-published`, `not-found`, `unknown-studio`, `title-mismatch`.
- Copy-text line format: `{icon} {studio} – {title} ({Mon D})`. Icons: ❌ for missing; ⚠️ for every other problem. The date part is omitted when there is no date.
- Light and dark themes (tokens on `:root`, dark under `prefers-color-scheme`); works at 360px width without horizontal scroll.

## Review Focus

1. **The window crosses months but only one month is pasted** (e.g. a release whose window is Oct 30 – Nov 5). Expect a warning listing the uncovered dates, and no false "missing" rows for those dates → test in Task 4 and Task 7.
2. **The same label is used by two sites** (`Sex Tapes` under `admin.sextapes.com` and `admin.studiovanniall.com`). Only the mapped admin host may count → test in Task 6.
3. **The same title appears twice inside one studio**, as in the schedule duplicates (e.g. `isabella-rose-waiting-room.mp4` ×2) or in IndieBucks's two "Cute Boy … Part 1" lines. Assignment must stay one-to-one → tests in Task 7 and Task 8.
4. **A newsletter scene has no FHG or models** (Big Gulp Girls "Kayliana Nova" FHG uses `http://`; IndieBucks has no FHGs). It must still be a scene → test in Task 3.
5. **Quoted-printable or base64 bodies with non-ASCII punctuation** (`–`, `’`, `&amp;`), and pasted `.eml` text instead of a file. Titles must decode correctly → test in Task 3.

---

## File Structure

```
package.json            scripts: test, build, e2e
build.mjs               bundles src/ui.js → inlines into dist/checker.html
src/normalize.js        normalizeTitle, slugify, dice
src/windowCalc.js       computeWindow
src/eml.js              parseEml
src/newsletter.js       parseNewsletter, detectProgram
src/schedule.js         parseSchedule
src/coworkerList.js     parseCoworkerList
src/mapping.js          DEFAULT_MAPPING, studioForSite, studioForHeader
src/matcher.js          checkSchedule, checkIndieBucks
src/report.js           summarize, toCopyText, toCsv
src/ui.js               DOM wiring (browser only)
src/page.html           markup + CSS template with /*SCRIPT*/ placeholder
tests/setup.js          installs linkedom DOMParser on globalThis
tests/fixtures/         radicalcash-2026-10-26.eml, kennyspennies-2026-10-26.eml,
                        indiebucks-2026-10-21.eml, indiebucks-list-2026-10-21.txt,
                        schedule-2026-10.html
tests/*.test.js         one per module; e2e.test.js uses Playwright
dist/checker.html       build output (git-ignored)
```

Shared row shape, produced by `matcher.js` and consumed by `report.js` and `ui.js`:

```js
/** @typedef {{status:string, studio:string, newsletterTitle:string|null,
 *   scheduleTitle:string|null, date:string|null, fhg:string|null,
 *   code:string|null, note:string|null, score:number|null}} Row */
```

---

### Task 1: Scaffold, fixtures, normalization

**Files:**
- Create: `package.json`, `.gitignore`, `tests/setup.js`, `src/normalize.js`, `tests/normalize.test.js`, `tests/fixtures/*`

**Interfaces:**
- Produces: `normalizeTitle(s: string): string`, `slugify(s: string): string`, `dice(a: string, b: string): number` (0..1, computed on normalized strings)

- [ ] **Step 1: Scaffold.** `package.json` contains `"type":"module"` and these scripts:
  - `"test": "node --test --import ./tests/setup.js tests/*.unit.test.js"` (unit test files are named `*.unit.test.js`; the e2e file is excluded)
  - `"build": "node build.mjs"`
  - `"e2e": "node --test tests/e2e.test.js"`

  Then run `npm i -D linkedom esbuild`. `.gitignore` contains `node_modules/` and `dist/`. `tests/setup.js` does `import {DOMParser} from 'linkedom'; globalThis.DOMParser = DOMParser;`.
- [ ] **Step 2: Fixtures.**
  - Copy the three uploaded `.eml` files to the fixture names above.
  - Write `indiebucks-list-2026-10-21.txt` with the 17 lines the user pasted. The lines start with `psm0128_lucasmancinni_matteo - Tickle me, coach: I can take it!` and end with `tkh0108_heavenlyxp_matt - Virginia: Heavenly Loses Count of her Orgasms`.
  - `schedule-2026-10.html` must be the user's saved October 2026 schedule page. **If it is not on disk, stop and ask the user to upload it. Do not fabricate it.**
- [ ] **Step 3: Write the failing tests** in `tests/normalize.unit.test.js`:

```js
assert.equal(normalizeTitle("Bi The Way ft Anna Cummings & Ray Ray XXX"), normalizeTitle("Bi The Way Ft Anna Cummings and Ray Ray Xxx"));
assert.equal(normalizeTitle("Lia Lin – Eye-Rolling Orgasm"), "lia lin eye rolling orgasm");
assert.equal(normalizeTitle("Robert's Cock"), "roberts cock");
assert.equal(slugify("Please Don't Tell Your StepFather - CAM 2"), "please-dont-tell-your-stepfather-cam-2");
assert.equal(dice("abc", "abc"), 1);
assert.ok(dice("an Madrox & Yuri smoking & stroking on the couch", "Ian Madrox & Yuri smoking & stroking on the couch") >= 0.85);
assert.ok(dice("Using A New Sub Boy - Part 4", "Cute Boy Gets Punished & Fucked - Part 1") < 0.85);
```

- [ ] **Step 4: Run** `npm test`. Expected: FAIL (module not found).
- [ ] **Step 5: Implement `src/normalize.js`.**
  - `normalizeTitle`: lowercase → `&`→` and ` → delete `'’"“”` → replace `[^a-z0-9]+` with a space → trim.
  - `slugify`: `normalizeTitle(s).replace(/ /g,'-')`.
  - `dice`: the Sørensen–Dice coefficient over the multiset of adjacent character pairs of the normalized strings. Spaces are kept and count as characters. Two identical strings score 1. If either string has fewer than 2 characters, return 1 when the strings are equal and 0 otherwise.
- [ ] **Step 6: Run** `npm test`. Expected: PASS.
- [ ] **Step 7: Commit** `feat: scaffold, fixtures, title normalization`.

### Task 2: Release window

**Files:** Create `src/windowCalc.js`, `tests/windowCalc.unit.test.js`

**Interfaces:**
- Produces: `computeWindow(release: 'YYYY-MM-DD'): {release, generation, start, end, days: string[]}` (all `YYYY-MM-DD`; `days` lists start through end, 7 entries)

- [ ] **Step 1: Failing tests:**

```js
assert.deepEqual(pick(computeWindow('2026-10-26')), {generation:'2026-10-22', start:'2026-10-09', end:'2026-10-15'});
assert.equal(computeWindow('2026-10-21').generation, '2026-10-15'); // Wed release
assert.equal(computeWindow('2026-10-22').generation, '2026-10-15'); // strictly before
assert.deepEqual(pick(computeWindow('2026-11-09')), {generation:'2026-11-05', start:'2026-10-23', end:'2026-10-29'});
assert.equal(computeWindow('2026-10-26').days.length, 7);
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** using `Date.UTC` arithmetic only. Step back one day at a time from release − 1 until `getUTCDay() === 4`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: release window calculation`.

### Task 3: Email and newsletter parsing

**Files:** Create `src/eml.js`, `src/newsletter.js`, `tests/newsletter.unit.test.js`

**Interfaces:**
- Produces:
  - `parseEml(raw: string): {subject: string, from: string, html: string}`
  - `detectProgram(subject: string): 'radicalcash'|'kennyspennies'|'indiebucks'|null`
  - `parseNewsletter(html: string): {releaseDate: string|null, sections: Array<{header: string, scenes: Array<{title, slug: string|null, fhg: string|null, models: string[], clips: string[]}>}>}`

- [ ] **Step 1: Failing tests** (read the fixtures with `fs.readFileSync(...,'utf8')`):

```js
const rc = parseNewsletter(parseEml(RC).html);
assert.equal(rc.releaseDate, '2026-10-26');
assert.equal(rc.sections.length, 32);
assert.equal(rc.sections.flatMap(s=>s.scenes).length, 38);
const wank = rc.sections.find(s=>s.header==='WANKITNOW');
assert.deepEqual(wank.scenes.map(s=>s.title), ['Birthday Surprise','Boss Pleasure','Main Event','My New Toy','Naughty Heighbor']);
assert.equal(wank.scenes[0].slug, 'birthday-surprise');
assert.deepEqual(wank.scenes[0].models, ['Honour May']);
const bgg = rc.sections.find(s=>s.header==='BIG GULP GIRLS');           // Review Focus 4
assert.deepEqual(bgg.scenes.map(s=>s.title), ['Kayliana Nova','Tori Cummings']);
assert.equal(bgg.scenes[0].slug, 'kayliana-nova');                       // http:// FHG
assert.ok(rc.sections.flatMap(s=>s.scenes).some(s=>s.title==='Lia Lin – Eye-rolling Orgasm')); // Review Focus 5: QP en dash decoded
assert.equal(detectProgram(parseEml(RC).subject), 'radicalcash');           // "Fwd: RadicalCash - …"
const kp = parseNewsletter(parseEml(KP).html);
assert.equal(kp.sections.flatMap(s=>s.scenes).length, 13);
assert.equal(detectProgram(parseEml(KP).subject), 'kennyspennies');
const ib = parseNewsletter(parseEml(IB).html);
assert.equal(ib.releaseDate, '2026-10-21');
assert.equal(ib.sections.flatMap(s=>s.scenes).length, 18);
const sub = ib.sections.flatMap(s=>s.scenes).find(s=>s.title==='Using A New Sub Boy - Part 4');
assert.deepEqual(sub.models, ['Mitch Schif','Romeo Twink']);
assert.deepEqual(sub.clips, ['5 Minutes','10 Minutes']);
assert.equal(sub.slug, null);
assert.equal(detectProgram(parseEml(IB).subject), 'indiebucks');
assert.equal(parseEml(RC.replace(/\r\n/g,'\n')).html.length > 1000, true); // pasted text, LF endings
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement `parseEml`.**
  - Split headers from body at the first blank line. Unfold header continuation lines. Decode RFC 2047 encoded-words in the Subject (`=?utf-8?B?…?=` and `Q` encodings).
  - Walk multipart boundaries recursively and choose the `text/html` part.
  - Decode by `Content-Transfer-Encoding`: `quoted-printable` (soft line breaks `=\n`, then `=XX` bytes) or `base64`. Interpret the bytes as UTF-8 with `TextDecoder`.
  - Accept both CRLF and LF line endings.
- [ ] **Step 4: Implement `detectProgram`.** Strip any leading `Fwd:`/`FW:`, then match the start of the subject case-insensitively:
  - `/^radicalcash\b/` → `radicalcash`
  - `/^kennyspennies\b/` → `kennyspennies`
  - `/^indiebucks/` → `indiebucks`
- [ ] **Step 5: Implement `parseNewsletter`.**
  - Parse the HTML with `new DOMParser().parseFromString(html,'text/html')`.
  - Walk text nodes in document order (TreeWalker, or recursive childNodes for linkedom), producing tokens `{text, isTitle}`. `text` is the trimmed text content. A token is a title when its nearest `td` ancestor has `colspan="2"` and an inline style containing both `padding:10px` and `font-weight:bold` (ignore whitespace inside the style).
  - Then scan the tokens:
    - `Latest Tools` starts a new section whose header is the previous non-empty token.
    - A title token starts a new scene in the current section.
    - Inside a scene:
      - the token after `Models:` is split on `/,\s*/` into the models list;
      - the token after `Video FHG:` is the FHG URL, and the slug is the last path segment of that URL;
      - tokens matching `/^\d+ Minutes$/` are added to the clips list.
  - `releaseDate` is the first match of `/(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})/` in the token stream, converted to ISO.
- [ ] **Step 6: Run.** Expected: PASS.
- [ ] **Step 7: Commit** `feat: eml and newsletter parsing`.

### Task 4: Schedule parsing

**Files:** Create `src/schedule.js`, `tests/schedule.unit.test.js`

**Interfaces:**
- Produces:
  - `parseSchedule(htmls: string[]): {entries: Entry[], coveredDays: Set<string>}`, where `Entry = {siteKey, label, adminHost, title, status, date, id, hasVideo, hasPhoto}`
  - `isTestTitle(t: string): boolean`

- [ ] **Step 1: Failing tests:**

```js
const {entries, coveredDays} = parseSchedule([SCHED]);
assert.equal(coveredDays.size, 31);                     // every .day-heading data-day
const da = entries.filter(e=>e.label==='Dirty Auditions' && e.date==='2026-10-02');
assert.equal(da.length, 1);                              // sticky duplicate merged
assert.ok(!entries.some(e=>/^test\d$/.test(e.title)));   // test1..test4 dropped
assert.ok(!entries.some(e=>e.title.startsWith('TEST_')));
assert.ok(!entries.some(e=>e.title.startsWith('Carlo Test')));
const resist = entries.find(e=>e.title==='Resist Temptation.');
assert.deepEqual([resist.hasVideo,resist.hasPhoto,resist.status],[false,true,'published']);
const st = entries.filter(e=>e.label==='Sex Tapes').map(e=>e.adminHost);
assert.ok(st.includes('admin.sextapes.com') && st.includes('admin.studiovanniall.com'));
assert.equal(isTestTitle('Test Drive'), false);          // real WankItNow title "TEST DRIVE"
assert.throws(()=>parseSchedule(['<p>hello</p>']), /no calendar entries/);
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Each `button.calendar-event` produces an entry:
    - `siteKey` = the `.event-domain` text
    - `label` and `adminHost` = the split at the last ` - ` (admin host starts with `admin.`)
    - `title` = the trimmed `.event-title` text
    - `status` = from the class `status-(\w+)`
    - `date` = `data-day`
    - `id` = `data-event`
    - `hasVideo` / `hasPhoto` = whether `.media-flag.video` / `.media-flag.photo` exists
  - `coveredDays` = every `.day-heading[data-day]`, across all pages.
  - Dedupe on `siteKey|normalizeTitle(title)|date` and keep the first.
  - `isTestTitle(t)` = `/^test\d*$/i.test(t) || /^test_/i.test(t) || /\stest\s/i.test(t)`. This catches `Carlo Test - …` and `jon test …`, and keeps WankItNow's real `TEST DRIVE`.
  - Throw `Error('This doesn\'t look like a schedule page — it has no calendar entries.')` when no entries are found.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: schedule parsing`.

### Task 5: Coworker list parsing

**Files:** Create `src/coworkerList.js`, `tests/coworkerList.unit.test.js`

**Interfaces:**
- Produces: `parseCoworkerList(text: string): Array<{code: string|null, title: string, note: string|null, modelTokens: string[]}>`

- [ ] **Step 1: Failing tests:**

```js
const rows = parseCoworkerList(LIST);
assert.equal(rows.length, 17);
assert.deepEqual(rows.find(r=>r.code==='bbbc0167_blazemaxwell_jr'),
  {code:'bbbc0167_blazemaxwell_jr', title:'Finally Getting His Load Off', note:'No 10 min tube for this scene', modelTokens:['blazemaxwell','jr']});
assert.deepEqual(rows.find(r=>r.code.startsWith('boyn1253')).modelTokens, ['romeotwink','mitchschif']);
assert.deepEqual(parseCoworkerList('Boyfriend experience - CSW')[0], {code:null, title:'Boyfriend experience', note:'CSW', modelTokens:[]});
assert.equal(parseCoworkerList('\n\n  \n').length, 0);
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Skip blank lines and split each line at the first ` - `.
  - If the left part matches `/^[a-z]+\d+[a-z0-9_]*$/i`, it is the code. Otherwise, the left part is the title and the right part is the note.
  - When there is a code, the right part is the title, and a trailing `\(([^)]*)\)` becomes the note and is removed from the title.
  - `modelTokens` = the code split on `_`, dropping:
    - the first token
    - tokens matching `/^part\d+$/i`
    - tokens matching `/^\d+$/`
  - Lowercase the remaining tokens.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: coworker list parsing`.

### Task 6: Studio mapping

**Files:** Create `src/mapping.js`, `tests/mapping.unit.test.js`

**Interfaces:**
- Produces:
  - `DEFAULT_MAPPING: Array<{studio, program: 'radicalcash'|'kennyspennies', labels: string[], headers: string[], guess?: true}>`, copied verbatim from spec Appendix A
  - `studioForSite(mapping, program, entry): string|null`
  - `studioForHeader(mapping, program, header): string|null`

- [ ] **Step 1: Failing tests:**

```js
const m = DEFAULT_MAPPING;
assert.equal(m.filter(r=>r.program==='radicalcash').length, 66);
assert.equal(m.filter(r=>r.program==='kennyspennies').length, 14);
assert.equal(studioForSite(m,'radicalcash',{label:'Sex Tapes',adminHost:'admin.sextapes.com'}), 'Sextapes');
assert.equal(studioForSite(m,'radicalcash',{label:'Sex Tapes',adminHost:'admin.studiovanniall.com'}), null); // Review Focus 2
assert.equal(studioForSite(m,'radicalcash',{label:'RickysResort Season 2',adminHost:'admin.rickysresort.com'}), "Ricky's Resort");
assert.equal(studioForSite(m,'radicalcash',{label:'BJ Raw BTS',adminHost:'admin.bjraw.com'}), null);
assert.equal(studioForSite(m,'radicalcash',{label:'Yummy Couple',adminHost:'admin.yummycouple.com'}), null); // other program
assert.equal(studioForHeader(m,'radicalcash',"LIL D'S PLAYHOUSE"), 'LildPlayHouse');
assert.equal(studioForHeader(m,'radicalcash','Lil Ds Playhouse'), 'LildPlayHouse');
assert.equal(studioForHeader(m,'kennyspennies','RED XXX'), 'Red-XXX');
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - A label string `"X @ host"` matches only when `entry.adminHost === host`.
  - A plain label matches any host.
  - Labels are compared with `normalizeTitle`, and headers with `normalizeTitle` as well.
  - The five Kenny's Pennies guesses carry `guess: true`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: default studio mapping`.

### Task 7: Matcher — schedule mode

**Files:** Create `src/matcher.js`, `tests/matcher.schedule.unit.test.js`

**Interfaces:**
- Consumes: Tasks 1–6
- Produces: `checkSchedule({newsletter, entries, coveredDays, mapping, program, window}): {rows: Row[], uncoveredDays: string[]}`

- [ ] **Step 1: Failing tests** (built from the real fixtures):

```js
const r = run('radicalcash', RC);   // helper: parse RC + SCHED, computeWindow(newsletter.releaseDate), checkSchedule
const missing = r.rows.filter(x=>x.status==='missing').map(x=>`${x.studio}|${x.scheduleTitle}`).sort();
assert.deepEqual(missing, [
  'AmazingFilms|Jazz Gives Great Service','Bemefi|StepSisterLove 6 Scene 2','BigGulpGirls|Bad Bella',
  'DoggVision|Misty Rein Threesome Behind the Scenes','LaBellaDX|The Lesbian Animation Session',
  'WankItNow|SENSUAL GROOVE','WankItNow|SEXY VIDERO','WankItNow|VERY HAPPY ENDING','WankItNow|WORK ME OUT'].sort());
assert.equal(r.rows.filter(x=>['matched','fuzzy'].includes(x.status)).length, 38);
assert.equal(r.rows.find(x=>/Roberts Cock/.test(x.newsletterTitle)).status !== 'not-found', true);
const k = run('kennyspennies', KP);
assert.equal(k.rows.filter(x=>['matched','fuzzy'].includes(x.status)).length, 13);
assert.deepEqual(k.rows.filter(x=>x.status==='missing').map(x=>x.scheduleTitle), ['Wife Saves Your Job']);
assert.ok(!k.rows.some(x=>x.scheduleTitle==='Resist Temptation.'));   // photo-only excluded
// synthetic cases
assert.equal(synthetic({nlTitle:'Old Scene', entry:{date:'2026-10-01',status:'published'}}).status, 'outside-window');
assert.equal(synthetic({nlTitle:'Soon', entry:{date:'2026-10-12',status:'scheduled'}}).status, 'not-published');
assert.equal(synthetic({nlHeader:'NEW STUDIO'}).status, 'unknown-studio');
assert.equal(synthetic({nlTitle:'Nothing Like It'}).status, 'not-found');
// Review Focus 3: two identical newsletter titles, one schedule entry → one matched, one not-found
// Review Focus 1: coveredDays without 2026-10-15 → uncoveredDays === ['2026-10-15'] and no 'missing' row dated 2026-10-15
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement `checkSchedule`.**
  - `uncoveredDays` = the window days that are not in `coveredDays`.
  - Expected entries are those where:
    - `studioForSite` gives a studio
    - `status==='published'`
    - `hasVideo`
    - the date is in the window
    - the date is not in `uncoveredDays`
  - For each newsletter section:
    - Get the studio from `studioForHeader`. When it is null, every scene in the section becomes an `unknown-studio` row.
    - Otherwise, the candidates are all entries for that studio, from all dates and statuses.
  - Score each (scene, candidate) pair:
    - 1.0 if `scene.slug === slugify(candidate.title)`, else `dice(scene.title, candidate.title)`
    - plus 0.001 when the candidate is in the expected set (tie-break)
  - Assign greedily (below), then classify each assigned pair:
    - **`matched` or `fuzzy`:** the candidate is in the expected set. It is `matched` when the normalized titles are equal or the slug matched; otherwise `fuzzy`.
    - **`outside-window`:** the candidate is published, but its date is outside the window.
    - **`not-published`:** the candidate's status is not published. This includes a published candidate without video that falls inside the window.
  - Unassigned scenes become `not-found`. Unassigned expected entries become `missing`.

  The greedy assignment, shared with Task 8:

```js
// pairs: [{a, b, score}] ; returns pairs kept, each a and b used at most once
function assign(pairs, min) {
  const usedA = new Set(), usedB = new Set(), kept = [];
  for (const p of [...pairs].sort((x, y) => y.score - x.score)) {
    if (p.score < min || usedA.has(p.a) || usedB.has(p.b)) continue;
    usedA.add(p.a); usedB.add(p.b); kept.push(p);
  }
  return kept;
}
```

  Export `assign` for reuse. The schedule mode uses `min = 0.85`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: schedule-mode matcher`.

### Task 8: Matcher — IndieBucks mode

**Files:** Modify `src/matcher.js`; Create `tests/matcher.indiebucks.unit.test.js`

**Interfaces:**
- Produces: `checkIndieBucks({newsletter, list}): {rows: Row[]}`. `studio` is the section header, and `code`/`note` come from the list line.

- [ ] **Step 1: Failing tests:**

```js
const r = checkIndieBucks({newsletter: parseNewsletter(parseEml(IB).html), list: parseCoworkerList(LIST)});
const by = s => r.rows.filter(x=>x.status===s);
assert.equal(by('matched').length + by('fuzzy').length, 16);
assert.deepEqual(by('title-mismatch').map(x=>[x.code.split('_')[0], x.newsletterTitle]), [['boyn1253','Using A New Sub Boy - Part 4']]);
assert.deepEqual(by('not-found').map(x=>x.newsletterTitle), ['Ticklish Sub Surrenders To Master Teko pure Tickling']);
assert.equal(by('missing').length, 0);
assert.equal(r.rows.find(x=>x.code?.startsWith('boyn1195')).newsletterTitle, 'Cute Boy Gets Punished & Fucked - Part 1');
assert.equal(r.rows.find(x=>x.code?.startsWith('bsmhq0175')).status, 'fuzzy');
assert.equal(r.rows.find(x=>x.code?.startsWith('bbbc0167')).note, 'No 10 min tube for this scene');
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - For every (line, scene) pair, compute:
    - `t = dice(line.title, scene.title)`
    - `hits` = the number of `line.modelTokens` contained in `scene.models.map(m=>m.toLowerCase().replace(/[^a-z0-9]/g,''))`
    - `score = t + 0.15*hits`
    - `eligible = t >= 0.85 || (hits > 0 && hits === line.modelTokens.length)`
  - Pass only eligible pairs to `assign(pairs, 0)`.
  - Classify each kept pair:
    - `t >= 0.85`: `matched` when the normalized titles are equal, else `fuzzy`
    - otherwise: `title-mismatch`
  - Unassigned scenes become `not-found`. Unassigned lines become `missing`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: IndieBucks matcher`.

### Task 9: Report helpers

**Files:** Create `src/report.js`, `tests/report.unit.test.js`

**Interfaces:**
- Produces:
  - `summarize(rows): {ok: number, missing: number, review: number}`. `ok` counts `matched` + `fuzzy`; `missing` counts `missing`; `review` counts everything else.
  - `toCopyText(rows): string`
  - `toCsv(rows): string`

- [ ] **Step 1: Failing tests:**

```js
const rows = [
  {status:'missing', studio:'WankItNow', scheduleTitle:'Sensual Groove', newsletterTitle:null, date:'2026-10-13'},
  {status:'not-found', studio:'PSMTICKLING', newsletterTitle:'Ticklish Sub', scheduleTitle:null, date:null},
  {status:'matched', studio:'AD4X', newsletterTitle:'Quebecers On Vacation', scheduleTitle:'Quebecers on Vacation', date:'2026-10-15'}];
assert.deepEqual(summarize(rows), {ok:1, missing:1, review:1});
assert.equal(toCopyText(rows), '❌ WankItNow – Sensual Groove (Oct 13)\n⚠️ PSMTICKLING – Ticklish Sub');
assert.equal(toCsv(rows).split('\n')[0], 'status,studio,newsletter_title,schedule_title,date,code,note,fhg');
assert.ok(toCsv([{...rows[0], scheduleTitle:'A, "B"'}]).includes('"A, ""B"""'));
```

- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Copy text includes problem rows only (not `matched`/`fuzzy`), ordered by studio then title.
  - The title shown is `scheduleTitle ?? newsletterTitle`.
  - CSV follows RFC 4180 quoting and uses `\n` line endings.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: report summary, copy text, CSV`.

### Task 10: Page, build, end-to-end

**Files:** Create `src/page.html`, `src/ui.js`, `build.mjs`, `tests/e2e.test.js`

**Interfaces:**
- Consumes: all modules above.
- Produces: `dist/checker.html`, an artifact body fragment containing `<title>Newsletter Checker</title>`, `<style>`, the markup, and the inline `<script>`.

The markup uses these element ids, which the e2e test relies on:

| Id | Element |
|---|---|
| `#schedule-input` | textarea + file input `#schedule-file`, multiple |
| `#add-month` | button |
| `#eml-file` | file input |
| `#eml-paste` | textarea |
| `#program` | select: radicalcash / kennyspennies / indiebucks |
| `#coworker-list` | textarea, shown only for indiebucks |
| `#release-date` | `input[type=date]` |
| `#generation-date` | `input[type=date]` |
| `#window-label` | text |
| `#run` | button |
| `#errors` | message area |
| `#summary` | contains `[data-count=ok]`, `[data-count=missing]`, `[data-count=review]` |
| `#filters` | buttons with `data-filter` = all / problems / missing / review |
| `#results` | `tbody` rows with `data-status` |
| `#copy-problems` | button |
| `#download-csv` | button |
| `#expected-list` | `details` |
| `#mapping-editor` | `details` containing a table + `#reset-mapping` |

- [ ] **Step 1: Write the failing e2e test** (`tests/e2e.test.js`).
  - Run `npm run build`.
  - Launch Playwright chromium.
  - Load the page with `page.setContent('<!doctype html><html><head><meta charset=utf-8></head><body>'+fragment+'</body></html>')`.
  - **RadicalCash run:**
    - fill `#schedule-input` with the schedule fixture
    - set `#eml-file` to the RadicalCash fixture
    - click `#run`
    - expect `[data-count=ok]` to have text `38`, `[data-count=missing]` to have `9`, and `#window-label` to contain `Oct 9` and `Oct 15`
    - click the `missing` filter and expect exactly 9 visible rows
  - **IndieBucks run:**
    - set `#eml-file` to the IndieBucks fixture
    - expect `#program` to auto-select `indiebucks`
    - fill `#coworker-list`, then run
    - expect `[data-count=review]` to be `2` and `[data-count=missing]` to be `0`
  - **Error run:** fill `#schedule-input` with `<p>x</p>` and run in RadicalCash mode. Expect `#errors` to contain `no calendar entries`.
  - **Layout:** at a 360px-wide viewport, `document.documentElement.scrollWidth <= 360`.
- [ ] **Step 2: Run** `npm run e2e`. Expected: FAIL (no build).
- [ ] **Step 3: Implement `build.mjs`.** Use `esbuild.build({entryPoints:['src/ui.js'], bundle:true, format:'iife', write:false, minify:true})`, then replace `/*SCRIPT*/` in `src/page.html` with the output and write `dist/checker.html`.
- [ ] **Step 4: Implement `src/page.html` and `src/ui.js`.**
  - Read files with `File.text()`.
  - When an eml is loaded, set `#program` from `detectProgram` and `#release-date` from `releaseDate`.
  - Recompute `#generation-date` and `#window-label` whenever the release date changes. A manual edit of the generation date overrides the computed one, and the window is derived from the generation date.
  - `#run` calls `checkSchedule` or `checkIndieBucks` and renders the rows, grouped by studio.
  - Each row shows:
    - a status chip with a text label (not color alone)
    - the newsletter title, with the schedule title underneath when it differs
    - the date as `Mon D`
    - an FHG link
    - the code and note (IndieBucks only)
  - When `uncoveredDays` is not empty, show a warning in `#errors`: `Schedule doesn't cover {dates} — add the other month's page.`
  - **Copy problems:** `navigator.clipboard.writeText(toCopyText(rows))` with a textarea fallback.
  - **Download CSV:** a `Blob` link with filename `newsletter-check-{program}-{release}.csv`.
  - **Mapping editor:** edits save to `localStorage` (`nlc.mapping.v1`, wrapped in try/catch); `#reset-mapping` restores `DEFAULT_MAPPING`; guessed studios show a "guess" tag.
  - **Styling:** CSS tokens on `:root` with dark-mode overrides, a 16px gutter, and a table that becomes stacked cards below 640px.
- [ ] **Step 5: Run** `npm test && npm run e2e`. Expected: all PASS.
- [ ] **Step 6: Take a screenshot** of the RadicalCash result with Playwright at 1280×900 and at 390×844, and view both with the Read tool. Fix any visible layout defects.
- [ ] **Step 7: Commit** `feat: checker page, build, e2e`.

### Task 11: Publish

**Files:** none new.

- [ ] **Step 1:** Load the `artifact-design` skill and check `src/page.html` against its page contract (title, theming tokens, no external requests). Apply fixes, then rebuild and rerun the e2e test.
- [ ] **Step 2:** Publish `dist/checker.html` with the Artifact tool, using `icon: "checklist"` and the description "Checks affiliate newsletters against the content schedule or the IndieBucks list."
- [ ] **Step 3:** Commit any final changes with `chore: artifact-ready page`.
